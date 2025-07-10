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
    reliability?: number;
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
   * 批量导入排放因子数据
   */
  async batchImport(data: any[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{
      row: number;
      message: string;
    }>;
  }> {
    const response = await api.post(`${this.baseUrl}/batch-import`, {
      data
    });
    return response.data.data;
  }

  /**
   * 导出排放因子数据
   */
  async exportData(params?: EmissionFactorQueryParams): Promise<EmissionFactor[]> {
    const response = await api.get(`${this.baseUrl}/export`, { params });
    return response.data.data;
  }

  /**
   * 下载导入模板
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/import-template`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 验证导入数据
   */
  async validateImportData(data: any[]): Promise<{
    valid: number;
    invalid: number;
    errors: Array<{
      row: number;
      field: string;
      message: string;
      value: any;
    }>;
  }> {
    const response = await api.post(`${this.baseUrl}/validate-import`, {
      data
    });
    return response.data.data;
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