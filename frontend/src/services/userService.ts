import api from './api';
import type {
  User,
  UserRole,
  UserQueryParams,
  UserListResponse,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  UserPermissions
} from '../types/auth';

/**
 * 用户管理服务类
 * 专为管理员提供用户管理功能
 */
class UserService {
  private readonly baseUrl = '/admin/users';

  /**
   * 获取用户列表
   */
  async getUsers(params?: UserQueryParams): Promise<UserListResponse['data']> {
    const response = await api.get(this.baseUrl, { params });
    return response.data.data;
  }

  /**
   * 根据ID获取用户详情
   */
  async getUserById(id: number): Promise<User> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * 创建新用户
   */
  async createUser(data: AdminCreateUserRequest): Promise<User> {
    const response = await api.post(this.baseUrl, data);
    return response.data.data;
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: number, data: AdminUpdateUserRequest): Promise<User> {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * 批量删除用户
   */
  async batchDeleteUsers(ids: number[]): Promise<void> {
    await api.delete(`${this.baseUrl}/batch`, { data: { ids } });
  }

  /**
   * 激活用户
   */
  async activateUser(id: number): Promise<User> {
    const response = await api.patch(`${this.baseUrl}/${id}/activate`);
    return response.data.data;
  }

  /**
   * 禁用用户
   */
  async deactivateUser(id: number): Promise<User> {
    const response = await api.patch(`${this.baseUrl}/${id}/deactivate`);
    return response.data.data;
  }

  /**
   * 封禁用户
   */
  async banUser(id: number, reason?: string): Promise<User> {
    const response = await api.patch(`${this.baseUrl}/${id}/ban`, { reason });
    return response.data.data;
  }

  /**
   * 解封用户
   */
  async unbanUser(id: number): Promise<User> {
    const response = await api.patch(`${this.baseUrl}/${id}/unban`);
    return response.data.data;
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(id: number, newPassword?: string): Promise<{ password: string }> {
    const response = await api.patch(`${this.baseUrl}/${id}/reset-password`, {
      new_password: newPassword
    });
    return response.data.data;
  }

  /**
   * 更新用户角色
   */
  async updateUserRole(id: number, role: UserRole): Promise<User> {
    const response = await api.patch(`${this.baseUrl}/${id}/role`, { role });
    return response.data.data;
  }

  /**
   * 更新用户权限
   */
  async updateUserPermissions(id: number, permissions: UserPermissions): Promise<User> {
    const response = await api.patch(`${this.baseUrl}/${id}/permissions`, { permissions });
    return response.data.data;
  }

  /**
   * 强制用户登出
   */
  async forceLogoutUser(id: number): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/force-logout`);
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<{
    total_users: number;
    active_users: number;
    inactive_users: number;
    banned_users: number;
    pending_users: number;
    roles: Array<{ role: UserRole; count: number }>;
    organizations: Array<{ organization: string; count: number }>;
    recent_logins: number;
    new_registrations_today: number;
    new_registrations_week: number;
  }> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data.data;
  }

  /**
   * 获取用户活动日志
   */
  async getUserActivityLog(id: number, limit?: number): Promise<Array<{
    id: number;
    action: string;
    description: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
  }>> {
    const response = await api.get(`${this.baseUrl}/${id}/activity-log`, {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * 获取所有可用角色
   */
  async getAvailableRoles(): Promise<Array<{
    value: UserRole;
    label: string;
    description: string;
    permissions: string[];
  }>> {
    const response = await api.get('/admin/roles');
    return response.data.data;
  }

  /**
   * 获取可用权限列表
   */
  async getAvailablePermissions(): Promise<Array<{
    key: string;
    name: string;
    description: string;
    category: string;
  }>> {
    const response = await api.get('/admin/permissions');
    return response.data.data;
  }

  /**
   * 导出用户数据
   */
  async exportUsers(params?: UserQueryParams, format: 'csv' | 'xlsx' = 'xlsx'): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/export`, {
      params: { ...params, format },
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 批量导入用户
   */
  async importUsers(file: File, options?: {
    update_existing?: boolean;
    send_welcome_email?: boolean;
    default_role?: UserRole;
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
    return response.data.data;
  }

  /**
   * 获取用户导入模板
   */
  async getUserImportTemplate(format: 'csv' | 'xlsx' = 'xlsx'): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/import-template`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(id: number): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/send-welcome-email`);
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(id: number): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/send-password-reset`);
  }

  /**
   * 获取用户登录历史
   */
  async getUserLoginHistory(id: number, limit?: number): Promise<Array<{
    id: number;
    ip_address: string;
    user_agent: string;
    device_info: any;
    location?: string;
    success: boolean;
    failure_reason?: string;
    created_at: string;
  }>> {
    const response = await api.get(`${this.baseUrl}/${id}/login-history`, {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * 检查用户名是否可用
   */
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const response = await api.get(`${this.baseUrl}/check-username`, {
      params: { username }
    });
    return response.data.data;
  }

  /**
   * 检查邮箱是否可用
   */
  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    const response = await api.get(`${this.baseUrl}/check-email`, {
      params: { email }
    });
    return response.data.data;
  }

  /**
   * 模拟用户登录（管理员功能）
   */
  async impersonateUser(id: number): Promise<{
    access_token: string;
    expires_in: string;
  }> {
    const response = await api.post(`${this.baseUrl}/${id}/impersonate`);
    return response.data.data;
  }
}

// 创建服务实例
const userService = new UserService();

export default userService; 