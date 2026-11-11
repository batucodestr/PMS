from django.db import models
from apps.core.models import BaseModel

class Property(BaseModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    address = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    max_guests = models.PositiveIntegerField()
    bedroom_count = models.PositiveIntegerField()
    bed_count = models.PositiveIntegerField()
    bathroom_count = models.PositiveIntegerField()
    area = models.DecimalField(max_digits=10, decimal_places=2)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


def property_image_upload_to(instance, filename):
    return f'property_images/{instance.property.id}/{filename}'

class PropertyImage(models.Model):
    property = models.ForeignKey(Property, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to=property_image_upload_to)
    alt_text = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Image for {self.property.name}"