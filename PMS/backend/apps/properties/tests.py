import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from apps.core.testing import AuthenticatedAPITestCase, make_property
from apps.guests.models import Guest
from apps.reservations.models import Reservation
from .models import Property, PropertyImage

PAYLOAD = {
    'name': 'Villa', 'description': 'Nice', 'phone': '555', 'email': 'v@example.com',
    'address': 'x', 'city': 'Bodrum', 'country': 'Turkey', 'postal_code': '48000',
    'max_guests': 6,
    'bedroom_count': 3, 'bed_count': 4, 'bathroom_count': 2,
    'area': '120.50', 'base_price': '250.00',
}


class PropertyCRUDTests(AuthenticatedAPITestCase):
    def test_create(self):
        res = self.client.post('/api/properties/', PAYLOAD, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(Property.objects.get().name, 'Villa')

    def test_create_invalid(self):
        res = self.client.post('/api/properties/', {**PAYLOAD, 'max_guests': 0, 'base_price': '-1'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_list_is_paginated_and_searchable(self):
        make_property(name='Alpha', city='Izmir')
        make_property(name='Beta', city='Muğla')
        res = self.client.get('/api/properties/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 2)
        self.assertIn('results', res.data)
        res = self.client.get('/api/properties/?search=Alpha')
        self.assertEqual([p['name'] for p in res.data['results']], ['Alpha'])
        res = self.client.get('/api/properties/?city=Muğla')
        self.assertEqual(res.data['count'], 1)

    def test_detail_update_delete(self):
        prop = make_property()
        url = f'/api/properties/{prop.id}/'
        self.assertEqual(self.client.get(url).data['name'], 'Sea View')
        res = self.client.patch(url, {'name': 'Renamed'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['name'], 'Renamed')
        res = self.client.put(url, {**PAYLOAD, 'name': 'Put Name'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_delete_with_reservations_returns_409(self):
        prop = make_property()
        guest = Guest.objects.create(first_name='A', last_name='B', phone='1')
        Reservation.objects.create(
            property=prop, guest=guest, check_in='2030-01-01', check_out='2030-01-03', total_price=10,
        )
        res = self.client.delete(f'/api/properties/{prop.id}/')
        self.assertEqual(res.status_code, 409)
        self.assertTrue(Property.objects.filter(pk=prop.pk).exists())


class PropertyImageTests(AuthenticatedAPITestCase):
    def _image(self):
        buf = io.BytesIO()
        Image.new('RGB', (4, 4), 'red').save(buf, 'PNG')
        return SimpleUploadedFile('a.png', buf.getvalue(), content_type='image/png')

    def test_upload_list_delete(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=tmp):
            prop = make_property()
            res = self.client.post(
                '/api/property-images/',
                {'property': prop.id, 'image': self._image(), 'alt_text': 'front'},
                format='multipart',
            )
            self.assertEqual(res.status_code, 201, res.data)
            res = self.client.get(f'/api/properties/{prop.id}/')
            self.assertEqual(len(res.data['images']), 1)
            res = self.client.get(f'/api/property-images/?property={prop.id}')
            self.assertEqual(res.data['count'], 1)
            image = PropertyImage.objects.get()
            self.assertEqual(self.client.delete(f'/api/property-images/{image.id}/').status_code, 204)
