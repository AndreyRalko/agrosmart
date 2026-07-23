import type { Field } from '@/lib/types/field/field';

export interface FieldMapPolygon {
  coordinates: [number, number][];
  hint?: string;
  balloon?: string;
  fieldId?: number;
}

export function parseFieldCoordinate(lat: string, lon: string): [number, number] | null {
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (!isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0) {
    return [latNum, lonNum];
  }

  return null;
}

export function buildFieldPolygons(fields: Field[]): FieldMapPolygon[] {
  const polygons: FieldMapPolygon[] = [];

  fields.forEach((field) => {
    const topLeft = parseFieldCoordinate(field.pos_top_left_lat, field.pos_top_left_lon);
    const topRight = parseFieldCoordinate(field.pos_top_right_lat, field.pos_top_right_lon);
    const bottomLeft = parseFieldCoordinate(field.pos_bottom_left_lat, field.pos_bottom_left_lon);
    const bottomRight = parseFieldCoordinate(field.pos_bottom_right_lat, field.pos_bottom_right_lon);

    if (topLeft && topRight && bottomLeft && bottomRight) {
      polygons.push({
        coordinates: [topLeft, topRight, bottomRight, bottomLeft],
        hint: `Поле №${field.no}`,
        balloon: `<strong>Поле №${field.no}</strong><br/>Площадь: ${field.square} га`,
        fieldId: field.id,
      });
    }
  });

  return polygons;
}
