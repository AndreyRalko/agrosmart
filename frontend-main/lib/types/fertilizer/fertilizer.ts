export type NutrientKey = 'N' | 'P2O5' | 'K2O';

export interface NutrientInput {
  available_soil_content: number;
  soil_utilization_coefficient: number;
  mineral_fertilizer_utilization_coefficient: number;
  organic_supply?: number;
}

export interface NutrientResult {
  nutrient_removal: number;
  total_requirement: number;
  from_soil: number;
  deficit: number;
  active_substance_dose: number;
}

export interface FertilizerDoseRequest {
  culture_variety: number;
  planned_yield: number;
  nutrients: Record<NutrientKey, NutrientInput>;
}

export interface FertilizerDoseResponse {
  culture_variety: number;
  planned_yield: number;
  nutrients: Record<NutrientKey, NutrientResult>;
}