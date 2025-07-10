import api from './api';
import type {
  EmissionFactor,
  CreateEmissionFactorRequest,
  UpdateEmissionFactorRequest,
  EmissionFactorQueryParams,
  EmissionFactorListResponse,
  EmissionFactorStats,
  FormOptions,
  QualityScore
} from '../types/emission-factor';

/**
 * 排放因子服务类
 */
class EmissionFactorService {
  private readonly baseUrl = '/emission-factors';

  /**
   * 获取排放因子列表
   */
  async getEmissionFactors(params?: EmissionFactorQueryParams): Promise<EmissionFactorListResponse> {
    const response = await api.get(this.baseUrl, { params });
    return response.data.data;
  }

  /**
   * 根据ID获取排放因子详情
   */
  async getEmissionFactorById(id: string): Promise<EmissionFactor> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * 创建新的排放因子
   */
  async createEmissionFactor(data: CreateEmissionFactorRequest): Promise<EmissionFactor> {
    const response = await api.post(this.baseUrl, data);
    return response.data.data;
  }

  /**
   * 更新排放因子
   */
  async updateEmissionFactor(data: UpdateEmissionFactorRequest): Promise<EmissionFactor> {
    const { id, ...updateData } = data;
    const response = await api.put(`${this.baseUrl}/${id}`, updateData);
    return response.data.data;
  }

  /**
   * 删除排放因子
   */
  async deleteEmissionFactor(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * 批量删除排放因子
   */
  async batchDeleteEmissionFactors(ids: string[]): Promise<void> {
    await api.delete(`${this.baseUrl}/batch`, { data: { ids } });
  }

  /**
   * 发布排放因子（将状态设为published）
   */
  async publishEmissionFactor(id: string): Promise<EmissionFactor> {
    const response = await api.patch(`${this.baseUrl}/${id}/publish`);
    return response.data.data;
  }

  /**
   * 归档排放因子（将状态设为archived）
   */
  async archiveEmissionFactor(id: string): Promise<EmissionFactor> {
    const response = await api.patch(`${this.baseUrl}/${id}/archive`);
    return response.data.data;
  }

  /**
   * 克隆排放因子
   */
  async cloneEmissionFactor(id: string, newName?: string): Promise<EmissionFactor> {
    const response = await api.post(`${this.baseUrl}/${id}/clone`, {
      name: newName
    });
    return response.data.data;
  }

  /**
   * 计算质量评分
   */
  async calculateQualityScore(data: {
    temporal_representativeness: number;
    geographical_representativeness: number;
    technology_representativeness: number;
    completeness: number;
  }): Promise<QualityScore> {
    const response = await api.post(`${this.baseUrl}/quality-score`, data);
    return response.data.data;
  }

  /**
   * 获取排放因子统计信息
   */
  async getStats(): Promise<EmissionFactorStats> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  /**
   * 获取表单选项数据
   */
  async getFormOptions(): Promise<FormOptions> {
    const response = await api.get(`${this.baseUrl}/form-options`);
    return response.data.data;
  }

  /**
   * 搜索排放因子（模糊匹配）
   */
  async searchEmissionFactors(query: string, limit?: number): Promise<EmissionFactor[]> {
    const response = await api.get(`${this.baseUrl}/search`, {
      params: { q: query, limit }
    });
    return response.data.data;
  }

  /**
   * 获取相似的排放因子
   */
  async getSimilarEmissionFactors(id: string, limit?: number): Promise<EmissionFactor[]> {
    const response = await api.get(`${this.baseUrl}/${id}/similar`, {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * 导出排放因子数据
   */
  async exportEmissionFactors(params?: EmissionFactorQueryParams, format: 'csv' | 'xlsx' | 'json' = 'xlsx'): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/export`, {
      params: { ...params, format },
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 导入排放因子数据
   */
  async importEmissionFactors(file: File, options?: {
    skip_duplicates?: boolean;
    update_existing?: boolean;
  }): Promise<{
    success_count: number;
    error_count: number;
    errors: Array<{ row: number; message: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await api.post(`${this.baseUrl}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  }

  /**
   * 获取导入模板
   */
  async getImportTemplate(format: 'csv' | 'xlsx' = 'xlsx'): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/import-template`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 验证排放因子数据
   */
  async validateEmissionFactor(data: CreateEmissionFactorRequest): Promise<{
    valid: boolean;
    errors: Array<{ field: string; message: string }>;
    warnings: Array<{ field: string; message: string }>;
  }> {
    const response = await api.post(`${this.baseUrl}/validate`, data);
    return response.data.data!;
  }

  /**
   * 获取版本历史
   */
  async getVersionHistory(id: string): Promise<Array<{
    version: number;
    changes: string[];
    created_at: string;
    created_by: string;
  }>> {
    const response = await api.get(`${this.baseUrl}/${id}/versions`);
    return response.data.data!;
  }

  /**
   * 恢复到指定版本
   */
  async restoreVersion(id: string, version: number): Promise<EmissionFactor> {
    const response = await api.post(`${this.baseUrl}/${id}/restore/${version}`);
    return response.data.data;
  }
}

// 创建服务实例
const emissionFactorService = new EmissionFactorService();

export default emissionFactorService; 