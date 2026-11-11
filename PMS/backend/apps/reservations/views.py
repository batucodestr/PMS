from django.db import transaction
from django.utils import timezone
from rest_framework import status as http
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.views import ProtectedDeleteMixin
from apps.operations.models import StayRecord
from apps.operations.serializers import StayRecordSerializer
from .models import Reservation, AvailabilityBlock, ReservationStatusHistory
from .serializers import ReservationSerializer, AvailabilityBlockSerializer


def _conflict(message):
    return Response({'detail': message}, status=http.HTTP_409_CONFLICT)


class ReservationViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related('property', 'guest').order_by('-check_in', 'id')
    serializer_class = ReservationSerializer
    filterset_fields = {
        'property': ['exact'],
        'guest': ['exact'],
        'status': ['exact'],
        'source': ['exact'],
        'check_in': ['exact', 'gte', 'lte'],
        'check_out': ['exact', 'gte', 'lte'],
    }
    search_fields = ['guest__first_name', 'guest__last_name', 'guest__email', 'property__name']
    ordering_fields = ['check_in', 'check_out', 'created_at', 'total_price']

    def _locked(self):
        """Fetch (404/permissions) then re-read the reservation under a row lock."""
        obj = self.get_object()
        return Reservation.objects.select_for_update().get(pk=obj.pk)

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        with transaction.atomic():
            reservation = self._locked()
            if reservation.status != Reservation.Status.CONFIRMED:
                return _conflict(
                    f"Only confirmed reservations can check in (current status: {reservation.status})."
                )
            stay, _ = StayRecord.objects.get_or_create(reservation=reservation)
            if stay.actual_check_in:
                return _conflict("This reservation has already checked in.")
            stay.actual_check_in = timezone.now()
            stay.checked_in_by = request.user
            if request.data.get('notes'):
                stay.notes = str(request.data['notes'])
            stay.save()
        return Response(StayRecordSerializer(stay).data, status=http.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='check-out')
    def check_out(self, request, pk=None):
        with transaction.atomic():
            reservation = self._locked()
            stay = StayRecord.objects.filter(reservation=reservation).first()
            if stay is None or not stay.actual_check_in:
                return _conflict("This reservation has not checked in yet.")
            if stay.actual_check_out:
                return _conflict("This reservation has already checked out.")
            stay.actual_check_out = timezone.now()
            stay.checked_out_by = request.user
            if request.data.get('notes'):
                stay.notes = str(request.data['notes'])
            stay.save()
            old_status = reservation.status
            reservation.status = Reservation.Status.COMPLETED
            reservation.save(update_fields=['status', 'updated_at'])
            ReservationStatusHistory.objects.create(
                reservation=reservation, old_status=old_status,
                new_status=reservation.status, changed_by=request.user,
            )
        return Response(StayRecordSerializer(stay).data, status=http.HTTP_200_OK)


class AvailabilityBlockViewSet(viewsets.ModelViewSet):
    queryset = AvailabilityBlock.objects.select_related('property').order_by('start_date', 'id')
    serializer_class = AvailabilityBlockSerializer
    filterset_fields = {
        'property': ['exact'],
        'start_date': ['exact', 'gte', 'lte'],
        'end_date': ['exact', 'gte', 'lte'],
    }
