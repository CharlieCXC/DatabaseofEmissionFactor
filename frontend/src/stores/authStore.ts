import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { message } from 'antd';
import authService from '../services/authService';
import type {
  AuthState,
  AuthStore,
  User,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../types/auth';

// 初始状态
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
};

// 创建认证存储
export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, _get) => ({
        ...initialState,

        /**
         * 用户登录
         */
        login: async (credentials: Omit<LoginRequest, 'device_info'>) => {
          try {
            set({ loading: true, error: null });

            const response = await authService.login(credentials);
            
            if (response.success && response.data) {
              const { user, tokens } = response.data;
              
              set({
                isAuthenticated: true,
                user,
                token: tokens.access_token,
                refreshToken: tokens.refresh_token,
                loading: false,
                error: null,
              });

              message.success('登录成功');
            } else {
              throw new Error(response.message || '登录失败');
            }
          } catch (error: any) {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              refreshToken: null,
              loading: false,
              error: error.message || '登录失败',
            });
            
            message.error(error.message || '登录失败');
            throw error;
          }
        },

        /**
         * 用户注册
         */
        register: async (userData: RegisterRequest) => {
          try {
            set({ loading: true, error: null });

            const response = await authService.register(userData);
            
            if (response.success) {
              set({ loading: false, error: null });
              message.success('注册成功，请登录');
            } else {
              throw new Error(response.message || '注册失败');
            }
          } catch (error: any) {
            set({
              loading: false,
              error: error.message || '注册失败',
            });
            
            message.error(error.message || '注册失败');
            throw error;
          }
        },

        /**
         * 用户登出
         */
        logout: async () => {
          try {
            set({ loading: true });

            await authService.logout();
            
            set({
              ...initialState,
              loading: false,
            });

            message.success('已退出登录');
          } catch (error: any) {
            // 即使API调用失败，也清除本地状态
            set({
              ...initialState,
              loading: false,
              error: error.message || '登出失败',
            });
            
            console.error('Logout error:', error);
          }
        },

        /**
         * 刷新访问令牌
         */
        refreshAccessToken: async () => {
          try {
            const response = await authService.refreshToken();
            
            if (response.success && response.data) {
              const { tokens } = response.data;
              
              set({
                token: tokens.access_token,
                refreshToken: tokens.refresh_token,
                error: null,
              });
            } else {
              throw new Error('刷新令牌失败');
            }
          } catch (error: any) {
            set({
              ...initialState,
              error: error.message || '刷新令牌失败',
            });
            
            message.error('登录已过期，请重新登录');
            throw error;
          }
        },

        /**
         * 更新用户信息
         */
        updateProfile: async (data: UpdateProfileRequest) => {
          try {
            set({ loading: true, error: null });

            const updatedUser = await authService.updateProfile(data);
            
            set({
              user: updatedUser,
              loading: false,
              error: null,
            });

            message.success('用户信息更新成功');
          } catch (error: any) {
            set({
              loading: false,
              error: error.message || '更新用户信息失败',
            });
            
            message.error(error.message || '更新用户信息失败');
            throw error;
          }
        },

        /**
         * 修改密码
         */
        changePassword: async (data: ChangePasswordRequest) => {
          try {
            set({ loading: true, error: null });

            await authService.changePassword(data);
            
            set({
              loading: false,
              error: null,
            });

            message.success('密码修改成功');
          } catch (error: any) {
            set({
              loading: false,
              error: error.message || '修改密码失败',
            });
            
            message.error(error.message || '修改密码失败');
            throw error;
          }
        },

        /**
         * 清除错误信息
         */
        clearError: () => {
          set({ error: null });
        },

        /**
         * 检查认证状态
         */
        checkAuth: async () => {
          try {
            // 检查本地存储是否有认证信息
            const token = authService.getStoredToken();
            const user = authService.getStoredUser();

            if (!token || !user) {
              set(initialState);
              return;
            }

            // 验证token有效性并获取最新用户信息
            set({ loading: true });
            
            const currentUser = await authService.getProfile();
            
            set({
              isAuthenticated: true,
              user: currentUser,
              token: authService.getStoredToken(),
              refreshToken: authService.getStoredRefreshToken(),
              loading: false,
              error: null,
            });
          } catch (error: any) {
            console.error('Auth check failed:', error);
            
            // 认证检查失败，清除状态
            set({
              ...initialState,
              loading: false,
            });
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
        }),
        onRehydrateStorage: () => (state) => {
          // 重新水合后检查认证状态
          if (state?.isAuthenticated) {
            state.checkAuth();
          }
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// 认证相关的hooks和工具函数

/**
 * 获取当前用户信息
 */
export const useCurrentUser = (): User | null => {
  return useAuthStore((state) => state.user);
};

/**
 * 获取认证状态
 */
export const useIsAuthenticated = (): boolean => {
  return useAuthStore((state) => state.isAuthenticated);
};

/**
 * 获取加载状态
 */
export const useAuthLoading = (): boolean => {
  return useAuthStore((state) => state.loading);
};

/**
 * 获取错误信息
 */
export const useAuthError = (): string | null => {
  return useAuthStore((state) => state.error);
};

/**
 * 检查用户权限
 */
export const useHasPermission = (permission: string): boolean => {
  const user = useCurrentUser();
  return authService.hasPermission(permission, user || undefined);
};

/**
 * 检查用户角色
 */
export const useHasRole = (roles: string | string[]): boolean => {
  const user = useCurrentUser();
  return authService.hasRole(roles, user || undefined);
};

/**
 * 检查是否为管理员
 */
export const useIsAdmin = (): boolean => {
  return useHasRole('admin');
};

/**
 * 获取用户显示名称
 */
export const useUserDisplayName = (): string => {
  const user = useCurrentUser();
  return authService.getUserDisplayName(user || undefined);
};

/**
 * 认证操作hooks
 */
export const useAuthActions = () => {
  const store = useAuthStore();
  
  return {
    login: store.login,
    register: store.register,
    logout: store.logout,
    refreshAccessToken: store.refreshAccessToken,
    updateProfile: store.updateProfile,
    changePassword: store.changePassword,
    clearError: store.clearError,
    checkAuth: store.checkAuth,
  };
};

/**
 * 初始化认证状态
 */
export const initializeAuth = () => {
  const checkAuth = useAuthStore.getState().checkAuth;
  checkAuth();
};

// 默认导出store
export default useAuthStore; 