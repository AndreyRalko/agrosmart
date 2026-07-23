import django_filters
from .models import Animal


class AnimalFilter(django_filters.FilterSet):
    tag = django_filters.CharFilter(method="filter_tag")

    def filter_tag(self, queryset, name, value):
        return queryset.filter(tag__istartswith=value)

    class Meta:
        model = Animal
        fields = ["tag"]
