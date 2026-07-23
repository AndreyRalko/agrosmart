from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notification", "0002_alter_notificationagroopfield_notification"),
    ]

    operations = [
        migrations.AddField(
            model_name="notificationagroopfield",
            name="checked_conditions",
            field=models.JSONField(default=list),
        ),
    ]
