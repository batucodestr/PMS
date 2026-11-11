from django.db import migrations


class Migration(migrations.Migration):
    """Boş: check_in_time/check_out_time 0005'te tamamen kaldırılıyor.

    Eskiden TimeField -> DateTimeField çevirisi yapıyordu; PostgreSQL bunu
    cast edemediği için (ve alanlar zaten siliniyor) işlemler kaldırıldı.
    """

    dependencies = [
        ('properties', '0003_property_created_at_property_updated_at_and_more'),
    ]

    operations = []
