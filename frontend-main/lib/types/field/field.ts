export interface Field {
  id: number;
  no: string;
  square: number;
  pos_top_left_lat: string;
  pos_top_left_lon: string;
  pos_top_right_lat: string;
  pos_top_right_lon: string;
  pos_bottom_left_lat: string;
  pos_bottom_left_lon: string;
  pos_bottom_right_lat: string;
  pos_bottom_right_lon: string;
}

export interface FieldCreate {
  no: string;
  square: number;
  pos_top_left_lat: string;
  pos_top_left_lon: string;
  pos_top_right_lat: string;
  pos_top_right_lon: string;
  pos_bottom_left_lat: string;
  pos_bottom_left_lon: string;
  pos_bottom_right_lat: string;
  pos_bottom_right_lon: string;
}

export interface FieldUpdate {
  no?: string;
  square?: number;
  pos_top_left_lat?: string;
  pos_top_left_lon?: string;
  pos_top_right_lat?: string;
  pos_top_right_lon?: string;
  pos_bottom_left_lat?: string;
  pos_bottom_left_lon?: string;
  pos_bottom_right_lat?: string;
  pos_bottom_right_lon?: string;
}

export interface FieldListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Field[];
}