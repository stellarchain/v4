import { apiEndpoints, getApiV1Data } from '@/services/api';

export interface Project {
  id: number;
  sourceUrl?: string;
  name: string;
  website?: string;
  github?: string;
  description?: string;
  rounds: string[];
  submissions: string[];
  teamSize?: number;
  category?: string;
  totalAwarded?: string;
  awardedSubmissions?: number;
  imageAlt?: string;
  imageSourceUrl?: string;
  imagePublicUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectCollectionView {
  first?: string;
  last?: string;
  next?: string;
  previous?: string;
}

export interface ProjectCollectionResponse {
  member: Project[];
  totalItems: number;
  view?: ProjectCollectionView;
}

export interface ProjectCategory {
  id: number;
  name: string;
}

export interface FetchProjectsParams {
  page?: number;
  itemsPerPage?: number;
  name?: string;
  category?: string;
  sort?: 'default' | 'awarded_asc' | 'awarded_desc' | 'rounds_desc';
}

export async function fetchProjects(params: FetchProjectsParams = {}): Promise<ProjectCollectionResponse> {
  const sort = params.sort || 'default';
  const query = {
    page: params.page ?? 1,
    itemsPerPage: params.itemsPerPage ?? 20,
    name: params.name?.trim() || undefined,
    category: params.category?.trim() || undefined,
    'order[id]': sort === 'default' ? 'asc' : undefined,
    'order[name]': sort === 'default' ? 'asc' : undefined,
    'order[updatedAt]': sort === 'default' ? 'asc' : undefined,
    'order[createdAt]': sort === 'default' ? 'asc' : undefined,
    'order[totalAwardedAmount]': sort === 'awarded_asc' ? 'asc' : sort === 'awarded_desc' ? 'desc' : undefined,
    'order[roundsCount]': sort === 'rounds_desc' ? 'desc' : undefined,
  };
  const data = await getApiV1Data(apiEndpoints.v1.projects(query));
  return {
    member: Array.isArray(data?.member) ? data.member : [],
    totalItems: Number(data?.totalItems || 0),
    view: data?.view || undefined,
  };
}

export async function fetchProjectById(id: string | number): Promise<Project | null> {
  if (!id) return null;
  const data = await getApiV1Data(apiEndpoints.v1.projectById(id));
  return data || null;
}

export async function fetchProjectCategories(): Promise<ProjectCategory[]> {
  const data = await getApiV1Data(apiEndpoints.v1.projectCategories());
  return Array.isArray(data?.member) ? data.member : [];
}
