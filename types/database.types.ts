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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addon_history: {
        Row: {
          addon_category:
            | Database["public"]["Enums"]["addon_category_enum"]
            | null
          addon_name: string
          created_at: string | null
          id: string
          last_price: number | null
          last_used_at: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          addon_category?:
            | Database["public"]["Enums"]["addon_category_enum"]
            | null
          addon_name: string
          created_at?: string | null
          id?: string
          last_price?: number | null
          last_used_at?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          addon_category?:
            | Database["public"]["Enums"]["addon_category_enum"]
            | null
          addon_name?: string
          created_at?: string | null
          id?: string
          last_price?: number | null
          last_used_at?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          active_leaf_message_id: string | null
          created_at: string
          id: string
          last_message_preview: string | null
          locked_by: string | null
          locked_until: string | null
          message_count: number
          summary: string | null
          summary_updated_at: string | null
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          active_leaf_message_id?: string | null
          created_at?: string
          id?: string
          last_message_preview?: string | null
          locked_by?: string | null
          locked_until?: string | null
          message_count?: number
          summary?: string | null
          summary_updated_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          active_leaf_message_id?: string | null
          created_at?: string
          id?: string
          last_message_preview?: string | null
          locked_by?: string | null
          locked_until?: string | null
          message_count?: number
          summary?: string | null
          summary_updated_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          parent_message_id: string | null
          request_id: string | null
          revision: number
          role: string
          status: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_message_id?: string | null
          request_id?: string | null
          revision?: number
          role: string
          status?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parent_message_id?: string | null
          request_id?: string | null
          revision?: number
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_turns: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          error: string | null
          id: string
          last_sequence: number
          request_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          error?: string | null
          id: string
          last_sequence?: number
          request_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          error?: string | null
          id?: string
          last_sequence?: number
          request_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_turns_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moodie_message_feedback: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_id: string
          note: string | null
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_id: string
          note?: string | null
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_id?: string
          note?: string | null
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moodie_message_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moodie_message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      moodie_memories: {
        Row: {
          confidence: number
          content: string
          conversation_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_confirmed_at: string | null
          memory_type: string
          scope: string
          source_message_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confidence?: number
          content: string
          conversation_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_confirmed_at?: string | null
          memory_type: string
          scope: string
          source_message_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confidence?: number
          content?: string
          conversation_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_confirmed_at?: string | null
          memory_type?: string
          scope?: string
          source_message_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moodie_memories_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moodie_memories_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }

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
          description: string | null
          employee_id: string | null
          id: string
          ip_address: string | null
          log_type: Database["public"]["Enums"]["log_type_enum"]
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          record_id: string | null
          severity: Database["public"]["Enums"]["severity_enum"]
          source: Database["public"]["Enums"]["log_source_enum"]
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          log_type?: Database["public"]["Enums"]["log_type_enum"]
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id?: string | null
          severity?: Database["public"]["Enums"]["severity_enum"]
          source?: Database["public"]["Enums"]["log_source_enum"]
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          ip_address?: string | null
          log_type?: Database["public"]["Enums"]["log_type_enum"]
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id?: string | null
          severity?: Database["public"]["Enums"]["severity_enum"]
          source?: Database["public"]["Enums"]["log_source_enum"]
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
      budgets: {
        Row: {
          budget_amount: number
          category_name: string
          created_at: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          period_month: number
          period_year: number
          updated_at: string | null
        }
        Insert: {
          budget_amount?: number
          category_name: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          updated_at?: string | null
        }
        Update: {
          budget_amount?: number
          category_name?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          category: string
          created_at: string | null
          event_stage: string
          id: string
          is_active: boolean | null
          item_name: string
          service_type: string
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          event_stage: string
          id?: string
          is_active?: boolean | null
          item_name: string
          service_type: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          event_stage?: string
          id?: string
          is_active?: boolean | null
          item_name?: string
          service_type?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      contract_checklists: {
        Row: {
          category: string
          contract_id: string
          created_at: string | null
          event_stage: string | null
          id: string
          is_completed: boolean | null
          item_name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          contract_id: string
          created_at?: string | null
          event_stage?: string | null
          id?: string
          is_completed?: boolean | null
          item_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          contract_id?: string
          created_at?: string | null
          event_stage?: string | null
          id?: string
          is_completed?: boolean | null
          item_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_checklists_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          contract_id: string
          created_at: string | null
          deadline: string | null
          deleted_at: string | null
          end_date: string | null
          end_time: string | null
          event_date: string | null
          event_type: Database["public"]["Enums"]["event_type_enum"]
          google_event_id: string | null
          google_sync_error: string | null
          google_sync_status: string
          google_synced_at: string | null
          id: string
          is_manual_date: boolean | null
          location: string | null
          notes: string | null
          phase: string | null
          sort_order: number | null
          start_time: string | null
          status: string | null
          sync_to_google: boolean
          title: string | null
          updated_at: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          deadline?: string | null
          deleted_at?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type: Database["public"]["Enums"]["event_type_enum"]
          google_event_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          google_synced_at?: string | null
          id?: string
          is_manual_date?: boolean | null
          location?: string | null
          notes?: string | null
          phase?: string | null
          sort_order?: number | null
          start_time?: string | null
          status?: string | null
          sync_to_google?: boolean
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          deadline?: string | null
          deleted_at?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          google_event_id?: string | null
          google_sync_error?: string | null
          google_sync_status?: string
          google_synced_at?: string | null
          id?: string
          is_manual_date?: boolean | null
          location?: string | null
          notes?: string | null
          phase?: string | null
          sort_order?: number | null
          start_time?: string | null
          status?: string | null
          sync_to_google?: boolean
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
          deleted_at: string | null
          discount_amount: number | null
          dress_id: string | null
          export_type: Database["public"]["Enums"]["export_type_enum"] | null
          id: string
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
          deleted_at?: string | null
          discount_amount?: number | null
          dress_id?: string | null
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
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
          deleted_at?: string | null
          discount_amount?: number | null
          dress_id?: string | null
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
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
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_inventory_item_id_fkey"
            columns: ["dress_id"]
            isOneToOne: false
            referencedRelation: "dresses"
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
      contract_notes: {
        Row: {
          content: string
          contract_id: string
          created_at: string | null
          created_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_notes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          assigned_to: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
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
          payment_status: string
          remaining_amount: number | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status: string
          total_amount: number
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at: string | null
          updated_by: string | null
          work_date: string | null
        }
        Insert: {
          assigned_to?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
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
          payment_status?: string
          remaining_amount?: number | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          status?: string
          total_amount?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
          work_date?: string | null
        }
        Update: {
          assigned_to?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
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
          payment_status?: string
          remaining_amount?: number | null
          service_type?: Database["public"]["Enums"]["service_type_enum"]
          status?: string
          total_amount?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string | null
          updated_by?: string | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          bank_name: string
          card_label: string | null
          created_at: string | null
          credit_limit: number | null
          deleted_at: string | null
          due_day: number
          due_next_month: boolean | null
          id: string
          last_4: string | null
          statement_day: number
          updated_at: string | null
        }
        Insert: {
          bank_name: string
          card_label?: string | null
          created_at?: string | null
          credit_limit?: number | null
          deleted_at?: string | null
          due_day?: number
          due_next_month?: boolean | null
          id?: string
          last_4?: string | null
          statement_day?: number
          updated_at?: string | null
        }
        Update: {
          bank_name?: string
          card_label?: string | null
          created_at?: string | null
          credit_limit?: number | null
          deleted_at?: string | null
          due_day?: number
          due_next_month?: boolean | null
          id?: string
          last_4?: string | null
          statement_day?: number
          updated_at?: string | null
        }
        Relationships: []
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
          deal_value: number | null
          deleted_at: string | null
          email: string | null
          id: string
          lost_reason: string | null
          needs: string | null
          next_contact_date: string | null
          notes: string | null
          phone: string | null
          pipeline_order: number | null
          potential: Database["public"]["Enums"]["lead_potential_enum"] | null
          score: number | null
          social_link: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status_enum"] | null
          status_changed_at: string | null
          tags: string[] | null
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
          deal_value?: number | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          lost_reason?: string | null
          needs?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_order?: number | null
          potential?: Database["public"]["Enums"]["lead_potential_enum"] | null
          score?: number | null
          social_link?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status_enum"] | null
          status_changed_at?: string | null
          tags?: string[] | null
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
          deal_value?: number | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          lost_reason?: string | null
          needs?: string | null
          next_contact_date?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_order?: number | null
          potential?: Database["public"]["Enums"]["lead_potential_enum"] | null
          score?: number | null
          social_link?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status_enum"] | null
          status_changed_at?: string | null
          tags?: string[] | null
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
          bride_height: number | null
          bride_name: string | null
          bride_phone: string | null
          bride_shoe_size: number | null
          bride_weight: number | null
          created_at: string | null
          created_by: string | null
          customer_code: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"] | null
          groom_height: number | null
          groom_name: string | null
          groom_phone: string | null
          groom_shoe_size: number | null
          groom_weight: number | null
          id: string
          lead_id: string | null
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
          bride_height?: number | null
          bride_name?: string | null
          bride_phone?: string | null
          bride_shoe_size?: number | null
          bride_weight?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_code: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          groom_height?: number | null
          groom_name?: string | null
          groom_phone?: string | null
          groom_shoe_size?: number | null
          groom_weight?: number | null
          id?: string
          lead_id?: string | null
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
          bride_height?: number | null
          bride_name?: string | null
          bride_phone?: string | null
          bride_shoe_size?: number | null
          bride_weight?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_code?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          groom_height?: number | null
          groom_name?: string | null
          groom_phone?: string | null
          groom_shoe_size?: number | null
          groom_weight?: number | null
          id?: string
          lead_id?: string | null
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
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          amount: number
          card_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          debt_date: string | null
          deleted_at: string | null
          due_date: string | null
          entity_id: string | null
          entity_name: string
          entity_type: string
          id: string
          installment_amount: number | null
          installment_paid: number | null
          installment_total: number | null
          notes: string | null
          paid_amount: number | null
          payment_date: string | null
          platform: string | null
          remaining: number | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          card_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          debt_date?: string | null
          deleted_at?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_name: string
          entity_type: string
          id?: string
          installment_amount?: number | null
          installment_paid?: number | null
          installment_total?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          platform?: string | null
          remaining?: number | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          card_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          debt_date?: string | null
          deleted_at?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          installment_amount?: number | null
          installment_paid?: number | null
          installment_total?: number | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          platform?: string | null
          remaining?: number | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debts_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
        Relationships: []
      }
      dress_rental_accessories: {
        Row: {
          condition_note: string | null
          created_at: string | null
          id: string
          name: string
          quantity: number | null
          rental_id: string
          returned: boolean | null
        }
        Insert: {
          condition_note?: string | null
          created_at?: string | null
          id?: string
          name: string
          quantity?: number | null
          rental_id: string
          returned?: boolean | null
        }
        Update: {
          condition_note?: string | null
          created_at?: string | null
          id?: string
          name?: string
          quantity?: number | null
          rental_id?: string
          returned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dress_rental_accessories_rental_id_fkey"
            columns: ["rental_id"]
            isOneToOne: false
            referencedRelation: "dress_rentals"
            referencedColumns: ["id"]
          },
        ]
      }
      dress_rentals: {
        Row: {
          accessories: string | null
          actual_return_date: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string
          damage_fee: number | null
          deposit: number | null
          deposit_returned: boolean | null
          id: string
          item_id: string
          notes: string | null
          phone: string | null
          pickup_date: string
          rental_price: number | null
          return_condition: string | null
          return_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accessories?: string | null
          actual_return_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name: string
          damage_fee?: number | null
          deposit?: number | null
          deposit_returned?: boolean | null
          id?: string
          item_id: string
          notes?: string | null
          phone?: string | null
          pickup_date: string
          rental_price?: number | null
          return_condition?: string | null
          return_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accessories?: string | null
          actual_return_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string
          damage_fee?: number | null
          deposit?: number | null
          deposit_returned?: boolean | null
          id?: string
          item_id?: string
          notes?: string | null
          phone?: string | null
          pickup_date?: string
          rental_price?: number | null
          return_condition?: string | null
          return_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dress_rentals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dress_rentals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "dresses"
            referencedColumns: ["id"]
          },
        ]
      }
      dress_reservations: {
        Row: {
          contract_id: string | null
          contract_item_id: string | null
          created_at: string | null
          customer_id: string | null
          dress_id: string
          end_date: string
          export_type: Database["public"]["Enums"]["export_type_enum"] | null
          id: string
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
          dress_id: string
          end_date: string
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
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
          dress_id?: string
          end_date?: string
          export_type?: Database["public"]["Enums"]["export_type_enum"] | null
          id?: string
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
            columns: ["dress_id"]
            isOneToOne: false
            referencedRelation: "dresses"
            referencedColumns: ["id"]
          },
        ]
      }
      dresses: {
        Row: {
          average_unit_price: number | null
          category: string | null
          color: string | null
          condition: string | null
          created_at: string | null
          created_by: string | null
          current_stock: number | null
          deleted_at: string | null
          id: string
          image_url: string | null
          item_code: string
          min_stock: number | null
          name: string
          notes: string | null
          purchase_price: number | null
          rental_price: number | null
          sale_price: number | null
          size: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          average_unit_price?: number | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          item_code: string
          min_stock?: number | null
          name: string
          notes?: string | null
          purchase_price?: number | null
          rental_price?: number | null
          sale_price?: number | null
          size?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          average_unit_price?: number | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          item_code?: string
          min_stock?: number | null
          name?: string
          notes?: string | null
          purchase_price?: number | null
          rental_price?: number | null
          sale_price?: number | null
          size?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
          gender: Database["public"]["Enums"]["gender_enum"] | null
          id: string
          notes: string | null
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
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: string
          notes?: string | null
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
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: string
          notes?: string | null
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
      event_templates: {
        Row: {
          created_at: string | null
          default_days_offset: number | null
          event_name: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id: string
          is_active: boolean | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_days_offset?: number | null
          event_name: string
          event_type: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          is_active?: boolean | null
          service_type: Database["public"]["Enums"]["service_type_enum"]
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_days_offset?: number | null
          event_name?: string
          event_type?: Database["public"]["Enums"]["event_type_enum"]
          id?: string
          is_active?: boolean | null
          service_type?: Database["public"]["Enums"]["service_type_enum"]
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          printing_order_id: string | null
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
          printing_order_id?: string | null
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
          printing_order_id?: string | null
          recipient?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
            foreignKeyName: "expenses_printing_order_id_fkey"
            columns: ["printing_order_id"]
            isOneToOne: false
            referencedRelation: "printing_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_close_tasks: {
        Row: {
          assignee_id: string | null
          close_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string
          step_name: string
          step_number: number
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          close_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          step_name: string
          step_number: number
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          close_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          step_name?: string
          step_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_close_tasks_close_id_fkey"
            columns: ["close_id"]
            isOneToOne: false
            referencedRelation: "finance_monthly_closes"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_monthly_closes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          period: string
          snapshot_metrics: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period: string
          snapshot_metrics?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          period?: string
          snapshot_metrics?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          color: string | null
          created_at: string | null
          current_amount: number
          deadline: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          name: string
          notes: string | null
          status: string | null
          target_amount: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          current_amount?: number
          deadline?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string | null
          target_amount?: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          current_amount?: number
          deadline?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string | null
          target_amount?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      fixed_costs: {
        Row: {
          cost_code: string
          cost_name: string
          cost_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          monthly_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      galleries: {
        Row: {
          access_url: string | null
          access_version: number
          allow_comments: boolean
          allow_download: boolean
          client_name: string | null
          contract_id: string
          cover_image_id: string | null
          created_at: string | null
          created_by: string | null
          custom_slug: string | null
          download_unlocked_at: string | null
          download_unlocked_by: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          enable_watermark: boolean | null
          folder_type: string | null
          id: string
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          password: string | null
          password_hash: string | null
          password_updated_at: string | null
          selection_deadline: string | null
          selection_limit: number | null
          share_version: number
          shared_at: string | null
          show_namecard: boolean | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          access_url?: string | null
          access_version?: number
          allow_comments?: boolean
          allow_download?: boolean
          client_name?: string | null
          contract_id: string
          cover_image_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_slug?: string | null
          download_unlocked_at?: string | null
          download_unlocked_by?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          enable_watermark?: boolean | null
          folder_type?: string | null
          id?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          password?: string | null
          password_hash?: string | null
          password_updated_at?: string | null
          selection_deadline?: string | null
          selection_limit?: number | null
          share_version?: number
          shared_at?: string | null
          show_namecard?: boolean | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          access_url?: string | null
          access_version?: number
          allow_comments?: boolean
          allow_download?: boolean
          client_name?: string | null
          contract_id?: string
          cover_image_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_slug?: string | null
          download_unlocked_at?: string | null
          download_unlocked_by?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          enable_watermark?: boolean | null
          folder_type?: string | null
          id?: string
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          password?: string | null
          password_hash?: string | null
          password_updated_at?: string | null
          selection_deadline?: string | null
          selection_limit?: number | null
          share_version?: number
          shared_at?: string | null
          show_namecard?: boolean | null
          status?: string | null
          tags?: string[] | null
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
            foreignKeyName: "galleries_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_albums: {
        Row: {
          cover_image_id: string | null
          created_at: string | null
          description: string | null
          gallery_id: string
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          cover_image_id?: string | null
          created_at?: string | null
          description?: string | null
          gallery_id: string
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          cover_image_id?: string | null
          created_at?: string | null
          description?: string | null
          gallery_id?: string
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_albums_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_albums_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_comments: {
        Row: {
          author_name: string | null
          client_identifier: string
          content: string
          created_at: string | null
          gallery_id: string
          id: string
          image_id: string
        }
        Insert: {
          author_name?: string | null
          client_identifier: string
          content: string
          created_at?: string | null
          gallery_id: string
          id?: string
          image_id: string
        }
        Update: {
          author_name?: string | null
          client_identifier?: string
          content?: string
          created_at?: string | null
          gallery_id?: string
          id?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_comments_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_comments_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_filter_jobs: {
        Row: {
          copied_files: number
          created_at: string
          current_file_name: string | null
          error_log: Json | null
          folder_id: string
          folder_name: string | null
          gallery_id: string
          id: string
          status: string
          total_files: number
          updated_at: string
        }
        Insert: {
          copied_files?: number
          created_at?: string
          current_file_name?: string | null
          error_log?: Json | null
          folder_id: string
          folder_name?: string | null
          gallery_id: string
          id?: string
          status?: string
          total_files?: number
          updated_at?: string
        }
        Update: {
          copied_files?: number
          created_at?: string
          current_file_name?: string | null
          error_log?: Json | null
          folder_id?: string
          folder_name?: string | null
          gallery_id?: string
          id?: string
          status?: string
          total_files?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_filter_jobs_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          album_id: string | null
          client_note: string | null
          created_at: string | null
          drive_file_id: string | null
          file_group: string | null
          file_name: string | null
          gallery_id: string
          id: string
          image_url: string
          is_selected: boolean | null
          is_starred: boolean | null
          selected_at: string | null
          starred_at: string | null
          sort_order: number | null
          thumbnail_url: string | null
        }
        Insert: {
          album_id?: string | null
          client_note?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          file_group?: string | null
          file_name?: string | null
          gallery_id: string
          id?: string
          image_url: string
          is_selected?: boolean | null
          is_starred?: boolean | null
          selected_at?: string | null
          starred_at?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          album_id?: string | null
          client_note?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          file_group?: string | null
          file_name?: string | null
          gallery_id?: string
          id?: string
          image_url?: string
          is_selected?: boolean | null
          is_starred?: boolean | null
          selected_at?: string | null
          starred_at?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_reactions: {
        Row: {
          client_identifier: string
          created_at: string | null
          gallery_id: string
          id: string
          image_id: string
          reaction_type: string
        }
        Insert: {
          client_identifier: string
          created_at?: string | null
          gallery_id: string
          id?: string
          image_id: string
          reaction_type: string
        }
        Update: {
          client_identifier?: string
          created_at?: string | null
          gallery_id?: string
          id?: string
          image_id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_reactions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_reactions_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_selection_batch_items: {
        Row: {
          batch_id: string
          client_note: string | null
          created_at: string
          drive_file_id: string | null
          file_name: string | null
          id: string
          image_id: string
          sort_order: number | null
        }
        Insert: {
          batch_id: string
          client_note?: string | null
          created_at?: string
          drive_file_id?: string | null
          file_name?: string | null
          id?: string
          image_id: string
          sort_order?: number | null
        }
        Update: {
          batch_id?: string
          client_note?: string | null
          created_at?: string
          drive_file_id?: string | null
          file_name?: string | null
          id?: string
          image_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_selection_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "gallery_selection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_selection_batch_items_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_selection_batches: {
        Row: {
          contract_id: string
          created_at: string
          created_by_client: string | null
          gallery_id: string
          id: string
          locked_at: string | null
          locked_by: string | null
          selected_count: number
          status: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by_client?: string | null
          gallery_id: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          selected_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by_client?: string | null
          gallery_id?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          selected_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_selection_batches_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_selection_batches_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_share_links: {
        Row: {
          access_version: number
          capability: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          gallery_id: string
          id: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          access_version?: number
          capability: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          gallery_id: string
          id?: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          access_version?: number
          capability?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          gallery_id?: string
          id?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_share_links_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          contribution_date: string | null
          created_at: string | null
          goal_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount?: number
          contribution_date?: string | null
          created_at?: string | null
          goal_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          contribution_date?: string | null
          created_at?: string | null
          goal_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_reports: {
        Row: {
          checks: Json | null
          created_at: string | null
          id: string
          info_count: number | null
          scan_date: string | null
          status: string | null
          total_issues: number | null
          warning_count: number | null
        }
        Insert: {
          checks?: Json | null
          created_at?: string | null
          id?: string
          info_count?: number | null
          scan_date?: string | null
          status?: string | null
          total_issues?: number | null
          warning_count?: number | null
        }
        Update: {
          checks?: Json | null
          created_at?: string | null
          id?: string
          info_count?: number | null
          scan_date?: string | null
          status?: string | null
          total_issues?: number | null
          warning_count?: number | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          average_unit_price: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          current_stock: number | null
          deleted_at: string | null
          id: string
          image_url: string | null
          item_code: string
          min_stock: number | null
          name: string
          notes: string | null
          purchase_price: number | null
          sale_price: number | null
          status: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          average_unit_price?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          item_code: string
          min_stock?: number | null
          name: string
          notes?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          status?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          average_unit_price?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          item_code?: string
          min_stock?: number | null
          name?: string
          notes?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          status?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          contract_code: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          item_id: string
          notes: string | null
          payment_method: string | null
          performed_by: string | null
          printing_order_id: string | null
          quantity: number
          reason: string | null
          receipt_id: string | null
          sale_total: number | null
          sale_unit_price: number | null
          source_id: string | null
          source_type: string | null
          supplier: string | null
          total_cost: number | null
          transaction_type: string
          unit_cost: number | null
        }
        Insert: {
          contract_code?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_id: string
          notes?: string | null
          payment_method?: string | null
          performed_by?: string | null
          printing_order_id?: string | null
          quantity?: number
          reason?: string | null
          receipt_id?: string | null
          sale_total?: number | null
          sale_unit_price?: number | null
          source_id?: string | null
          source_type?: string | null
          supplier?: string | null
          total_cost?: number | null
          transaction_type: string
          unit_cost?: number | null
        }
        Update: {
          contract_code?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          payment_method?: string | null
          performed_by?: string | null
          printing_order_id?: string | null
          quantity?: number
          reason?: string | null
          receipt_id?: string | null
          sale_total?: number | null
          sale_unit_price?: number | null
          source_id?: string | null
          source_type?: string | null
          supplier?: string | null
          total_cost?: number | null
          transaction_type?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          investment_id: string
          maintenance_date: string
          performed_by: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          investment_id: string
          maintenance_date: string
          performed_by?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          investment_id?: string
          maintenance_date?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_maintenance_logs_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          category: string
          condition: string | null
          created_at: string | null
          deleted_at: string | null
          depreciation_method: string | null
          id: string
          linked_revenue: number | null
          location: string | null
          maintenance_interval_days: number | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          purchase_date: string
          purchase_price: number
          salvage_value: number | null
          serial_number: string | null
          sold_date: string | null
          sold_price: number | null
          status: string | null
          updated_at: string | null
          useful_life_months: number | null
        }
        Insert: {
          category?: string
          condition?: string | null
          created_at?: string | null
          deleted_at?: string | null
          depreciation_method?: string | null
          id?: string
          linked_revenue?: number | null
          location?: string | null
          maintenance_interval_days?: number | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date: string
          purchase_price?: number
          salvage_value?: number | null
          serial_number?: string | null
          sold_date?: string | null
          sold_price?: number | null
          status?: string | null
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Update: {
          category?: string
          condition?: string | null
          created_at?: string | null
          deleted_at?: string | null
          depreciation_method?: string | null
          id?: string
          linked_revenue?: number | null
          location?: string | null
          maintenance_interval_days?: number | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date?: string
          purchase_price?: number
          salvage_value?: number | null
          serial_number?: string | null
          sold_date?: string | null
          sold_price?: number | null
          status?: string | null
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Relationships: []
      }
      lab_payment_allocations: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          payment_id: string
          printing_order_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id: string
          printing_order_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id?: string
          printing_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "lab_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_payment_allocations_printing_order_id_fkey"
            columns: ["printing_order_id"]
            isOneToOne: false
            referencedRelation: "printing_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          lab_id: string
          note: string | null
          payment_method: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          lab_id: string
          note?: string | null
          payment_method?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lab_id?: string
          note?: string | null
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_payments_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
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
          deleted_at: string | null
          id: string
          lab_name: string
          phone: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lab_name: string
          phone?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lab_name?: string
          phone?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
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
        Relationships: []
      }
      notification_preferences: {
        Row: {
          deadline_reminder: boolean | null
          employee_id: string
          onsite_reminder: boolean | null
          overdue_alert: boolean | null
          system_alerts: boolean | null
          task_assignment: boolean | null
          updated_at: string | null
        }
        Insert: {
          deadline_reminder?: boolean | null
          employee_id: string
          onsite_reminder?: boolean | null
          overdue_alert?: boolean | null
          system_alerts?: boolean | null
          task_assignment?: boolean | null
          updated_at?: string | null
        }
        Update: {
          deadline_reminder?: boolean | null
          employee_id?: string
          onsite_reminder?: boolean | null
          overdue_alert?: boolean | null
          system_alerts?: boolean | null
          task_assignment?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          content: string | null
          created_at: string | null
          employee_id: string
          id: string
          read_at: string | null
          resource_id: string | null
          resource_type: string | null
          status: string | null
          title: string
          type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string | null
          title: string
          type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          status?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_employee_id_fkey"
            columns: ["employee_id"]
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
      payment_plan_allocations: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          payment_id: string
          payment_plan_id: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id: string
          payment_plan_id: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id?: string
          payment_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_allocations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_allocations_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plan_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plan_allocations_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
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
          sort_order: number
          stage_key: string | null
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
          sort_order?: number
          stage_key?: string | null
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
          sort_order?: number
          stage_key?: string | null
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
          contract_adjustment_item_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
          is_contract_adjustment: boolean
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method_enum"]
          payment_stage: string | null
          receipt_code: string | null
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category_id?: string | null
          contract_adjustment_item_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_contract_adjustment?: boolean
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          payment_stage?: string | null
          receipt_code?: string | null
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category_id?: string | null
          contract_adjustment_item_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_contract_adjustment?: boolean
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method_enum"]
          payment_stage?: string | null
          receipt_code?: string | null
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_adjustment_item_id_fkey"
            columns: ["contract_adjustment_item_id"]
            isOneToOne: false
            referencedRelation: "contract_items"
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
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
        }
        Relationships: []
      }
      printing_orders: {
        Row: {
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
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
          status: string | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          print_file_url: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
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
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          print_file_url?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
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
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          print_file_url?: string | null
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
      receipts: {
        Row: {
          category_id: string | null
          category_name: string | null
          contract_code: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          payment_type: string
          previous_paid: number | null
          receipt_amount: number
          receipt_date: string
          receipt_type: string
          remaining_amount: number | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          contract_code?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          payment_type?: string
          previous_paid?: number | null
          receipt_amount?: number
          receipt_date: string
          receipt_type: string
          remaining_amount?: number | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          contract_code?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          payment_type?: string
          previous_paid?: number | null
          receipt_amount?: number
          receipt_date?: string
          receipt_type?: string
          remaining_amount?: number | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          date: string
          employee_salary_id: string
          id: string
          reason: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          date?: string
          employee_salary_id: string
          id?: string
          reason: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          date?: string
          employee_salary_id?: string
          id?: string
          reason?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_adjustments_employee_salary_id_fkey"
            columns: ["employee_salary_id"]
            isOneToOne: false
            referencedRelation: "employee_salaries"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          color_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          end_date: string | null
          event_date: string
          event_type: string | null
          google_event_id: string | null
          id: string
          location: string | null
          notes: string | null
          role_in_event: Database["public"]["Enums"]["work_type_enum"] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          color_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          end_date?: string | null
          event_date: string
          event_type?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          role_in_event?: Database["public"]["Enums"]["work_type_enum"] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          color_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          end_date?: string | null
          event_date?: string
          event_type?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          role_in_event?: Database["public"]["Enums"]["work_type_enum"] | null
          status?: string | null
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
      service_bundles: {
        Row: {
          adjustment_price: number | null
          child_service_id: string
          created_at: string | null
          id: string
          parent_service_id: string
          quantity: number
          sort_order: number | null
        }
        Insert: {
          adjustment_price?: number | null
          child_service_id: string
          created_at?: string | null
          id?: string
          parent_service_id: string
          quantity?: number
          sort_order?: number | null
        }
        Update: {
          adjustment_price?: number | null
          child_service_id?: string
          created_at?: string | null
          id?: string
          parent_service_id?: string
          quantity?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bundles_child_service_id_fkey"
            columns: ["child_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bundles_parent_service_id_fkey"
            columns: ["parent_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string | null
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
      service_relations: {
        Row: {
          child_category_id: string | null
          child_service_id: string | null
          created_at: string | null
          id: string
          is_required: boolean | null
          parent_service_id: string
          relation_type: string | null
          sort_order: number | null
        }
        Insert: {
          child_category_id?: string | null
          child_service_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          parent_service_id: string
          relation_type?: string | null
          sort_order?: number | null
        }
        Update: {
          child_category_id?: string | null
          child_service_id?: string | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          parent_service_id?: string
          relation_type?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          fulfillment_type: string | null
          id: string
          image_url: string | null
          name: string
          selling_price: number
          service_code: string
          service_type: string
          status: string | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          fulfillment_type?: string | null
          id?: string
          image_url?: string | null
          name: string
          selling_price?: number
          service_code: string
          service_type: string
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          fulfillment_type?: string | null
          id?: string
          image_url?: string | null
          name?: string
          selling_price?: number
          service_code?: string
          service_type?: string
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
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
          google_oauth: Json | null
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
          google_oauth?: Json | null
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
          google_oauth?: Json | null
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
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
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
        Relationships: []
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
          end_time: string | null
          event_id: string | null
          id: string
          notes: string | null
          start_date: string | null
          start_time: string | null
          status: string | null
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
          end_time?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
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
          end_time?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
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
      payment_plan_states: {
        Row: {
          amount: number | null
          contract_id: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          paid_amount: number | null
          receipt_id: string | null
          remaining_amount: number | null
          sort_order: number | null
          stage_key: string | null
          stage_name: string | null
          status: string | null
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
    }
    Functions: {
      advance_close_task: {
        Args: {
          p_actor_id: string
          p_close_id: string
          p_new_status: string
          p_step_number: number
        }
        Returns: undefined
      }
      append_care_log: {
        Args: { p_content: string; p_lead_id: string; p_type?: string }
        Returns: Json
      }
      backfill_payment_plan_ssot_v2: { Args: never; Returns: Json }
      calendar_month_events: {
        Args: { p_month: number; p_year: number }
        Returns: {
          assigned_to: string
          color_id: string
          contract_code: string
          contract_id: string
          customer_name: string
          deadline: string
          employee_id: string
          end_date: string
          end_time: string
          event_date: string
          event_id: string
          event_source: string
          event_type: string
          google_event_id: string
          id: string
          location: string
          notes: string
          start_date: string
          start_time: string
          status: string
          work_type: string
        }[]
      }
      cancel_contract_cascade: {
        Args: { p_contract_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      cancel_dress_rental_atomic: {
        Args: { p_rental_id: string; p_user_id?: string }
        Returns: Json
      }
      check_inventory_conflict: {
        Args: {
          p_end_date: string
          p_exclude_reservation_id?: string
          p_item_id: string
          p_start_date: string
        }
        Returns: boolean
      }
      contract_payment_health_checks: {
        Args: never
        Returns: {
          check_name: string
          issue_count: number
        }[]
      }
      contract_payment_receipt_code: {
        Args: { p_payment_date: string; p_payment_id: string }
        Returns: string
      }
      contract_payment_status_v2: {
        Args: { p_paid: number; p_remaining: number }
        Returns: string
      }
      contract_stats: {
        Args: never
        Returns: {
          active: number
          completed: number
          growth_total: number
          outstanding: number
          pending: number
          revenue: number
          total: number
        }[]
      }
      contribute_to_goal: {
        Args: { p_amount: number; p_goal_id: string; p_notes?: string }
        Returns: undefined
      }
      convert_lead_to_customer: { Args: { p_lead_id: string }; Returns: Json }
      create_contract_inventory_addon_sale_atomic: {
        Args: {
          p_contract_id: string
          p_item_id: string
          p_notes?: string
          p_payment_date: string
          p_payment_method: Database["public"]["Enums"]["payment_method_enum"]
          p_quantity: number
          p_sale_unit_price: number
          p_user_id?: string
        }
        Returns: Json
      }
      create_default_payment_schedule_v2: {
        Args: {
          p_contract_date?: string
          p_contract_id: string
          p_initial_amount?: number
          p_initial_stage?: string
          p_total: number
          p_work_date?: string
        }
        Returns: string
      }
      create_dress_contract_reservation_atomic: {
        Args: {
          p_contract_id: string
          p_contract_item_id?: string
          p_customer_id?: string
          p_dress_id: string
          p_end_date?: string
          p_export_type?: string
          p_is_addon?: boolean
          p_notes?: string
          p_rental_price?: number
          p_start_date?: string
          p_user_id?: string
        }
        Returns: Json
      }
      create_printing_order_atomic: {
        Args: { p_actor_id: string; p_order: Json }
        Returns: Json
      }
      create_sale_receipt_atomic: {
        Args: { p_items: Json; p_receipt: Json }
        Returns: Json
      }
      create_standalone_dress_rental_atomic: {
        Args: {
          p_accessories?: string
          p_contract_id?: string
          p_customer_name?: string
          p_deposit?: number
          p_item_id: string
          p_notes?: string
          p_phone?: string
          p_pickup_date?: string
          p_rental_price?: number
          p_return_date?: string
          p_user_id?: string
        }
        Returns: Json
      }
      dashboard_critical_kpis: {
        Args: { p_month: number; p_year: number }
        Returns: {
          current_completed: number
          current_contracts: number
          current_revenue: number
          previous_completed: number
          previous_contracts: number
          previous_revenue: number
          total_debt: number
        }[]
      }
      dashboard_revenue_chart: {
        Args: { p_month: number; p_months?: number; p_year: number }
        Returns: {
          month_index: number
          month_label: string
          revenue: number
        }[]
      }
      dashboard_service_breakdown: {
        Args: {
          p_can_view_financials?: boolean
          p_month: number
          p_year: number
        }
        Returns: {
          contract_count: number
          revenue: number
          service_type: string
        }[]
      }
      decrement_goal_amount: {
        Args: { p_amount: number; p_goal_id: string }
        Returns: undefined
      }
      delete_contract_cascade: {
        Args: { p_contract_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_dress_atomic: {
        Args: { p_dress_id: string; p_user_id?: string }
        Returns: Json
      }
      delete_printing_order_atomic: {
        Args: { p_actor_id: string; p_order_id: string }
        Returns: Json
      }
      delete_service_atomic: {
        Args: { p_actor_id: string; p_service_id: string }
        Returns: Json
      }
      dress_list: {
        Args: {
          p_category?: string
          p_limit?: number
          p_page?: number
          p_search?: string
          p_sort?: string
          p_status?: string
        }
        Returns: Json
      }
      dress_rental_list: {
        Args: {
          p_item_id?: string
          p_limit?: number
          p_page?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      dress_stats: { Args: never; Returns: Json }
      employee_stats: {
        Args: never
        Returns: {
          active: number
          departments: Json
          inactive: number
          total: number
        }[]
      }
      finance_cashflow_timeline: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          date: string
          inflow: number
          outflow: number
        }[]
      }
      finance_contract_profit_report: {
        Args: {
          p_from?: string
          p_page?: number
          p_page_size?: number
          p_status?: string
          p_to?: string
        }
        Returns: {
          addon_revenue: number
          contract_code: string
          contract_date: string
          customer_name: string
          discount: number
          expense_cost: number
          id: string
          inventory_cost: number
          package_revenue: number
          paid_amount: number
          print_cost: number
          profit: number
          profit_margin: number
          remaining_amount: number
          status: string
          task_cost: number
          total_amount: number
          total_cost: number
          total_count: number
        }[]
      }
      finance_dashboard_metrics: {
        Args: { p_month: number; p_year: number }
        Returns: {
          contracts_done: number
          contracts_new: number
          month_change_percent: number
          profit: number
          total_debt: number
          total_inflow: number
          total_outflow: number
        }[]
      }
      finance_debt_stats: {
        Args: never
        Returns: {
          aging: Json
          net_debt: number
          overdue: number
          payable: number
          receivable: number
        }[]
      }
      finance_expense_stats: {
        Args: { p_month?: number; p_year?: number }
        Returns: {
          approved_count: number
          pending_count: number
          total_amount: number
          total_expenses: number
        }[]
      }
      finance_lab_debt_summary: {
        Args: never
        Returns: {
          lab_id: string
          lab_name: string
          last_order_date: string
          order_count: number
          remaining: number
          total_orders: number
          total_paid: number
        }[]
      }
      finance_ledger: {
        Args: {
          p_month?: number
          p_page?: number
          p_page_size?: number
          p_type?: string
          p_year?: number
        }
        Returns: {
          amount: number
          category_name: string
          code: string
          customer_name: string
          description: string
          direction: string
          id: string
          payment_method: string
          source_table: string
          status: string
          total_count: number
          transaction_date: string
        }[]
      }
      finance_ledger_range: {
        Args: {
          p_from_date?: string
          p_page?: number
          p_page_size?: number
          p_to_date?: string
          p_type?: string
        }
        Returns: {
          amount: number
          category_name: string
          code: string
          customer_name: string
          description: string
          direction: string
          id: string
          payment_method: string
          source_table: string
          status: string
          total_count: number
          transaction_date: string
        }[]
      }
      finance_receipt_document_stats: {
        Args: { p_month?: number; p_year?: number }
        Returns: {
          completed_count: number
          pending_count: number
          total_amount: number
          total_receipts: number
        }[]
      }
      finance_receipt_documents: {
        Args: {
          p_limit?: number
          p_month?: number
          p_offset?: number
          p_receipt_type?: string
          p_search?: string
          p_year?: number
        }
        Returns: {
          category_id: string
          category_name: string
          contract_code: string
          contract_id: string
          created_at: string
          customer_name: string
          id: string
          notes: string
          payment_type: string
          receipt_amount: number
          receipt_code: string
          receipt_date: string
          receipt_type: string
          remaining_amount: number
          source_id: string
          source_table: string
          status: string
          total_amount: number
          total_count: number
          updated_at: string
        }[]
      }
      finance_receipt_stats: {
        Args: { p_month?: number; p_year?: number }
        Returns: {
          completed_count: number
          pending_count: number
          total_amount: number
          total_receipts: number
        }[]
      }
      finance_reports_snapshot: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      finance_revenue_by_month: {
        Args: { p_year: number }
        Returns: {
          month_label: string
          raw_month: number
          revenue: number
        }[]
      }
      finance_service_distribution: {
        Args: { p_month: number; p_year: number }
        Returns: {
          name: string
          revenue: number
          value: number
        }[]
      }
      get_budget_vs_actual: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      get_cashflow_forecast: { Args: { p_days?: number }; Returns: Json }
      get_contract_balance: { Args: { p_contract_id: string }; Returns: Json }
      get_contract_detail_v2: { Args: { p_contract_id: string }; Returns: Json }
      get_contract_list_v2: {
        Args: {
          p_end_date?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_service_type?: string
          p_sort?: string
          p_start_date?: string
          p_status?: string
          p_time_filter?: string
        }
        Returns: Json
      }
      get_crm_customer_stats: { Args: never; Returns: Json }
      get_crm_lead_stats: { Args: never; Returns: Json }
      get_current_employee_id: { Args: never; Returns: string }
      get_current_employee_role: {
        Args: never
        Returns: Database["public"]["Enums"]["employee_role_enum"]
      }
      get_employee_job_details: {
        Args: {
          p_employee_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          client_name: string
          contract_code: string
          contract_id: string
          cost: number
          deadline: string
          event_date: string
          service_type: string
          status: string
          work_type: string
        }[]
      }
      get_employee_productivity: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          active_tasks: number
          completed_tasks: number
          employee_id: string
          full_name: string
          onsite_hours: number
          overdue_tasks: number
          post_production_active: number
          role: Database["public"]["Enums"]["employee_role_enum"]
          total_cost: number
        }[]
      }
      get_expense_breakdown: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      get_finance_advanced_intelligence: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      get_finance_intelligence: { Args: never; Returns: Json }
      get_my_employee_job_details: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          client_name: string
          contract_code: string
          contract_id: string
          cost: number
          deadline: string
          event_date: string
          service_type: string
          status: string
          work_type: string
        }[]
      }
      get_my_employee_productivity: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          active_tasks: number
          completed_tasks: number
          employee_id: string
          full_name: string
          onsite_hours: number
          overdue_tasks: number
          post_production_active: number
          role: Database["public"]["Enums"]["employee_role_enum"]
          total_cost: number
        }[]
      }
      get_printing_cost_stats: {
        Args: never
        Returns: {
          total_cost: number
          unpaid_cost: number
        }[]
      }
      get_receivable_aging: { Args: never; Returns: Json }
      inventory_detail_v2: { Args: { p_item_id: string }; Returns: Json }
      inventory_item_transaction_totals: {
        Args: { p_item_id: string }
        Returns: Json
      }
      inventory_list: {
        Args: {
          p_category?: string
          p_limit?: number
          p_page?: number
          p_search?: string
          p_sort?: string
          p_status?: string
        }
        Returns: Json
      }
      inventory_stats: { Args: never; Returns: Json }
      inventory_stock_in_atomic: {
        Args: {
          p_item_id: string
          p_notes?: string
          p_quantity: number
          p_reason?: string
          p_supplier?: string
          p_unit_cost: number
          p_user_id?: string
        }
        Returns: Json
      }
      inventory_stock_out_atomic: {
        Args: {
          p_contract_id?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_item_id: string
          p_notes?: string
          p_quantity: number
          p_reason?: string
          p_user_id?: string
        }
        Returns: Json
      }
      is_dress_available: {
        Args: {
          p_dress_id: string
          p_end_date: string
          p_exclude_rental_id?: string
          p_exclude_reservation_id?: string
          p_start_date: string
        }
        Returns: boolean
      }
      is_period_locked: { Args: { p_date: string }; Returns: boolean }
      mark_dress_cleaned_atomic: {
        Args: { p_dress_id: string; p_user_id?: string }
        Returns: Json
      }
      next_employee_code: { Args: never; Returns: string }
      nextval_customer_code: { Args: never; Returns: number }
      nextval_inventory_code: { Args: never; Returns: string }
      nextval_printing_order_code: { Args: never; Returns: string }
      payment_stage_display_label_v2: {
        Args: { p_default?: string; p_stage: string }
        Returns: string
      }
      payment_stage_key_v2: { Args: { p_stage: string }; Returns: string }
      prepare_gallery_share: {
        Args: { p_gallery_id: string; p_user_id: string }
        Returns: Json
      }
      printing_integrity_report: {
        Args: never
        Returns: {
          check_name: string
          issue_count: number
        }[]
      }
      printing_items_total: { Args: { p_items: Json }; Returns: number }
      printing_lab_overview: {
        Args: never
        Returns: {
          address: string
          contact_person: string
          created_at: string
          id: string
          lab_name: string
          last_payment_at: string
          outstanding_debt: number
          phone: string
          service_count: number
          service_preview: string[]
          status: string
          unpaid_orders: number
        }[]
      }
      printing_stats: {
        Args: never
        Returns: {
          cho_xu_ly: number
          da_in: number
          da_nhan: number
          dang_in: number
          total: number
          total_cost: number
          unpaid_cost: number
        }[]
      }
      process_contract_payment: {
        Args: {
          p_amount: number
          p_category_id?: string
          p_contract_id: string
          p_created_by?: string
          p_notes?: string
          p_payment_date: string
          p_payment_method: Database["public"]["Enums"]["payment_method_enum"]
          p_payment_plan_id?: string
          p_payment_stage?: string
        }
        Returns: Json
      }
      process_contract_payment_v2: {
        Args: {
          p_amount: number
          p_category_id?: string
          p_contract_id: string
          p_created_by?: string
          p_notes?: string
          p_payment_date: string
          p_payment_method: Database["public"]["Enums"]["payment_method_enum"]
          p_payment_plan_id?: string
          p_payment_stage?: string
          p_update_total?: boolean
        }
        Returns: Json
      }
      recalc_contract_totals: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      record_lab_payment_atomic: {
        Args: {
          p_actor_id: string
          p_allocations: Json
          p_amount: number
          p_lab_id: string
          p_note: string
          p_payment_method: string
        }
        Returns: Json
      }
      refresh_dress_status: { Args: { p_dress_id: string }; Returns: undefined }
      refresh_dress_status_atomic: {
        Args: { p_dress_id: string; p_user_id?: string }
        Returns: Json
      }
      release_dress_reservation_atomic: {
        Args: { p_reservation_id: string; p_user_id?: string }
        Returns: Json
      }
      resolve_printing_expense_category_id: { Args: never; Returns: string }
      restore_inventory_from_transaction: {
        Args: {
          p_actor_id?: string
          p_reason: string
          p_source_id: string
          p_source_type: string
        }
        Returns: undefined
      }
      return_dress_rental_atomic: {
        Args: {
          p_damage_fee?: number
          p_deposit_returned?: boolean
          p_notes?: string
          p_rental_id: string
          p_return_condition: string
          p_user_id?: string
        }
        Returns: Json
      }
      run_integrity_scan: { Args: never; Returns: undefined }
      save_contract_atomic: {
        Args: {
          p_actor_id: string
          p_contract: Json
          p_customer: Json
          p_existing_contract_id?: string
          p_expected_updated_at?: string
          p_initial_payment?: Json
          p_items: Json
        }
        Returns: Json
      }
      save_service_atomic: {
        Args: {
          p_actor_id: string
          p_bundle_items?: Json
          p_expected_updated_at?: string
          p_service: Json
        }
        Returns: Json
      }
      set_gallery_password: {
        Args: { p_gallery_id: string; p_password: string }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_dress_rental_atomic: {
        Args: { p_rental_id: string; p_user_id?: string }
        Returns: Json
      }
      sync_payment_plan_statuses_v2: {
        Args: { p_contract_id: string }
        Returns: undefined
      }
      undo_contribution_atomic: {
        Args: { p_contribution_id: string }
        Returns: Json
      }
      update_dress_reservation_status_atomic: {
        Args: { p_reservation_id: string; p_status: string; p_user_id?: string }
        Returns: Json
      }
      update_printing_order_atomic: {
        Args: {
          p_actor_id: string
          p_expected_updated_at: string
          p_order: Json
          p_order_id: string
        }
        Returns: Json
      }
      upsert_printing_expense: {
        Args: { p_actor_id: string; p_printing_order_id: string }
        Returns: string
      }
      verify_gallery_password: {
        Args: { p_gallery_id: string; p_password: string }
        Returns: boolean
      }
      void_contract_payment_v2: {
        Args: { p_actor_id: string; p_payment_id: string; p_reason: string }
        Returns: Json
      }
    }
    Enums: {
      addon_category_enum:
        | "makeup"
        | "trang_phuc"
        | "phu_kien"
        | "them_gio"
        | "khac"
      employee_role_enum: "admin" | "manager" | "sale" | "media" | "ctv"
      event_type_enum:
        | "chuan_bi"
        | "ngay_chup"
        | "ngay_to_chuc"
        | "hau_ky"
        | "giao_san_pham"
      export_type_enum: "xuat_ban" | "xuat_thue"
      gender_enum: "nam" | "nu" | "khac"
      item_type_enum: "dich_vu" | "san_pham" | "trang_phuc" | "phat_sinh"
      lead_potential_enum: "hot" | "warm" | "cold"
      lead_status_enum:
        | "moi"
        | "da_lien_he"
        | "hen_gap"
        | "da_bao_gia"
        | "da_chot"
        | "huy"
      log_source_enum: "trigger" | "server_action" | "frontend" | "system"
      log_type_enum:
        | "EVENT_CHANGE"
        | "ASSIGNMENT"
        | "CONFLICT"
        | "ERROR"
        | "GENERAL"
      payment_method_enum: "tien_mat" | "chuyen_khoan"
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
        | "outsource"
        | "khac"
      severity_enum: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      addon_category_enum: [
        "makeup",
        "trang_phuc",
        "phu_kien",
        "them_gio",
        "khac",
      ],
      employee_role_enum: ["admin", "manager", "sale", "media", "ctv"],
      event_type_enum: [
        "chuan_bi",
        "ngay_chup",
        "ngay_to_chuc",
        "hau_ky",
        "giao_san_pham",
      ],
      export_type_enum: ["xuat_ban", "xuat_thue"],
      gender_enum: ["nam", "nu", "khac"],
      item_type_enum: ["dich_vu", "san_pham", "trang_phuc", "phat_sinh"],
      lead_potential_enum: ["hot", "warm", "cold"],
      lead_status_enum: [
        "moi",
        "da_lien_he",
        "hen_gap",
        "da_bao_gia",
        "da_chot",
        "huy",
      ],
      log_source_enum: ["trigger", "server_action", "frontend", "system"],
      log_type_enum: [
        "EVENT_CHANGE",
        "ASSIGNMENT",
        "CONFLICT",
        "ERROR",
        "GENERAL",
      ],
      payment_method_enum: ["tien_mat", "chuyen_khoan"],
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
        "outsource",
        "khac",
      ],
      severity_enum: ["INFO", "WARNING", "ERROR", "CRITICAL"],
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
