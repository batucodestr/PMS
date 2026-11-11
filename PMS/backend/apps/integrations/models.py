from django.db import models
from apps.core.models import BaseModel
from apps.properties.models import Property

class ChannelConnection(BaseModel):
    provider = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    credentials = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

class ChannelListing(BaseModel):
    connection = models.ForeignKey(
        ChannelConnection,
        on_delete=models.CASCADE,
        related_name="listings"
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="channel_listings"
    )
    external_listing_id = models.CharField(max_length=255)
    external_url = models.URLField(blank=True)
    sync_enabled = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["connection", "external_listing_id"],
                name="unique_external_listing"
            )
        ]


class SyncLog(BaseModel):
    connection = models.ForeignKey(
        ChannelConnection,
        on_delete=models.CASCADE,
        related_name="sync_logs"
    )
    action = models.CharField(max_length=100)
    status = models.CharField(max_length=30)
    message = models.TextField(blank=True)
    details = models.JSONField(default=dict)


class WebhookEvent(BaseModel):
    provider = models.CharField(max_length=50)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
