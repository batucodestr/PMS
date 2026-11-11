from datetime import timedelta

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken


class AuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('staff', 'staff@example.com', 'S3cret-pass!')

    def _login(self, password='S3cret-pass!'):
        return self.client.post('/api/accounts/login/', {'username': 'staff', 'password': password})

    def test_login_returns_tokens(self):
        res = self._login()
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_login_with_invalid_credentials(self):
        res = self._login('wrong-password')
        self.assertEqual(res.status_code, 401)
        self.assertNotIn('access', res.data)

    def test_token_refresh(self):
        refresh = self._login().data['refresh']
        res = self.client.post('/api/accounts/token/refresh/', {'refresh': refresh})
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)

    def test_token_refresh_with_invalid_token(self):
        res = self.client.post('/api/accounts/token/refresh/', {'refresh': 'garbage'})
        self.assertEqual(res.status_code, 401)


class JWTProtectionTests(APITestCase):
    url = '/api/properties/'

    def setUp(self):
        self.user = User.objects.create_user('staff', 'staff@example.com', 'S3cret-pass!')

    def test_no_token_is_rejected(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_valid_token_is_accepted(self):
        token = AccessToken.for_user(self.user)
        res = self.client.get(self.url, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(res.status_code, 200)

    def test_invalid_token_is_rejected(self):
        res = self.client.get(self.url, HTTP_AUTHORIZATION='Bearer not-a-token')
        self.assertEqual(res.status_code, 401)

    def test_expired_token_is_rejected(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(lifetime=-timedelta(minutes=1))
        res = self.client.get(self.url, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(res.status_code, 401)

    def test_all_resource_endpoints_require_auth(self):
        for path in ('guests', 'reservations', 'housekeeping', 'general-tasks',
                     'availability-blocks', 'property-images'):
            self.assertEqual(self.client.get(f'/api/{path}/').status_code, 401, path)
