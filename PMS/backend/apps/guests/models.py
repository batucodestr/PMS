from django.db import models
from apps.core.models import BaseModel

# Create your models here.

class Guest(BaseModel):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20)
    nationality = models.CharField(max_length=100, blank=True)
    identity_number = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True, null=True, max_length=500)


    def __str__(self):
        return f"{self.first_name} {self.last_name}"