from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('animal', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Feed',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('dry_matter', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('energy', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('protein', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('fiber', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('fat', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('ndf', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('starch', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('calcium', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('phosphorus', models.DecimalField(decimal_places=3, default=0, max_digits=6)),
                ('price_per_kg', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='NutritionNorm',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ration_type', models.CharField(choices=[('dairy', 'Дойные коровы'), ('dry', 'Сухостойные коровы'), ('heifers', 'Нетели'), ('calves', 'Телята'), ('bulls', 'Быки'), ('other', 'Другое')], max_length=50, unique=True)),
                ('dry_matter_min', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('dry_matter_max', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('energy_min', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('energy_max', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('protein_min', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('protein_max', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('fiber_min', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('fiber_max', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('ndf_min', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('ndf_max', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('calcium_min', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('calcium_max', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('phosphorus_min', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('phosphorus_max', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Ration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('ration_type', models.CharField(choices=[('dairy', 'Дойные коровы'), ('dry', 'Сухостойные коровы'), ('heifers', 'Нетели'), ('calves', 'Телята'), ('bulls', 'Быки'), ('other', 'Другое')], default='dairy', max_length=50)),
                ('animal_count', models.IntegerField(default=0)),
                ('date_start', models.DateField()),
                ('date_end', models.DateField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('animal_group', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rations', to='animal.animal')),
            ],
        ),
        migrations.CreateModel(
            name='RationFeed',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity_kg', models.DecimalField(decimal_places=3, max_digits=8)),
                ('feed', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='ration_feeds', to='ration.feed')),
                ('ration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ration_feeds', to='ration.ration')),
            ],
            options={
                'unique_together': {('ration', 'feed')},
            },
        ),
    ]