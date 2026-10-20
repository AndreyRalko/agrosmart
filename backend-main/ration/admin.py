from django.contrib import admin
from .models import Feed, NutritionNorm, Ration, RationFeed

admin.site.register(Feed)
admin.site.register(NutritionNorm)
admin.site.register(Ration)
admin.site.register(RationFeed)