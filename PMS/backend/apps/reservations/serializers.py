from django.db import transaction
from rest_framework import serializers

from apps.properties.models import Property
from .models import Reservation, ReservationGuest, AvailabilityBlock, ReservationStatusHistory

Status = Reservation.Status

# Statuses that occupy the calendar. Cancelled and no-show reservations free their dates.
BLOCKING_STATUSES = (Status.PENDING, Status.CONFIRMED, Status.COMPLETED)

# Manual status transitions. COMPLETED is only reachable through the check-out endpoint.
ALLOWED_TRANSITIONS = {
    Status.PENDING: {Status.CONFIRMED, Status.CANCELLED},
    Status.CONFIRMED: {Status.CANCELLED, Status.NO_SHOW},
    Status.CANCELLED: {Status.PENDING, Status.CONFIRMED},
    Status.COMPLETED: set(),
    Status.NO_SHOW: set(),
}

AVAILABILITY_FIELDS = ('property', 'check_in', 'check_out', 'adults', 'children', 'status')


def assert_availability(*, property, check_in, check_out, adults, children, status, exclude_pk=None):
    """
    Capacity / overlap / block checks.

    Reservations occupy nights [check_in, check_out); blocks occupy every day
    from start_date to end_date inclusive.
    """
    if status not in BLOCKING_STATUSES:
        return
    errors = {}
    if adults + children > property.max_guests:
        errors['adults'] = f"Guest count exceeds the property capacity ({property.max_guests})."

    overlapping = Reservation.objects.filter(
        property=property,
        status__in=BLOCKING_STATUSES,
        check_in__lt=check_out,
        check_out__gt=check_in,
    )
    if exclude_pk:
        overlapping = overlapping.exclude(pk=exclude_pk)
    if overlapping.exists():
        errors['check_in'] = "The property is already reserved for the selected dates."

    if AvailabilityBlock.objects.filter(
        property=property, start_date__lt=check_out, end_date__gte=check_in
    ).exists():
        errors['check_out'] = "The property is blocked for part of the selected dates."

    if errors:
        raise serializers.ValidationError(errors)


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = "__all__"

    def validate_currency(self, value):
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Currency must be a 3-letter code.")
        return value.upper()

    def _effective(self, data):
        """Merge incoming data over the stored instance (PATCH/PUT safe)."""
        values = {}
        for name in AVAILABILITY_FIELDS:
            if name in data:
                values[name] = data[name]
            elif self.instance is not None:
                values[name] = getattr(self.instance, name)
        return values

    def _availability_relevant(self, data):
        if self.instance is None:
            return True
        return any(
            name in data and data[name] != getattr(self.instance, name)
            for name in AVAILABILITY_FIELDS
        )

    def _check_availability(self, data):
        if not self._availability_relevant(data):
            return
        v = self._effective(data)
        assert_availability(
            property=v['property'], check_in=v['check_in'], check_out=v['check_out'],
            adults=v['adults'], children=v['children'], status=v['status'],
            exclude_pk=self.instance.pk if self.instance else None,
        )

    def validate(self, data):
        instance = self.instance
        check_in = data.get('check_in', getattr(instance, 'check_in', None))
        check_out = data.get('check_out', getattr(instance, 'check_out', None))
        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError(
                {"check_out": "Check-out must be after check-in."}
            )
        if 'adults' in data and data['adults'] < 1:
            raise serializers.ValidationError(
                {"adults": "At least one adult is required."}
            )
        if 'total_price' in data and data['total_price'] < 0:
            raise serializers.ValidationError(
                {"total_price": "Total price cannot be negative."}
            )

        new_property = data.get('property')
        if new_property is not None and not new_property.is_active and (
            instance is None or new_property != instance.property
        ):
            raise serializers.ValidationError({"property": "This property is not active."})

        checked_in = bool(
            instance is not None
            and hasattr(instance, 'stay_record')
            and instance.stay_record.actual_check_in
        )
        if checked_in and new_property is not None and new_property != instance.property:
            raise serializers.ValidationError(
                {"property": "Cannot change the property of a reservation that has checked in."}
            )

        new_status = data.get('status')
        if instance is None:
            if new_status not in (None, Status.PENDING, Status.CONFIRMED):
                raise serializers.ValidationError(
                    {"status": "A new reservation can only be pending or confirmed."}
                )
            data.setdefault('status', Status.PENDING)
        elif new_status is not None and new_status != instance.status:
            if new_status not in ALLOWED_TRANSITIONS[instance.status]:
                raise serializers.ValidationError(
                    {"status": f"Cannot change status from '{instance.status}' to '{new_status}'. "
                               "(Use the check-out endpoint to complete a stay.)"}
                )
            if checked_in and new_status in (Status.CANCELLED, Status.NO_SHOW):
                raise serializers.ValidationError(
                    {"status": "A reservation that has checked in cannot be cancelled."}
                )

        # Early, friendly error. The authoritative check re-runs under a lock in create()/update().
        self._check_availability(data)
        return data

    def _record_history(self, reservation, old_status):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        ReservationStatusHistory.objects.create(
            reservation=reservation,
            old_status=old_status,
            new_status=reservation.status,
            changed_by=user if user is not None and user.is_authenticated else None,
        )

    def create(self, validated_data):
        with transaction.atomic():
            # Serialise concurrent bookings for the same property (row lock on PostgreSQL).
            Property.objects.select_for_update().get(pk=validated_data['property'].pk)
            self._check_availability(validated_data)
            reservation = super().create(validated_data)
            self._record_history(reservation, '')
        return reservation

    def update(self, instance, validated_data):
        with transaction.atomic():
            target = validated_data.get('property', instance.property)
            Property.objects.select_for_update().get(pk=target.pk)
            old_status = instance.status
            self._check_availability(validated_data)
            instance = super().update(instance, validated_data)
            if instance.status != old_status:
                self._record_history(instance, old_status)
        return instance


class ReservationGuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationGuest
        fields = "__all__"


class AvailabilityBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilityBlock
        fields = "__all__"

    def validate(self, data):
        start = data.get('start_date', getattr(self.instance, 'start_date', None))
        end = data.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date cannot be before start date."}
            )
        return data


class ReservationStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationStatusHistory
        fields = "__all__"
