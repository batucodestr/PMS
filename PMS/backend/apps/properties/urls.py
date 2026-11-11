from rest_framework.routers import SimpleRouter

from .views import PropertyViewSet, PropertyImageViewSet

router = SimpleRouter()
router.register('properties', PropertyViewSet, basename='property')
router.register('property-images', PropertyImageViewSet, basename='property-image')

urlpatterns = router.urls
