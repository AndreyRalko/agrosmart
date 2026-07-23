import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notification", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notificationagroopfield",
            name="notification",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="agro_op_field",
                to="notification.notification",
            ),
        ),
    ]
