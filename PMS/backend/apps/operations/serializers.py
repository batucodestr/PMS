from django.utils import timezone
from rest_framework import serializers
from .models import GeneralTask, HouseKeepingTasks, StayRecord


def sync_completed_date(data):
    """Keep completed_date consistent with status when status is being written."""
    if 'status' not in data:
        return
    if data['status'] == 'completed':
        if not data.get('completed_date'):
            data['completed_date'] = timezone.localdate()
    else:
        data['completed_date'] = None

class GeneralTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneralTask
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_status(self, value):
        if value not in [choice[0] for choice in GeneralTask.Status.choices]:
            raise serializers.ValidationError("Invalid status.")
        return value

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError("Description cannot be empty.")
        return value

    def validate(self, data):
        sync_completed_date(data)
        return data

class HouseKeepingTasksSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseKeepingTasks
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_status(self, value):
        if value not in [choice[0] for choice in HouseKeepingTasks.Status.choices]:
            raise serializers.ValidationError("Invalid status.")
        return value

    def validate(self, data):
        prop = data.get('property', getattr(self.instance, 'property', None))
        reservation = data.get('reservation', getattr(self.instance, 'reservation', None))
        if prop and reservation and reservation.property_id != prop.pk:
            raise serializers.ValidationError(
                {"reservation": "Reservation does not belong to the selected property."}
            )
        sync_completed_date(data)
        return data


class StayRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = StayRecord
        fields = ['id', 'reservation', 'actual_check_in', 'actual_check_out',
                  'checked_in_by', 'checked_out_by', 'notes', 'created_at', 'updated_at']
        read_only_fields = fields
