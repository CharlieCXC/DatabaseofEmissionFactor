// 用户角色类型
export type UserRole = 'admin' | 'editor' | 'viewer' | 'user';

// 用户状态类型
export type UserStatus = 'active' | 'inactive' | 'pending' | 'banned';

// 用户权限类型
export interface UserPermissions {
  [key: string]: boolean;
}

// 用户基本信息接口
export interface User {
  id: number;
  uuid: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  organization?: string;
  department?: string;
  position?: string;
  role: UserRole;
  status?: UserStatus;
  permissions: UserPermissions;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  login_count?: number;
}

// 登录请求接口
export interface LoginRequest {
  identifier: string; // 用户名或邮箱
  password: string;
  remember?: boolean;
  device_info?: {
    device_type?: string;
    device_name?: string;
    browser?: string;
    os?: string;
  };
}

// 登录响应接口
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: string;
    };
  };
}

// 注册请求接口
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  phone?: string;
  organization?: string;
  department?: string;
  position?: string;
}

// 注册响应接口
export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: Omit<User, 'permissions'>;
  };
}

// 用户信息更新请求接口
export interface UpdateProfileRequest {
  email?: string;
  full_name?: string;
  phone?: string;
  organization?: string;
  department?: string;
  position?: string;
}

// 修改密码请求接口
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// 刷新令牌请求接口
export interface RefreshTokenRequest {
  refresh_token: string;
}

// 刷新令牌响应接口
export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    tokens: {
      access_token: string;
      refresh_token: string;
      expires_in: string;
    };
  };
}

// 用户查询参数接口
export interface UserQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  organization?: string;
  sort_by?: 'created_at' | 'updated_at' | 'last_login_at' | 'username' | 'email';
  sort_order?: 'asc' | 'desc';
}

// 用户列表响应接口
export interface UserListResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
}

// 管理员创建用户请求接口
export interface AdminCreateUserRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  phone?: string;
  organization?: string;
  department?: string;
  position?: string;
  status?: UserStatus;
  permissions?: UserPermissions;
}

// 管理员更新用户请求接口
export interface AdminUpdateUserRequest {
  email?: string;
  full_name?: string;
  role?: UserRole;
  phone?: string;
  organization?: string;
  department?: string;
  position?: string;
  status?: UserStatus;
  permissions?: UserPermissions;
}

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
}

// API错误响应接口
export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: {
    [field: string]: string[];
  };
}

// 认证状态接口
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

// 认证上下文操作接口
export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

// 完整的认证存储接口
export interface AuthStore extends AuthState, AuthActions {}

// 设备信息接口
export interface DeviceInfo {
  device_type: string;
  device_name: string;
  browser: string;
  os: string;
  screen_resolution: string;
  timezone: string;
} 