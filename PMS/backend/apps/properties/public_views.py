"""Tanıtım sitesi (Evlerim sayfası) için kimlik doğrulamasız, salt-okunur uç noktalar.

Yalnızca aktif mülkler ve PublicPropertySerializer'daki güvenli alanlar döner.
Yazma işlemleri (POST/PUT/PATCH/DELETE) bu uçlarda yoktur.
"""
from django.db.models import Prefetch
from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle

from .models import Property, PropertyImage
from .serializers import PublicPropertySerializer


class PublicPropertyViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PublicPropertySerializer
    permission_classes = [AllowAny]
    # Header'da gelen (geçersiz/eski) bir token isteği 401'e düşürmesin.
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public'
    filterset_fields = ['city', 'country', 'bedroom_count', 'max_guests']
    search_fields = ['name', 'city', 'country', 'description']
    ordering_fields = ['name', 'base_price', 'max_guests', 'bedroom_count', 'created_at']

    def get_queryset(self):
        return (
            Property.objects.filter(is_active=True)
            .prefetch_related(Prefetch('images', queryset=PropertyImage.objects.order_by('id')))
            .order_by('-created_at', 'id')
        )
