# Hướng dẫn đăng nhập Admin

## Chức năng mới đã được thêm

Đã thêm chức năng đăng nhập admin với thông tin đăng nhập cứng để truy cập nhanh vào hệ thống.

## Thông tin đăng nhập Admin

### **Tài khoản Admin:**
- **Username**: `admin`
- **Password**: `123456`

### **Cách sử dụng:**

1. **Truy cập trang đăng nhập**
   - Mở ứng dụng và điều hướng đến trang đăng nhập

2. **Nhập thông tin đăng nhập**
   - **Tài khoản**: `admin`
   - **Mật khẩu**: `123456`

3. **Đăng nhập thành công**
   - Hệ thống sẽ tự động chuyển hướng đến trang Dashboard
   - Bạn sẽ có quyền Admin với đầy đủ chức năng

## Tính năng của Admin

### **Quyền truy cập:**
- ✅ Quản lý người dùng và vai trò
- ✅ Quản lý kho hàng và sản phẩm
- ✅ Quản lý đơn hàng và khách hàng
- ✅ Quản lý phiếu xuất/nhập kho
- ✅ Xem báo cáo doanh thu
- ✅ Quản lý hệ thống

### **Duy trì phiên đăng nhập:**
- Session admin được lưu trong localStorage
- Tự động khôi phục session khi refresh trang
- Đăng xuất sẽ xóa hoàn toàn session

## Lưu ý bảo mật

### **⚠️ Cảnh báo:**
- Đây là tài khoản admin cứng chỉ dành cho mục đích phát triển và test
- **KHÔNG sử dụng trong môi trường production**
- Thay đổi thông tin đăng nhập trong code trước khi deploy

### **Khuyến nghị:**
1. **Môi trường Development**: Có thể sử dụng tài khoản này
2. **Môi trường Production**: 
   - Tắt chức năng này
   - Sử dụng tài khoản admin thật từ database
   - Thiết lập mật khẩu mạnh

## Cách tắt chức năng Admin cứng

Để tắt chức năng admin cứng, chỉnh sửa file `src/hooks/useAuth.tsx`:

```typescript
// Comment hoặc xóa đoạn code này:
/*
if (emailOrUsername === 'admin' && password === '123456') {
  // ... admin login logic
}
*/
```

## Troubleshooting

### **Vấn đề thường gặp:**

1. **Không đăng nhập được**
   - Kiểm tra username và password chính xác
   - Xóa cache trình duyệt và thử lại

2. **Session bị mất**
   - Kiểm tra localStorage có bị xóa không
   - Đăng nhập lại với thông tin admin

3. **Không có quyền admin**
   - Đảm bảo đăng nhập với username `admin`
   - Kiểm tra console log có thông báo "Admin login successful"

### **Debug:**
- Mở Developer Tools (F12)
- Kiểm tra Console để xem log
- Kiểm tra Application > Local Storage để xem session

## Code đã thay đổi

### **File: `src/hooks/useAuth.tsx`**

**Thêm chức năng:**
- Kiểm tra username/password cứng cho admin
- Tạo mock user và session cho admin
- Lưu session admin vào localStorage
- Khôi phục session admin khi refresh trang
- Xóa session admin khi đăng xuất

**Các thay đổi chính:**
1. Thêm logic kiểm tra `admin`/`123456`
2. Tạo mock User và Session objects
3. Lưu session vào localStorage
4. Khôi phục session từ localStorage trong useEffect
5. Xóa session khi signOut

## Kết luận

Chức năng admin cứng đã được thêm thành công và sẵn sàng sử dụng cho mục đích phát triển và test. Hãy nhớ tắt chức năng này trước khi deploy lên production.
