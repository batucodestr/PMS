from apps.core.testing import AuthenticatedAPITestCase, make_guest
from .models import Guest

PAYLOAD = {
    'first_name': 'Grace', 'last_name': 'Hopper', 'email': 'grace@example.com',
    'phone': '5553334455', 'nationality': 'US', 'identity_number': 'A1234567',
}


class GuestCRUDTests(AuthenticatedAPITestCase):
    def test_create_masks_identity_number(self):
        res = self.client.post('/api/guests/', PAYLOAD, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertNotIn('identity_number', res.data)
        self.assertEqual(res.data['identity_number_masked'], '*****567')
        self.assertEqual(Guest.objects.get().identity_number, 'A1234567')

    def test_create_validation(self):
        res = self.client.post('/api/guests/', {**PAYLOAD, 'phone': ''}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/guests/', {**PAYLOAD, 'identity_number': '123'}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/guests/', {**PAYLOAD, 'email': 'not-an-email'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_list_search_detail(self):
        make_guest(first_name='Ada')
        make_guest(first_name='Linus', last_name='Torvalds', email='l@example.com')
        res = self.client.get('/api/guests/')
        self.assertEqual(res.data['count'], 2)
        res = self.client.get('/api/guests/?search=Linus')
        self.assertEqual(res.data['count'], 1)
        guest_id = res.data['results'][0]['id']
        self.assertEqual(self.client.get(f'/api/guests/{guest_id}/').status_code, 200)

    def test_update_and_delete(self):
        guest = make_guest()
        url = f'/api/guests/{guest.id}/'
        res = self.client.patch(url, {'notes': 'VIP'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['notes'], 'VIP')
        res = self.client.put(url, PAYLOAD, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(Guest.objects.exists())
