# Inventory Management System

A comprehensive inventory management system built with React, TypeScript, and Supabase. This application provides complete warehouse management, order processing, export slip generation, and user role management capabilities.

## Features

### 🏗️ Core Functionality

- **Dashboard**: Real-time overview of inventory, orders, and key metrics
- **Inventory Management**: Complete warehouse and product tracking
- **Order Processing**: Full order lifecycle management with status tracking
- **Export Slip Management**: Generate and approve export slips with item tracking
- **Customer Management**: Customer database with order history
- **Revenue Analytics**: Financial reporting and analytics
- **Document Management**: Upload and manage order-related documents
- **User Management**: Role-based access control and user administration

### 👥 User Roles & Permissions

#### Owner/Director (`owner_director`)
- Full system access
- User creation and management (except password reset)
- All inventory and order operations
- Revenue analytics access
- System settings management

#### Admin (`admin`)
- User creation and management
- **Password reset for all user types** (exclusive privilege)
- All inventory and order operations
- Revenue analytics access
- Cannot modify system settings

#### Inventory Manager (`inventory`)
- Warehouse and inventory management
- Export slip creation and approval
- Order fulfillment operations
- Limited user management

#### Sales (`sales`)
- Order creation and management
- Customer management
- Basic inventory viewing
- Export slip viewing

#### Accounting (`accounting`)
- Revenue analytics and reporting
- Order payment tracking
- Financial document management
- Read-only access to most features

### 📦 Inventory Features

- **Warehouse Management**: Create, edit, and manage multiple warehouses
- **Product Tracking**: Add products with detailed information (name, description, price, quantity)
- **Stock Levels**: Real-time inventory tracking across warehouses
- **Excel Import**: Bulk import inventory data via Excel/CSV files
- **Location Management**: Organize products by warehouse locations

### 📋 Order Management

- **Order Creation**: Create orders with multiple line items
- **Status Tracking**: Complete order lifecycle from draft to completed
- **Payment Management**: Track payment status and amounts
- **Export Slip Generation**: Generate export slips for order fulfillment
- **Document Attachments**: Upload and manage order documents
- **Email Notifications**: Automated order status emails

### 📄 Export Slip Workflow

1. **Creation**: Generate export slips from orders
2. **Review**: View slip details and item quantities
3. **Approval**: Multi-level approval process
4. **Fulfillment**: Mark as exported when physically shipped
5. **History**: Complete audit trail of all actions

### 🔐 Authentication & Security

- Supabase authentication with email/password
- Row Level Security (RLS) policies
- Role-based access control
- Secure user management with edge functions
- Password reset functionality

## Project Info

**URL**: https://lovable.dev/projects/ec292ccd-5f0b-42a0-8051-d944e66f8227

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ec292ccd-5f0b-42a0-8051-d944e66f8227) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Technology Stack

This project is built with modern web technologies:

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast development build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful and accessible UI components
- **React Router** - Client-side routing
- **React Hook Form** - Form management and validation
- **React Query** - Server state management
- **Lucide React** - Beautiful icons

### Backend & Database
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database with Row Level Security
  - Real-time subscriptions
  - Authentication and user management
  - Edge functions for server-side logic
  - File storage for documents

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Date-fns** - Date utility library
- **Zod** - Schema validation

## Database Schema

The application uses PostgreSQL with the following main tables:

### Core Tables
- `auth.users` - User authentication (Supabase managed)
- `public.user_roles` - User role assignments
- `public.warehouses` - Warehouse information
- `public.inventory` - Product inventory tracking
- `public.customers` - Customer database
- `public.orders` - Order management
- `public.order_items` - Order line items
- `public.export_slips` - Export slip tracking
- `public.export_slip_items` - Export slip line items

### Security
All tables implement Row Level Security (RLS) policies to ensure data access is properly restricted based on user roles and ownership.

## API Documentation

### Supabase REST API Endpoints

The application uses Supabase's auto-generated REST API for database operations. All endpoints follow the pattern:
`https://elogncohkxrriqmvapqo.supabase.co/rest/v1/{table_name}`

#### Authentication Headers
All API requests require authentication headers:
```
Authorization: Bearer {access_token}
apikey: {supabase_anon_key}
Content-Type: application/json
```

### Core Entity APIs

#### 1. Warehouses API

##### GET /warehouses
List all warehouses
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/warehouses" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

**Response**:
```json
[
  {
    "id": "uuid",
    "code": "WH001",
    "name": "Kho chính",
    "address": "123 Main Street",
    "description": "Kho hàng chính",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

##### POST /warehouses
Create new warehouse (inventory/admin/owner only)
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/warehouses" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WH002",
    "name": "Kho phụ",
    "address": "456 Secondary St",
    "description": "Kho hàng phụ"
  }'
```

##### PATCH /warehouses?id=eq.{warehouse_id}
Update warehouse
```bash
curl -X PATCH "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/warehouses?id=eq.{warehouse_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated warehouse name"}'
```

#### 2. Products API

##### GET /products
List all products with filtering and pagination
```bash
# Get all products
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/products" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Filter by category
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/products?category=eq.Electronics" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Search by name
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/products?name=ilike.*laptop*" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Pagination
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/products?limit=20&offset=40" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

**Response**:
```json
[
  {
    "id": "uuid",
    "code": "PRD001",
    "name": "Laptop Dell",
    "description": "Laptop Dell Inspiron 15",
    "category": "Electronics",
    "unit_price": 15000000,
    "cost_price": 12000000,
    "current_stock": 25,
    "min_stock_level": 5,
    "location": "A1-01",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

##### POST /products
Create new product (inventory/owner only)
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/products" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PRD002",
    "name": "iPhone 15",
    "description": "iPhone 15 128GB",
    "category": "Electronics",
    "unit_price": 25000000,
    "cost_price": 20000000,
    "current_stock": 10,
    "min_stock_level": 2,
    "location": "A2-05"
  }'
```

##### PATCH /products?id=eq.{product_id}
Update product inventory
```bash
curl -X PATCH "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/products?id=eq.{product_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{"current_stock": 30, "unit_price": 16000000}'
```

#### 3. Customers API

##### GET /customers
List all customers
```bash
# Get all customers
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/customers" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Search customers
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/customers?name=ilike.*Nguyen*" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

**Response**:
```json
[
  {
    "id": "uuid",
    "customer_code": "KH000001",
    "name": "Nguyen Van A",
    "email": "nguyenvana@email.com",
    "phone": "0901234567",
    "address": "123 ABC Street, Ho Chi Minh City",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

##### POST /customers
Create new customer
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/customers" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tran Thi B",
    "email": "tranthib@email.com",
    "phone": "0907654321",
    "address": "456 XYZ Street, Ha Noi"
  }'
```

#### 4. Orders API

##### GET /orders
List orders with relationships
```bash
# Get all orders with customer info
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders?select=*,customers(*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Filter by status
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders?status=eq.processing" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Get orders with items
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders?select=*,order_items(*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

**Response**:
```json
[
  {
    "id": "uuid",
    "order_number": "ORD-000001",
    "customer_id": "uuid",
    "customer_name": "Nguyen Van A",
    "customer_phone": "0901234567",
    "customer_address": "123 ABC Street",
    "status": "processing",
    "order_type": "sale",
    "total_amount": 45000000,
    "paid_amount": 20000000,
    "debt_amount": 25000000,
    "debt_date": "2024-02-01",
    "notes": "Giao hàng trước 15h",
    "contract_number": "CT001",
    "contract_url": "https://...",
    "purchase_order_number": "PO001",
    "created_by": "uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

##### POST /orders
Create new order
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "uuid",
    "customer_name": "Nguyen Van A",
    "customer_phone": "0901234567",
    "customer_address": "123 ABC Street",
    "order_type": "sale",
    "notes": "Giao hàng nhanh",
    "created_by": "current_user_uuid"
  }'
```

##### PATCH /orders?id=eq.{order_id}
Update order status and payment
```bash
curl -X PATCH "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders?id=eq.{order_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "paid_amount": 45000000,
    "debt_amount": 0
  }'
```

#### 5. Order Items API

##### GET /order_items
Get order items with product info
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/order_items?order_id=eq.{order_id}&select=*,products(*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

##### POST /order_items
Add items to order
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/order_items" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "uuid",
    "product_id": "uuid",
    "product_name": "Laptop Dell",
    "product_code": "PRD001",
    "quantity": 2,
    "unit_price": 15000000,
    "total_price": 30000000
  }'
```

#### 6. Export Slips API

##### GET /export_slips
List export slips with relationships
```bash
# Get export slips with order info
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/export_slips?select=*,orders(*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Filter by status
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/export_slips?status=eq.pending" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

**Response**:
```json
[
  {
    "id": "uuid",
    "order_id": "uuid",
    "slip_number": "PX000001",
    "status": "pending",
    "notes": "Kiểm tra kỹ hàng hóa",
    "approval_notes": null,
    "export_notes": null,
    "created_by": "uuid",
    "approved_by": null,
    "approved_at": null,
    "export_completed_by": null,
    "export_completed_at": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

##### POST /export_slips
Create export slip (inventory users only)
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/export_slips" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "uuid",
    "notes": "Xuất kho theo đơn hàng",
    "created_by": "current_user_uuid"
  }'
```

##### PATCH /export_slips?id=eq.{slip_id}
Update export slip status (approval/completion)
```bash
# Approve export slip (accountant only)
curl -X PATCH "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/export_slips?id=eq.{slip_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "approval_notes": "Đã duyệt phiếu xuất",
    "approved_by": "current_user_uuid",
    "approved_at": "2024-01-01T12:00:00Z"
  }'

# Complete export (inventory users only)
curl -X PATCH "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/export_slips?id=eq.{slip_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "export_notes": "Đã xuất kho hoàn thành",
    "export_completed_by": "current_user_uuid",
    "export_completed_at": "2024-01-01T15:00:00Z"
  }'
```

#### 7. Payments API

##### GET /payments
List payments (financial roles only)
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/payments?select=*,orders(*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

##### POST /payments
Record payment (financial roles only)
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/payments" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "uuid",
    "amount": 20000000,
    "payment_method": "bank_transfer",
    "payment_date": "2024-01-01",
    "notes": "Chuyển khoản ngân hàng",
    "created_by": "current_user_uuid"
  }'
```

#### 8. Notifications API

##### GET /notifications
Get user notifications
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/notifications?user_id=eq.{user_id}&order=created_at.desc" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

##### PATCH /notifications?id=eq.{notification_id}
Mark notification as read
```bash
curl -X PATCH "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/notifications?id=eq.{notification_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{"read_at": "2024-01-01T12:00:00Z"}'
```

### Supabase Edge Functions

#### User Management Functions

##### `create-user`
Creates a new user with specified role and profile information.

**Endpoint**: `POST /functions/v1/create-user`
**Authentication**: Required (admin or owner_director only)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "role": "sales"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "timestamp"
  },
  "profile": {
    "id": "uuid",
    "full_name": "John Doe"
  },
  "role": "sales"
}
```

##### `delete-user`
Removes a user from the system.

**Endpoint**: `POST /functions/v1/delete-user`
**Authentication**: Required (admin or owner_director only)
**Note**: Admins cannot delete owner_director users, owner_directors cannot delete other owner_directors

**Request Body**:
```json
{
  "userId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

##### `list-users`
Retrieves all system users with their roles and profiles.

**Endpoint**: `GET /functions/v1/list-users`
**Authentication**: Required (admin or owner_director only)

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "sales",
      "created_at": "timestamp"
    }
  ]
}
```

##### `login-with-username`
Custom authentication endpoint for username-based login.

**Endpoint**: `POST /functions/v1/login-with-username`
**Authentication**: Not required

**Request Body**:
```json
{
  "username": "john_doe",
  "password": "securepassword"
}
```

##### `reset-user-password`
Resets a user's password (admin only privilege).

**Endpoint**: `POST /functions/v1/reset-user-password`
**Authentication**: Required (admin only)

**Request Body**:
```json
{
  "userId": "uuid",
  "newPassword": "newSecurePassword"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

##### `send-order-emails`
Sends automated email notifications for order status changes.

**Endpoint**: `POST /functions/v1/send-order-emails`
**Authentication**: Required

**Request Body**:
```json
{
  "orderId": "uuid",
  "emailType": "status_change",
  "recipientEmail": "customer@example.com"
}
```

### Advanced Query Examples

#### Complex Filtering and Joins

##### Get orders with full details
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders?select=*,customers(*),order_items(*,products(*)),export_slips(*),payments(*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

##### Get low stock products
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/products?current_stock=lt.min_stock_level" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

##### Get pending export slips with order details
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/export_slips?status=eq.pending&select=*,orders(*,customers(*)),export_slip_items(*,products(*))" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

##### Get revenue by date range
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/revenue?revenue_date=gte.2024-01-01&revenue_date=lte.2024-01-31&select=*,orders(*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

#### Aggregations and Statistics

##### Get order statistics
```bash
# Count orders by status
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders?select=status,count" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"

# Sum total amounts by month
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/rest/v1/orders?select=created_at::date,total_amount.sum()" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

### Real-time Subscriptions

#### Subscribe to order changes
```javascript
const { data, error } = await supabase
  .channel('orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders'
  }, payload => {
    console.log('Order changed:', payload)
  })
  .subscribe()
```

#### Subscribe to inventory updates
```javascript
const { data, error } = await supabase
  .channel('inventory')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'products',
    filter: 'current_stock=lt.min_stock_level'
  }, payload => {
    console.log('Low stock alert:', payload)
  })
  .subscribe()
```

### File Upload API

#### Upload order documents
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/storage/v1/object/order-documents/{file_path}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/pdf" \
  --data-binary @document.pdf
```

#### Get file URL
```bash
curl -X GET "https://elogncohkxrriqmvapqo.supabase.co/storage/v1/object/public/order-documents/{file_path}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {anon_key}"
```

### Error Handling

#### Standard Error Responses

**400 Bad Request**:
```json
{
  "code": "PGRST100",
  "details": "JSON object requested, multiple (or no) rows returned",
  "hint": "The result contains 0 rows",
  "message": "No rows found"
}
```

**403 Forbidden**:
```json
{
  "code": "42501",
  "details": "new row violates row-level security policy for table \"orders\"",
  "hint": null,
  "message": "permission denied for table orders"
}
```

**409 Conflict**:
```json
{
  "code": "23505",
  "details": "Key (customer_code)=(KH000001) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint"
}
```

### Rate Limiting and Performance

- **REST API**: 100 requests per second per IP
- **Edge Functions**: 100 requests per minute per user  
- **Real-time**: 200 concurrent connections per project
- **Storage**: 50MB/minute upload bandwidth

### Authentication Flow

#### 1. Sign In
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

#### 2. Refresh Token
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "refresh_token_here"
  }'
```

#### 3. Reset Password
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/auth/v1/recover" \
  -H "apikey: {anon_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Response**:
```json
{
  "message": "Check your email for the confirmation link"
}
```

#### 4. Sign Out
```bash
curl -X POST "https://elogncohkxrriqmvapqo.supabase.co/auth/v1/logout" \
  -H "Authorization: Bearer {access_token}" \
  -H "apikey: {anon_key}"
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account for backend services

### Environment Setup
The application uses Supabase for backend services. Configuration is handled through the Supabase client setup in `src/integrations/supabase/client.ts`.

### Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Access the application at `http://localhost:5173`

### User Roles Setup
After initial deployment, you'll need to set up user roles in the Supabase database:

1. Create your first user through the application
2. Manually set their role to `owner_director` in the `user_roles` table
3. This user can then create and manage other users through the application

## Usage Guide

### For Administrators
1. **User Management**: Create users and assign appropriate roles
2. **Warehouse Setup**: Create and configure warehouses
3. **Inventory Import**: Use Excel import for bulk inventory setup
4. **System Monitoring**: Monitor orders, export slips, and revenue

### For Inventory Managers
1. **Stock Management**: Add/update product quantities
2. **Export Slip Approval**: Review and approve export requests
3. **Warehouse Organization**: Manage product locations

### For Sales Team
1. **Order Creation**: Create orders for customers
2. **Customer Management**: Maintain customer database
3. **Order Tracking**: Monitor order status and fulfillment

### For Accounting
1. **Revenue Tracking**: Monitor financial performance
2. **Payment Status**: Track order payments
3. **Financial Reports**: Generate revenue analytics

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ec292ccd-5f0b-42a0-8051-d944e66f8227) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
