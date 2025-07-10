import api, { getDeviceInfo } from './api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserQueryParams,
  UserListResponse,
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  User,
  ApiResponse,
} from '../types/auth';

class AuthService {
  /**
   * 用户登录
   */
  async login(credentials: Omit<LoginRequest, 'device_info'>): Promise<LoginResponse> {
    const deviceInfo = getDeviceInfo();
    
    const response = await api.post<LoginResponse>('/auth/login', {
      ...credentials,
      device_info: deviceInfo,
    });

    // 保存认证信息到本地存储
    if (response.data.success && response.data.data) {
      const { tokens, user } = response.data.data;
      this.saveAuthData(tokens.access_token, tokens.refresh_token, user);
    }

    return response.data;
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', userData);
    return response.data;
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // 无论API调用是否成功，都清除本地存储
      this.clearAuthData();
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });

    // 更新本地存储的令牌
    if (response.data.success && response.data.data) {
      const { tokens } = response.data.data;
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }
    }

    return response.data;
  }

  /**
   * 获取当前用户信息
   */
  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/profile');
    
    if (response.data.success && response.data.data) {
      const user = response.data.data.user;
      // 更新本地存储的用户信息
      localStorage.setItem('user_info', JSON.stringify(user));
      return user;
    }

    throw new Error('Failed to get user profile');
  }

  /**
   * 更新用户信息
   */
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await api.put<ApiResponse<{ user: User }>>('/auth/profile', data);
    
    if (response.data.success && response.data.data) {
      const user = response.data.data.user;
      // 更新本地存储的用户信息
      localStorage.setItem('user_info', JSON.stringify(user));
      return user;
    }

    throw new Error('Failed to update profile');
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    const response = await api.post<ApiResponse>('/auth/change-password', data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to change password');
    }
  }

  /**
   * 获取用户列表（管理员功能）
   */
  async getUsers(params: UserQueryParams = {}): Promise<UserListResponse> {
    const response = await api.get<UserListResponse>('/auth/users', { params });
    return response.data;
  }

  /**
   * 创建用户（管理员功能）
   */
  async createUser(userData: AdminCreateUserRequest): Promise<User> {
    const response = await api.post<ApiResponse<{ user: User }>>('/auth/users', userData);
    
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }

    throw new Error('Failed to create user');
  }

  /**
   * 更新用户（管理员功能）
   */
  async updateUser(userId: number, data: AdminUpdateUserRequest): Promise<User> {
    const response = await api.put<ApiResponse<{ user: User }>>(`/auth/users/${userId}`, data);
    
    if (response.data.success && response.data.data) {
      return response.data.data.user;
    }

    throw new Error('Failed to update user');
  }

  /**
   * 删除用户（管理员功能）
   */
  async deleteUser(userId: number): Promise<void> {
    const response = await api.delete<ApiResponse>(`/auth/users/${userId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete user');
    }
  }

  /**
   * 重置用户密码（管理员功能）
   */
  async resetUserPassword(userId: number): Promise<{ temporaryPassword: string }> {
    const response = await api.post<ApiResponse<{ temporaryPassword: string }>>(
      `/auth/users/${userId}/reset-password`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to reset user password');
  }

  /**
   * 锁定/解锁用户（管理员功能）
   */
  async toggleUserLock(userId: number, locked: boolean): Promise<void> {
    const response = await api.post<ApiResponse>(`/auth/users/${userId}/toggle-lock`, {
      locked,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to toggle user lock');
    }
  }

  /**
   * 检查认证状态
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const user = this.getStoredUser();
    return !!(token && user);
  }

  /**
   * 获取存储的用户信息
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user_info');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to parse stored user info:', error);
      return null;
    }
  }

  /**
   * 获取存储的访问令牌
   */
  getStoredToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * 获取存储的刷新令牌
   */
  getStoredRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * 保存认证数据到本地存储
   */
  private saveAuthData(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_info', JSON.stringify(user));
  }

  /**
   * 清除本地存储的认证数据
   */
  private clearAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
  }

  /**
   * 检查用户权限
   */
  hasPermission(permission: string, user?: User): boolean {
    const currentUser = user || this.getStoredUser();
    
    if (!currentUser) {
      return false;
    }

    // 管理员拥有所有权限
    if (currentUser.role === 'admin') {
      return true;
    }

    // 检查具体权限
    return currentUser.permissions[permission] === true;
  }

  /**
   * 检查用户角色
   */
  hasRole(roles: string | string[], user?: User): boolean {
    const currentUser = user || this.getStoredUser();
    
    if (!currentUser) {
      return false;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(currentUser.role);
  }

  /**
   * 获取用户显示名称
   */
  getUserDisplayName(user?: User): string {
    const currentUser = user || this.getStoredUser();
    
    if (!currentUser) {
      return 'Unknown User';
    }

    return currentUser.full_name || currentUser.username || currentUser.email;
  }

  /**
   * 获取用户角色显示名称
   */
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      admin: '管理员',
      editor: '编辑员',
      viewer: '查看员',
      user: '普通用户',
    };

    return roleNames[role] || role;
  }

  /**
   * 获取用户状态显示名称
   */
  getStatusDisplayName(status: string): string {
    const statusNames: Record<string, string> = {
      active: '活跃',
      inactive: '非活跃',
      pending: '待激活',
      banned: '已禁用',
    };

    return statusNames[status] || status;
  }
}

// 创建单例实例
const authService = new AuthService();

export default authService; 