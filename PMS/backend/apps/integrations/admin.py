from django.contrib import admin
from .models import ChannelConnection, ChannelListing, SyncLog, WebhookEvent

admin.site.register(ChannelConnection)
admin.site.register(ChannelListing)
admin.site.register(SyncLog)
admin.site.register(WebhookEvent)
