# HTTP Request Utility

Utility này cung cấp các tiện ích để thực hiện các request HTTP sử dụng axios với các interceptors để xử lý:

## Tính năng chính

- ✅ **Thêm token vào header** - Tự động thêm Bearer token vào Authorization header
- ✅ **Thêm thời gian timeout** - Cấu hình timeout cho request
- ✅ **Thêm params vào URL** - Xử lý query parameters
- ✅ **Thêm data vào body** - Xử lý request body
- ✅ **Thêm header vào request** - Tùy chỉnh headers
- ✅ **Thêm response type** - Hỗ trợ json, text, blob, arraybuffer
- ✅ **Thêm loading state** - Theo dõi trạng thái loading của request
- ✅ **Thêm cancel token** - Hủy request khi cần thiết
- ✅ **Xử lý response** - Chuẩn hóa response data
- ✅ **Xử lý error** - Chuẩn hóa error handling
- ✅ **Upload/Download file** - Hỗ trợ file operations

## Cách sử dụng

### Import

```typescript
import { http, requestManager, RequestManager } from '@/@core/utils/requestUtils';
```

### Sử dụng cơ bản

```typescript
// GET request
const response = await http.get('/api/users');
console.log(response.data); // Dữ liệu response
console.log(response.status); // HTTP status code
console.log(response.success); // true/false

// POST request
const newUser = await http.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updatedUser = await http.put('/api/users/1', {
  name: 'Jane Doe'
});

// DELETE request
await http.delete('/api/users/1');

// PATCH request
const patchedUser = await http.patch('/api/users/1', {
  email: 'jane@example.com'
});
```

### Authentication

```typescript
// Set token
http.setAuthToken('your-jwt-token');

// Clear token
http.clearAuthToken();
```

### Upload file

```typescript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const response = await http.upload('/api/upload', file);
console.log('File uploaded:', response.data);
```

### Download file

```typescript
await http.download('/api/download/report.pdf', 'report.pdf');
```

### Loading state

```typescript
const requestId = 'get-users';
http.setLoading(requestId, true);

try {
  const users = await http.get('/api/users');
  console.log(users);
} finally {
  http.setLoading(requestId, false);
}

// Hoặc kiểm tra trạng thái
if (http.isLoading('get-users')) {
  console.log('Đang tải dữ liệu...');
}
```

### Cancel request

```typescript
// Tạo cancel token
const cancelToken = http.createCancelToken('search-users');

// Sử dụng trong request
const response = await http.get('/api/users/search?q=john', {
  cancelToken: cancelToken.token
});

// Hủy request
http.cancelRequest('search-users');

// Hoặc hủy tất cả requests
http.cancelAllRequests();
```

### Custom configuration

```typescript
const response = await http.get('/api/users', {
  timeout: 10000, // 10 seconds
  headers: {
    'Custom-Header': 'value'
  },
  params: {
    page: 1,
    limit: 10
  }
});
```

### Tạo instance mới

```typescript
const customRequestManager = new RequestManager('https://api.example.com', 15000);
const customHttp = {
  get: <T>(url: string, config?: RequestConfig) => customRequestManager.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: RequestConfig) => customRequestManager.post<T>(url, data, config),
  // ... các methods khác
};
```

## Types

### RequestConfig

```typescript
interface RequestConfig extends AxiosRequestConfig {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}
```

### ResponseData

```typescript
interface ResponseData<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
  success: boolean;
  error?: string;
  message?: string;
}
```

### RequestError

```typescript
interface RequestError {
  message: string;
  status?: number;
  statusText?: string;
  data?: any;
  config?: RequestConfig;
}
```

## Error Handling

```typescript
try {
  const response = await http.get('/api/users');
  console.log('Success:', response.data);
} catch (error) {
  if (error.status === 401) {
    console.log('Unauthorized - cần đăng nhập lại');
  } else if (error.status === 404) {
    console.log('Không tìm thấy resource');
  } else {
    console.log('Error:', error.message);
  }
}
```

## Interceptors

Utility này sử dụng axios interceptors để:

1. **Request Interceptor**: Tự động thêm token, headers, và xử lý loading state
2. **Response Interceptor**: Xử lý response và error, cập nhật loading state

## Lưu ý

- Mỗi request sẽ có một unique ID để theo dõi loading state
- Token authentication được xử lý tự động qua interceptors
- File upload/download được hỗ trợ sẵn
- Có thể tạo nhiều instance với các cấu hình khác nhau
- Hỗ trợ TypeScript với generic types
