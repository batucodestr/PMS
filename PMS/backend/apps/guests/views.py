from rest_framework import viewsets

from apps.core.views import ProtectedDeleteMixin
from .models import Guest
from .serializers import GuestSerializer


class GuestViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    queryset = Guest.objects.order_by('last_name', 'first_name', 'id')
    serializer_class = GuestSerializer
    filterset_fields = ['nationality']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['first_name', 'last_name', 'created_at']
