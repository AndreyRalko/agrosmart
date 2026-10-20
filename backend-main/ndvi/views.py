import logging
from datetime import date

from drf_spectacular.utils import extend_schema, OpenApiTypes, OpenApiParameter
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

logger = logging.getLogger(__name__)

from field.models import Field

from .models import DroneUpload
from .preview import build_ndvi_map, get_field_history
from .serializers import DroneUploadSerializer, DroneUploadCreateSerializer
from .services import save_drone_upload
from .sentinel import get_sentinel_image


class DroneUploadView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ndvi"

    @extend_schema(
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {
                    "file": {"type": "string", "format": "binary"},
                    "field": {"type": "integer"},
                    "flight_date": {"type": "string", "format": "date"},
                },
                "required": ["file", "field", "flight_date"],
            }
        },
        responses={201: DroneUploadSerializer},
    )
    def post(self, request):
        serializer = DroneUploadCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        file = serializer.validated_data['file']
        if not file.name.endswith((".tif", ".tiff")):
            return Response(
                {"error": "Только GeoTIFF файлы (.tif, .tiff)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            upload = save_drone_upload(
                file=file,
                field=serializer.validated_data['field'],
                flight_date=serializer.validated_data['flight_date'],
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except Exception as e:
            return Response(
                {"error": f"Ошибка обработки: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            DroneUploadSerializer(upload, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        parameters=[
            OpenApiParameter(name='field', type=OpenApiTypes.INT, required=False, description='Filter by field ID'),
        ],
        responses={200: DroneUploadSerializer(many=True)},
    )
    def get(self, request):
        field_id = request.query_params.get('field')
        qs = DroneUpload.objects.select_related('field').all()
        if field_id:
            qs = qs.filter(field_id=field_id)
        return Response(
            DroneUploadSerializer(qs, many=True, context={'request': request}).data
        )

class NdviMapView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ndvi"

    @extend_schema(tags=["ndvi"])
    def get(self, request):
        raw = request.query_params.get("date")
        try:
            day = date.fromisoformat(raw) if raw else date.today()
        except ValueError:
            return Response({"error": "Некорректная дата"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            return Response(build_ndvi_map(day))
        except ValueError as exc:
            return Response({"error": str(exc), "fields": []}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("NDVI map render failed")
            return Response(
                {"error": "Не удалось получить снимок Sentinel-2", "fields": []},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class NdviHistoryView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ndvi"

    @extend_schema(tags=["ndvi"])
    def get(self, request):
        raw = request.query_params.get("field")
        try:
            field_id = int(raw)
        except (TypeError, ValueError):
            return Response({"error": "Укажите поле"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            return Response(get_field_history(field_id))
        except Field.DoesNotExist:
            return Response({"error": "Поле не найдено"}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            logger.exception("NDVI history failed")
            return Response({"error": "Не удалось собрать историю NDVI"}, status=status.HTTP_502_BAD_GATEWAY)


class SentinelDownloadView(APIView):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_key = "ndvi"

    @extend_schema(tags=['ndvi'])
    def post(self, request):
        field_id = request.data.get('field')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        try:
            field = Field.objects.get(id=field_id)
            result = get_sentinel_image(field, start_date, end_date)
        except Field.DoesNotExist:
            return Response({"error": "Field not found"}, status=404)
        except ValueError as e:
            return Response({"error": str(e)}, status=422)

        return Response({
            "title": result['title'],
            "cloud_cover": result['cloudcoverpercentage'],
            "date": result['beginposition'].date().isoformat(),
        })