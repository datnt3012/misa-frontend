import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, CancelTokenSource } from 'axios';

// Types
export interface RequestConfig extends AxiosRequestConfig {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export interface ResponseData<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
  success: boolean;
  error?: string;
  message?: string;
}

export interface RequestError {
  message: string;
  status?: number;
  statusText?: string;
  data?: any;
  config?: RequestConfig;
}

// Request Manager Class
class RequestManager {
  private instance: AxiosInstance;
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private loadingStates: Map<string, boolean> = new Map();
  private authToken?: string;

  constructor(baseURL: string = '', timeout: number = 30000) {
    this.instance = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // Setup interceptors
  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Thêm token vào header
        if (this.authToken) {
          if (!config.headers) {
            config.headers = {} as any;
          }
          (config.headers as any).Authorization = `Bearer ${this.authToken}`;
        }

        // Thêm thời gian timeout
        if (config.timeout) {
          config.timeout = config.timeout;
        }

        // Thêm params vào url
        if (config.params) {
          config.params = { ...config.params };
        }

        // Thêm data vào body
        if (config.data) {
          config.data = config.data;
        }

        // Thêm header vào request
        if (config.headers) {
          config.headers = { ...config.headers } as any;
        }

        // Thêm cancel token
        if (config.cancelToken) {
          config.cancelToken = config.cancelToken;
        }

        // Thêm response type
        if (config.responseType) {
          config.responseType = config.responseType;
        }

        // Set loading state
        const requestId = this.generateRequestId(config);
        this.loadingStates.set(requestId, true);

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - chỉ xử lý loading state
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Set success state
        const requestId = this.generateRequestId(response.config);
        this.loadingStates.set(requestId, false);
        return response;
      },
      (error: AxiosError) => {
        // Set error state
        const requestId = this.generateRequestId(error.config);
        this.loadingStates.set(requestId, false);
        return Promise.reject(error);
      }
    );
  }

  // Generate unique request ID
  private generateRequestId(config: AxiosRequestConfig): string {
    return `${config.method || 'GET'}_${config.url || ''}_${Date.now()}`;
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Clear authentication token
  clearAuthToken() {
    this.authToken = undefined;
  }

  // Create cancel token
  createCancelToken(key: string): CancelTokenSource {
    const cancelToken = axios.CancelToken.source();
    this.cancelTokens.set(key, cancelToken);
    return cancelToken;
  }

  // Cancel request
  cancelRequest(key: string) {
    const cancelToken = this.cancelTokens.get(key);
    if (cancelToken) {
      cancelToken.cancel('Request cancelled');
      this.cancelTokens.delete(key);
    }
  }

  // Cancel all requests
  cancelAllRequests() {
    this.cancelTokens.forEach((cancelToken) => {
      cancelToken.cancel('All requests cancelled');
    });
    this.cancelTokens.clear();
  }

  // Check loading state
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  // Set loading state
  setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading);
  }

  // GET request
  async get<T = any>(url: string, config?: RequestConfig): Promise<ResponseData<T>> {
    const requestId = this.generateRequestId({ method: 'GET', url, ...config });
    this.setLoading(requestId, true);

    try {
      const response = await this.instance.get<T>(url, config);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        config: response.config as RequestConfig,
        success: true,
      };
    } finally {
      this.setLoading(requestId, false);
    }
  }

  // POST request
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    const requestId = this.generateRequestId({ method: 'POST', url, ...config });
    this.setLoading(requestId, true);

    try {
      const response = await this.instance.post<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        config: response.config as RequestConfig,
        success: true,
      };
    } finally {
      this.setLoading(requestId, false);
    }
  }

  // PUT request
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    const requestId = this.generateRequestId({ method: 'PUT', url, ...config });
    this.setLoading(requestId, true);

    try {
      const response = await this.instance.put<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        config: response.config as RequestConfig,
        success: true,
      };
    } finally {
      this.setLoading(requestId, false);
    }
  }

  // DELETE request
  async delete<T = any>(url: string, config?: RequestConfig): Promise<ResponseData<T>> {
    const requestId = this.generateRequestId({ method: 'DELETE', url, ...config });
    this.setLoading(requestId, true);

    try {
      const response = await this.instance.delete<T>(url, config);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        config: response.config as RequestConfig,
        success: true,
      };
    } finally {
      this.setLoading(requestId, false);
    }
  }

  // PATCH request
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>> {
    const requestId = this.generateRequestId({ method: 'PATCH', url, ...config });
    this.setLoading(requestId, true);

    try {
      const response = await this.instance.patch<T>(url, data, config);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        config: response.config as RequestConfig,
        success: true,
      };
    } finally {
      this.setLoading(requestId, false);
    }
  }

  // Upload file
  async upload<T = any>(url: string, file: File, config?: RequestConfig): Promise<ResponseData<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const uploadConfig: RequestConfig = {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    };

    return this.post<T>(url, formData, uploadConfig);
  }

  // Download file
  async download(url: string, filename?: string, config?: RequestConfig): Promise<void> {
    const downloadConfig: RequestConfig = {
      ...config,
      responseType: 'blob',
    };

    const response = await this.get(url, downloadConfig);
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// Create default instance
export const requestManager = new RequestManager();

// Export convenience functions
export const http = {
  get: <T = any>(url: string, config?: RequestConfig) => requestManager.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: RequestConfig) => requestManager.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: RequestConfig) => requestManager.put<T>(url, data, config),
  delete: <T = any>(url: string, config?: RequestConfig) => requestManager.delete<T>(url, config),
  patch: <T = any>(url: string, data?: any, config?: RequestConfig) => requestManager.patch<T>(url, data, config),
  upload: <T = any>(url: string, file: File, config?: RequestConfig) => requestManager.upload<T>(url, file, config),
  download: (url: string, filename?: string, config?: RequestConfig) => requestManager.download(url, filename, config),
  setAuthToken: (token: string) => requestManager.setAuthToken(token),
  clearAuthToken: () => requestManager.clearAuthToken(),
  createCancelToken: (key: string) => requestManager.createCancelToken(key),
  cancelRequest: (key: string) => requestManager.cancelRequest(key),
  cancelAllRequests: () => requestManager.cancelAllRequests(),
  isLoading: (key: string) => requestManager.isLoading(key),
  setLoading: (key: string, loading: boolean) => requestManager.setLoading(key, loading),
};

// Export the class
export { RequestManager };