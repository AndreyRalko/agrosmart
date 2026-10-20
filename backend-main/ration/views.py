from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.drf_permissions import ModulePermission
from drf_spectacular.utils import extend_schema

from .models import Feed, NutritionNorm, Ration, RationFeed
from .serializers import (
    FeedSerializer, NutritionNormSerializer,
    RationSerializer, RationWriteSerializer, RationFeedSerializer
)


class RationStatsView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def get(self, request):
        active_rations = Ration.objects.filter(is_active=True)
        total_active = active_rations.count()
        groups_on_feeding = active_rations.exclude(animal_group=None).count()

        costs = []
        total_30_days = 0
        deviations_count = 0

        for r in active_rations:
            nutrition = r.get_nutrition()
            costs.append(nutrition['cost_per_head'])
            total_30_days += nutrition['cost_per_group_30']
            if r.get_deviations():
                deviations_count += 1

        avg_cost = round(sum(costs) / len(costs), 2) if costs else 0

        return Response({
            'active_rations': total_active,
            'groups_on_feeding': groups_on_feeding,
            'avg_cost_per_head': avg_cost,
            'total_cost_30_days': round(total_30_days, 2),
            'rations_with_deviations': deviations_count,
        })


class RationListView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def get(self, request):
        rations = Ration.objects.prefetch_related('ration_feeds__feed', 'ration_feeds__storage').all()
        return Response(RationSerializer(rations, many=True).data)

    @extend_schema(tags=['ration'])
    def post(self, request):
        serializer = RationWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        ration = serializer.save()
        return Response(RationSerializer(ration).data, status=status.HTTP_201_CREATED)


class RationDetailView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    def get_object(self, pk):
        try:
            return Ration.objects.prefetch_related('ration_feeds__feed', 'ration_feeds__storage').get(pk=pk)
        except Ration.DoesNotExist:
            return None

    @extend_schema(tags=['ration'])
    def get(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(RationSerializer(obj).data)

    @extend_schema(tags=['ration'])
    def patch(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = RationWriteSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = serializer.save()
        return Response(RationSerializer(obj).data)

    @extend_schema(tags=['ration'])
    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RationFeedView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def post(self, request, pk):
        try:
            ration = Ration.objects.get(pk=pk)
        except Ration.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = RationFeedSerializer(data=request.data, context={'ration': ration})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(ration=ration)
        return Response(RationSerializer(ration).data, status=status.HTTP_201_CREATED)


class RationFeedDetailView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def patch(self, request, pk, feed_pk):
        try:
            rf = RationFeed.objects.get(ration_id=pk, id=feed_pk)
        except RationFeed.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = RationFeedSerializer(rf, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        ration = Ration.objects.prefetch_related('ration_feeds__feed', 'ration_feeds__storage').get(pk=pk)
        return Response(RationSerializer(ration).data)

    @extend_schema(tags=['ration'])
    def delete(self, request, pk, feed_pk):
        try:
            rf = RationFeed.objects.get(ration_id=pk, id=feed_pk)
        except RationFeed.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        rf.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RationNutritionView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def get(self, request, pk):
        try:
            ration = Ration.objects.prefetch_related('ration_feeds__feed', 'ration_feeds__storage').get(pk=pk)
        except Ration.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        nutrition = ration.get_nutrition()
        deviations = ration.get_deviations()

        try:
            norm = NutritionNorm.objects.get(ration_type=ration.ration_type)
            norm_data = NutritionNormSerializer(norm).data
        except NutritionNorm.DoesNotExist:
            norm_data = None

        return Response({
            'nutrition': nutrition,
            'norm': norm_data,
            'deviations': deviations,
            'deviation_count': len(deviations),
        })


class FeedListView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def get(self, request):
        feeds = Feed.objects.all()
        return Response(FeedSerializer(feeds, many=True).data)

    @extend_schema(tags=['ration'])
    def post(self, request):
        serializer = FeedSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FeedDetailView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    def get_object(self, pk):
        try:
            return Feed.objects.get(pk=pk)
        except Feed.DoesNotExist:
            return None

    @extend_schema(tags=['ration'])
    def get(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(FeedSerializer(obj).data)

    @extend_schema(tags=['ration'])
    def patch(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = FeedSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(tags=['ration'])
    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NutritionNormView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def get(self, request):
        norms = NutritionNorm.objects.all()
        return Response(NutritionNormSerializer(norms, many=True).data)

    @extend_schema(tags=['ration'])
    def post(self, request):
        serializer = NutritionNormSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class NutritionNormDetailView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def patch(self, request, pk):
        try:
            norm = NutritionNorm.objects.get(pk=pk)
        except NutritionNorm.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = NutritionNormSerializer(norm, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class RationCostChartView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def get(self, request):
        rations = Ration.objects.prefetch_related('ration_feeds__feed', 'ration_feeds__storage').filter(is_active=True)
        data = []
        for r in rations:
            nutrition = r.get_nutrition()
            data.append({
                'id': r.id,
                'name': r.name,
                'cost_per_head': round(nutrition['cost_per_head'], 2),
            })
        return Response(data)


class RationFeedStructureView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ration"

    @extend_schema(tags=['ration'])
    def get(self, request):
        ration_id = request.query_params.get('ration')
        rations = Ration.objects.prefetch_related('ration_feeds__feed', 'ration_feeds__storage')
        if ration_id:
            rations = rations.filter(id=ration_id)
        else:
            rations = rations.filter(is_active=True)

        feed_totals = {}
        for ration in rations:
            for rf in ration.ration_feeds.all():
                name = rf.feed.name
                cost = float(rf.quantity_kg) * float(rf.feed.price_per_kg)
                if name in feed_totals:
                    feed_totals[name] += cost
                else:
                    feed_totals[name] = cost

        data = [
            {'feed': name, 'cost': round(cost, 2)}
            for name, cost in sorted(feed_totals.items(), key=lambda x: x[1], reverse=True)
        ]
        return Response(data)