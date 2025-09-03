# Cấu trúc Database - Hệ thống Quản lý Kho hàng

## Tổng quan
Hệ thống sử dụng PostgreSQL với Supabase, bao gồm các bảng chính để quản lý kho hàng, đơn hàng, khách hàng, và người dùng.

## Các bảng chính

### 1. Bảng Quản lý Người dùng

#### `auth.users` (Supabase Auth)
```sql
-- Bảng người dùng được quản lý bởi Supabase Auth
-- Chứa thông tin xác thực: email, password, session
```

#### `public.profiles`
```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.user_roles`
```sql
-- Enum cho vai trò người dùng
CREATE TYPE public.user_role AS ENUM (
  'owner_director',    -- Chủ sở hữu/Giám đốc
  'admin',             -- Quản trị viên
  'chief_accountant',  -- Kế toán trưởng
  'accountant',        -- Kế toán
  'inventory',         -- Quản lý kho
  'sales',             -- Nhân viên bán hàng
  'shipper'            -- Nhân viên giao hàng
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
```

### 2. Bảng Quản lý Kho hàng

#### `public.warehouses`
```sql
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  province_code TEXT,
  province_name TEXT,
  district_code TEXT,
  district_name TEXT,
  ward_code TEXT,
  ward_name TEXT,
  address_detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.products`
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  location TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'archived'
  barcode TEXT,
  unit TEXT DEFAULT 'cái',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 3. Bảng Quản lý Khách hàng

#### `public.customers`
```sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 4. Bảng Quản lý Đơn hàng

#### `public.orders`
```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  order_type TEXT NOT NULL DEFAULT 'sale',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  debt_amount NUMERIC NOT NULL DEFAULT 0,
  debt_date DATE,
  notes TEXT,
  contract_number TEXT,
  contract_url TEXT,
  purchase_order_number TEXT,
  vat_type TEXT DEFAULT 'none', -- 'none', 'per_line', 'total'
  vat_rate NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  vat_invoice_email TEXT,
  order_status TEXT DEFAULT 'new', -- 'new', 'confirmed', 'processing', 'picked', 'handover', 'delivered'
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid', 'refunded'
  completion_status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'failed', 'returned'
  initial_payment NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.order_items`
```sql
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  warehouse_id UUID REFERENCES public.warehouses(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 5. Bảng Quản lý Phiếu Xuất/Nhập

#### `public.export_slips`
```sql
CREATE TABLE public.export_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  slip_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
  notes TEXT,
  approval_notes TEXT,
  export_notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  export_completed_by UUID REFERENCES auth.users(id),
  export_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.export_slip_items`
```sql
CREATE TABLE public.export_slip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_slip_id UUID REFERENCES public.export_slips(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.import_slips`
```sql
CREATE TABLE public.import_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id),
  supplier_name TEXT,
  supplier_contact TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  import_date DATE NOT NULL DEFAULT CURRENT_DATE
);
```

#### `public.import_slip_items`
```sql
CREATE TABLE public.import_slip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_slip_id UUID REFERENCES public.import_slips(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  expiry_date DATE,
  batch_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 6. Bảng Theo dõi và Lịch sử

#### `public.inventory_movements`
```sql
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL, -- 'in', 'out'
  reference_type TEXT NOT NULL, -- 'import_slip', 'export_slip', 'adjustment'
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.order_status_history`
```sql
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  old_paid_amount NUMERIC DEFAULT 0,
  new_paid_amount NUMERIC DEFAULT 0,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.product_changelog`
```sql
CREATE TABLE public.product_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID NOT NULL,
  change_type TEXT NOT NULL, -- 'created', 'updated', 'archived', 'price_changed'
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 7. Bảng Thông báo và Tài liệu

#### `public.notifications`
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  related_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `public.order_documents`
```sql
CREATE TABLE public.order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL, -- 'contract', 'purchase_order', 'invoice', 'receipt', 'other'
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 8. Bảng Bổ sung

#### `public.provinces_cache`
```sql
CREATE TABLE public.provinces_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  districts JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Các Function và Trigger quan trọng

### 1. Function kiểm tra vai trò
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### 2. Function tạo số phiếu xuất
```sql
CREATE OR REPLACE FUNCTION public.generate_export_slip_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  slip_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(slip_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.export_slips
  WHERE slip_number ~ '^PX[0-9]+$';
  
  slip_num := 'PX' || LPAD(next_number::TEXT, 6, '0');
  RETURN slip_num;
END;
$$ LANGUAGE plpgsql;
```

### 3. Function tạo số phiếu nhập
```sql
CREATE OR REPLACE FUNCTION public.generate_import_slip_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  slip_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(slip_number FROM 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.import_slips
  WHERE slip_number ~ '^PN[0-9]+$';
  
  slip_num := 'PN' || LPAD(next_number::TEXT, 6, '0');
  RETURN slip_num;
END;
$$ LANGUAGE plpgsql;
```

### 4. Function tính tổng đơn hàng
```sql
CREATE OR REPLACE FUNCTION public.calculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  subtotal NUMERIC := 0;
  total_vat NUMERIC := 0;
  order_vat_type TEXT;
  order_vat_rate NUMERIC;
BEGIN
  -- Get order VAT settings
  SELECT vat_type, vat_rate INTO order_vat_type, order_vat_rate
  FROM public.orders 
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calculate subtotal from order items
  SELECT COALESCE(SUM(total_price), 0) 
  INTO subtotal
  FROM public.order_items 
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calculate VAT based on type
  IF order_vat_type = 'total' THEN
    total_vat := subtotal * (order_vat_rate / 100);
  ELSIF order_vat_type = 'per_line' THEN
    SELECT COALESCE(SUM(vat_amount), 0) 
    INTO total_vat
    FROM public.order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  END IF;
  
  -- Update the order totals
  UPDATE public.orders 
  SET 
    total_amount = subtotal + total_vat,
    vat_amount = total_vat,
    debt_amount = (subtotal + total_vat) - paid_amount,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
```

## Row Level Security (RLS)

Tất cả các bảng đều được bật RLS với các policy phù hợp:

- **Profiles**: Người dùng chỉ có thể xem/sửa profile của mình
- **User Roles**: Chỉ owner/director có thể quản lý vai trò
- **Products**: Tất cả có thể xem, inventory/admin có thể sửa
- **Orders**: Tất cả có thể xem, sales/admin có thể tạo/sửa
- **Export/Import Slips**: Inventory có thể tạo, accountant có thể duyệt

## Cách triển khai

### 1. Tạo database mới
```bash
# Tạo project Supabase mới
supabase init
supabase start
```

### 2. Chạy migrations
```bash
# Chạy tất cả migrations theo thứ tự
supabase db reset
```

### 3. Tạo tài khoản admin
```sql
-- Chạy script tạo tài khoản admin
-- (Xem file create-admin-simple.sql)
```

### 4. Cấu hình environment
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Lưu ý quan trọng

1. **Backup**: Luôn backup database trước khi thực hiện thay đổi lớn
2. **Testing**: Test kỹ các migration trên môi trường development
3. **Performance**: Đánh index cho các trường thường query
4. **Security**: Kiểm tra RLS policies định kỳ
5. **Monitoring**: Theo dõi performance và logs
