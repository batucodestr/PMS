from django.contrib import admin
from .models import (
    Reservation, ReservationGuest, AvailabilityBlock, ReservationStatusHistory,
)
# Register your models here.
admin.site.register(Reservation)
admin.site.register(ReservationGuest)
admin.site.register(AvailabilityBlock)
admin.site.register(ReservationStatusHistory)
