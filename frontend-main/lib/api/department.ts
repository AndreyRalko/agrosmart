import { api } from './client';
import type { Department, DepartmentCreate, DepartmentUpdate, DepartmentListResponse } from '@/lib/types/department';

export async function getDepartments(): Promise<Department[] | DepartmentListResponse> {
  return api.get<Department[] | DepartmentListResponse>('/department/');
}

export async function createDepartment(data: DepartmentCreate): Promise<Department> {
  return api.post<Department>('/department/', data);
}

export async function updateDepartment(id: number, data: DepartmentUpdate): Promise<Department> {
  return api.patch<Department>(`/department/${id}/`, data);
}

export async function deleteDepartment(id: number): Promise<void> {
  return api.delete<void>(`/department/${id}/`);
}