from rest_framework import serializers
from .models import Guest

class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'identity_number': {'write_only': True}}

    identity_number_masked = serializers.SerializerMethodField()

    def get_identity_number_masked(self, obj):
        value = obj.identity_number or ''
        if not value:
            return ''
        return '*' * max(len(value) - 3, 0) + value[-3:]

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email is required.")
        return value

    def validate_identity_number(self, value):
        if value and len(value) < 5:
            raise serializers.ValidationError("Identity number must be at least 5 characters long.")
        return value