from apps.core.testing import AuthenticatedAPITestCase, make_guest, make_property
from apps.reservations.models import Reservation


class HousekeepingTests(AuthenticatedAPITestCase):
    url = '/api/housekeeping/'

    def setUp(self):
        super().setUp()
        self.property = make_property()
        self.other = make_property(name='Other')
        self.reservation = Reservation.objects.create(
            property=self.property, guest=make_guest(), check_in='2030-01-01',
            check_out='2030-01-03', total_price=10,
        )

    def payload(self, **kw):
        data = {'property': self.property.id, 'scheduled_date': '2030-01-03', 'notes': 'deep clean'}
        data.update(kw)
        return data

    def test_crud(self):
        res = self.client.post(self.url, self.payload(reservation=str(self.reservation.id)), format='json')
        self.assertEqual(res.status_code, 201, res.data)
        tid = res.data['id']
        self.assertEqual(self.client.get(self.url).data['count'], 1)
        self.assertEqual(self.client.get(f'{self.url}{tid}/').status_code, 200)
        res = self.client.patch(f'{self.url}{tid}/', {'notes': 'updated'}, format='json')
        self.assertEqual(res.data['notes'], 'updated')
        res = self.client.put(f'{self.url}{tid}/', self.payload(notes='put'), format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.client.delete(f'{self.url}{tid}/').status_code, 204)
        self.assertEqual(self.client.get(f'{self.url}{tid}/').status_code, 404)

    def test_reservation_must_belong_to_property(self):
        res = self.client.post(
            self.url, self.payload(property=self.other.id, reservation=str(self.reservation.id)), format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('reservation', res.data)

    def test_patch_property_checked_against_stored_reservation(self):
        tid = self.client.post(self.url, self.payload(reservation=str(self.reservation.id)), format='json').data['id']
        res = self.client.patch(f'{self.url}{tid}/', {'property': self.other.id}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_status_update_sets_and_clears_completed_date(self):
        tid = self.client.post(self.url, self.payload(), format='json').data['id']
        res = self.client.patch(f'{self.url}{tid}/', {'status': 'in_progress'}, format='json')
        self.assertEqual(res.data['status'], 'in_progress')
        self.assertIsNone(res.data['completed_date'])
        res = self.client.patch(f'{self.url}{tid}/', {'status': 'completed'}, format='json')
        self.assertIsNotNone(res.data['completed_date'])
        res = self.client.patch(f'{self.url}{tid}/', {'status': 'pending'}, format='json')
        self.assertIsNone(res.data['completed_date'])
        res = self.client.patch(f'{self.url}{tid}/', {'status': 'nonsense'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_filters(self):
        self.client.post(self.url, self.payload(), format='json')
        self.client.post(self.url, self.payload(property=self.other.id, scheduled_date='2030-02-01'), format='json')
        self.assertEqual(self.client.get(f'{self.url}?property={self.other.id}').data['count'], 1)
        self.assertEqual(self.client.get(f'{self.url}?scheduled_date__gte=2030-02-01').data['count'], 1)
        self.assertEqual(self.client.get(f'{self.url}?status=completed').data['count'], 0)


class GeneralTaskTests(AuthenticatedAPITestCase):
    url = '/api/general-tasks/'

    def setUp(self):
        super().setUp()
        self.property = make_property()

    def payload(self, **kw):
        data = {'property': self.property.id, 'description': 'Fix tap', 'due_date': '2030-03-01'}
        data.update(kw)
        return data

    def test_crud(self):
        res = self.client.post(self.url, self.payload(assigned_to=self.user.id), format='json')
        self.assertEqual(res.status_code, 201, res.data)
        tid = res.data['id']
        self.assertEqual(self.client.get(self.url).data['count'], 1)
        self.assertEqual(self.client.get(f'{self.url}{tid}/').data['description'], 'Fix tap')
        res = self.client.patch(f'{self.url}{tid}/', {'description': 'Fix sink'}, format='json')
        self.assertEqual(res.data['description'], 'Fix sink')
        res = self.client.put(f'{self.url}{tid}/', self.payload(description='Put'), format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.client.delete(f'{self.url}{tid}/').status_code, 204)

    def test_validation(self):
        self.assertEqual(self.client.post(self.url, self.payload(description='   '), format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, self.payload(status='bad'), format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'description': 'x'}, format='json').status_code, 400)

    def test_status_management(self):
        tid = self.client.post(self.url, self.payload(), format='json').data['id']
        res = self.client.patch(f'{self.url}{tid}/', {'status': 'completed'}, format='json')
        self.assertIsNotNone(res.data['completed_date'])
        res = self.client.patch(f'{self.url}{tid}/', {'status': 'in_progress'}, format='json')
        self.assertIsNone(res.data['completed_date'])
        self.assertEqual(self.client.get(f'{self.url}?status=in_progress').data['count'], 1)
        self.assertEqual(self.client.get(f'{self.url}?search=Fix').data['count'], 1)
