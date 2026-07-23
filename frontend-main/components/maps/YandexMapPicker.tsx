'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';
import type { FieldMapPolygon } from '@/lib/utils/field-map';

interface Coordinates {
  topLeft: [number, number] | null;
  topRight: [number, number] | null;
  bottomLeft: [number, number] | null;
  bottomRight: [number, number] | null;
}

interface YandexMapPickerProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  fillHeight?: boolean;
  initialCoordinates?: Coordinates;
  existingPolygons?: FieldMapPolygon[];
  onCoordinatesChange: (coords: Coordinates) => void;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function YandexMapPicker({ 
  center = DEFAULT_MAP_CENTER,
  zoom = 14,
  height = '400px',
  fillHeight = false,
  initialCoordinates,
  existingPolygons = [],
  onCoordinatesChange
}: YandexMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const existingPolygonsRef = useRef(existingPolygons);
  const [coordinates, setCoordinates] = useState<Coordinates>(
    initialCoordinates || {
      topLeft: null,
      topRight: null,
      bottomLeft: null,
      bottomRight: null,
    }
  );
  const [currentStep, setCurrentStep] = useState<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'complete'>('topLeft');
  const coordinatesRef = useRef<Coordinates>(coordinates);
  const currentStepRef = useRef(currentStep);

  // Синхронизируем refs с state
  useEffect(() => {
    coordinatesRef.current = coordinates;
    currentStepRef.current = currentStep;
  }, [coordinates, currentStep]);

  useEffect(() => {
    existingPolygonsRef.current = existingPolygons;

    if (mapInstanceRef.current) {
      updateMapMarkers(coordinatesRef.current);
    }
  }, [existingPolygons]);

  // Инициализация начальных координат
  useEffect(() => {
    if (initialCoordinates) {
      setCoordinates(initialCoordinates);
      
      // Определяем текущий шаг на основе заполненных координат
      if (initialCoordinates.topLeft && initialCoordinates.topRight && 
          initialCoordinates.bottomLeft && initialCoordinates.bottomRight) {
        setCurrentStep('complete');
      } else if (initialCoordinates.topLeft && initialCoordinates.topRight && 
                 initialCoordinates.bottomLeft) {
        setCurrentStep('bottomRight');
      } else if (initialCoordinates.topLeft && initialCoordinates.topRight) {
        setCurrentStep('bottomLeft');
      } else if (initialCoordinates.topLeft) {
        setCurrentStep('topRight');
      }
    }
  }, [initialCoordinates]);

  useEffect(() => {
    const loadMap = () => {
      if (!mapRef.current || !window.ymaps) return;

      window.ymaps.ready(() => {
        if (mapInstanceRef.current) return; // Карта уже создана

        mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
          center: center,
          zoom: zoom,
          controls: ['zoomControl', 'typeSelector', 'geolocationControl']
        });

        // Добавляем обработчик клика
        clickListenerRef.current = (e: any) => {
          const coords = e.get('coords') as [number, number];
          handleMapClick(coords);
        };

        mapInstanceRef.current.events.add('click', clickListenerRef.current);

        updateMapMarkers(initialCoordinates || coordinatesRef.current);
      });
    };

    if (!document.getElementById('yandex-maps-script')) {
      const script = document.createElement('script');
      script.id = 'yandex-maps-script';
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&lang=ru_RU`;
      script.async = true;
      document.body.appendChild(script);
      script.onload = loadMap;
    } else if (window.ymaps) {
      loadMap();
    }

    return () => {
      // НЕ удаляем карту при unmount, только при полном закрытии компонента
    };
  }, []); // Пустой массив зависимостей!

  const handleMapClick = (coords: [number, number]) => {
    const currentCoords = coordinatesRef.current;
    const step = currentStepRef.current;

    let newCoords = { ...currentCoords };
    let nextStep = step;

    console.log('Клик на карту:', coords, 'Текущий шаг:', step);

    switch (step) {
      case 'topLeft':
        newCoords.topLeft = coords;
        nextStep = 'topRight';
        console.log('Установлен верхний левый угол:', coords);
        break;
      case 'topRight':
        newCoords.topRight = coords;
        nextStep = 'bottomLeft';
        console.log('Установлен верхний правый угол:', coords);
        break;
      case 'bottomLeft':
        newCoords.bottomLeft = coords;
        nextStep = 'bottomRight';
        console.log('Установлен нижний левый угол:', coords);
        break;
      case 'bottomRight':
        newCoords.bottomRight = coords;
        nextStep = 'complete';
        console.log('Установлен нижний правый угол:', coords);
        break;
      case 'complete':
        // Начинаем заново
        newCoords = {
          topLeft: coords,
          topRight: null,
          bottomLeft: null,
          bottomRight: null,
        };
        nextStep = 'topRight';
        console.log('Сброс. Новый верхний левый угол:', coords);
        break;
    }

    setCoordinates(newCoords);
    setCurrentStep(nextStep);
    onCoordinatesChange(newCoords);
    updateMapMarkers(newCoords);
  };

  const updateMapMarkers = (coords: Coordinates) => {
    if (!mapInstanceRef.current || !window.ymaps) return;

    mapInstanceRef.current.geoObjects.removeAll();

    existingPolygonsRef.current.forEach((polygon) => {
      const existingField = new window.ymaps.Polygon(
        [polygon.coordinates],
        {
          hintContent: polygon.hint,
          balloonContent: polygon.balloon,
        },
        {
          fillColor: '#6B728040',
          strokeColor: '#4B5563',
          strokeWidth: 2,
          opacity: 0.7,
          interactivityModel: 'default#silent',
          zIndex: 100,
        }
      );

      mapInstanceRef.current.geoObjects.add(existingField);

      if (polygon.hint) {
        const coordsList = polygon.coordinates;
        const centerLat = coordsList.reduce((sum, c) => sum + c[0], 0) / coordsList.length;
        const centerLng = coordsList.reduce((sum, c) => sum + c[1], 0) / coordsList.length;

        const label = new window.ymaps.Placemark(
          [centerLat, centerLng],
          { iconContent: polygon.hint.replace('Поле №', '') },
          {
            preset: 'islands#grayStretchyIcon',
            interactivityModel: 'default#silent',
            zIndex: 100,
          }
        );

        mapInstanceRef.current.geoObjects.add(label);
      }
    });

    const addMarker = (position: [number, number] | null, label: string, color: string) => {
      if (!position || !mapInstanceRef.current) return;
      
      const placemark = new window.ymaps.Placemark(
        position,
        {
          balloonContent: label,
          iconContent: label.split(' ')[0] // Первое слово в качестве иконки
        },
        {
          preset: `islands#${color}CircleDotIcon`
        }
      );
      mapInstanceRef.current.geoObjects.add(placemark);
    };

    addMarker(coords.topLeft, '1. Верхний левый', 'blue');
    addMarker(coords.topRight, '2. Верхний правый', 'green');
    addMarker(coords.bottomLeft, '3. Нижний левый', 'orange');
    addMarker(coords.bottomRight, '4. Нижний правый', 'red');

    // Если все точки выбраны, рисуем полигон
    if (coords.topLeft && coords.topRight && coords.bottomLeft && coords.bottomRight) {
      const polygon = new window.ymaps.Polygon(
        [[coords.topLeft, coords.topRight, coords.bottomRight, coords.bottomLeft]],
        {
          hintContent: 'Поле'
        },
        {
          fillColor: '#00FF0030',
          strokeColor: '#00AA00',
          strokeWidth: 3,
          opacity: 0.6,
          zIndex: 200,
        }
      );
      mapInstanceRef.current.geoObjects.add(polygon);
    } else if (coords.topLeft && coords.topRight) {
      // Рисуем линию между первыми двумя точками
      const polyline = new window.ymaps.Polyline(
        [coords.topLeft, coords.topRight],
        {},
        {
          strokeColor: '#0000FF',
          strokeWidth: 2
        }
      );
      mapInstanceRef.current.geoObjects.add(polyline);
    }
  };

  const handleReset = () => {
    const newCoords = {
      topLeft: null,
      topRight: null,
      bottomLeft: null,
      bottomRight: null,
    };
    
    setCoordinates(newCoords);
    setCurrentStep('topLeft');
    onCoordinatesChange(newCoords);
    
    if (mapInstanceRef.current) {
      updateMapMarkers({
        topLeft: null,
        topRight: null,
        bottomLeft: null,
        bottomRight: null,
      });
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 'topLeft': return '1️⃣ Нажмите на карту для выбора верхнего левого угла (синий)';
      case 'topRight': return '2️⃣ Нажмите на карту для выбора верхнего правого угла (зеленый)';
      case 'bottomLeft': return '3️⃣ Нажмите на карту для выбора нижнего левого угла (оранжевый)';
      case 'bottomRight': return '4️⃣ Нажмите на карту для выбора нижнего правого угла (красный)';
      case 'complete': return '✅ Все углы выбраны! Нажмите на карту для начала заново';
    }
  };

  const getStepColor = () => {
    switch (currentStep) {
      case 'topLeft': return 'text-blue-600';
      case 'topRight': return 'text-green-600';
      case 'bottomLeft': return 'text-orange-600';
      case 'bottomRight': return 'text-red-600';
      case 'complete': return 'text-green-600';
    }
  };

  return (
    <div className={fillHeight ? 'flex h-full min-h-0 flex-col' : undefined}>
      <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3">
        <div className={`text-sm font-medium ${getStepColor()}`}>
          {getStepLabel()}
        </div>
        {currentStep !== 'topLeft' && (
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 text-xs font-medium text-red-600 underline hover:text-red-800"
          >
            🔄 Начать заново
          </button>
        )}
      </div>
      
      <div 
        ref={mapRef} 
        style={fillHeight ? { width: '100%' } : { width: '100%', height }}
        className={`overflow-hidden rounded-lg border-2 border-neutral-300 cursor-crosshair ${fillHeight ? 'min-h-0 flex-1' : ''}`}
      />
      
      <div className="mt-3 flex gap-1">
        <div className={`flex-1 h-2 rounded ${coordinates.topLeft ? 'bg-blue-500' : 'bg-neutral-200'}`} />
        <div className={`flex-1 h-2 rounded ${coordinates.topRight ? 'bg-green-500' : 'bg-neutral-200'}`} />
        <div className={`flex-1 h-2 rounded ${coordinates.bottomLeft ? 'bg-orange-500' : 'bg-neutral-200'}`} />
        <div className={`flex-1 h-2 rounded ${coordinates.bottomRight ? 'bg-red-500' : 'bg-neutral-200'}`} />
      </div>
    </div>
  );
}