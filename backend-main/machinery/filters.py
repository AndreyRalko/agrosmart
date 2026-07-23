import django_filters
from .models import Machinery


class MachineryFilter(django_filters.FilterSet):
    gov_num = django_filters.CharFilter(method="filter_gov_num")

    def filter_gov_num(self, queryset, name, value):
        return queryset.filter(gov_num__istartswith=value)

    class Meta:
        model = Machinery
        fields = ["gov_num"]
