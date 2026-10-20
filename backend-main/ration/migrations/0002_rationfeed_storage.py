import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('storage', '0001_initial'),
        ('ration', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='rationfeed',
            name='storage',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='ration_feeds',
                to='storage.storageobject',
            ),
        ),
        migrations.AddConstraint(
            model_name='rationfeed',
            constraint=models.UniqueConstraint(
                condition=models.Q(storage__isnull=False),
                fields=('ration', 'storage'),
                name='uniq_ration_storage',
            ),
        ),
    ]
