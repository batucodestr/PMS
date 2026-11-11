from rest_framework.routers import SimpleRouter

from .views import GuestViewSet

router = SimpleRouter()
router.register('guests', GuestViewSet, basename='guest')

urlpatterns = router.urls
