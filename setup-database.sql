-- Script thiết lập Database cho Hệ thống Quản lý Kho hàng
-- Chạy script này trong Supabase SQL Editor để tạo toàn bộ cấu trúc database

-- =====================================================
-- 1. TẠO ENUM VÀ CÁC TYPE
-- =====================================================

-- Tạo enum cho vai trò người dùng
CREATE TYPE public.user_role AS ENUM (
  'owner_director',    -- Chủ sở hữu/Giám đốc
  'admin',             -- Quản trị viên
  'chief_accountant',  -- Kế toán trưởng
  'accountant',        -- Kế toán
  'inventory',         -- Quản lý kho
  'sales',             -- Nhân viên bán hàng
  'shipper'            -- Nhân viên giao hàng
);

-- =====================================================
-- 2. TẠO CÁC BẢNG CHÍNH
-- =====================================================

-- Bảng profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bảng user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Bảng warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
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

-- Bảng products
CREATE TABLE IF NOT EXISTS public.products (
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
  status TEXT DEFAULT 'active',
  barcode TEXT,
  unit TEXT DEFAULT 'cái',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bảng customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bảng orders
CREATE TABLE IF NOT EXISTS public.orders (
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
  vat_type TEXT DEFAULT 'none',
  vat_rate NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  vat_invoice_email TEXT,
  order_status TEXT DEFAULT 'new',
  payment_status TEXT DEFAULT 'unpaid',
  completion_status TEXT DEFAULT 'active',
  initial_payment NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bảng order_items
CREATE TABLE IF NOT EXISTS public.order_items (
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

-- Bảng export_slips
CREATE TABLE IF NOT EXISTS public.export_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  slip_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
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

-- Bảng export_slip_items
CREATE TABLE IF NOT EXISTS public.export_slip_items (
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

-- Bảng import_slips
CREATE TABLE IF NOT EXISTS public.import_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_number TEXT UNIQUE NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id),
  supplier_name TEXT,
  supplier_contact TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  import_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Bảng import_slip_items
CREATE TABLE IF NOT EXISTS public.import_slip_items (
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

-- Bảng inventory_movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bảng order_status_history
CREATE TABLE IF NOT EXISTS public.order_status_history (
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

-- Bảng product_changelog
CREATE TABLE IF NOT EXISTS public.product_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID NOT NULL,
  change_type TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bảng notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  related_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bảng order_documents
CREATE TABLE IF NOT EXISTS public.order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bảng provinces_cache
CREATE TABLE IF NOT EXISTS public.provinces_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  districts JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. TẠO CÁC FUNCTION
-- =====================================================

-- Function kiểm tra vai trò
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

-- Function lấy vai trò hiện tại
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1
$$;

-- Function cập nhật timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function xử lý user mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Function tạo số phiếu xuất
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

-- Function tạo số phiếu nhập
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

-- Function tính tổng đơn hàng
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

-- Function tính VAT cho item
CREATE OR REPLACE FUNCTION public.calculate_item_vat()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate VAT amount for the item
  NEW.vat_amount := NEW.total_price * (NEW.vat_rate / 100);
  RETURN NEW;
END;
$function$;

-- Function log thay đổi sản phẩm
CREATE OR REPLACE FUNCTION public.log_product_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  change_type_val text;
  old_vals jsonb := '{}';
  new_vals jsonb := '{}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'created';
    new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    change_type_val := 'updated';
    old_vals := to_jsonb(OLD);
    new_vals := to_jsonb(NEW);
    
    -- Special case for status changes
    IF OLD.status != NEW.status AND NEW.status = 'archived' THEN
      change_type_val := 'archived';
    -- Special case for price changes
    ELSIF OLD.unit_price != NEW.unit_price OR OLD.cost_price != NEW.cost_price THEN
      change_type_val := 'price_changed';
    END IF;
  END IF;
  
  -- Log the change
  INSERT INTO public.product_changelog (
    product_id,
    changed_by,
    change_type,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    change_type_val,
    old_vals,
    new_vals
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================================================
-- 4. TẠO CÁC TRIGGER
-- =====================================================

-- Trigger cho user mới
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger cập nhật timestamp
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_slips_updated_at
  BEFORE UPDATE ON public.import_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_slip_items_updated_at
  BEFORE UPDATE ON public.import_slip_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger tính tổng đơn hàng
DROP TRIGGER IF EXISTS update_order_totals_trigger ON public.order_items;
CREATE TRIGGER update_order_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_order_totals();

-- Trigger tính VAT cho item
CREATE TRIGGER calculate_item_vat_trigger
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_item_vat();

-- Trigger log thay đổi sản phẩm
DROP TRIGGER IF EXISTS product_changes_trigger ON public.products;
CREATE TRIGGER product_changes_trigger
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.log_product_changes();

-- =====================================================
-- 5. BẬT ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_slip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_slip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces_cache ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. TẠO CÁC POLICY CƠ BẢN
-- =====================================================

-- Policies cho profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies cho user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owner/director can manage all roles" 
ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'owner_director'));

-- Policies cho warehouses
CREATE POLICY "Users can view warehouses" 
ON public.warehouses FOR SELECT USING (true);

CREATE POLICY "Admin and inventory can manage warehouses" 
ON public.warehouses FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory') OR 
  public.has_role(auth.uid(), 'owner_director')
);

-- Policies cho products
CREATE POLICY "Users can view products" 
ON public.products FOR SELECT USING (true);

CREATE POLICY "Admin and inventory can manage products" 
ON public.products FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory') OR 
  public.has_role(auth.uid(), 'owner_director')
);

-- Policies cho customers
CREATE POLICY "Users can view customers" 
ON public.customers FOR SELECT USING (true);

CREATE POLICY "Sales and admin can manage customers" 
ON public.customers FOR ALL USING (
  public.has_role(auth.uid(), 'sales') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'owner_director')
);

-- Policies cho orders
CREATE POLICY "Users can view orders" 
ON public.orders FOR SELECT USING (true);

CREATE POLICY "Sales and admin can manage orders" 
ON public.orders FOR ALL USING (
  public.has_role(auth.uid(), 'sales') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'owner_director')
);

-- Policies cho order_items
CREATE POLICY "Users can view order items" 
ON public.order_items FOR SELECT USING (true);

CREATE POLICY "Sales and admin can manage order items" 
ON public.order_items FOR ALL USING (
  public.has_role(auth.uid(), 'sales') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'owner_director')
);

-- Policies cho export_slips
CREATE POLICY "Users can view export slips" 
ON public.export_slips FOR SELECT USING (true);

CREATE POLICY "Inventory and admin can create export slips" 
ON public.export_slips FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'inventory') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'owner_director')
);

CREATE POLICY "Accountants can approve export slips" 
ON public.export_slips FOR UPDATE USING (
  public.has_role(auth.uid(), 'accountant') OR 
  public.has_role(auth.uid(), 'chief_accountant') OR 
  public.has_role(auth.uid(), 'owner_director') OR
  public.has_role(auth.uid(), 'admin')
);

-- Policies cho import_slips
CREATE POLICY "Users can view import slips" 
ON public.import_slips FOR SELECT USING (true);

CREATE POLICY "Inventory and admin can create import slips" 
ON public.import_slips FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'inventory') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'owner_director')
);

CREATE POLICY "Financial roles can approve import slips" 
ON public.import_slips FOR UPDATE USING (
  public.has_role(auth.uid(), 'accountant') OR 
  public.has_role(auth.uid(), 'chief_accountant') OR 
  public.has_role(auth.uid(), 'owner_director') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Policies cho notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT WITH CHECK (true);

-- Policies cho provinces_cache
CREATE POLICY "Anyone can read provinces cache" 
ON public.provinces_cache FOR SELECT USING (true);

CREATE POLICY "Admins can manage provinces cache" 
ON public.provinces_cache FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'owner_director')
);

-- =====================================================
-- 7. TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH
-- =====================================================

-- Xóa tài khoản admin cũ nếu có
DELETE FROM public.user_roles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'anh.hxt@gmail.com'
);

DELETE FROM public.profiles WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'anh.hxt@gmail.com'
);

DELETE FROM auth.users WHERE email = 'anh.hxt@gmail.com';

-- Tạo tài khoản admin mới
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    confirmation_token,
    recovery_sent_at,
    recovery_token,
    email_change_sent_at,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change_sent_at,
    phone_change,
    phone_change_token,
    reauthentication_sent_at,
    reauthentication_token,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change_token_new,
    email_change_token_current_candidate,
    email_change_token_new_candidate,
    banned_until,
    deleted_at,
    is_sso_user
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'anh.hxt@gmail.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    '',
    NULL,
    '',
    '',
    NULL,
    '',
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Admin User", "username": "admin"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    '',
    NULL,
    NULL,
    false
);

-- Tạo profile cho admin
INSERT INTO public.profiles (id, full_name)
SELECT id, 'Admin User' FROM auth.users WHERE email = 'anh.hxt@gmail.com';

-- Gán role admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::user_role FROM auth.users WHERE email = 'anh.hxt@gmail.com';

-- =====================================================
-- 8. TẠO DỮ LIỆU MẪU
-- =====================================================

-- Tạo kho hàng mẫu
INSERT INTO public.warehouses (code, name, address, description) VALUES
('WH001', 'Kho chính', '123 Đường ABC, Quận 1, TP.HCM', 'Kho hàng chính của công ty'),
('WH002', 'Kho phụ', '456 Đường XYZ, Quận 7, TP.HCM', 'Kho hàng phụ');

-- Tạo sản phẩm mẫu
INSERT INTO public.products (code, name, description, category, unit_price, cost_price, current_stock, min_stock_level, location) VALUES
('PRD001', 'Laptop Dell Inspiron 15', 'Laptop Dell Inspiron 15 inch, Core i5', 'Electronics', 15000000, 12000000, 25, 5, 'A1-01'),
('PRD002', 'iPhone 15 128GB', 'iPhone 15 128GB màu đen', 'Electronics', 25000000, 20000000, 10, 2, 'A2-05'),
('PRD003', 'Bàn làm việc', 'Bàn làm việc gỗ tự nhiên', 'Furniture', 2000000, 1500000, 15, 3, 'B1-03');

-- Tạo khách hàng mẫu
INSERT INTO public.customers (customer_code, name, email, phone, address) VALUES
('KH000001', 'Nguyễn Văn A', 'nguyenvana@email.com', '0901234567', '123 Đường ABC, Quận 1, TP.HCM'),
('KH000002', 'Trần Thị B', 'tranthib@email.com', '0907654321', '456 Đường XYZ, Quận 7, TP.HCM');

-- =====================================================
-- 9. THÔNG BÁO HOÀN THÀNH
-- =====================================================

SELECT 
    'Database đã được thiết lập thành công!' as message,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

SELECT 
    'Tài khoản admin đã được tạo:' as info,
    u.email,
    p.full_name,
    ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'anh.hxt@gmail.com';
