from rest_framework.routers import SimpleRouter

from .views import ReservationViewSet, AvailabilityBlockViewSet

router = SimpleRouter()
router.register('reservations', ReservationViewSet, basename='reservation')
router.register('availability-blocks', AvailabilityBlockViewSet, basename='availability-block')

urlpatterns = router.urls
