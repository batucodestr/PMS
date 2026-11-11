from unittest import mock

from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.testing import AuthenticatedAPITestCase, make_guest, make_property
from apps.operations.models import StayRecord
from .models import AvailabilityBlock, Reservation, ReservationStatusHistory
from .serializers import ReservationSerializer

URL = '/api/reservations/'


class ReservationBase(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.property = make_property(max_guests=4)
        self.guest = make_guest()

    def payload(self, **overrides):
        data = {
            'property': str(self.property.id), 'guest': str(self.guest.id),
            'check_in': '2030-06-10', 'check_out': '2030-06-15',
            'adults': 2, 'children': 1, 'total_price': '500.00',
        }
        data.update(overrides)
        return data

    def book(self, **overrides):
        return self.client.post(URL, self.payload(**overrides), format='json')


class ReservationCRUDTests(ReservationBase):
    def test_create_valid(self):
        res = self.book()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['status'], 'pending')
        reservation = Reservation.objects.get()
        history = ReservationStatusHistory.objects.get(reservation=reservation)
        self.assertEqual((history.old_status, history.new_status, history.changed_by), ('', 'pending', self.user))

    def test_list_filter_detail(self):
        self.book()
        self.book(check_in='2030-07-01', check_out='2030-07-03')
        res = self.client.get(URL)
        self.assertEqual(res.data['count'], 2)
        res = self.client.get(f'{URL}?check_in__gte=2030-07-01')
        self.assertEqual(res.data['count'], 1)
        res = self.client.get(f'{URL}?property={self.property.id}&status=pending')
        self.assertEqual(res.data['count'], 2)
        res = self.client.get(f'{URL}?search=Lovelace')
        self.assertEqual(res.data['count'], 2)
        rid = res.data['results'][0]['id']
        self.assertEqual(self.client.get(f'{URL}{rid}/').status_code, 200)

    def test_patch_put_delete(self):
        rid = self.book().data['id']
        res = self.client.patch(f'{URL}{rid}/', {'special_requests': 'late arrival'}, format='json')
        self.assertEqual(res.status_code, 200)
        res = self.client.put(f'{URL}{rid}/', self.payload(total_price='900.00'), format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['total_price'], '900.00')
        self.assertEqual(self.client.delete(f'{URL}{rid}/').status_code, 204)

    def test_invalid_relations(self):
        res = self.book(guest='00000000-0000-0000-0000-000000000000')
        self.assertEqual(res.status_code, 400)
        res = self.book(property=999999)
        self.assertEqual(res.status_code, 400)

    def test_inactive_property_rejected(self):
        self.property.is_active = False
        self.property.save()
        self.assertEqual(self.book().status_code, 400)

    def test_validation_errors(self):
        self.assertEqual(self.book(adults=0).status_code, 400)
        self.assertEqual(self.book(total_price='-5').status_code, 400)
        self.assertEqual(self.book(currency='TURK').status_code, 400)
        self.assertEqual(self.book(status='completed').status_code, 400)


class ReservationRuleTests(ReservationBase):
    def test_check_out_must_be_after_check_in(self):
        res = self.book(check_in='2030-06-10', check_out='2030-06-10')
        self.assertEqual(res.status_code, 400)
        self.assertIn('check_out', res.data)
        res = self.book(check_in='2030-06-10', check_out='2030-06-09')
        self.assertEqual(res.status_code, 400)

    def test_overlapping_reservation_rejected(self):
        self.assertEqual(self.book().status_code, 201)
        for ci, co in [('2030-06-12', '2030-06-14'),   # inside
                       ('2030-06-08', '2030-06-11'),   # overlaps start
                       ('2030-06-14', '2030-06-20'),   # overlaps end
                       ('2030-06-01', '2030-06-30')]:  # encloses
            res = self.book(check_in=ci, check_out=co)
            self.assertEqual(res.status_code, 400, (ci, co))
            self.assertIn('check_in', res.data)
        self.assertEqual(Reservation.objects.count(), 1)

    def test_back_to_back_reservations_allowed(self):
        self.assertEqual(self.book().status_code, 201)
        self.assertEqual(self.book(check_in='2030-06-15', check_out='2030-06-18').status_code, 201)
        self.assertEqual(self.book(check_in='2030-06-08', check_out='2030-06-10').status_code, 201)

    def test_other_property_not_affected(self):
        other = make_property(name='Other')
        self.book()
        self.assertEqual(self.book(property=str(other.id)).status_code, 201)

    def test_cancelled_and_no_show_free_dates(self):
        rid = self.book().data['id']
        self.assertEqual(self.book().status_code, 400)
        self.client.patch(f'{URL}{rid}/', {'status': 'cancelled'}, format='json')
        self.assertEqual(self.book().status_code, 201)
        # no-show also frees dates
        Reservation.objects.filter(pk=rid).update(status='no_show')
        other = make_property(name='P2')
        r2 = self.book(property=str(other.id)).data['id']
        self.client.patch(f'{URL}{r2}/', {'status': 'confirmed'}, format='json')
        Reservation.objects.filter(pk=r2).update(status='no_show')
        self.assertEqual(self.book(property=str(other.id)).status_code, 201)

    def test_completed_reservation_still_occupies_dates(self):
        Reservation.objects.create(
            property=self.property, guest=self.guest, check_in='2030-06-10',
            check_out='2030-06-15', total_price=1, status='completed',
        )
        self.assertEqual(self.book().status_code, 400)

    def test_reactivating_cancelled_reservation_rechecks_availability(self):
        rid = self.book().data['id']
        self.client.patch(f'{URL}{rid}/', {'status': 'cancelled'}, format='json')
        self.assertEqual(self.book().status_code, 201)
        res = self.client.patch(f'{URL}{rid}/', {'status': 'confirmed'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_availability_block_conflict(self):
        AvailabilityBlock.objects.create(property=self.property, start_date='2030-06-12', end_date='2030-06-12')
        res = self.book()
        self.assertEqual(res.status_code, 400)
        self.assertIn('check_out', res.data)
        # nights 10,11 end the morning of the 12th -> no conflict
        self.assertEqual(self.book(check_in='2030-06-10', check_out='2030-06-12').status_code, 201)
        # starting on the day after the block is fine
        self.assertEqual(self.book(check_in='2030-06-13', check_out='2030-06-15').status_code, 201)
        # starting on the blocked day is not
        self.assertEqual(self.book(check_in='2030-06-12', check_out='2030-06-13').status_code, 400)

    def test_capacity_enforced(self):
        res = self.book(adults=4, children=1)
        self.assertEqual(res.status_code, 400)
        self.assertIn('adults', res.data)
        self.assertEqual(self.book(adults=3, children=1).status_code, 201)

    def test_update_does_not_conflict_with_itself(self):
        rid = self.book().data['id']
        res = self.client.patch(f'{URL}{rid}/', {'check_in': '2030-06-11', 'check_out': '2030-06-14'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        res = self.client.put(f'{URL}{rid}/', self.payload(), format='json')
        self.assertEqual(res.status_code, 200, res.data)

    def test_update_dates_conflicting_with_other_reservation(self):
        rid = self.book().data['id']
        self.book(check_in='2030-06-20', check_out='2030-06-25')
        res = self.client.patch(f'{URL}{rid}/', {'check_out': '2030-06-21'}, format='json')
        self.assertEqual(res.status_code, 400)
        # partial update validates against the stored check_out (06-15)
        res = self.client.patch(f'{URL}{rid}/', {'check_in': '2030-06-16'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_patch_uses_stored_dates_for_validation(self):
        rid = self.book().data['id']
        res = self.client.patch(f'{URL}{rid}/', {'check_out': '2030-06-09'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_status_transitions(self):
        rid = self.book().data['id']
        res = self.client.patch(f'{URL}{rid}/', {'status': 'completed'}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.patch(f'{URL}{rid}/', {'status': 'confirmed'}, format='json')
        self.assertEqual(res.status_code, 200)
        res = self.client.patch(f'{URL}{rid}/', {'status': 'bogus'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(
            list(ReservationStatusHistory.objects.filter(reservation_id=rid)
                 .order_by('created_at').values_list('new_status', flat=True)),
            ['pending', 'confirmed'],
        )

    def test_guest_count_change_rechecked_on_update(self):
        rid = self.book().data['id']
        res = self.client.patch(f'{URL}{rid}/', {'adults': 5}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_authoritative_check_inside_create_blocks_race(self):
        """
        Simulate two requests that both passed validate() before either saved:
        the second create() must still refuse, because it re-checks under the lock.
        """
        from rest_framework.exceptions import ValidationError
        first = ReservationSerializer(data=self.payload(), context={'request': mock.Mock(user=self.user)})
        second = ReservationSerializer(data=self.payload(), context={'request': mock.Mock(user=self.user)})
        self.assertTrue(first.is_valid(), first.errors)
        self.assertTrue(second.is_valid(), second.errors)  # both look free
        first.save()
        with self.assertRaises(ValidationError):
            second.save()
        self.assertEqual(Reservation.objects.count(), 1)


class CheckInOutTests(ReservationBase):
    def setUp(self):
        super().setUp()
        self.rid = self.book(status='confirmed').data['id']

    def test_check_in_success(self):
        before = timezone.now()
        res = self.client.post(f'{URL}{self.rid}/check-in/')
        self.assertEqual(res.status_code, 200, res.data)
        stay = StayRecord.objects.get(reservation_id=self.rid)
        self.assertEqual(stay.checked_in_by, self.user)
        self.assertGreaterEqual(stay.actual_check_in, before)
        self.assertIsNone(stay.actual_check_out)
        self.assertEqual(Reservation.objects.get(pk=self.rid).status, 'confirmed')

    def test_check_in_twice_rejected(self):
        self.client.post(f'{URL}{self.rid}/check-in/')
        first_time = StayRecord.objects.get().actual_check_in
        res = self.client.post(f'{URL}{self.rid}/check-in/')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(StayRecord.objects.get().actual_check_in, first_time)

    def test_check_in_requires_confirmed(self):
        pending = self.book(check_in='2030-08-01', check_out='2030-08-03').data['id']
        self.assertEqual(self.client.post(f'{URL}{pending}/check-in/').status_code, 409)
        self.assertFalse(StayRecord.objects.filter(reservation_id=pending).exists())

    def test_check_out_success(self):
        self.client.post(f'{URL}{self.rid}/check-in/')
        res = self.client.post(f'{URL}{self.rid}/check-out/', {'notes': 'all good'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        stay = StayRecord.objects.get()
        self.assertEqual(stay.checked_out_by, self.user)
        self.assertIsNotNone(stay.actual_check_out)
        self.assertGreaterEqual(stay.actual_check_out, stay.actual_check_in)
        self.assertEqual(stay.notes, 'all good')
        self.assertEqual(Reservation.objects.get(pk=self.rid).status, 'completed')
        self.assertTrue(ReservationStatusHistory.objects.filter(
            reservation_id=self.rid, new_status='completed', changed_by=self.user).exists())

    def test_check_out_twice_rejected(self):
        self.client.post(f'{URL}{self.rid}/check-in/')
        self.client.post(f'{URL}{self.rid}/check-out/')
        res = self.client.post(f'{URL}{self.rid}/check-out/')
        self.assertEqual(res.status_code, 409)

    def test_check_out_before_check_in_rejected(self):
        res = self.client.post(f'{URL}{self.rid}/check-out/')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(Reservation.objects.get(pk=self.rid).status, 'confirmed')

    def test_check_in_after_check_out_rejected(self):
        self.client.post(f'{URL}{self.rid}/check-in/')
        self.client.post(f'{URL}{self.rid}/check-out/')
        self.assertEqual(self.client.post(f'{URL}{self.rid}/check-in/').status_code, 409)

    def test_checked_in_reservation_cannot_be_cancelled(self):
        self.client.post(f'{URL}{self.rid}/check-in/')
        res = self.client.patch(f'{URL}{self.rid}/', {'status': 'cancelled'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_unknown_reservation_404_and_auth_required(self):
        res = self.client.post(f'{URL}00000000-0000-0000-0000-000000000000/check-in/')
        self.assertEqual(res.status_code, 404)
        anon = APIClient()
        self.assertEqual(anon.post(f'{URL}{self.rid}/check-in/').status_code, 401)


class AvailabilityBlockAPITests(ReservationBase):
    def test_crud_and_validation(self):
        data = {'property': str(self.property.id), 'start_date': '2030-01-01', 'end_date': '2030-01-05'}
        res = self.client.post('/api/availability-blocks/', data, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        bid = res.data['id']
        res = self.client.post('/api/availability-blocks/', {**data, 'start_date': '2030-02-05', 'end_date': '2030-02-01'}, format='json')
        self.assertEqual(res.status_code, 400)
        res = self.client.patch(f'/api/availability-blocks/{bid}/', {'end_date': '2029-12-31'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.get('/api/availability-blocks/').data['count'], 1)
        self.assertEqual(self.client.delete(f'/api/availability-blocks/{bid}/').status_code, 204)
