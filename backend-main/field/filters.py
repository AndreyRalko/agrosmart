import django_filters
from .models import Field


class FieldFilter(django_filters.FilterSet):
    no = django_filters.CharFilter(method="filter_no")

    def filter_no(self, queryset, name, value):
        return queryset.filter(no__istartswith=value)

    class Meta:
        model = Field
        fields = ["no"]
