from rest_framework import viewsets

from apps.core.views import ProtectedDeleteMixin
from .models import Property, PropertyImage
from .serializers import PropertySerializer, PropertyImageSerializer


class PropertyViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = Property.objects.prefetch_related('images').order_by('name', 'id')
    serializer_class = PropertySerializer
    filterset_fields = ['is_active', 'city', 'country', 'max_guests', 'bedroom_count']
    search_fields = ['name', 'city', 'address', 'country']
    ordering_fields = ['name', 'base_price', 'max_guests', 'city']


class PropertyImageViewSet(viewsets.ModelViewSet):
    queryset = PropertyImage.objects.select_related('property').order_by('id')
    serializer_class = PropertyImageSerializer
    filterset_fields = ['property']
