import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { message } from 'antd';

// API响应接口
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  errors?: {
    [field: string]: string[];
  };
}

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config: AxiosRequestConfig): any => {
    // 添加认证token
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加请求ID用于日志追踪
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    if (config.headers) {
      config.headers['X-Request-ID'] = requestId;
    }

    // 开发环境下打印请求信息
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request [${requestId}]:`, {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>): AxiosResponse<ApiResponse> => {
    const { data } = response;

    // 开发环境下打印响应信息
    if (import.meta.env.DEV) {
      const requestId = response.config.headers?.['X-Request-ID'];
      console.log(`✅ API Response [${requestId}]:`, {
        status: response.status,
        data: data,
      });
    }

    // 检查业务状态码
    if (data.success === false) {
      console.error('API business error:', data);
      
      // 特殊错误码处理
      if (data.code === 'TOKEN_EXPIRED') {
        handleTokenExpired();
      } else if (data.code === 'ACCOUNT_LOCKED') {
        message.error(data.message || '账户已被锁定');
      } else if (data.code === 'INSUFFICIENT_PERMISSIONS') {
        message.error('权限不足，请联系管理员');
      } else {
        message.error(data.message || '操作失败');
      }
      
      // 抛出错误而不是返回Promise.reject
      throw new Error(data.message || '操作失败');
    }

    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const { response, config } = error;

    // 开发环境下打印错误信息
    if (import.meta.env.DEV) {
      const requestId = config?.headers?.['X-Request-ID'];
      console.error(`❌ API Error [${requestId}]:`, {
        status: response?.status,
        statusText: response?.statusText,
        data: response?.data,
        message: error.message,
      });
    }

    if (response) {
      const { status, data } = response;

      switch (status) {
        case 400:
          message.error(data?.message || '请求参数错误');
          break;
        case 401:
          // Token过期或无效
          if (data?.code === 'TOKEN_EXPIRED') {
            await handleTokenExpired();
          } else {
            message.error('认证失败，请重新登录');
            redirectToLogin();
          }
          break;
        case 403:
          message.error(data?.message || '权限不足');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 409:
          message.error(data?.message || '数据冲突');
          break;
        case 422:
          // 处理验证错误
          if (data?.errors) {
            const errorMessages = Object.values(data.errors).flat();
            message.error(errorMessages.join(', '));
          } else {
            message.error(data?.message || '数据验证失败');
          }
          break;
        case 429:
          message.error('请求过于频繁，请稍后再试');
          break;
        case 500:
          message.error('服务器内部错误，请稍后再试');
          break;
        case 502:
        case 503:
        case 504:
          message.error('服务暂时不可用，请稍后再试');
          break;
        default:
          message.error(data?.message || `请求失败 (${status})`);
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时，请检查网络连接');
    } else if (error.message === 'Network Error') {
      message.error('网络连接失败，请检查网络设置');
    } else {
      message.error('请求失败，请稍后再试');
    }

    return Promise.reject(error);
  }
);

// 处理Token过期
async function handleTokenExpired() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    redirectToLogin();
    return;
  }

  try {
    // 使用刷新令牌获取新的访问令牌
    const response = await axios.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: newRefreshToken } = response.data.data.tokens;

    // 更新本地存储的令牌
    localStorage.setItem('access_token', access_token);
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken);
    }

    message.success('登录状态已刷新');
  } catch (error) {
    console.error('Token refresh failed:', error);
    message.error('登录已过期，请重新登录');
    redirectToLogin();
  }
}

// 重定向到登录页面
function redirectToLogin() {
  // 清除本地存储的认证信息
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_info');

  // 重定向到登录页面
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  }
}

// 检查网络连接状态
export function checkNetworkStatus(): boolean {
  return navigator.onLine;
}

// 重试机制
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries - 1) {
        break;
      }

      // 等待指定延迟后重试
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError!;
}

// 上传文件专用实例
export const uploadApi: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 60000, // 上传文件需要更长的超时时间
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// 上传进度回调类型
export type UploadProgressCallback = (progressEvent: any) => void;

// 上传文件方法
export async function uploadFile(
  url: string,
  file: File,
  onProgress?: UploadProgressCallback,
  additionalData?: Record<string, any>
): Promise<AxiosResponse> {
  const formData = new FormData();
  formData.append('file', file);

  // 添加额外数据
  if (additionalData) {
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });
  }

  return uploadApi.post(url, formData, {
    onUploadProgress: onProgress,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
  });
}

// 下载文件方法
export async function downloadFile(url: string, filename?: string): Promise<void> {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    message.error('文件下载失败');
  }
}

// 获取设备信息
export function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  
  // 检测浏览器
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // 检测操作系统
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'MacOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return {
    device_type: 'web',
    device_name: `${browser} on ${os}`,
    browser,
    os,
    screen_resolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    user_agent: userAgent,
  };
}

export default api; 