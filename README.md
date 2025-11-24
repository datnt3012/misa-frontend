# Inventory Management System

A comprehensive inventory management system built with React, TypeScript, and a custom backend API. This application provides complete warehouse management, order processing, export slip generation, and user role management capabilities.

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
- **Custom Backend API** - RESTful API built with Node.js/Express
  - PostgreSQL database with proper authentication
  - JWT-based authentication system
  - Role-based access control
  - RESTful endpoints for all operations
  - File upload and management

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Date-fns** - Date utility library
- **Zod** - Schema validation

## Database Schema

The application uses PostgreSQL with the following main tables:

### Core Tables
- `users` - User authentication and profiles
- `user_roles` - User role assignments
- `warehouses` - Warehouse information
- `products` - Product catalog and inventory
- `stock_levels` - Real-time stock tracking per warehouse
- `customers` - Customer database
- `suppliers` - Supplier management
- `orders` - Order management
- `order_items` - Order line items
- `warehouse_receipts` - Import slip tracking
- `warehouse_receipt_items` - Import slip line items
- `export_slips` - Export slip tracking
- `export_slip_items` - Export slip line items
- `payments` - Payment tracking
- `notifications` - System notifications

### Security
The backend implements proper authentication and authorization middleware to ensure data access is properly restricted based on user roles and permissions.

## API Documentation

### Custom Backend REST API Endpoints

The application uses a custom backend API built with Node.js/Express. All endpoints follow the pattern:
`http://localhost:3274/api/v0/{endpoint}`

#### Authentication Headers
All API requests require authentication headers:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

#### Base Configuration
- **Base URL**: `http://localhost:3274/api/v0`
- **Authentication**: JWT-based authentication
- **Content-Type**: `application/json`
- **Timeout**: 30 seconds

### Core Entity APIs

#### 1. Warehouses API

##### GET /warehouses
List all warehouses
```bash
curl -X GET "http://localhost:3274/api/v0/warehouses" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "code": 200,
  "data": {
    "count": 1,
    "rows": [
      {
        "id": "uuid",
        "code": "WH001",
        "name": "Kho chính",
        "address": "123 Main Street",
        "description": "Kho hàng chính",
        "isDeleted": false,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "page": 1,
    "limit": 100,
    "totalPage": 1
  },
  "message": "Warehouses retrieved successfully"
}
```

##### POST /warehouses
Create new warehouse (inventory/admin/owner only)
```bash
curl -X POST "http://localhost:3274/api/v0/warehouses" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WH002",
    "name": "Kho phụ",
    "address": "456 Secondary St",
    "description": "Kho hàng phụ"
  }'
```

##### PATCH /warehouses/{warehouse_id}
Update warehouse
```bash
curl -X PATCH "http://localhost:3274/api/v0/warehouses/{warehouse_id}" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated warehouse name"}'
```

#### 2. Products API

##### GET /products
List all products with filtering and pagination
```bash
# Get all products
curl -X GET "http://localhost:3274/api/v0/products" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"

# Filter by category
curl -X GET "http://localhost:3274/api/v0/products?category=Electronics" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"

# Search by name
curl -X GET "http://localhost:3274/api/v0/products?search=laptop" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"

# Pagination
curl -X GET "http://localhost:3274/api/v0/products?page=1&limit=20" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "code": 200,
  "data": {
    "count": 1,
    "rows": [
      {
        "id": "uuid",
        "code": "PRD001",
        "name": "Laptop Dell",
        "description": "Laptop Dell Inspiron 15",
        "category": "Electronics",
        "price": "15000000.00",
        "costPrice": "12000000.00",
        "barcode": "1234567890123",
        "unit": "piece",
        "isDeleted": false,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "page": 1,
    "limit": 100,
    "totalPage": 1
  },
  "message": "Products retrieved successfully"
}
```

##### POST /products
Create new product (inventory/owner only)
```bash
curl -X POST "http://localhost:3274/api/v0/products" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PRD002",
    "name": "iPhone 15",
    "description": "iPhone 15 128GB",
    "category": "Electronics",
    "price": 25000000,
    "costPrice": 20000000,
    "barcode": "9876543210987",
    "unit": "piece"
  }'
```

##### PATCH /products/{product_id}
Update product
```bash
curl -X PATCH "http://localhost:3274/api/v0/products/{product_id}" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"price": 16000000, "costPrice": 13000000}'
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
# Get all orders
curl -X GET "http://localhost:3274/api/v0/orders" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"

# Filter by status
curl -X GET "http://localhost:3274/api/v0/orders?status=processing" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"

# Search orders
curl -X GET "http://localhost:3274/api/v0/orders?search=customer_name" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"

# Pagination
curl -X GET "http://localhost:3274/api/v0/orders?page=1&limit=20" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "code": 200,
  "data": {
    "count": 1,
    "rows": [
      {
        "id": "uuid",
        "order_number": "ORD-000001",
        "customer_id": "uuid",
        "customer_name": "Nguyen Van A",
        "customer_phone": "0901234567",
        "customer_address": "123 ABC Street",
        "status": "processing",
        "order_type": "sale",
        "total_amount": "45000000.00",
        "paid_amount": "20000000.00",
        "debt_amount": "25000000.00",
        "debt_date": "2024-02-01",
        "notes": "Giao hàng trước 15h",
        "contract_number": "CT001",
        "purchase_order_number": "PO001",
        "created_by": "uuid",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "customer": {
          "id": "uuid",
          "name": "Nguyen Van A",
          "email": "customer@email.com",
          "phone": "0901234567"
        },
        "items": [
          {
            "id": "uuid",
            "product_id": "uuid",
            "product_name": "Laptop Dell",
            "product_code": "PRD001",
            "quantity": 2,
            "unit_price": "15000000.00",
            "total_price": "30000000.00"
          }
        ]
      }
    ],
    "page": 1,
    "limit": 100,
    "totalPage": 1
  },
  "message": "Orders retrieved successfully"
}
```

##### POST /orders
Create new order
```bash
curl -X POST "http://localhost:3274/api/v0/orders" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid",
    "paymentMethod": "cash",
    "totalAmount": 45000000,
    "details": [
      {
        "productId": "uuid",
        "quantity": 2,
        "unitPrice": 15000000,
        "warehouseId": "uuid"
      }
    ]
  }'
```

##### PATCH /orders/{order_id}
Update order status and payment
```bash
curl -X PATCH "http://localhost:3274/api/v0/orders/{order_id}" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped",
    "paid_amount": 45000000,
    "debt_amount": 0
  }'
```

#### 5. Stock Levels API

##### GET /stock-levels
Get real-time stock levels across warehouses
```bash
curl -X GET "http://localhost:3274/api/v0/stock-levels" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "code": 200,
  "data": {
    "count": 1,
    "rows": [
      {
        "id": "uuid",
        "productId": "uuid",
        "warehouseId": "uuid",
        "quantity": 25,
        "product": {
          "id": "uuid",
          "code": "PRD001",
          "name": "Laptop Dell"
        },
        "warehouse": {
          "id": "uuid",
          "code": "WH001",
          "name": "Kho chính"
        }
      }
    ]
  },
  "message": "Stock levels retrieved successfully"
}
```

#### 6. Suppliers API

##### GET /suppliers
List all suppliers
```bash
curl -X GET "http://localhost:3274/api/v0/suppliers" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

##### POST /suppliers
Create new supplier
```bash
curl -X POST "http://localhost:3274/api/v0/suppliers" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUP001",
    "name": "Nhà cung cấp A",
    "phoneNumber": "0901234567",
    "email": "supplier@email.com",
    "address": "123 Supplier Street"
  }'
```

#### 7. Warehouse Receipts API (Import Slips)

##### GET /warehouse-receipts
List warehouse receipts (import slips)
```bash
curl -X GET "http://localhost:3274/api/v0/warehouse-receipts" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

##### POST /warehouse-receipts
Create new warehouse receipt
```bash
curl -X POST "http://localhost:3274/api/v0/warehouse-receipts" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseId": "uuid",
    "supplierId": "uuid",
    "code": "IMP001",
    "description": "Nhập kho từ nhà cung cấp",
    "status": "pending",
    "type": "import",
    "details": [
      {
        "productId": "uuid",
        "quantity": 100,
        "unitPrice": 50000
      }
    ]
  }'
```

##### PATCH /warehouse-receipts/{receipt_id}/approve
Approve warehouse receipt
```bash
curl -X PATCH "http://localhost:3274/api/v0/warehouse-receipts/{receipt_id}/approve" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "approvalNotes": "Đã duyệt phiếu nhập kho"
  }'
```

#### 8. Export Slips API

##### GET /export-slips
List export slips with relationships
```bash
curl -X GET "http://localhost:3274/api/v0/export-slips" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

##### POST /export-slips
Create export slip (inventory users only)
```bash
curl -X POST "http://localhost:3274/api/v0/export-slips" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "uuid",
    "notes": "Xuất kho theo đơn hàng"
  }'
```

##### PATCH /export-slips/{slip_id}/approve
Approve export slip
```bash
curl -X PATCH "http://localhost:3274/api/v0/export-slips/{slip_id}/approve" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "approvalNotes": "Đã duyệt phiếu xuất"
  }'
```

##### PATCH /export-slips/{slip_id}/complete
Complete export slip
```bash
curl -X PATCH "http://localhost:3274/api/v0/export-slips/{slip_id}/complete" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "exportNotes": "Đã xuất kho hoàn thành"
  }'
```

#### 9. Authentication API

##### POST /auth/login
User login
```bash
curl -X POST "http://localhost:3274/api/v0/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

**Response**:
```json
{
  "code": 200,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "sales"
    },
    "token": "jwt_token_here"
  },
  "message": "Login successful"
}
```

##### POST /auth/register
User registration
```bash
curl -X POST "http://localhost:3274/api/v0/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

##### POST /auth/refresh
Refresh JWT token
```bash
curl -X POST "http://localhost:3274/api/v0/auth/refresh" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

### Error Handling

#### Standard Error Responses

**400 Bad Request**:
```json
{
  "message": ["Field is required", "Invalid format"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**401 Unauthorized**:
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

**403 Forbidden**:
```json
{
  "message": "Forbidden",
  "statusCode": 403
}
```

**404 Not Found**:
```json
{
  "message": "Resource not found",
  "statusCode": 404
}
```

**409 Conflict**:
```json
{
  "message": "Resource already exists",
  "statusCode": 409
}
```

**500 Internal Server Error**:
```json
{
  "message": "Internal server error",
  "statusCode": 500
}
```

### Rate Limiting and Performance

- **API Requests**: 1000 requests per hour per user
- **File Uploads**: 10MB maximum file size
- **Response Time**: < 500ms for most operations
- **Concurrent Users**: 1000+ supported

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
