from django.urls import path
from .views import (
    RationListView, RationDetailView, RationStatsView,
    RationFeedView, RationFeedDetailView, RationNutritionView,
    FeedListView, FeedDetailView,
    NutritionNormView, NutritionNormDetailView,
    RationCostChartView, RationFeedStructureView,
)

urlpatterns = [
    path('', RationListView.as_view(), name='ration-list'),
    path('stats/', RationStatsView.as_view(), name='ration-stats'),
    path('charts/costs/', RationCostChartView.as_view(), name='ration-cost-chart'),
    path('charts/feed-structure/', RationFeedStructureView.as_view(), name='ration-feed-structure'),
    path('<int:pk>/', RationDetailView.as_view(), name='ration-detail'),
    path('<int:pk>/feeds/', RationFeedView.as_view(), name='ration-feeds'),
    path('<int:pk>/feeds/<int:feed_pk>/', RationFeedDetailView.as_view(), name='ration-feed-detail'),
    path('<int:pk>/nutrition/', RationNutritionView.as_view(), name='ration-nutrition'),
    path('feeds/', FeedListView.as_view(), name='feed-list'),
    path('feeds/<int:pk>/', FeedDetailView.as_view(), name='feed-detail'),
    path('norms/', NutritionNormView.as_view(), name='nutrition-norms'),
    path('norms/<int:pk>/', NutritionNormDetailView.as_view(), name='nutrition-norm-detail'),
]