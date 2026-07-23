'use client';

import { useEffect, useRef } from 'react';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

interface YandexMapProps {
  center?: [number, number];
  zoom?: number;
  polygons?: Array<{
    coordinates: [number, number][];
    hint?: string;
    balloon?: string;
    fieldId?: number;
  }>;
  height?: string;
  onPolygonClick?: (fieldId: number) => void;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function YandexMap({ 
  center = DEFAULT_MAP_CENTER,
  zoom = 10,
  polygons = [],
  height = '400px',
  onPolygonClick
}: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    centerRef.current = center;
    zoomRef.current = zoom;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(center, zoom);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!document.getElementById('yandex-maps-script')) {
      const script = document.createElement('script');
      script.id = 'yandex-maps-script';
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&lang=ru_RU`;
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        initMap();
      };
    } else if (window.ymaps) {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && window.ymaps) {
      updateMapObjects();
    }
  }, [polygons]);

  const updateMapObjects = () => {
    if (!mapInstanceRef.current || !window.ymaps) return;

    // Очищаем карту
    mapInstanceRef.current.geoObjects.removeAll();
    
    // Добавляем полигоны
    polygons.forEach((polygon, index) => {
      const poly = new window.ymaps.Polygon(
        [polygon.coordinates],
        {
          hintContent: polygon.hint,
          balloonContent: polygon.balloon
        },
        {
          fillColor: '#00AA0040',
          strokeColor: '#00AA00',
          strokeWidth: 2,
          opacity: 0.7,
          strokeStyle: 'solid'
        }
      );

      // Добавляем эффект наведения
      poly.events.add('mouseenter', function () {
        poly.options.set('fillColor', '#00FF0060');
        poly.options.set('strokeWidth', 3);
      });

      poly.events.add('mouseleave', function () {
        poly.options.set('fillColor', '#00AA0040');
        poly.options.set('strokeWidth', 2);
      });

      // Добавляем обработчик клика
      if (onPolygonClick && polygon.fieldId) {
        poly.events.add('click', function () {
          onPolygonClick(polygon.fieldId!);
        });
        // Меняем курсор на pointer при наведении
        poly.options.set('cursor', 'pointer');
      }

      mapInstanceRef.current.geoObjects.add(poly);

      // Добавляем текстовую метку с номером поля в центре
      if (polygon.hint) {
        const coords = polygon.coordinates;
        const centerLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
        const centerLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

        const label = new window.ymaps.Placemark(
          [centerLat, centerLng],
          {
            iconContent: polygon.hint.replace('Поле №', '')
          },
          {
            preset: 'islands#greenStretchyIcon',
            cursor: onPolygonClick ? 'pointer' : 'default'
          }
        );

        // Клик на метку тоже открывает редактирование
        if (onPolygonClick && polygon.fieldId) {
          label.events.add('click', function () {
            onPolygonClick(polygon.fieldId!);
          });
        }

        mapInstanceRef.current.geoObjects.add(label);
      }
    });
  };

  const initMap = () => {
    if (!mapRef.current || !window.ymaps) return;

    window.ymaps.ready(() => {
      if (mapInstanceRef.current) return; // Карта уже создана

      mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
        center: centerRef.current,
        zoom: zoomRef.current,
        controls: ['zoomControl', 'fullscreenControl', 'geolocationControl', 'typeSelector']
      });

      updateMapObjects();
    });
  };

  return (
    <div 
      ref={mapRef} 
      style={{ width: '100%', height }}
      className="rounded-lg overflow-hidden"
    />
  );
}