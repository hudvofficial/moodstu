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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_code: string | null
          attendance_date: string
          check_in_image_url: string | null
          check_in_location: string | null
          check_in_time: string | null
          check_out_image_url: string | null
          check_out_location: string | null
          check_out_time: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_absent: boolean | null
          notes: string | null
          salary_id: string | null
          total_hours: number | null
          updated_at: string | null
          work_days: number | null
          work_shift_id: string | null
          work_status: string | null
        }
        Insert: {
          attendance_code?: string | null
          attendance_date: string
          check_in_image_url?: string | null
          check_in_location?: string | null
          check_in_time?: string | null
          check_out_image_url?: string | null
          check_out_location?: string | null
          check_out_time?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_absent?: boolean | null
          notes?: string | null
          salary_id?: string | null
          total_hours?: number | null
          updated_at?: string | null
          work_days?: number | null
          work_shift_id?: string | null
          work_status?: string | null
        }
        Update: {
          attendance_code?: string | null
          attendance_date?: string
          check_in_image_url?: string | null
          check_in_location?: string | null
          check_in_time?: string | null
          check_out_image_url?: string | null
          check_out_location?: string | null
          check_out_time?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_absent?: boolean | null
          notes?: string | null
          salary_id?: string | null
          total_hours?: number | null
          updated_at?: string | null
          work_days?: number | null
          work_shift_id?: string | null
          work_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_work_shift_id_fkey"
            columns: ["work_shift_id"]
            isOneToOne: false
            referencedRelation: "work_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          employee_id: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          contract_id: string
          created_at: string | null
          end_date: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id: string
          location: string | null
          notes: string | null
          status: Database["public"]["Enums"]["task_status_enum"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          end_date?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          location?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          location?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          added_by: string | null
          addon_category:
            | Database["public"]["Enums"]["addon_category_enum"]
            | null
          contract_id: string
          created_at: string | null
          discount_amount: number | null
          export_type: Database["public"]["Enums"]["export_type_enum"] | null
          id: string
          inventory_item_id: string | null
          is_addon: boolean | null
          item_name: string
          notes: string | null
          original_price: number | null
          quantity: number | null
          service_id: string | null
          total_amount: number | null
          type: Database["public"]["Enums"]["item_type_enum"]
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          addon_category?:
            | Database["public"]["Enums"]["addon_category_enum"]
            | null
          contract_id: string
          created_at?: string | null
          discount_amount?: number | null
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
          inventory_item_id?: string | null
          is_addon?: boolean | null
          item_name: string
          notes?: string | null
          original_price?: number | null
          quantity?: number | null
          service_id?: string | null
          total_amount?: number | null
          type?: Database["public"]["Enums"]["item_type_enum"]
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          addon_category?:
            | Database["public"]["Enums"]["addon_category_enum"]
            | null
          contract_id?: string
          created_at?: string | null
          discount_amount?: number | null
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
          inventory_item_id?: string | null
          is_addon?: boolean | null
          item_name?: string
          notes?: string | null
          original_price?: number | null
          quantity?: number | null
          service_id?: string | null
          total_amount?: number | null
          type?: Database["public"]["Enums"]["item_type_enum"]
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          assigned_to: string | null
          contract_code: string
          contract_date: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          delivery_date: string | null
          description: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          paid_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status_enum"]
          remaining_amount: number | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status: Database["public"]["Enums"]["contract_status_enum"]
          total_amount: number
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at: string | null
          updated_by: string | null
          work_date: string | null
        }
        Insert: {
          assigned_to?: string | null
          contract_code: string
          contract_date?: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          delivery_date?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          remaining_amount?: number | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status?: Database["public"]["Enums"]["contract_status_enum"]
          total_amount?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
          work_date?: string | null
        }
        Update: {
          assigned_to?: string | null
          contract_code?: string
          contract_date?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          delivery_date?: string | null
          description?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          remaining_amount?: number | null
          service_type?: Database["public"]["Enums"]["service_type_enum"]
          status?: Database["public"]["Enums"]["contract_status_enum"]
          total_amount?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          care_history: string | null
          care_type: string | null
          contact_date: string
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          needs: string | null
          next_contact_date: string | null
          notes: string | null
          phone: string | null
          potential: string | null
          social_link: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          care_history?: string | null
          care_type?: string | null
          contact_date?: string
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          needs?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          potential?: string | null
          social_link?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          care_history?: string | null
          care_type?: string | null
          contact_date?: string
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          needs?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          potential?: string | null
          social_link?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          alt_phone: string | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          customer_code: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          wedding_date: string | null
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_code: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          wedding_date?: string | null
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_code?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          wedding_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          due_date: string | null
          entity_id: string | null
          entity_name: string
          entity_type: string
          id: string
          notes: string | null
          paid_amount: number | null
          remaining: number | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_name: string
          entity_type: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          remaining?: number | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          remaining?: number | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          document_code: string
          document_type: string
          file_url: string | null
          id: string
          name: string
          penalty_amount: number | null
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          document_code: string
          document_type: string
          file_url?: string | null
          id?: string
          name: string
          penalty_amount?: number | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          document_code?: string
          document_type?: string
          file_url?: string | null
          id?: string
          name?: string
          penalty_amount?: number | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salaries: {
        Row: {
          additional_days: number | null
          advance_payment: number | null
          attendance_days: number | null
          base_salary: number | null
          bonus: number | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          kpi_achieved: number | null
          kpi_percentage: number | null
          kpi_target: number | null
          month: number
          monthly_salary: number | null
          monthly_salary_id: string | null
          net_salary: number | null
          notes: string | null
          paid_amount: number | null
          penalty: number | null
          product_salary: number | null
          remaining_amount: number | null
          total_salary: number | null
          total_work_days: number | null
          total_work_hours: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          additional_days?: number | null
          advance_payment?: number | null
          attendance_days?: number | null
          base_salary?: number | null
          bonus?: number | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          kpi_achieved?: number | null
          kpi_percentage?: number | null
          kpi_target?: number | null
          month: number
          monthly_salary?: number | null
          monthly_salary_id?: string | null
          net_salary?: number | null
          notes?: string | null
          paid_amount?: number | null
          penalty?: number | null
          product_salary?: number | null
          remaining_amount?: number | null
          total_salary?: number | null
          total_work_days?: number | null
          total_work_hours?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          additional_days?: number | null
          advance_payment?: number | null
          attendance_days?: number | null
          base_salary?: number | null
          bonus?: number | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          kpi_achieved?: number | null
          kpi_percentage?: number | null
          kpi_target?: number | null
          month?: number
          monthly_salary?: number | null
          monthly_salary_id?: string | null
          net_salary?: number | null
          notes?: string | null
          paid_amount?: number | null
          penalty?: number | null
          product_salary?: number | null
          remaining_amount?: number | null
          total_salary?: number | null
          total_work_days?: number | null
          total_work_hours?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_monthly_salary_id_fkey"
            columns: ["monthly_salary_id"]
            isOneToOne: false
            referencedRelation: "monthly_salaries"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          department: string | null
          email: string | null
          employee_code: string
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["employee_role_enum"]
          salary_info: Json | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          employee_code: string
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["employee_role_enum"]
          salary_info?: Json | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["employee_role_enum"]
          salary_info?: Json | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          condition: string | null
          created_at: string | null
          created_by: string | null
          current_holder: string | null
          current_value: number | null
          depreciation_rate_yearly: number | null
          equipment_code: string
          equipment_name: string
          equipment_type: string | null
          id: string
          image_url: string | null
          location: string | null
          manufacturer: string | null
          monthly_depreciation: number | null
          months_used: number | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          supplier: string | null
          warranty_months: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          current_holder?: string | null
          current_value?: number | null
          depreciation_rate_yearly?: number | null
          equipment_code: string
          equipment_name: string
          equipment_type?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          manufacturer?: string | null
          monthly_depreciation?: number | null
          months_used?: number | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          supplier?: string | null
          warranty_months?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          current_holder?: string | null
          current_value?: number | null
          depreciation_rate_yearly?: number | null
          equipment_code?: string
          equipment_name?: string
          equipment_type?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          manufacturer?: string | null
          monthly_depreciation?: number | null
          months_used?: number | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          supplier?: string | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_holder_fkey"
            columns: ["current_holder"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          employee_id: string
          employee_salary_id: string | null
          evaluation_date: string
          evaluation_type: string
          id: string
          level: string | null
          monthly_salary_id: string | null
          notes: string | null
          times: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_id: string
          employee_salary_id?: string | null
          evaluation_date?: string
          evaluation_type: string
          id?: string
          level?: string | null
          monthly_salary_id?: string | null
          notes?: string | null
          times?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          employee_id?: string
          employee_salary_id?: string | null
          evaluation_date?: string
          evaluation_type?: string
          id?: string
          level?: string | null
          monthly_salary_id?: string | null
          notes?: string | null
          times?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_employee_salary_id_fkey"
            columns: ["employee_salary_id"]
            isOneToOne: false
            referencedRelation: "employee_salaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_monthly_salary_id_fkey"
            columns: ["monthly_salary_id"]
            isOneToOne: false
            referencedRelation: "monthly_salaries"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          expense_date: string
          id: string
          image_url: string | null
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          recipient: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          image_url?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          recipient?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          image_url?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          recipient?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          cost_code: string
          cost_name: string
          cost_type: string | null
          created_at: string | null
          created_by: string | null
          deposit_amount: number | null
          description: string | null
          end_date: string | null
          id: string
          monthly_amount: number | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          cost_code: string
          cost_name: string
          cost_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deposit_amount?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          monthly_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_code?: string
          cost_name?: string
          cost_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deposit_amount?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          monthly_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      galleries: {
        Row: {
          access_url: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          id: string
          password: string | null
          selection_deadline: string | null
          shared_at: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          access_url?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          password?: string | null
          selection_deadline?: string | null
          shared_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          access_url?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          password?: string | null
          selection_deadline?: string | null
          shared_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "galleries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galleries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          client_note: string | null
          created_at: string | null
          gallery_id: string
          id: string
          image_url: string
          is_selected: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
        }
        Insert: {
          client_note?: string | null
          created_at?: string | null
          gallery_id: string
          id?: string
          image_url: string
          is_selected?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          client_note?: string | null
          created_at?: string | null
          gallery_id?: string
          id?: string
          image_url?: string
          is_selected?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          color: string | null
          condition: string | null
          created_at: string | null
          current_stock: number | null
          id: string
          image_url: string | null
          item_code: string
          min_stock: number | null
          name: string
          notes: string | null
          rental_price: number | null
          sale_price: number | null
          size: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          image_url?: string | null
          item_code: string
          min_stock?: number | null
          name: string
          notes?: string | null
          rental_price?: number | null
          sale_price?: number | null
          size?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          image_url?: string | null
          item_code?: string
          min_stock?: number | null
          name?: string
          notes?: string | null
          rental_price?: number | null
          sale_price?: number | null
          size?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_reservations: {
        Row: {
          contract_id: string | null
          contract_item_id: string | null
          created_at: string | null
          customer_id: string | null
          end_date: string
          export_type: Database["public"]["Enums"]["export_type_enum"] | null
          id: string
          inventory_item_id: string
          notes: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contract_id?: string | null
          contract_item_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_date: string
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_id?: string | null
          contract_item_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          end_date?: string
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_contract_item_id_fkey"
            columns: ["contract_item_id"]
            isOneToOne: false
            referencedRelation: "contract_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_services: {
        Row: {
          cost_price: number | null
          created_at: string | null
          id: string
          item_name: string
          lab_id: string
          updated_at: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          item_name: string
          lab_id: string
          updated_at?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          id?: string
          item_name?: string
          lab_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_services_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          id: string
          lab_name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          lab_name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          lab_name?: string
          phone?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          email: string
          id: string
          last_attempt: string | null
          locked_until: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          email: string
          id?: string
          last_attempt?: string | null
          locked_until?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          email?: string
          id?: string
          last_attempt?: string | null
          locked_until?: string | null
        }
        Relationships: []
      }
      monthly_salaries: {
        Row: {
          advance_total: number | null
          base_salary_total: number | null
          bonus_total: number | null
          created_at: string | null
          created_by: string | null
          id: string
          month: number
          penalty_total: number | null
          product_salary_total: number | null
          salary_code: string
          total_employees: number | null
          total_salary: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          advance_total?: number | null
          base_salary_total?: number | null
          bonus_total?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month: number
          penalty_total?: number | null
          product_salary_total?: number | null
          salary_code: string
          total_employees?: number | null
          total_salary?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          advance_total?: number | null
          base_salary_total?: number | null
          bonus_total?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: number
          penalty_total?: number | null
          product_salary_total?: number | null
          salary_code?: string
          total_employees?: number | null
          total_salary?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_salaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          employee_id: string | null
          id: string
          is_read: boolean | null
          resource_id: string | null
          resource_type: string | null
          title: string
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          is_read?: boolean | null
          resource_id?: string | null
          resource_type?: string | null
          title: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          is_read?: boolean | null
          resource_id?: string | null
          resource_type?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          amount: number
          contract_id: string
          created_at: string | null
          due_date: string | null
          id: string
          receipt_id: string | null
          stage_name: string
          status: string | null
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          receipt_id?: string | null
          stage_name: string
          status?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          receipt_id?: string | null
          stage_name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_by: string | null
          category_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          payment_stage: string | null
          receipt_code: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          payment_stage?: string | null
          receipt_code?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          payment_stage?: string | null
          receipt_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      printing_orders: {
        Row: {
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          delivered_date: string | null
          expected_date: string | null
          id: string
          items: Json | null
          lab_id: string | null
          notes: string | null
          order_code: string | null
          order_date: string | null
          payment_status: string | null
          received_date: string | null
          status: Database["public"]["Enums"]["printing_status_enum"] | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_date?: string | null
          expected_date?: string | null
          id?: string
          items?: Json | null
          lab_id?: string | null
          notes?: string | null
          order_code?: string | null
          order_date?: string | null
          payment_status?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["printing_status_enum"] | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_date?: string | null
          expected_date?: string | null
          id?: string
          items?: Json | null
          lab_id?: string | null
          notes?: string | null
          order_code?: string | null
          order_date?: string | null
          payment_status?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["printing_status_enum"] | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printing_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printing_orders_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string | null
          discount_type: string | null
          discount_value: number
          end_date: string | null
          id: string
          max_discount_amount: number | null
          min_order_value: number | null
          promo_code: string
          promo_name: string
          start_date: string | null
          status: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          created_at?: string | null
          discount_type?: string | null
          discount_value: number
          end_date?: string | null
          id?: string
          max_discount_amount?: number | null
          min_order_value?: number | null
          promo_code: string
          promo_name: string
          start_date?: string | null
          status?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number
          end_date?: string | null
          id?: string
          max_discount_amount?: number | null
          min_order_value?: number | null
          promo_code?: string
          promo_name?: string
          start_date?: string | null
          status?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          amount: number | null
          approval_date: string | null
          approver_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string | null
          leave_type: string | null
          message: string | null
          notes: string | null
          reason: string | null
          request_date: string
          request_type: string
          requester_id: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          approval_date?: string | null
          approver_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          leave_type?: string | null
          message?: string | null
          notes?: string | null
          reason?: string | null
          request_date?: string
          request_type: string
          requester_id: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          approval_date?: string | null
          approver_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          leave_type?: string | null
          message?: string | null
          notes?: string | null
          reason?: string | null
          request_date?: string
          request_type?: string
          requester_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          contract_id: string | null
          created_at: string | null
          employee_id: string
          end_date: string | null
          event_date: string
          id: string
          location: string | null
          notes: string | null
          role_in_event: Database["public"]["Enums"]["work_type_enum"] | null
          updated_at: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          employee_id: string
          end_date?: string | null
          event_date: string
          id?: string
          location?: string | null
          notes?: string | null
          role_in_event?: Database["public"]["Enums"]["work_type_enum"] | null
          updated_at?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string | null
          event_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          role_in_event?: Database["public"]["Enums"]["work_type_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          selling_price: number
          service_code: string
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          selling_price?: number
          service_code: string
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          selling_price?: number
          service_code?: string
          service_type?: Database["public"]["Enums"]["service_type_enum"]
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_info: {
        Row: {
          address: string | null
          bank_info: Json | null
          created_at: string | null
          hotline: string | null
          id: string
          logo_url: string | null
          name: string
          representative: string | null
          social_links: Json | null
          timezone: string | null
          updated_at: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          bank_info?: Json | null
          created_at?: string | null
          hotline?: string | null
          id?: string
          logo_url?: string | null
          name: string
          representative?: string | null
          social_links?: Json | null
          timezone?: string | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          bank_info?: Json | null
          created_at?: string | null
          hotline?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          representative?: string | null
          social_links?: Json | null
          timezone?: string | null
          updated_at?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          category_code: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          category_code: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          category_code?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      work_shifts: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          lunch_break_hours: number | null
          shift_name: string
          standard_hours: number
          start_time: string
          total_hours: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          lunch_break_hours?: number | null
          shift_name: string
          standard_hours: number
          start_time: string
          total_hours: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          lunch_break_hours?: number | null
          shift_name?: string
          standard_hours?: number
          start_time?: string
          total_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_tasks: {
        Row: {
          assigned_to: string | null
          completion_date: string | null
          contract_id: string
          cost: number | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          event_id: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status_enum"] | null
          updated_at: string | null
          work_type: Database["public"]["Enums"]["work_type_enum"]
        }
        Insert: {
          assigned_to?: string | null
          completion_date?: string | null
          contract_id: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          updated_at?: string | null
          work_type: Database["public"]["Enums"]["work_type_enum"]
        }
        Update: {
          assigned_to?: string | null
          completion_date?: string | null
          contract_id?: string
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status_enum"] | null
          updated_at?: string | null
          work_type?: Database["public"]["Enums"]["work_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "work_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "contract_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_inventory_conflict: {
        Args: {
          p_end_date: string
          p_exclude_reservation_id?: string
          p_item_id: string
          p_start_date: string
        }
        Returns: boolean
      }
      get_contract_balance: { Args: { p_contract_id: string }; Returns: Json }
      get_current_employee_id: { Args: never; Returns: string }
      get_current_employee_role: {
        Args: never
        Returns: Database["public"]["Enums"]["employee_role_enum"]
      }
      recalc_contract_totals: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
    }
    Enums: {
      addon_category_enum:
        | "makeup"
        | "trang_phuc"
        | "phu_kien"
        | "them_gio"
        | "khac"
      contract_status_enum:
        | "cho_xu_ly"
        | "dang_thuc_hien"
        | "hoan_thanh"
        | "da_huy"
      employee_role_enum: "admin" | "manager" | "sale" | "media" | "ctv"
      event_type_enum: "ngay_chup" | "ngay_to_chuc" | "hau_ky" | "giao_san_pham"
      export_type_enum: "xuat_ban" | "xuat_thue"
      item_type_enum: "dich_vu" | "san_pham" | "trang_phuc" | "phat_sinh"
      payment_method_enum: "tien_mat" | "chuyen_khoan"
      payment_status_enum:
        | "chua_thanh_toan"
        | "da_coc"
        | "thanh_toan_mot_phan"
        | "da_thanh_toan"
        | "hoan_tien"
      printing_status_enum: "moi" | "dang_in" | "da_ve" | "da_giao"
      service_type_enum:
        | "studio"
        | "ngay_cuoi"
        | "combo"
        | "baby"
        | "gia_dinh"
        | "sinh_nhat"
        | "bau"
        | "concept"
        | "couple"
        | "ky_yeu"
        | "media"
        | "khac"
      task_status_enum: "chua_lam" | "dang_lam" | "hoan_thanh" | "da_huy"
      transaction_type_enum: "hop_dong" | "hoa_don"
      work_type_enum:
        | "concept"
        | "kich_ban"
        | "chup_anh"
        | "quay_phim"
        | "makeup"
        | "tro_ly"
        | "cameraman"
        | "hau_ky_anh"
        | "dung_phim"
        | "retouch"
        | "premiere"
        | "bien_tap"
        | "khac"
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
      addon_category_enum: [
        "makeup",
        "trang_phuc",
        "phu_kien",
        "them_gio",
        "khac",
      ],
      contract_status_enum: [
        "cho_xu_ly",
        "dang_thuc_hien",
        "hoan_thanh",
        "da_huy",
      ],
      employee_role_enum: ["admin", "manager", "sale", "media", "ctv"],
      event_type_enum: ["ngay_chup", "ngay_to_chuc", "hau_ky", "giao_san_pham"],
      export_type_enum: ["xuat_ban", "xuat_thue"],
      item_type_enum: ["dich_vu", "san_pham", "trang_phuc", "phat_sinh"],
      payment_method_enum: ["tien_mat", "chuyen_khoan"],
      payment_status_enum: [
        "chua_thanh_toan",
        "da_coc",
        "thanh_toan_mot_phan",
        "da_thanh_toan",
        "hoan_tien",
      ],
      printing_status_enum: ["moi", "dang_in", "da_ve", "da_giao"],
      service_type_enum: [
        "studio",
        "ngay_cuoi",
        "combo",
        "baby",
        "gia_dinh",
        "sinh_nhat",
        "bau",
        "concept",
        "couple",
        "ky_yeu",
        "media",
        "khac",
      ],
      task_status_enum: ["chua_lam", "dang_lam", "hoan_thanh", "da_huy"],
      transaction_type_enum: ["hop_dong", "hoa_don"],
      work_type_enum: [
        "concept",
        "kich_ban",
        "chup_anh",
        "quay_phim",
        "makeup",
        "tro_ly",
        "cameraman",
        "hau_ky_anh",
        "dung_phim",
        "retouch",
        "premiere",
        "bien_tap",
        "khac",
      ],
    },
  },
} as const

