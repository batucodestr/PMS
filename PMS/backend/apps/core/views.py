from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response


class ProtectedDeleteMixin:
    """Return 409 instead of a server error when PROTECT relations block a delete."""

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'This record is referenced by other records and cannot be deleted.'},
                status=status.HTTP_409_CONFLICT,
            )
