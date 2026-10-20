from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='StorageObject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('location', models.CharField(max_length=255)),
                ('storage_type', models.CharField(choices=[('warehouse', 'Склад'), ('trench', 'Траншея'), ('grain', 'Зерносклад')], max_length=50)),
                ('feed_type', models.CharField(choices=[('hay', 'Сено'), ('silage', 'Силос'), ('grain', 'Зерно'), ('other', 'Другое')], max_length=50)),
                ('storage_method', models.CharField(blank=True, choices=[('floor', 'Напольное хранение'), ('rack', 'Стеллажное хранение'), ('bulk', 'Насыпное хранение')], max_length=50)),
                ('current_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('max_capacity', models.DecimalField(decimal_places=2, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='StorageSensor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('temperature', models.DecimalField(decimal_places=1, max_digits=5)),
                ('humidity', models.DecimalField(decimal_places=1, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('storage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sensors', to='storage.storageobject')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FeedChemistry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dry_matter', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('protein', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('fat', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('fiber', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('ash', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('energy', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('storage', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chemistry', to='storage.storageobject')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]