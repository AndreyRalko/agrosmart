import type { AgroField } from './field';

export interface AgroOperation {
  id: number;
  name: string;
  fields: AgroField[];
  name_ru: string;
  name_kk: string;
}

export interface AgroOperationDetail {
  id: number;
  name: string;
  fields: AgroField[];
  name_ru: string;
  name_kk: string;
  type?: AgroOperationType;
  transportation?: TransportationCoords | null;
  is_transportation?: boolean;
}

export type AgroOperationType = 'standard' | 'transportation';

export interface TransportationCoords {
  point_a_lat: number;
  point_a_lng: number;
  point_b_lat: number;
  point_b_lng: number;
}

export interface AgroOperationCreate {
  name_ru: string;
  name_kk: string;
  type?: AgroOperationType;
  transportation?: TransportationCoords;
}
export interface AgroOperationUpdate {
  name_ru?: string;
  name_kk?: string;
}

export interface AgroOperationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AgroOperation[];
}

export interface AgroOperationDetail {
  id: number;
  name: string;
  fields: AgroField[];
  name_ru: string;
  name_kk: string;
  type?: AgroOperationType;
  transportation?: TransportationCoords | null;
}

export interface TransportationTaskCreate {
  task: number;
  machinery: number | null;
  from_place_name: string | null;
  from_place_x: number;
  from_place_y: number;
  to_place_name: string | null;
  to_place_x: number;
  to_place_y: number;
  description: string | null;
}