from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('field', '0004_alter_field_id'),
        ('ndvi', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='NdviObservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scene_date', models.DateField()),
                ('scene_id', models.CharField(max_length=160)),
                ('ndvi_mean', models.FloatField()),
                ('cloud_cover', models.FloatField(blank=True, null=True)),
                ('source', models.CharField(default='sentinel-2', max_length=32)),
                ('field', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ndvi_observations', to='field.field')),
            ],
            options={
                'ordering': ['scene_date', 'id'],
                'unique_together': {('field', 'scene_id')},
            },
        ),
    ]
