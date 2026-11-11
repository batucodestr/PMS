from django.db import models
from apps.core.models import BaseModel
from apps.properties.models import Property
from apps.guests.models import Guest


class Reservation(BaseModel):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"
        NO_SHOW = "no_show", "No Show"

    class Source(models.TextChoices):
        DIRECT = "direct", "Direct"
        AIRBNB = "airbnb", "Airbnb"
        BOOKING = "booking", "Booking.com"
        OTHER = "other", "Other"

    property = models.ForeignKey(
        Property,
        on_delete=models.PROTECT,
        related_name="reservations"
    )
    guest = models.ForeignKey(
        Guest,
        on_delete=models.PROTECT,
        related_name="reservations"
    )

    check_in = models.DateTimeField()
    check_out = models.DateTimeField()

    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)

    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="TRY")

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.DIRECT
    )

    special_requests = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(check_out__gt=models.F("check_in")),
                name="reservation_check_out_after_check_in",
            ),
            models.CheckConstraint(
                condition=models.Q(adults__gte=1),
                name="reservation_adults_at_least_one",
            ),
            models.CheckConstraint(
                condition=models.Q(total_price__gte=0),
                name="reservation_total_price_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.property.name} - {self.guest}"


class ReservationGuest(BaseModel):
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="reservation_guests"
    )
    guest = models.ForeignKey(
        Guest,
        on_delete=models.PROTECT,
        related_name="guest_reservations"
    )
    is_primary = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reservation", "guest"],
                name="unique_reservation_guest"
            )
        ]


class AvailabilityBlock(BaseModel):
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="availability_blocks"
    )
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["property", "start_date", "end_date"],
                name="unique_availability_block"
            ),
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="availability_block_end_not_before_start",
            ),
        ]


class ReservationStatusHistory(BaseModel):
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="status_history"
    )
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.reservation.id} - {self.new_status}"
