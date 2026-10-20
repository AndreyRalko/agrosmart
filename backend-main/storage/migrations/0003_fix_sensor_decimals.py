from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('storage', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='storagesensor',
            name='temperature',
            field=models.DecimalField(decimal_places=2, max_digits=6),
        ),
        migrations.AlterField(
            model_name='storagesensor',
            name='humidity',
            field=models.DecimalField(decimal_places=2, max_digits=6),
        ),
    ]