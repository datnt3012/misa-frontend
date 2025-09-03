export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          customer_code: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_code?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_code?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      export_slip_items: {
        Row: {
          actual_quantity: number
          created_at: string
          export_slip_id: string
          id: string
          product_code: string
          product_id: string
          product_name: string
          remaining_quantity: number
          requested_quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          actual_quantity?: number
          created_at?: string
          export_slip_id: string
          id?: string
          product_code: string
          product_id: string
          product_name: string
          remaining_quantity?: number
          requested_quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          export_slip_id?: string
          id?: string
          product_code?: string
          product_id?: string
          product_name?: string
          remaining_quantity?: number
          requested_quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_slip_items_export_slip_id_fkey"
            columns: ["export_slip_id"]
            isOneToOne: false
            referencedRelation: "export_slips"
            referencedColumns: ["id"]
          },
        ]
      }
      export_slips: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          export_completed_at: string | null
          export_completed_by: string | null
          export_notes: string | null
          id: string
          notes: string | null
          order_id: string
          slip_number: string
          status: string
          warehouse_id: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          export_completed_at?: string | null
          export_completed_by?: string | null
          export_notes?: string | null
          id?: string
          notes?: string | null
          order_id: string
          slip_number: string
          status?: string
          warehouse_id?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          export_completed_at?: string | null
          export_completed_by?: string | null
          export_notes?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          slip_number?: string
          status?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_slips_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_slips_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      import_slip_items: {
        Row: {
          created_at: string
          id: string
          import_slip_id: string
          notes: string | null
          po_number: string | null
          product_code: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_slip_id: string
          notes?: string | null
          po_number?: string | null
          product_code: string
          product_id: string
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          import_slip_id?: string
          notes?: string | null
          po_number?: string | null
          product_code?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      import_slips: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          id: string
          import_date: string
          notes: string | null
          slip_number: string
          status: string
          supplier_contact: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_amount: number
          warehouse_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          import_date?: string
          notes?: string | null
          slip_number: string
          status?: string
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          warehouse_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          import_date?: string
          notes?: string | null
          slip_number?: string
          status?: string
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_amount?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_import_slips_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_slips_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          related_order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          related_order_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          related_order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_documents: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          order_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          order_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          order_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_code: string
          product_id: string
          product_name: string
          quantity: number
          stock_warning: boolean | null
          total_price: number
          unit_price: number
          vat_amount: number | null
          vat_rate: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_code: string
          product_id: string
          product_name: string
          quantity: number
          stock_warning?: boolean | null
          total_price: number
          unit_price: number
          vat_amount?: number | null
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_code?: string
          product_id?: string
          product_name?: string
          quantity?: number
          stock_warning?: boolean | null
          total_price?: number
          unit_price?: number
          vat_amount?: number | null
          vat_rate?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          export_slip_action: string | null
          export_slip_id: string | null
          id: string
          new_paid_amount: number | null
          new_status: string
          notes: string | null
          old_paid_amount: number | null
          old_status: string | null
          order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          export_slip_action?: string | null
          export_slip_id?: string | null
          id?: string
          new_paid_amount?: number | null
          new_status: string
          notes?: string | null
          old_paid_amount?: number | null
          old_status?: string | null
          order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          export_slip_action?: string | null
          export_slip_id?: string | null
          id?: string
          new_paid_amount?: number | null
          new_status?: string
          notes?: string | null
          old_paid_amount?: number | null
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_status_history_export_slip"
            columns: ["export_slip_id"]
            isOneToOne: false
            referencedRelation: "export_slips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tag_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          order_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          order_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          order_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tag_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "order_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tags: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          completion_status: string | null
          contract_number: string | null
          contract_url: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          debt_amount: number
          debt_date: string | null
          id: string
          initial_payment: number | null
          notes: string | null
          order_number: string
          order_status: string | null
          order_type: string
          paid_amount: number
          payment_status: string | null
          purchase_order_number: string | null
          status: string
          total_amount: number
          updated_at: string
          vat_amount: number | null
          vat_invoice_email: string | null
          vat_rate: number | null
          vat_type: string | null
        }
        Insert: {
          completion_status?: string | null
          contract_number?: string | null
          contract_url?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          debt_amount?: number
          debt_date?: string | null
          id?: string
          initial_payment?: number | null
          notes?: string | null
          order_number: string
          order_status?: string | null
          order_type?: string
          paid_amount?: number
          payment_status?: string | null
          purchase_order_number?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vat_invoice_email?: string | null
          vat_rate?: number | null
          vat_type?: string | null
        }
        Update: {
          completion_status?: string | null
          contract_number?: string | null
          contract_url?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          debt_amount?: number
          debt_date?: string | null
          id?: string
          initial_payment?: number | null
          notes?: string | null
          order_number?: string
          order_status?: string | null
          order_type?: string
          paid_amount?: number
          payment_status?: string | null
          purchase_order_number?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vat_invoice_email?: string | null
          vat_rate?: number | null
          vat_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          payment_date: string
          payment_method: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          payment_date?: string
          payment_method?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          payment_date?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_changelog: {
        Row: {
          change_type: string
          changed_by: string
          created_at: string | null
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          product_id: string
        }
        Insert: {
          change_type: string
          changed_by: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          product_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_changelog_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          code: string
          cost_price: number
          created_at: string
          current_stock: number
          description: string | null
          id: string
          location: string | null
          min_stock_level: number
          name: string
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          code: string
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          location?: string | null
          min_stock_level?: number
          name: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          code?: string
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          id?: string
          location?: string | null
          min_stock_level?: number
          name?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      provinces_cache: {
        Row: {
          code: string
          created_at: string | null
          districts: Json | null
          id: string
          last_updated: string | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          districts?: Json | null
          id?: string
          last_updated?: string | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          districts?: Json | null
          id?: string
          last_updated?: string | null
          name?: string
        }
        Relationships: []
      }
      revenue: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          order_id: string | null
          payment_id: string | null
          revenue_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          revenue_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          revenue_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_role: Database["public"]["Enums"]["user_role"]
          old_role: Database["public"]["Enums"]["user_role"] | null
          reason: string | null
          target_user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_role: Database["public"]["Enums"]["user_role"]
          old_role?: Database["public"]["Enums"]["user_role"] | null
          reason?: string | null
          target_user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_role?: Database["public"]["Enums"]["user_role"]
          old_role?: Database["public"]["Enums"]["user_role"] | null
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_email_preferences: {
        Row: {
          created_at: string
          id: string
          receive_order_notifications: boolean
          receive_payment_updates: boolean
          receive_status_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          receive_order_notifications?: boolean
          receive_payment_updates?: boolean
          receive_status_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          receive_order_notifications?: boolean
          receive_payment_updates?: boolean
          receive_status_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          address_detail: string | null
          code: string
          created_at: string
          description: string | null
          district_code: string | null
          district_name: string | null
          id: string
          name: string
          province_code: string | null
          province_name: string | null
          updated_at: string
          ward_code: string | null
          ward_name: string | null
        }
        Insert: {
          address?: string | null
          address_detail?: string | null
          code: string
          created_at?: string
          description?: string | null
          district_code?: string | null
          district_name?: string | null
          id?: string
          name: string
          province_code?: string | null
          province_name?: string | null
          updated_at?: string
          ward_code?: string | null
          ward_name?: string | null
        }
        Update: {
          address?: string | null
          address_detail?: string | null
          code?: string
          created_at?: string
          description?: string | null
          district_code?: string | null
          district_name?: string | null
          id?: string
          name?: string
          province_code?: string | null
          province_name?: string | null
          updated_at?: string
          ward_code?: string | null
          ward_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_message: string
          p_order_id?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      generate_customer_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_export_slip_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_import_slip_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_slip_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_product_stock: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_role:
        | "owner_director"
        | "chief_accountant"
        | "accountant"
        | "inventory"
        | "shipper"
        | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: [
        "owner_director",
        "chief_accountant",
        "accountant",
        "inventory",
        "shipper",
        "admin",
      ],
    },
  },
} as const
