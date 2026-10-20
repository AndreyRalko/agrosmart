from django.db import models


class RationType(models.TextChoices):
    DAIRY = 'dairy', 'Дойные коровы'
    DRY = 'dry', 'Сухостойные коровы'
    HEIFERS = 'heifers', 'Нетели'
    CALVES = 'calves', 'Телята'
    BULLS = 'bulls', 'Быки'
    OTHER = 'other', 'Другое'


class Feed(models.Model):
    name = models.CharField(max_length=255)
    dry_matter = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    energy = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    protein = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    fiber = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    fat = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    ndf = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    starch = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    calcium = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    phosphorus = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class NutritionNorm(models.Model):
    ration_type = models.CharField(max_length=50, choices=RationType.choices, unique=True)
    dry_matter_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    dry_matter_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    energy_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    energy_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    protein_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    protein_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    fiber_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    fiber_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    ndf_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    ndf_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    calcium_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    calcium_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    phosphorus_min = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    phosphorus_max = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.ration_type


class Ration(models.Model):
    name = models.CharField(max_length=255)
    ration_type = models.CharField(max_length=50, choices=RationType.choices, default=RationType.DAIRY)
    animal_group = models.ForeignKey('animal.Animal', null=True, blank=True, on_delete=models.SET_NULL, related_name='rations')
    animal_count = models.IntegerField(default=0)
    date_start = models.DateField()
    date_end = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def get_nutrition(self):
        totals = {
            'total_weight': 0,
            'dry_matter': 0,
            'energy': 0,
            'protein': 0,
            'fiber': 0,
            'fat': 0,
            'ndf': 0,
            'starch': 0,
            'calcium': 0,
            'phosphorus': 0,
            'cost_per_head': 0,
        }
        for rf in self.ration_feeds.select_related('feed').all():
            q = float(rf.quantity_kg)
            totals['total_weight'] += q
            totals['dry_matter'] += q * float(rf.feed.dry_matter) / 100
            totals['energy'] += q * float(rf.feed.energy)
            totals['protein'] += q * float(rf.feed.protein) / 100
            totals['fiber'] += q * float(rf.feed.fiber) / 100
            totals['fat'] += q * float(rf.feed.fat) / 100
            totals['ndf'] += q * float(rf.feed.ndf) / 100
            totals['starch'] += q * float(rf.feed.starch) / 100
            totals['calcium'] += q * float(rf.feed.calcium) / 100 * 1000  # % → доля → кг → г
            totals['phosphorus'] += q * float(rf.feed.phosphorus) / 100 * 1000  # % → доля → кг → г
            totals['cost_per_head'] += q * float(rf.feed.price_per_kg)

        totals['cost_per_group_day'] = totals['cost_per_head'] * self.animal_count
        totals['cost_per_group_30'] = totals['cost_per_head'] * self.animal_count * 30
        return totals
        
    def get_deviations(self):
        try:
            norm = NutritionNorm.objects.get(ration_type=self.ration_type)
        except NutritionNorm.DoesNotExist:
            return []

        nutrition = self.get_nutrition()
        deviations = []
        checks = [
            ('dry_matter', 'Сухое вещество', 'кг', norm.dry_matter_min, norm.dry_matter_max),
            ('energy', 'Обменная энергия', 'МДж', norm.energy_min, norm.energy_max),
            ('protein', 'Сырой протеин', 'кг', norm.protein_min, norm.protein_max),
            ('fiber', 'Клетчатка', 'кг', norm.fiber_min, norm.fiber_max),
            ('ndf', 'NDF', 'кг', norm.ndf_min, norm.ndf_max),
            ('calcium', 'Кальций', 'г', norm.calcium_min, norm.calcium_max),
            ('phosphorus', 'Фосфор', 'г', norm.phosphorus_min, norm.phosphorus_max),
        ]

        for key, label, unit, min_val, max_val in checks:
            if min_val is None and max_val is None:
                continue
            actual = nutrition[key]
            if min_val and actual < float(min_val):
                pct = round((1 - actual / float(min_val)) * 100) if float(min_val) > 0 else 100
                deviations.append({
                    'nutrient': label,
                    'message': f'{label}: ниже рекомендуемого диапазона на {pct}% (факт {round(actual, 2)} {unit}, норма {min_val}–{max_val} {unit}).'
                })
            elif max_val and actual > float(max_val):
                pct = round((actual / float(max_val) - 1) * 100)
                deviations.append({
                    'nutrient': label,
                    'message': f'{label}: выше рекомендуемого диапазона на {pct}% (факт {round(actual, 2)} {unit}, норма {min_val}–{max_val} {unit}).'
                })

        return deviations


class RationFeed(models.Model):
    ration = models.ForeignKey(Ration, on_delete=models.CASCADE, related_name='ration_feeds')
    feed = models.ForeignKey(Feed, on_delete=models.PROTECT, related_name='ration_feeds')
    storage = models.ForeignKey(
        'storage.StorageObject', null=True, blank=True, on_delete=models.PROTECT, related_name='ration_feeds',
    )
    quantity_kg = models.DecimalField(max_digits=8, decimal_places=3)

    class Meta:
        unique_together = ['ration', 'feed']
        constraints = [
            models.UniqueConstraint(
                fields=['ration', 'storage'],
                condition=models.Q(storage__isnull=False),
                name='uniq_ration_storage',
            ),
        ]

    def __str__(self):
        source = self.storage.name if self.storage_id else self.feed.name
        return f'{self.ration.name} — {source}'


def feed_for_storage(storage):
    """Корм справочника для склада: имя склада, питательность — из последнего анализа, если он есть."""
    feed = Feed.objects.filter(name=storage.name).first()
    if feed is None:
        feed = Feed.objects.create(name=storage.name)
    chemistry = storage.chemistry.order_by('-created_at').first()
    if chemistry is None:
        return feed
    copied = {
        'dry_matter': chemistry.dry_matter,
        'energy': chemistry.energy,
        'protein': chemistry.protein,
        'fiber': chemistry.fiber,
        'fat': chemistry.fat,
        'starch': chemistry.starch,
    }
    changed = []
    for field, value in copied.items():
        if value is not None and getattr(feed, field) != value:
            setattr(feed, field, value)
            changed.append(field)
    if changed:
        feed.save(update_fields=changed)
    return feed