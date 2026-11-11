from rest_framework import serializers
from .models import Property, PropertyImage
from .validate import validate_property_data

class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = '__all__'

    def validate_property(self, prop):
        # Veritabanı/disk tasarrufu: mülk başına en fazla 1 resim.
        qs = prop.images.all()
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Bu mülk için zaten bir resim var. Önce mevcut resmi silin.')
        return prop


class PropertySerializer(serializers.ModelSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)

    class Meta:
        model = Property
        fields = '__all__'

    def validate(self, data):
        validate_property_data(data)
        return data
