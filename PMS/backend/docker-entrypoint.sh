#!/bin/sh
set -e

# Sadece web sürecinde (gunicorn) migrate + collectstatic çalıştır.
if [ "$1" = "gunicorn" ]; then
  echo "Running migrations..."
  python manage.py migrate --noinput
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

exec "$@"
