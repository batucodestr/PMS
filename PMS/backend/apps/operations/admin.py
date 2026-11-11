from django.contrib import admin
from .models import GeneralTask, HouseKeepingTasks, StayRecord
# Register your models here.
admin.site.register(GeneralTask)
admin.site.register(HouseKeepingTasks)
admin.site.register(StayRecord)
