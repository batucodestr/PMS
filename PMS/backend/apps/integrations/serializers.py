from rest_framework import serializers
from .models import ChannelConnection, ChannelListing, SyncLog, WebhookEvent

class ChannelConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChannelConnection
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'credentials': {'write_only': True}}

class ChannelListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChannelListing
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class SyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

class WebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEvent
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']