from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('field', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DroneUpload',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('flight_date', models.DateField()),
                ('original_filename', models.CharField(max_length=255)),
                ('file_size_mb', models.FloatField()),
                ('file_type', models.CharField(max_length=20)),
                ('ndvi_image', models.ImageField(upload_to='ndvi/images/')),
                ('ndvi_mean', models.FloatField()),
                ('ndvi_min', models.FloatField()),
                ('ndvi_max', models.FloatField()),
                ('ndvi_std', models.FloatField()),
                ('field', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='drone_uploads', to='field.field')),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
    ]