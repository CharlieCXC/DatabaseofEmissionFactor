// 排放因子数据接口
export interface EmissionFactor {
  id: string;
  name: string;
  description?: string;
  category: string;
  sub_category?: string;
  unit: string;
  value: number;
  uncertainty?: number;
  data_source: string;
  reference_year?: number;
  geographical_scope: string;
  quality_score?: number;
  temporal_representativeness?: number;
  geographical_representativeness?: number;
  technology_representativeness?: number;
  completeness?: number;
  methodology_description?: string;
  gas_type: string;
  sector?: string;
  activity?: string;
  fuel_type?: string;
  status: 'draft' | 'published' | 'archived';
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// 创建排放因子请求接口
export interface CreateEmissionFactorRequest {
  name: string;
  description?: string;
  category: string;
  sub_category?: string;
  unit: string;
  value: number;
  uncertainty?: number;
  data_source: string;
  reference_year?: number;
  geographical_scope: string;
  quality_score?: number;
  temporal_representativeness?: number;
  geographical_representativeness?: number;
  technology_representativeness?: number;
  completeness?: number;
  methodology_description?: string;
  gas_type: string;
  sector?: string;
  activity?: string;
  fuel_type?: string;
  status?: 'draft' | 'published';
  tags?: string[];
}

// 更新排放因子请求接口
export interface UpdateEmissionFactorRequest extends Partial<CreateEmissionFactorRequest> {
  id: string;
}

// 排放因子查询参数接口
export interface EmissionFactorQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  sub_category?: string;
  gas_type?: string;
  sector?: string;
  activity?: string;
  fuel_type?: string;
  geographical_scope?: string;
  status?: 'draft' | 'published' | 'archived';
  min_quality_score?: number;
  max_quality_score?: number;
  reference_year?: number;
  sort_by?: 'name' | 'value' | 'quality_score' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  tags?: string[];
}

// 分页查询响应接口
export interface EmissionFactorListResponse {
  emission_factors: EmissionFactor[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 质量评分详情接口
export interface QualityScore {
  temporal_representativeness: number;
  geographical_representativeness: number;
  technology_representativeness: number;
  completeness: number;
  overall_score: number;
}

// 排放因子统计接口
export interface EmissionFactorStats {
  total_count: number;
  published_count: number;
  draft_count: number;
  archived_count: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
  gas_types: Array<{
    gas_type: string;
    count: number;
  }>;
  quality_distribution: {
    high: number; // 质量分数 >= 80
    medium: number; // 质量分数 50-79
    low: number; // 质量分数 < 50
  };
}

// 表单选项接口
export interface FormOptions {
  categories: string[];
  subCategories: { [category: string]: string[] };
  units: string[];
  gasTypes: string[];
  sectors: string[];
  activities: string[];
  fuelTypes: string[];
  geographicalScopes: string[];
} 