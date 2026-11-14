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


class PublicPropertySerializer(serializers.ModelSerializer):
    """Tanıtım sitesine açılan, salt-okunur mülk görünümü.

    Kişisel/operasyonel alanlar (telefon, e-posta, açık adres, posta kodu)
    bilerek dışarıda bırakılır. Görsel, sitenin kendi sunucusu üzerinden
    proxy'lenebilsin diye host'tan bağımsız göreli yol (/media/...) olarak döner.
    """

    image = serializers.SerializerMethodField()
    image_alt = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            'id', 'name', 'description', 'city', 'country',
            'max_guests', 'bedroom_count', 'bed_count', 'bathroom_count',
            'area', 'base_price', 'image', 'image_alt', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    @staticmethod
    def _first_image(obj):
        # prefetch_related('images') ile gelen önbelleği kullanır, ek sorgu atmaz.
        images = list(obj.images.all())
        return images[0] if images else None

    def get_image(self, obj):
        img = self._first_image(obj)
        if not img or not img.image:
            return None
        return img.image.url

    def get_image_alt(self, obj):
        img = self._first_image(obj)
        return (img.alt_text if img else '') or obj.name
