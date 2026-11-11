"""Shared helpers for the API test suites."""
from datetime import date, time
from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from apps.guests.models import Guest
from apps.properties.models import Property


def make_property(**overrides):
    data = dict(
        name='Sea View', description='', phone='5551112233', email='p@example.com',
        address='1 Beach Rd', city='Antalya', country='Turkey', postal_code='07000',
        max_guests=4,
        bedroom_count=2, bed_count=3, bathroom_count=1,
        area=Decimal('80.00'), base_price=Decimal('100.00'),
    )
    data.update(overrides)
    return Property.objects.create(**data)


def make_guest(**overrides):
    data = dict(first_name='Ada', last_name='Lovelace', phone='5550001122', email='ada@example.com')
    data.update(overrides)
    return Guest.objects.create(**data)


class AuthenticatedAPITestCase(APITestCase):
    password = 'S3cret-pass!'

    def setUp(self):
        self.user = User.objects.create_user('staff', 'staff@example.com', self.password)
        self.client.force_authenticate(self.user)
