from rest_framework import viewsets

from .models import GeneralTask, HouseKeepingTasks
from .serializers import GeneralTaskSerializer, HouseKeepingTasksSerializer


class HouseKeepingTasksViewSet(viewsets.ModelViewSet):
    queryset = HouseKeepingTasks.objects.select_related('property', 'reservation').order_by('-scheduled_date', 'id')
    serializer_class = HouseKeepingTasksSerializer
    filterset_fields = {
        'property': ['exact'],
        'reservation': ['exact'],
        'assigned_to': ['exact'],
        'status': ['exact'],
        'scheduled_date': ['exact', 'gte', 'lte'],
    }
    search_fields = ['notes', 'property__name']
    ordering_fields = ['scheduled_date', 'status', 'created_at']


class GeneralTaskViewSet(viewsets.ModelViewSet):
    queryset = GeneralTask.objects.select_related('property').order_by('due_date', 'id')
    serializer_class = GeneralTaskSerializer
    filterset_fields = {
        'property': ['exact'],
        'assigned_to': ['exact'],
        'status': ['exact'],
        'due_date': ['exact', 'gte', 'lte'],
    }
    search_fields = ['description', 'property__name']
    ordering_fields = ['due_date', 'status', 'created_at']
