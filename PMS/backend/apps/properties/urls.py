from rest_framework.routers import SimpleRouter

from .public_views import PublicPropertyViewSet
from .views import PropertyViewSet, PropertyImageViewSet

router = SimpleRouter()
router.register('properties', PropertyViewSet, basename='property')
router.register('property-images', PropertyImageViewSet, basename='property-image')
# Tanıtım sitesi için herkese açık, salt-okunur liste/detay.
router.register('public/properties', PublicPropertyViewSet, basename='public-property')

urlpatterns = router.urls
