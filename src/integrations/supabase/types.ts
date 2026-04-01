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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          center_id: string | null
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_years_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_date: string | null
          activity_type_id: string | null
          center_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          grade: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          photo_url: string | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          activity_date?: string | null
          activity_type_id?: string | null
          center_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          photo_url?: string | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          activity_date?: string | null
          activity_type_id?: string | null
          center_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          title?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          center_id: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          center_id: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          center_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_types: {
        Row: {
          center_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_types_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_types_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_applications: {
        Row: {
          application_data: Json | null
          applied_grade: string
          center_id: string | null
          created_at: string | null
          id: string
          parent_email: string | null
          parent_name: string
          parent_phone: string | null
          status: string | null
          student_name: string
          updated_at: string | null
        }
        Insert: {
          application_data?: Json | null
          applied_grade: string
          center_id?: string | null
          created_at?: string | null
          id?: string
          parent_email?: string | null
          parent_name: string
          parent_phone?: string | null
          status?: string | null
          student_name: string
          updated_at?: string | null
        }
        Update: {
          application_data?: Json | null
          applied_grade?: string
          center_id?: string | null
          created_at?: string | null
          id?: string
          parent_email?: string | null
          parent_name?: string
          parent_phone?: string | null
          status?: string | null
          student_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_applications_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_tag: string | null
          assigned_to_user_id: string | null
          category: string | null
          center_id: string | null
          condition: string | null
          created_at: string | null
          id: string
          location: string | null
          name: string
          purchase_date: string | null
          purchase_price: number | null
          status: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_tag?: string | null
          assigned_to_user_id?: string | null
          category?: string | null
          center_id?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_tag?: string | null
          assigned_to_user_id?: string | null
          category?: string | null
          center_id?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          center_id: string
          created_at: string
          date: string
          id: string
          is_locked: boolean | null
          marked_by: string | null
          notes: string | null
          remarks: string | null
          status: string
          student_id: string
          time_in: string | null
          time_out: string | null
        }
        Insert: {
          center_id: string
          created_at?: string
          date: string
          id?: string
          is_locked?: boolean | null
          marked_by?: string | null
          notes?: string | null
          remarks?: string | null
          status: string
          student_id: string
          time_in?: string | null
          time_out?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string
          date?: string
          id?: string
          is_locked?: boolean | null
          marked_by?: string | null
          notes?: string | null
          remarks?: string | null
          status?: string
          student_id?: string
          time_in?: string | null
          time_out?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          center_id: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          center_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          center_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      book_loans: {
        Row: {
          book_id: string | null
          center_id: string | null
          created_at: string | null
          due_date: string
          fine_amount: number | null
          id: string
          issue_date: string | null
          return_date: string | null
          status: string | null
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          book_id?: string | null
          center_id?: string | null
          created_at?: string | null
          due_date: string
          fine_amount?: number | null
          id?: string
          issue_date?: string | null
          return_date?: string | null
          status?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          book_id?: string | null
          center_id?: string | null
          created_at?: string | null
          due_date?: string
          fine_amount?: number | null
          id?: string
          issue_date?: string | null
          return_date?: string | null
          status?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_loans_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_loans_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_loans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "book_loans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          available_copies: number | null
          category: string | null
          center_id: string | null
          created_at: string | null
          id: string
          isbn: string | null
          title: string
          total_copies: number | null
        }
        Insert: {
          author?: string | null
          available_copies?: number | null
          category?: string | null
          center_id?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          title: string
          total_copies?: number | null
        }
        Update: {
          author?: string | null
          available_copies?: number | null
          category?: string | null
          center_id?: string | null
          created_at?: string | null
          id?: string
          isbn?: string | null
          title?: string
          total_copies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          center_id: string
          created_at: string | null
          id: string
          message_text: string
          sender_user_id: string
          sent_at: string | null
          target_audience: string
          target_grade: string | null
          title: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          id?: string
          message_text: string
          sender_user_id: string
          sent_at?: string | null
          target_audience: string
          target_grade?: string | null
          title?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          id?: string
          message_text?: string
          sender_user_id?: string
          sent_at?: string | null
          target_audience?: string
          target_grade?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_messages_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_routes: {
        Row: {
          center_id: string | null
          created_at: string | null
          end_point: string | null
          id: string
          route_name: string
          start_point: string | null
          stops: Json | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          end_point?: string | null
          id?: string
          route_name: string
          start_point?: string | null
          stops?: Json | null
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          end_point?: string | null
          id?: string
          route_name?: string
          start_point?: string | null
          stops?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_routes_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_routes_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          center_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          is_school_day: boolean | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          is_school_day?: boolean | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          is_school_day?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      center_events: {
        Row: {
          center_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          id: string
          is_holiday: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_holiday?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_holiday?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_events_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_events_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      center_feature_permissions: {
        Row: {
          about_institution: boolean | null
          academics_access: boolean | null
          ai_insights: boolean | null
          attendance_summary: boolean | null
          calendar_events: boolean | null
          center_id: string
          chapter_performance: boolean | null
          class_routine: boolean | null
          communications_access: boolean | null
          created_at: string
          dashboard_access: boolean | null
          discipline_issues: boolean | null
          exams_results: boolean | null
          finance: boolean | null
          homework_management: boolean | null
          hr_management: boolean | null
          id: string
          inventory_assets: boolean | null
          leave_management: boolean | null
          lesson_plans: boolean | null
          lesson_tracking: boolean | null
          meetings_management: boolean | null
          messaging: boolean | null
          parent_portal: boolean | null
          preschool_activities: boolean | null
          published_results: boolean | null
          register_student: boolean | null
          school_days: boolean | null
          settings_access: boolean | null
          student_id_cards: boolean | null
          student_report: boolean | null
          students_registration: boolean | null
          summary: boolean | null
          take_attendance: boolean | null
          teacher_management: boolean | null
          teacher_performance: boolean | null
          teacher_reports: boolean | null
          teachers_attendance: boolean | null
          teachers_registration: boolean | null
          test_management: boolean | null
          transport_tracking: boolean | null
          updated_at: string
          view_records: boolean | null
        }
        Insert: {
          about_institution?: boolean | null
          academics_access?: boolean | null
          ai_insights?: boolean | null
          attendance_summary?: boolean | null
          calendar_events?: boolean | null
          center_id: string
          chapter_performance?: boolean | null
          class_routine?: boolean | null
          communications_access?: boolean | null
          created_at?: string
          dashboard_access?: boolean | null
          discipline_issues?: boolean | null
          exams_results?: boolean | null
          finance?: boolean | null
          homework_management?: boolean | null
          hr_management?: boolean | null
          id?: string
          inventory_assets?: boolean | null
          leave_management?: boolean | null
          lesson_plans?: boolean | null
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          messaging?: boolean | null
          parent_portal?: boolean | null
          preschool_activities?: boolean | null
          published_results?: boolean | null
          register_student?: boolean | null
          school_days?: boolean | null
          settings_access?: boolean | null
          student_id_cards?: boolean | null
          student_report?: boolean | null
          students_registration?: boolean | null
          summary?: boolean | null
          take_attendance?: boolean | null
          teacher_management?: boolean | null
          teacher_performance?: boolean | null
          teacher_reports?: boolean | null
          teachers_attendance?: boolean | null
          teachers_registration?: boolean | null
          test_management?: boolean | null
          transport_tracking?: boolean | null
          updated_at?: string
          view_records?: boolean | null
        }
        Update: {
          about_institution?: boolean | null
          academics_access?: boolean | null
          ai_insights?: boolean | null
          attendance_summary?: boolean | null
          calendar_events?: boolean | null
          center_id?: string
          chapter_performance?: boolean | null
          class_routine?: boolean | null
          communications_access?: boolean | null
          created_at?: string
          dashboard_access?: boolean | null
          discipline_issues?: boolean | null
          exams_results?: boolean | null
          finance?: boolean | null
          homework_management?: boolean | null
          hr_management?: boolean | null
          id?: string
          inventory_assets?: boolean | null
          leave_management?: boolean | null
          lesson_plans?: boolean | null
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          messaging?: boolean | null
          parent_portal?: boolean | null
          preschool_activities?: boolean | null
          published_results?: boolean | null
          register_student?: boolean | null
          school_days?: boolean | null
          settings_access?: boolean | null
          student_id_cards?: boolean | null
          student_report?: boolean | null
          students_registration?: boolean | null
          summary?: boolean | null
          take_attendance?: boolean | null
          teacher_management?: boolean | null
          teacher_performance?: boolean | null
          teacher_reports?: boolean | null
          teachers_attendance?: boolean | null
          teachers_registration?: boolean | null
          test_management?: boolean | null
          transport_tracking?: boolean | null
          updated_at?: string
          view_records?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "center_feature_permissions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: true
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_feature_permissions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: true
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      center_invoices: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          center_id: string | null
          created_at: string | null
          due_date: string
          id: string
          invoice_number: string
          status: string | null
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          center_id?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          invoice_number: string
          status?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          center_id?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "center_invoices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_invoices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      center_requirements: {
        Row: {
          center_id: string | null
          created_at: string | null
          id: string
          module_name: string
          requirement_description: string | null
          updated_at: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          module_name: string
          requirement_description?: string | null
          updated_at?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          module_name?: string
          requirement_description?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "center_requirements_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_requirements_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      center_subscriptions: {
        Row: {
          billed_amount: number | null
          center_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          package_type: string | null
          plan_id: string | null
          start_date: string | null
          status: string | null
          subscription_days: number | null
        }
        Insert: {
          billed_amount?: number | null
          center_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          package_type?: string | null
          plan_id?: string | null
          start_date?: string | null
          status?: string | null
          subscription_days?: number | null
        }
        Update: {
          billed_amount?: number | null
          center_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          package_type?: string | null
          plan_id?: string | null
          start_date?: string | null
          status?: string | null
          subscription_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "center_subscriptions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_subscriptions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      center_usage_stats: {
        Row: {
          active_users_count: number | null
          api_requests: number | null
          center_id: string | null
          date: string | null
          db_rows_count: number | null
          id: string
          storage_used_bytes: number | null
        }
        Insert: {
          active_users_count?: number | null
          api_requests?: number | null
          center_id?: string | null
          date?: string | null
          db_rows_count?: number | null
          id?: string
          storage_used_bytes?: number | null
        }
        Update: {
          active_users_count?: number | null
          api_requests?: number | null
          center_id?: string | null
          date?: string | null
          db_rows_count?: number | null
          id?: string
          storage_used_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "center_usage_stats_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_usage_stats_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          about_description: string | null
          academic_info: string | null
          achievements: string | null
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          established_date: string | null
          facilities: Json | null
          gallary: string | null
          gallery: Json | null
          gps_device_id: string | null
          header_address_visible: boolean | null
          header_bg_url: string | null
          header_code_visible: boolean | null
          header_contact_visible: boolean | null
          header_details_color: string | null
          header_email_visible: boolean | null
          header_font_color: string | null
          header_font_family: string | null
          header_font_size: string | null
          header_overlay_color: string | null
          header_overlay_opacity: number | null
          header_principal_visible: boolean | null
          header_text_transform: string | null
          header_title_color: string | null
          header_title_visible: boolean | null
          header_visible_sections: Json | null
          header_website_visible: boolean | null
          header_year_visible: boolean | null
          id: string
          institution_type: string | null
          late_penalty_per_day: number | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mission: string | null
          name: string
          package_type: string | null
          phone: string | null
          principal_message: string | null
          principal_name: string | null
          radius_meters: number | null
          short_code: string | null
          social_links: Json | null
          theme: Json | null
          updated_at: string
          vision: string | null
          website_url: string | null
        }
        Insert: {
          about_description?: string | null
          academic_info?: string | null
          achievements?: string | null
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          established_date?: string | null
          facilities?: Json | null
          gallary?: string | null
          gallery?: Json | null
          gps_device_id?: string | null
          header_address_visible?: boolean | null
          header_bg_url?: string | null
          header_code_visible?: boolean | null
          header_contact_visible?: boolean | null
          header_details_color?: string | null
          header_email_visible?: boolean | null
          header_font_color?: string | null
          header_font_family?: string | null
          header_font_size?: string | null
          header_overlay_color?: string | null
          header_overlay_opacity?: number | null
          header_principal_visible?: boolean | null
          header_text_transform?: string | null
          header_title_color?: string | null
          header_title_visible?: boolean | null
          header_visible_sections?: Json | null
          header_website_visible?: boolean | null
          header_year_visible?: boolean | null
          id?: string
          institution_type?: string | null
          late_penalty_per_day?: number | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mission?: string | null
          name: string
          package_type?: string | null
          phone?: string | null
          principal_message?: string | null
          principal_name?: string | null
          radius_meters?: number | null
          short_code?: string | null
          social_links?: Json | null
          theme?: Json | null
          updated_at?: string
          vision?: string | null
          website_url?: string | null
        }
        Update: {
          about_description?: string | null
          academic_info?: string | null
          achievements?: string | null
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          established_date?: string | null
          facilities?: Json | null
          gallary?: string | null
          gallery?: Json | null
          gps_device_id?: string | null
          header_address_visible?: boolean | null
          header_bg_url?: string | null
          header_code_visible?: boolean | null
          header_contact_visible?: boolean | null
          header_details_color?: string | null
          header_email_visible?: boolean | null
          header_font_color?: string | null
          header_font_family?: string | null
          header_font_size?: string | null
          header_overlay_color?: string | null
          header_overlay_opacity?: number | null
          header_principal_visible?: boolean | null
          header_text_transform?: string | null
          header_title_color?: string | null
          header_title_visible?: boolean | null
          header_visible_sections?: Json | null
          header_website_visible?: boolean | null
          header_year_visible?: boolean | null
          id?: string
          institution_type?: string | null
          late_penalty_per_day?: number | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mission?: string | null
          name?: string
          package_type?: string | null
          phone?: string | null
          principal_message?: string | null
          principal_name?: string | null
          radius_meters?: number | null
          short_code?: string | null
          social_links?: Json | null
          theme?: Json | null
          updated_at?: string
          vision?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          center_id: string
          created_at: string | null
          id: string
          parent_user_id: string | null
          student_id: string | null
          teacher_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          id?: string
          parent_user_id?: string | null
          student_id?: string | null
          teacher_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          id?: string
          parent_user_id?: string | null
          student_id?: string | null
          teacher_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "chat_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_teacher_user_id_fkey"
            columns: ["teacher_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          center_id: string | null
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_text: string
          read_at: string | null
          sender_user_id: string
          sent_at: string | null
        }
        Insert: {
          center_id?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text: string
          read_at?: string | null
          sender_user_id: string
          sent_at?: string | null
        }
        Update: {
          center_id?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text?: string
          read_at?: string | null
          sender_user_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      class_periods: {
        Row: {
          center_id: string
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_published: boolean | null
          period_number: number
          start_time: string
          updated_at: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          period_number: number
          start_time: string
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          period_number?: number
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_periods_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_periods_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      class_substitutions: {
        Row: {
          center_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          original_teacher_id: string | null
          period_schedule_id: string
          status: string
          substitute_teacher_id: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          original_teacher_id?: string | null
          period_schedule_id: string
          status?: string
          substitute_teacher_id: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          original_teacher_id?: string | null
          period_schedule_id?: string
          status?: string
          substitute_teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_substitutions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_substitutions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_substitutions_original_teacher_id_fkey"
            columns: ["original_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_substitutions_period_schedule_id_fkey"
            columns: ["period_schedule_id"]
            isOneToOne: false
            referencedRelation: "period_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_substitutions_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      class_teacher_assignments: {
        Row: {
          center_id: string
          created_at: string
          grade: string
          id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          grade: string
          id?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          grade?: string
          id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teacher_assignments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teacher_assignments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      consumable_logs: {
        Row: {
          action_type: string | null
          center_id: string | null
          consumable_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          quantity: number
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          action_type?: string | null
          center_id?: string | null
          consumable_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          action_type?: string | null
          center_id?: string | null
          consumable_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumable_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_logs_consumable_id_fkey"
            columns: ["consumable_id"]
            isOneToOne: false
            referencedRelation: "consumables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "consumable_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumable_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      consumables: {
        Row: {
          category: string
          center_id: string | null
          created_at: string | null
          current_stock: number | null
          id: string
          min_stock_level: number | null
          name: string
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          center_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          min_stock_level?: number | null
          name: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          center_id?: string | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          min_stock_level?: number | null
          name?: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumables_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumables_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_categories: {
        Row: {
          center_id: string
          created_at: string
          default_severity: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          default_severity?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          default_severity?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipline_categories_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_categories_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_issues: {
        Row: {
          center_id: string
          created_at: string
          description: string
          discipline_category_id: string | null
          id: string
          issue_date: string
          reported_by: string | null
          resolution: string | null
          severity: string | null
          status: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          description: string
          discipline_category_id?: string | null
          id?: string
          issue_date?: string
          reported_by?: string | null
          resolution?: string | null
          severity?: string | null
          status?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          description?: string
          discipline_category_id?: string | null
          id?: string
          issue_date?: string
          reported_by?: string | null
          resolution?: string | null
          severity?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipline_issues_category_id_fkey"
            columns: ["discipline_category_id"]
            isOneToOne: false
            referencedRelation: "discipline_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_issues_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_issues_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_issues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "discipline_issues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          action: string | null
          component: string | null
          created_at: string | null
          device_info: Json | null
          endpoint: string | null
          error_type: string
          id: string
          message: string
          module: string | null
          payload: Json | null
          request_context: Json | null
          schema_context: string | null
          severity: string
          stack: string | null
          status_code: number | null
          timestamp: string | null
          user_context: Json
        }
        Insert: {
          action?: string | null
          component?: string | null
          created_at?: string | null
          device_info?: Json | null
          endpoint?: string | null
          error_type: string
          id?: string
          message: string
          module?: string | null
          payload?: Json | null
          request_context?: Json | null
          schema_context?: string | null
          severity?: string
          stack?: string | null
          status_code?: number | null
          timestamp?: string | null
          user_context?: Json
        }
        Update: {
          action?: string | null
          component?: string | null
          created_at?: string | null
          device_info?: Json | null
          endpoint?: string | null
          error_type?: string
          id?: string
          message?: string
          module?: string | null
          payload?: Json | null
          request_context?: Json | null
          schema_context?: string | null
          severity?: string
          stack?: string | null
          status_code?: number | null
          timestamp?: string | null
          user_context?: Json
        }
        Relationships: []
      }
      exam_marks: {
        Row: {
          center_id: string
          created_at: string
          entered_by: string | null
          exam_id: string
          exam_subject_id: string
          id: string
          marks_obtained: number | null
          remarks: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          entered_by?: string | null
          exam_id: string
          exam_subject_id: string
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          entered_by?: string | null
          exam_id?: string
          exam_subject_id?: string
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_marks_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_exam_subject_id_fkey"
            columns: ["exam_subject_id"]
            isOneToOne: false
            referencedRelation: "exam_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "exam_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_subjects: {
        Row: {
          center_id: string
          created_at: string
          credit_weight: number | null
          exam_id: string
          full_marks: number
          id: string
          pass_marks: number
          subject_name: string
        }
        Insert: {
          center_id: string
          created_at?: string
          credit_weight?: number | null
          exam_id: string
          full_marks?: number
          id?: string
          pass_marks?: number
          subject_name: string
        }
        Update: {
          center_id?: string
          created_at?: string
          credit_weight?: number | null
          exam_id?: string
          full_marks?: number
          id?: string
          pass_marks?: number
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_subjects_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subjects_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subjects_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_types: {
        Row: {
          center_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_types_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_types_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string
          applicable_grades: string[] | null
          center_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          exam_date: string | null
          exam_type_id: string | null
          grade: string
          grades: string[] | null
          grading_system_id: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          applicable_grades?: string[] | null
          center_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          exam_date?: string | null
          exam_type_id?: string | null
          grade: string
          grades?: string[] | null
          grading_system_id?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          applicable_grades?: string[] | null
          center_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          exam_date?: string | null
          exam_type_id?: string | null
          grade?: string
          grades?: string[] | null
          grading_system_id?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_grading_system_id_fkey"
            columns: ["grading_system_id"]
            isOneToOne: false
            referencedRelation: "grading_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          center_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          receipt_url: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          center_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          center_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_headings: {
        Row: {
          center_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          center_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          center_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_headings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_headings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_installments: {
        Row: {
          amount: number
          center_id: string | null
          created_at: string | null
          due_date: string
          id: string
          invoice_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          center_id?: string | null
          created_at?: string | null
          due_date: string
          id?: string
          invoice_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          center_id?: string | null
          created_at?: string | null
          due_date?: string
          id?: string
          invoice_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_installments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_installments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          amount: number
          center_id: string
          class: string | null
          created_at: string
          fee_heading_id: string
          frequency: string | null
          id: string
        }
        Insert: {
          amount: number
          center_id: string
          class?: string | null
          created_at?: string
          fee_heading_id: string
          frequency?: string | null
          id?: string
        }
        Update: {
          amount?: number
          center_id?: string
          class?: string | null
          created_at?: string
          fee_heading_id?: string
          frequency?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_fee_heading_id_fkey"
            columns: ["fee_heading_id"]
            isOneToOne: false
            referencedRelation: "fee_headings"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_systems: {
        Row: {
          center_id: string | null
          created_at: string | null
          id: string
          name: string
          ranges: Json
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          ranges: Json
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          ranges?: Json
        }
        Relationships: [
          {
            foreignKeyName: "grading_systems_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_systems_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          center_id: string
          class: string
          created_at: string
          description: string | null
          due_date: string | null
          grade: string | null
          id: string
          lesson_plan_id: string | null
          section: string | null
          subject: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          center_id: string
          class: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          grade?: string | null
          id?: string
          lesson_plan_id?: string | null
          section?: string | null
          subject: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          center_id?: string
          class?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          grade?: string | null
          id?: string
          lesson_plan_id?: string | null
          section?: string | null
          subject?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["lesson_plan_id"]
          },
          {
            foreignKeyName: "homework_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      id_card_designs: {
        Row: {
          center_id: string | null
          config: Json | null
          created_at: string | null
          design_name: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          center_id?: string | null
          config?: Json | null
          created_at?: string | null
          design_name: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          center_id?: string | null
          config?: Json | null
          created_at?: string | null
          design_name?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "id_card_designs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "id_card_designs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          center_id: string | null
          created_at: string | null
          description: string
          fee_heading_id: string | null
          id: string
          invoice_id: string
          quantity: number
          total_amount: number
          unit_amount: number
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          description: string
          fee_heading_id?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          total_amount: number
          unit_amount: number
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          description?: string
          fee_heading_id?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          total_amount?: number
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_fee_heading_id_fkey"
            columns: ["fee_heading_id"]
            isOneToOne: false
            referencedRelation: "fee_headings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          center_id: string
          created_at: string
          due_date: string | null
          id: string
          installment_plan_active: boolean | null
          invoice_date: string | null
          invoice_month: number | null
          invoice_number: string
          invoice_year: number | null
          late_fee_applied: number | null
          notes: string | null
          paid_amount: number | null
          status: string | null
          student_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_plan_active?: boolean | null
          invoice_date?: string | null
          invoice_month?: number | null
          invoice_number: string
          invoice_year?: number | null
          late_fee_applied?: number | null
          notes?: string | null
          paid_amount?: number | null
          status?: string | null
          student_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          installment_plan_active?: boolean | null
          invoice_date?: string | null
          invoice_month?: number | null
          invoice_number?: string
          invoice_year?: number | null
          late_fee_applied?: number | null
          notes?: string | null
          paid_amount?: number | null
          status?: string | null
          student_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          admin_notes: string | null
          approved_by: string | null
          category_id: string | null
          center_id: string
          created_at: string
          document_url: string | null
          end_date: string
          end_time: string | null
          id: string
          leave_date: string | null
          leave_type: string | null
          reason: string | null
          start_date: string
          start_time: string | null
          status: string
          student_id: string | null
          teacher_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_by?: string | null
          category_id?: string | null
          center_id: string
          created_at?: string
          document_url?: string | null
          end_date: string
          end_time?: string | null
          id?: string
          leave_date?: string | null
          leave_type?: string | null
          reason?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_by?: string | null
          category_id?: string | null
          center_id?: string
          created_at?: string
          document_url?: string | null
          end_date?: string
          end_time?: string | null
          id?: string
          leave_date?: string | null
          leave_type?: string | null
          reason?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "leave_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "leave_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_categories: {
        Row: {
          applicable_to: string
          center_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          applicable_to?: string
          center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          applicable_to?: string
          center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_categories_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_categories_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          admin_notes: string | null
          approval_date: string | null
          approved_at: string | null
          approved_by: string | null
          center_id: string
          chapter: string | null
          class: string
          class_work: string | null
          content: string | null
          created_at: string
          description: string | null
          end_date: string | null
          evaluation_activities: Json | null
          grade: string | null
          home_assignment: string | null
          id: string
          learning_activities: Json | null
          lesson_date: string | null
          lesson_file_url: string | null
          notes: string | null
          objectives: string | null
          period: string | null
          planned_date: string | null
          principal_remarks: string | null
          rejection_reason: string | null
          section: string | null
          start_date: string | null
          status: string | null
          subject: string
          submitted_at: string | null
          teacher_id: string | null
          title: string | null
          topic: string
          updated_at: string
          warm_up_review: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          center_id: string
          chapter?: string | null
          class: string
          class_work?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          evaluation_activities?: Json | null
          grade?: string | null
          home_assignment?: string | null
          id?: string
          learning_activities?: Json | null
          lesson_date?: string | null
          lesson_file_url?: string | null
          notes?: string | null
          objectives?: string | null
          period?: string | null
          planned_date?: string | null
          principal_remarks?: string | null
          rejection_reason?: string | null
          section?: string | null
          start_date?: string | null
          status?: string | null
          subject: string
          submitted_at?: string | null
          teacher_id?: string | null
          title?: string | null
          topic: string
          updated_at?: string
          warm_up_review?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          center_id?: string
          chapter?: string | null
          class?: string
          class_work?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          evaluation_activities?: Json | null
          grade?: string | null
          home_assignment?: string | null
          id?: string
          learning_activities?: Json | null
          lesson_date?: string | null
          lesson_file_url?: string | null
          notes?: string | null
          objectives?: string | null
          period?: string | null
          planned_date?: string | null
          principal_remarks?: string | null
          rejection_reason?: string | null
          section?: string | null
          start_date?: string | null
          status?: string | null
          subject?: string
          submitted_at?: string | null
          teacher_id?: string | null
          title?: string | null
          topic?: string
          updated_at?: string
          warm_up_review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      login_page_settings: {
        Row: {
          background_color: string | null
          background_url: string | null
          background_urls: string[] | null
          button_text: string | null
          created_at: string | null
          developer_info: Json | null
          features: Json | null
          footer_links: Json | null
          help_info: Json | null
          logo_url: string | null
          marketing_subtitle: string | null
          marketing_title: string | null
          page_type: string
          password_label: string | null
          password_placeholder: string | null
          primary_color: string | null
          section_toggles: Json | null
          subtitle: string | null
          title: string
          updated_at: string | null
          username_label: string | null
          username_placeholder: string | null
        }
        Insert: {
          background_color?: string | null
          background_url?: string | null
          background_urls?: string[] | null
          button_text?: string | null
          created_at?: string | null
          developer_info?: Json | null
          features?: Json | null
          footer_links?: Json | null
          help_info?: Json | null
          logo_url?: string | null
          marketing_subtitle?: string | null
          marketing_title?: string | null
          page_type: string
          password_label?: string | null
          password_placeholder?: string | null
          primary_color?: string | null
          section_toggles?: Json | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
          username_label?: string | null
          username_placeholder?: string | null
        }
        Update: {
          background_color?: string | null
          background_url?: string | null
          background_urls?: string[] | null
          button_text?: string | null
          created_at?: string | null
          developer_info?: Json | null
          features?: Json | null
          footer_links?: Json | null
          help_info?: Json | null
          logo_url?: string | null
          marketing_subtitle?: string | null
          marketing_title?: string | null
          page_type?: string
          password_label?: string | null
          password_placeholder?: string | null
          primary_color?: string | null
          section_toggles?: Json | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          username_label?: string | null
          username_placeholder?: string | null
        }
        Relationships: []
      }
      meeting_attendees: {
        Row: {
          attendance_status: string | null
          attended: boolean | null
          center_id: string | null
          created_at: string
          id: string
          meeting_id: string
          notes: string | null
          student_id: string | null
          teacher_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attendance_status?: string | null
          attended?: boolean | null
          center_id?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          notes?: string | null
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_status?: string | null
          attended?: boolean | null
          center_id?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          notes?: string | null
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "meeting_attendees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_conclusions: {
        Row: {
          center_id: string | null
          conclusion_notes: string
          created_at: string
          id: string
          meeting_id: string
          recorded_at: string
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          center_id?: string | null
          conclusion_notes: string
          created_at?: string
          id?: string
          meeting_id: string
          recorded_at?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string | null
          conclusion_notes?: string
          created_at?: string
          id?: string
          meeting_id?: string
          recorded_at?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_conclusions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_conclusions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_conclusions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_conclusions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          center_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_time: string | null
          meeting_type: string | null
          related_meeting_id: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          center_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_time?: string | null
          meeting_type?: string | null
          related_meeting_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          center_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string | null
          meeting_type?: string | null
          related_meeting_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_related_meeting_id_fkey"
            columns: ["related_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions_meta: {
        Row: {
          created_at: string | null
          has_approve: boolean | null
          has_publish: boolean | null
          id: string
          module_key: string
        }
        Insert: {
          created_at?: string | null
          has_approve?: boolean | null
          has_publish?: boolean | null
          id?: string
          module_key: string
        }
        Update: {
          created_at?: string | null
          has_approve?: boolean | null
          has_publish?: boolean | null
          id?: string
          module_key?: string
        }
        Relationships: []
      }
      nav_categories: {
        Row: {
          center_id: string | null
          created_at: string | null
          id: string
          name: string
          order: number | null
          updated_at: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          order?: number | null
          updated_at?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nav_categories_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nav_categories_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_items: {
        Row: {
          category_id: string | null
          center_id: string | null
          created_at: string | null
          feature_name: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order: number | null
          role: string | null
          route: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          center_id?: string | null
          created_at?: string | null
          feature_name?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order?: number | null
          role?: string | null
          route: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          center_id?: string | null
          created_at?: string | null
          feature_name?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order?: number | null
          role?: string | null
          route?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nav_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "nav_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nav_items_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nav_items_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          center_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_emergency: boolean | null
          target_audience: string | null
          target_grade: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          center_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_emergency?: boolean | null
          target_audience?: string | null
          target_grade?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          center_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_emergency?: boolean | null
          target_audience?: string | null
          target_grade?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          center_id: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          center_id: string | null
          created_at: string
          id: string
          parent_user_id: string
          student_id: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          id?: string
          parent_user_id: string
          student_id: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          id?: string
          parent_user_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_settings: {
        Row: {
          api_key: string | null
          api_secret: string | null
          center_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          provider: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          center_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          center_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_settings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_settings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          center_id: string | null
          created_at: string
          id: string
          invoice_id: string
          payment_date: string
          payment_method: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          center_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          center_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_logs: {
        Row: {
          allowances: number
          basic_pay: number
          center_id: string | null
          created_at: string | null
          deductions: number
          id: string
          month: string
          net_payable: number
          paid_at: string | null
          status: string | null
          teacher_id: string | null
          year: string
        }
        Insert: {
          allowances?: number
          basic_pay?: number
          center_id?: string | null
          created_at?: string | null
          deductions?: number
          id?: string
          month: string
          net_payable?: number
          paid_at?: string | null
          status?: string | null
          teacher_id?: string | null
          year: string
        }
        Update: {
          allowances?: number
          basic_pay?: number
          center_id?: string | null
          created_at?: string | null
          deductions?: number
          id?: string
          month?: string
          net_payable?: number
          paid_at?: string | null
          status?: string | null
          teacher_id?: string | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_logs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_evaluations: {
        Row: {
          center_id: string | null
          comments: string | null
          created_at: string | null
          evaluation_date: string | null
          evaluator_id: string | null
          id: string
          rating: number | null
          teacher_id: string | null
        }
        Insert: {
          center_id?: string | null
          comments?: string | null
          created_at?: string | null
          evaluation_date?: string | null
          evaluator_id?: string | null
          id?: string
          rating?: number | null
          teacher_id?: string | null
        }
        Update: {
          center_id?: string | null
          comments?: string | null
          created_at?: string | null
          evaluation_date?: string | null
          evaluator_id?: string | null
          id?: string
          rating?: number | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_evaluations_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_evaluations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      period_schedules: {
        Row: {
          attendance_verified: boolean | null
          center_id: string
          class_period_id: string
          created_at: string | null
          day_of_week: number
          end_time: string | null
          grade: string
          id: string
          period_number: number | null
          start_time: string | null
          status: string | null
          subject: string
          substitute_teacher_id: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          attendance_verified?: boolean | null
          center_id: string
          class_period_id: string
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          grade: string
          id?: string
          period_number?: number | null
          start_time?: string | null
          status?: string | null
          subject: string
          substitute_teacher_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attendance_verified?: boolean | null
          center_id?: string
          class_period_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          grade?: string
          id?: string
          period_number?: number | null
          start_time?: string | null
          status?: string | null
          subject?: string
          substitute_teacher_id?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_schedules_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_schedules_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_schedules_class_period_id_fkey"
            columns: ["class_period_id"]
            isOneToOne: false
            referencedRelation: "class_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_schedules_substitute_teacher_id_fkey"
            columns: ["substitute_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      preschool_activities: {
        Row: {
          activity_type_id: string | null
          center_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          rating: number | null
          student_id: string
          teacher_id: string | null
        }
        Insert: {
          activity_type_id?: string | null
          center_id: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          rating?: number | null
          student_id: string
          teacher_id?: string | null
        }
        Update: {
          activity_type_id?: string | null
          center_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          rating?: number | null
          student_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preschool_activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preschool_activities_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preschool_activities_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preschool_activities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "preschool_activities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preschool_activities_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          center_id: string | null
          created_at: string
          exam_name: string | null
          grade_id: string | null
          grading_scale: Json | null
          id: number
          subjects: Json | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          exam_name?: string | null
          grade_id?: string | null
          grading_scale?: Json | null
          id?: number
          subjects?: Json | null
        }
        Update: {
          center_id?: string | null
          created_at?: string
          exam_name?: string | null
          grade_id?: string | null
          grading_scale?: Json | null
          id?: number
          subjects?: Json | null
        }
        Relationships: []
      }
      saas_invoices: {
        Row: {
          amount: number
          center_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          payment_date: string | null
          plan_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          center_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          payment_date?: string | null
          plan_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          center_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          payment_date?: string | null
          plan_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_invoices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_invoices_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      school_days: {
        Row: {
          center_id: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          is_school_day: boolean | null
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          is_school_day?: boolean | null
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          is_school_day?: boolean | null
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_days_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_days_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_contracts: {
        Row: {
          center_id: string | null
          contract_type: string | null
          created_at: string | null
          document_url: string | null
          end_date: string | null
          id: string
          salary: number | null
          start_date: string
          status: string | null
          teacher_id: string | null
        }
        Insert: {
          center_id?: string | null
          contract_type?: string | null
          created_at?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          salary?: number | null
          start_date: string
          status?: string | null
          teacher_id?: string | null
        }
        Update: {
          center_id?: string | null
          contract_type?: string | null
          created_at?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          salary?: number | null
          start_date?: string
          status?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_contracts_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_contracts_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_contracts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          center_id: string | null
          document_name: string
          document_type: string | null
          document_url: string
          id: string
          teacher_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          center_id?: string | null
          document_name: string
          document_type?: string | null
          document_url: string
          id?: string
          teacher_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          center_id?: string | null
          document_name?: string
          document_type?: string | null
          document_url?: string
          id?: string
          teacher_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_documents_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activities: {
        Row: {
          activity_id: string | null
          activity_type_id: string | null
          attended_at: string | null
          center_id: string | null
          completed: boolean | null
          created_at: string
          date: string
          id: string
          involvement_score: number | null
          notes: string | null
          participation_rating: string | null
          rating: number | null
          student_id: string
          teacher_id: string | null
          teacher_notes: string | null
        }
        Insert: {
          activity_id?: string | null
          activity_type_id?: string | null
          attended_at?: string | null
          center_id?: string | null
          completed?: boolean | null
          created_at?: string
          date?: string
          id?: string
          involvement_score?: number | null
          notes?: string | null
          participation_rating?: string | null
          rating?: number | null
          student_id: string
          teacher_id?: string | null
          teacher_notes?: string | null
        }
        Update: {
          activity_id?: string | null
          activity_type_id?: string | null
          attended_at?: string | null
          center_id?: string | null
          completed?: boolean | null
          created_at?: string
          date?: string
          id?: string
          involvement_score?: number | null
          notes?: string | null
          participation_rating?: string | null
          rating?: number | null
          student_id?: string
          teacher_id?: string | null
          teacher_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "activity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_activities_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_activities_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_chapters: {
        Row: {
          center_id: string | null
          chapter_name: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          evaluation_rating: number | null
          id: string
          lesson_plan_id: string | null
          notes: string | null
          recorded_by_teacher_id: string | null
          student_id: string
          teacher_notes: string | null
        }
        Insert: {
          center_id?: string | null
          chapter_name?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          evaluation_rating?: number | null
          id?: string
          lesson_plan_id?: string | null
          notes?: string | null
          recorded_by_teacher_id?: string | null
          student_id: string
          teacher_notes?: string | null
        }
        Update: {
          center_id?: string | null
          chapter_name?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          evaluation_rating?: number | null
          id?: string
          lesson_plan_id?: string | null
          notes?: string | null
          recorded_by_teacher_id?: string | null
          student_id?: string
          teacher_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_chapters_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chapters_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chapters_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chapters_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["lesson_plan_id"]
          },
          {
            foreignKeyName: "student_chapters_recorded_by_teacher_id_fkey"
            columns: ["recorded_by_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_chapters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_chapters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_homework_records: {
        Row: {
          center_id: string | null
          created_at: string
          feedback: string | null
          homework_id: string
          id: string
          status: string | null
          student_id: string
          submission_date: string | null
          submission_url: string | null
          submitted_at: string | null
          teacher_remarks: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          feedback?: string | null
          homework_id: string
          id?: string
          status?: string | null
          student_id: string
          submission_date?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          teacher_remarks?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string
          feedback?: string | null
          homework_id?: string
          id?: string
          status?: string | null
          student_id?: string
          submission_date?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          teacher_remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_homework_records_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_homework_records_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_homework_records_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_homework_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_homework_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_promotion_history: {
        Row: {
          academic_year: string | null
          center_id: string | null
          from_grade: string | null
          id: string
          promoted_at: string | null
          promoted_by: string | null
          student_id: string | null
          to_grade: string | null
        }
        Insert: {
          academic_year?: string | null
          center_id?: string | null
          from_grade?: string | null
          id?: string
          promoted_at?: string | null
          promoted_by?: string | null
          student_id?: string | null
          to_grade?: string | null
        }
        Update: {
          academic_year?: string | null
          center_id?: string | null
          from_grade?: string | null
          id?: string
          promoted_at?: string | null
          promoted_by?: string | null
          student_id?: string | null
          to_grade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_promotion_history_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_history_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_history_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_promotion_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_promotion_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_results: {
        Row: {
          center_id: string | null
          created_at: string
          id: number
          marks: Json | null
          result_id: number | null
          student_id: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          id?: number
          marks?: Json | null
          result_id?: number | null
          student_id?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string
          id?: number
          marks?: Json | null
          result_id?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_results_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_date: string | null
          blood_group: string | null
          center_id: string
          contact_number: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          grade: string | null
          id: string
          is_active: boolean | null
          is_alumni: boolean | null
          name: string
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          photo_url: string | null
          roll_number: string | null
          school_name: string | null
          section: string | null
          status: string | null
          student_id_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          blood_group?: string | null
          center_id: string
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          is_alumni?: boolean | null
          name: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          photo_url?: string | null
          roll_number?: string | null
          school_name?: string | null
          section?: string | null
          status?: string | null
          student_id_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          blood_group?: string | null
          center_id?: string
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          is_alumni?: boolean | null
          name?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          photo_url?: string | null
          roll_number?: string | null
          school_name?: string | null
          section?: string | null
          status?: string | null
          student_id_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          center_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle: string | null
          created_at: string | null
          features: Json | null
          id: string
          limits: Json | null
          name: string
          price: number
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          name: string
          price: number
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          center_id: string | null
          created_at: string | null
          id: string
          message: string
          role_type: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          role_type: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          role_type?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          contact_info: string | null
          created_at: string | null
          developer_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          contact_info?: string | null
          created_at?: string | null
          developer_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          contact_info?: string | null
          created_at?: string | null
          developer_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_slabs: {
        Row: {
          center_id: string | null
          created_at: string | null
          id: string
          max_income: number | null
          min_income: number
          tax_percent: number
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          max_income?: number | null
          min_income: number
          tax_percent: number
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          max_income?: number | null
          min_income?: number
          tax_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_slabs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_slabs_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          center_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string
          teacher_id: string
          time_in: string | null
          time_out: string | null
        }
        Insert: {
          center_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          status: string
          teacher_id: string
          time_in?: string | null
          time_out?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          teacher_id?: string
          time_in?: string | null
          time_out?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_feature_permissions: {
        Row: {
          about_institution: boolean | null
          academics_access: boolean | null
          activities: boolean | null
          ai_insights: boolean | null
          attendance_summary: boolean | null
          calendar_events: boolean | null
          can_manage_attendance: boolean | null
          can_manage_hr: boolean | null
          can_manage_id_cards: boolean | null
          can_manage_inventory: boolean | null
          can_manage_leave: boolean | null
          can_manage_school_days: boolean | null
          can_manage_settings: boolean | null
          can_manage_students: boolean | null
          can_manage_teachers: boolean | null
          can_manage_transport: boolean | null
          center_id: string | null
          chapter_performance: boolean | null
          class_routine: boolean | null
          communications_access: boolean | null
          created_at: string
          dashboard_access: boolean | null
          discipline_issues: boolean | null
          exams_results: boolean | null
          finance: boolean | null
          homework_management: boolean | null
          hr_management: boolean | null
          id: string
          inventory_assets: boolean | null
          leave_management: boolean | null
          lesson_plans: boolean | null
          lesson_tracking: boolean | null
          meetings_management: boolean | null
          messaging: boolean | null
          parent_portal: boolean | null
          permissions: Json | null
          preschool_activities: boolean | null
          published_results: boolean | null
          register_student: boolean | null
          school_days: boolean | null
          settings_access: boolean | null
          student_id_cards: boolean | null
          student_report: boolean | null
          student_report_access: boolean | null
          students_registration: boolean | null
          summary: boolean | null
          take_attendance: boolean | null
          teacher_id: string
          teacher_management: boolean | null
          teacher_performance: boolean | null
          teacher_reports: boolean | null
          teacher_scope_mode: string | null
          teachers_attendance: boolean | null
          teachers_registration: boolean | null
          test_management: boolean | null
          transport_tracking: boolean | null
          updated_at: string
          view_records: boolean | null
        }
        Insert: {
          about_institution?: boolean | null
          academics_access?: boolean | null
          activities?: boolean | null
          ai_insights?: boolean | null
          attendance_summary?: boolean | null
          calendar_events?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_hr?: boolean | null
          can_manage_id_cards?: boolean | null
          can_manage_inventory?: boolean | null
          can_manage_leave?: boolean | null
          can_manage_school_days?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_students?: boolean | null
          can_manage_teachers?: boolean | null
          can_manage_transport?: boolean | null
          center_id?: string | null
          chapter_performance?: boolean | null
          class_routine?: boolean | null
          communications_access?: boolean | null
          created_at?: string
          dashboard_access?: boolean | null
          discipline_issues?: boolean | null
          exams_results?: boolean | null
          finance?: boolean | null
          homework_management?: boolean | null
          hr_management?: boolean | null
          id?: string
          inventory_assets?: boolean | null
          leave_management?: boolean | null
          lesson_plans?: boolean | null
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          messaging?: boolean | null
          parent_portal?: boolean | null
          permissions?: Json | null
          preschool_activities?: boolean | null
          published_results?: boolean | null
          register_student?: boolean | null
          school_days?: boolean | null
          settings_access?: boolean | null
          student_id_cards?: boolean | null
          student_report?: boolean | null
          student_report_access?: boolean | null
          students_registration?: boolean | null
          summary?: boolean | null
          take_attendance?: boolean | null
          teacher_id: string
          teacher_management?: boolean | null
          teacher_performance?: boolean | null
          teacher_reports?: boolean | null
          teacher_scope_mode?: string | null
          teachers_attendance?: boolean | null
          teachers_registration?: boolean | null
          test_management?: boolean | null
          transport_tracking?: boolean | null
          updated_at?: string
          view_records?: boolean | null
        }
        Update: {
          about_institution?: boolean | null
          academics_access?: boolean | null
          activities?: boolean | null
          ai_insights?: boolean | null
          attendance_summary?: boolean | null
          calendar_events?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_hr?: boolean | null
          can_manage_id_cards?: boolean | null
          can_manage_inventory?: boolean | null
          can_manage_leave?: boolean | null
          can_manage_school_days?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_students?: boolean | null
          can_manage_teachers?: boolean | null
          can_manage_transport?: boolean | null
          center_id?: string | null
          chapter_performance?: boolean | null
          class_routine?: boolean | null
          communications_access?: boolean | null
          created_at?: string
          dashboard_access?: boolean | null
          discipline_issues?: boolean | null
          exams_results?: boolean | null
          finance?: boolean | null
          homework_management?: boolean | null
          hr_management?: boolean | null
          id?: string
          inventory_assets?: boolean | null
          leave_management?: boolean | null
          lesson_plans?: boolean | null
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          messaging?: boolean | null
          parent_portal?: boolean | null
          permissions?: Json | null
          preschool_activities?: boolean | null
          published_results?: boolean | null
          register_student?: boolean | null
          school_days?: boolean | null
          settings_access?: boolean | null
          student_id_cards?: boolean | null
          student_report?: boolean | null
          student_report_access?: boolean | null
          students_registration?: boolean | null
          summary?: boolean | null
          take_attendance?: boolean | null
          teacher_id?: string
          teacher_management?: boolean | null
          teacher_performance?: boolean | null
          teacher_reports?: boolean | null
          teacher_scope_mode?: string | null
          teachers_attendance?: boolean | null
          teachers_registration?: boolean | null
          test_management?: boolean | null
          transport_tracking?: boolean | null
          updated_at?: string
          view_records?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_feature_permissions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_feature_permissions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_feature_permissions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          bank_details: Json | null
          center_id: string
          contact_number: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string | null
          emergency_contact: Json | null
          employee_id: string | null
          expected_check_in: string | null
          expected_check_out: string | null
          gender: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          monthly_salary: number | null
          name: string
          phone: string | null
          qualifications: Json | null
          regular_in_time: string | null
          regular_out_time: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: Json | null
          center_id: string
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_id?: string | null
          expected_check_in?: string | null
          expected_check_out?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          monthly_salary?: number | null
          name: string
          phone?: string | null
          qualifications?: Json | null
          regular_in_time?: string | null
          regular_out_time?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: Json | null
          center_id?: string
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_id?: string | null
          expected_check_in?: string | null
          expected_check_out?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          monthly_salary?: number | null
          name?: string
          phone?: string | null
          qualifications?: Json | null
          regular_in_time?: string | null
          regular_out_time?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_marks: {
        Row: {
          center_id: string | null
          created_at: string
          id: string
          marks_obtained: number | null
          remarks: string | null
          student_id: string
          test_id: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id: string
          test_id: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_marks_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_marks_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "test_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_marks_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          center_id: string | null
          created_at: string
          date_taken: string | null
          grade_earned: string | null
          id: string
          marks: Json | null
          marks_obtained: number | null
          percentage: number | null
          question_marks: Json | null
          student_id: string
          test_id: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          date_taken?: string | null
          grade_earned?: string | null
          id?: string
          marks?: Json | null
          marks_obtained?: number | null
          percentage?: number | null
          question_marks?: Json | null
          student_id: string
          test_id: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          date_taken?: string | null
          grade_earned?: string | null
          id?: string
          marks?: Json | null
          marks_obtained?: number | null
          percentage?: number | null
          question_marks?: Json | null
          student_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "test_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          center_id: string
          class: string
          created_at: string
          created_by: string | null
          date: string | null
          id: string
          lesson_plan_id: string | null
          max_marks: number | null
          name: string
          published: boolean | null
          questions: Json | null
          section: string | null
          subject: string | null
          subjects: Json | null
          test_date: string | null
          total_marks: number
          type: string | null
          updated_at: string
        }
        Insert: {
          center_id: string
          class: string
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          lesson_plan_id?: string | null
          max_marks?: number | null
          name: string
          published?: boolean | null
          questions?: Json | null
          section?: string | null
          subject?: string | null
          subjects?: Json | null
          test_date?: string | null
          total_marks: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string
          class?: string
          created_at?: string
          created_by?: string | null
          date?: string | null
          id?: string
          lesson_plan_id?: string | null
          max_marks?: number | null
          name?: string
          published?: boolean | null
          questions?: Json | null
          section?: string | null
          subject?: string | null
          subjects?: Json | null
          test_date?: string | null
          total_marks?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["lesson_plan_id"]
          },
        ]
      }
      transfer_certificates: {
        Row: {
          center_id: string | null
          certificate_number: string | null
          created_at: string | null
          id: string
          issue_date: string | null
          issued_by: string | null
          leaving_date: string
          reason_for_leaving: string | null
          student_id: string | null
        }
        Insert: {
          center_id?: string | null
          certificate_number?: string | null
          created_at?: string | null
          id?: string
          issue_date?: string | null
          issued_by?: string | null
          leaving_date: string
          reason_for_leaving?: string | null
          student_id?: string | null
        }
        Update: {
          center_id?: string | null
          certificate_number?: string | null
          created_at?: string | null
          id?: string
          issue_date?: string | null
          issued_by?: string | null
          leaving_date?: string
          reason_for_leaving?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_certificates_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_certificates_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "transfer_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_assignments: {
        Row: {
          center_id: string | null
          created_at: string | null
          id: string
          route_id: string | null
          student_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          route_id?: string | null
          student_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string | null
          id?: string
          route_id?: string | null
          student_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_assignments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "transport_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active_academic_year: string | null
          center_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_active_at: string | null
          last_login: string | null
          password_hash: string
          preferences: Json | null
          role: string
          student_id: string | null
          teacher_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          active_academic_year?: string | null
          center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          last_login?: string | null
          password_hash: string
          preferences?: Json | null
          role: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          active_academic_year?: string | null
          center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          last_login?: string | null
          password_hash?: string
          preferences?: Json | null
          role?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_missed_chapters"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "users_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity: number | null
          center_id: string | null
          created_at: string | null
          driver_name: string | null
          driver_phone: string | null
          gps_device_id: string | null
          id: string
          last_latitude: number | null
          last_longitude: number | null
          last_sync: string | null
          vehicle_name: string | null
          vehicle_number: string
        }
        Insert: {
          capacity?: number | null
          center_id?: string | null
          created_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          gps_device_id?: string | null
          id?: string
          last_latitude?: number | null
          last_longitude?: number | null
          last_sync?: string | null
          vehicle_name?: string | null
          vehicle_number: string
        }
        Update: {
          capacity?: number | null
          center_id?: string | null
          created_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          gps_device_id?: string | null
          id?: string
          last_latitude?: number | null
          last_longitude?: number | null
          last_sync?: string | null
          vehicle_name?: string | null
          vehicle_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      center_analytics_view: {
        Row: {
          about_description: string | null
          academic_info: string | null
          achievements: string | null
          active_now_count: number | null
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          established_date: string | null
          facilities: Json | null
          gallary: string | null
          gallery: Json | null
          header_address_visible: boolean | null
          header_bg_url: string | null
          header_code_visible: boolean | null
          header_contact_visible: boolean | null
          header_details_color: string | null
          header_email_visible: boolean | null
          header_font_color: string | null
          header_font_family: string | null
          header_font_size: string | null
          header_overlay_color: string | null
          header_overlay_opacity: number | null
          header_principal_visible: boolean | null
          header_text_transform: string | null
          header_title_color: string | null
          header_title_visible: boolean | null
          header_visible_sections: Json | null
          header_website_visible: boolean | null
          header_year_visible: boolean | null
          id: string | null
          institution_type: string | null
          late_penalty_per_day: number | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mission: string | null
          name: string | null
          parents_count: number | null
          phone: string | null
          principal_message: string | null
          principal_name: string | null
          radius_meters: number | null
          short_code: string | null
          social_links: Json | null
          students_count: number | null
          teachers_count: number | null
          theme: Json | null
          updated_at: string | null
          vision: string | null
          website_url: string | null
        }
        Insert: {
          about_description?: string | null
          academic_info?: string | null
          achievements?: string | null
          active_now_count?: never
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          established_date?: string | null
          facilities?: Json | null
          gallary?: string | null
          gallery?: Json | null
          header_address_visible?: boolean | null
          header_bg_url?: string | null
          header_code_visible?: boolean | null
          header_contact_visible?: boolean | null
          header_details_color?: string | null
          header_email_visible?: boolean | null
          header_font_color?: string | null
          header_font_family?: string | null
          header_font_size?: string | null
          header_overlay_color?: string | null
          header_overlay_opacity?: number | null
          header_principal_visible?: boolean | null
          header_text_transform?: string | null
          header_title_color?: string | null
          header_title_visible?: boolean | null
          header_visible_sections?: Json | null
          header_website_visible?: boolean | null
          header_year_visible?: boolean | null
          id?: string | null
          institution_type?: string | null
          late_penalty_per_day?: number | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mission?: string | null
          name?: string | null
          parents_count?: never
          phone?: string | null
          principal_message?: string | null
          principal_name?: string | null
          radius_meters?: number | null
          short_code?: string | null
          social_links?: Json | null
          students_count?: never
          teachers_count?: never
          theme?: Json | null
          updated_at?: string | null
          vision?: string | null
          website_url?: string | null
        }
        Update: {
          about_description?: string | null
          academic_info?: string | null
          achievements?: string | null
          active_now_count?: never
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          established_date?: string | null
          facilities?: Json | null
          gallary?: string | null
          gallery?: Json | null
          header_address_visible?: boolean | null
          header_bg_url?: string | null
          header_code_visible?: boolean | null
          header_contact_visible?: boolean | null
          header_details_color?: string | null
          header_email_visible?: boolean | null
          header_font_color?: string | null
          header_font_family?: string | null
          header_font_size?: string | null
          header_overlay_color?: string | null
          header_overlay_opacity?: number | null
          header_principal_visible?: boolean | null
          header_text_transform?: string | null
          header_title_color?: string | null
          header_title_visible?: boolean | null
          header_visible_sections?: Json | null
          header_website_visible?: boolean | null
          header_year_visible?: boolean | null
          id?: string | null
          institution_type?: string | null
          late_penalty_per_day?: number | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mission?: string | null
          name?: string | null
          parents_count?: never
          phone?: string | null
          principal_message?: string | null
          principal_name?: string | null
          radius_meters?: number | null
          short_code?: string | null
          social_links?: Json | null
          students_count?: never
          teachers_count?: never
          theme?: Json | null
          updated_at?: string | null
          vision?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      student_missed_chapters: {
        Row: {
          arrival_time: string | null
          attendance_status: string | null
          center_id: string | null
          chapter: string | null
          grade: string | null
          lesson_date: string | null
          lesson_plan_id: string | null
          student_id: string | null
          student_name: string | null
          subject: string | null
          topic: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "center_analytics_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_center_manage_parent_student_link: {
        Args: { p_parent_user_id: string; p_student_id: string }
        Returns: boolean
      }
      decrement_book_copies: { Args: { row_id: string }; Returns: undefined }
      decrement_consumable_stock: {
        Args: { amount: number; item_id: string }
        Returns: undefined
      }
      distribute_consumable_securely: {
        Args: {
          p_amount: number
          p_center_id: string
          p_consumable_id: string
          p_notes: string
          p_recipient_id: string
          p_recipient_type: string
        }
        Returns: undefined
      }
      get_auth_center_id: { Args: never; Returns: string }
      get_auth_role: { Args: never; Returns: string }
      get_auth_teacher_id: { Args: never; Returns: string }
      get_teacher_assigned_grades: { Args: never; Returns: string[] }
      get_teacher_scope_mode: { Args: never; Returns: string }
      get_user_center_id:
        | { Args: never; Returns: string }
        | { Args: { user_id: string }; Returns: string }
      get_user_role:
        | { Args: never; Returns: string }
        | { Args: { user_id: string }; Returns: string }
      get_user_student_id: { Args: never; Returns: string }
      get_user_teacher_id: { Args: never; Returns: string }
      increment_available_copies: {
        Args: { row_id: string }
        Returns: undefined
      }
      increment_consumable_stock: {
        Args: { amount: number; item_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_grade_assigned: { Args: { target_grade: string }; Returns: boolean }
      is_same_center: { Args: { target_center: string }; Returns: boolean }
      is_teacher_restricted: { Args: never; Returns: boolean }
      issue_book_securely: {
        Args: {
          p_book_id: string
          p_center_id: string
          p_due_date: string
          p_student_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
