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
            referencedRelation: "students"
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
        }
        Relationships: [
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
      center_feature_permissions: {
        Row: {
          ai_insights: boolean | null
          center_id: string
          created_at: string
          discipline_issues: boolean | null
          finance: boolean | null
          homework_management: boolean | null
          id: string
          lesson_plans: boolean | null
          lesson_tracking: boolean | null
          meetings_management: boolean | null
          preschool_activities: boolean | null
          register_student: boolean | null
          summary: boolean | null
          take_attendance: boolean | null
          teacher_management: boolean | null
          test_management: boolean | null
          updated_at: string
          view_records: boolean | null
        }
        Insert: {
          ai_insights?: boolean | null
          center_id: string
          created_at?: string
          discipline_issues?: boolean | null
          finance?: boolean | null
          homework_management?: boolean | null
          id?: string
          lesson_plans?: boolean | null
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          preschool_activities?: boolean | null
          register_student?: boolean | null
          summary?: boolean | null
          take_attendance?: boolean | null
          teacher_management?: boolean | null
          test_management?: boolean | null
          updated_at?: string
          view_records?: boolean | null
        }
        Update: {
          ai_insights?: boolean | null
          center_id?: string
          created_at?: string
          discipline_issues?: boolean | null
          finance?: boolean | null
          homework_management?: boolean | null
          id?: string
          lesson_plans?: boolean | null
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          preschool_activities?: boolean | null
          register_student?: boolean | null
          summary?: boolean | null
          take_attendance?: boolean | null
          teacher_management?: boolean | null
          test_management?: boolean | null
          updated_at?: string
          view_records?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "center_feature_permissions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: true
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          center_id: string
          created_at: string | null
          id: string
          parent_user_id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          center_id: string
          created_at?: string | null
          id?: string
          parent_user_id: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          created_at?: string | null
          id?: string
          parent_user_id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
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
          period_number?: number
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_periods_center_id_fkey"
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
            referencedRelation: "students"
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
            referencedRelation: "centers"
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
            referencedRelation: "centers"
            referencedColumns: ["id"]
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
      invoice_items: {
        Row: {
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
          invoice_date: string | null
          invoice_month: number | null
          invoice_number: string
          invoice_year: number | null
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
          invoice_date?: string | null
          invoice_month?: number | null
          invoice_number: string
          invoice_year?: number | null
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
          invoice_date?: string | null
          invoice_month?: number | null
          invoice_number?: string
          invoice_year?: number | null
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
            referencedRelation: "centers"
            referencedColumns: ["id"]
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
      lesson_plans: {
        Row: {
          center_id: string
          chapter: string | null
          class: string
          content: string | null
          created_at: string
          grade: string | null
          id: string
          lesson_date: string | null
          lesson_file_url: string | null
          notes: string | null
          objectives: string | null
          planned_date: string | null
          section: string | null
          status: string | null
          subject: string
          teacher_id: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          center_id: string
          chapter?: string | null
          class: string
          content?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          lesson_date?: string | null
          lesson_file_url?: string | null
          notes?: string | null
          objectives?: string | null
          planned_date?: string | null
          section?: string | null
          status?: string | null
          subject: string
          teacher_id?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          chapter?: string | null
          class?: string
          content?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          lesson_date?: string | null
          lesson_file_url?: string | null
          notes?: string | null
          objectives?: string | null
          planned_date?: string | null
          section?: string | null
          status?: string | null
          subject?: string
          teacher_id?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
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
      meeting_attendees: {
        Row: {
          attendance_status: string | null
          attended: boolean | null
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
          conclusion_notes: string
          created_at: string
          id: string
          meeting_id: string
          recorded_at: string
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          conclusion_notes: string
          created_at?: string
          id?: string
          meeting_id: string
          recorded_at?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
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
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
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
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_user_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_user_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_user_id?: string
          student_id?: string
        }
        Relationships: [
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
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          payment_date: string
          payment_method: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      period_schedules: {
        Row: {
          center_id: string
          class_period_id: string
          created_at: string | null
          day_of_week: number
          grade: string
          id: string
          subject: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          center_id: string
          class_period_id: string
          created_at?: string | null
          day_of_week: number
          grade: string
          id?: string
          subject: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          center_id?: string
          class_period_id?: string
          created_at?: string | null
          day_of_week?: number
          grade?: string
          id?: string
          subject?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "centers"
            referencedColumns: ["id"]
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
      student_activities: {
        Row: {
          activity_id: string | null
          activity_type_id: string | null
          attended_at: string | null
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
            foreignKeyName: "student_chapters_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
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
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_homework_records: {
        Row: {
          created_at: string
          homework_id: string
          id: string
          status: string | null
          student_id: string
          submission_date: string | null
          submitted_at: string | null
        }
        Insert: {
          created_at?: string
          homework_id: string
          id?: string
          status?: string | null
          student_id: string
          submission_date?: string | null
          submitted_at?: string | null
        }
        Update: {
          created_at?: string
          homework_id?: string
          id?: string
          status?: string | null
          student_id?: string
          submission_date?: string | null
          submitted_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          center_id: string
          contact_number: string | null
          created_at: string
          date_of_birth: string | null
          grade: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          roll_number: string | null
          school_name: string | null
          section: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          center_id: string
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          roll_number?: string | null
          school_name?: string | null
          section?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          center_id?: string
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          roll_number?: string | null
          school_name?: string | null
          section?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
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
          created_at: string
          discipline_issues: boolean | null
          homework_management: boolean | null
          id: string
          lesson_tracking: boolean | null
          meetings_management: boolean | null
          preschool_activities: boolean | null
          student_report_access: boolean | null
          take_attendance: boolean | null
          teacher_id: string
          test_management: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discipline_issues?: boolean | null
          homework_management?: boolean | null
          id?: string
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          preschool_activities?: boolean | null
          student_report_access?: boolean | null
          take_attendance?: boolean | null
          teacher_id: string
          test_management?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discipline_issues?: boolean | null
          homework_management?: boolean | null
          id?: string
          lesson_tracking?: boolean | null
          meetings_management?: boolean | null
          preschool_activities?: boolean | null
          student_report_access?: boolean | null
          take_attendance?: boolean | null
          teacher_id?: string
          test_management?: boolean | null
          updated_at?: string
        }
        Relationships: [
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
          center_id: string
          contact_number: string | null
          created_at: string
          email: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          center_id: string
          contact_number?: string | null
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          center_id?: string
          contact_number?: string | null
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
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
          created_at: string
          id: string
          marks_obtained: number | null
          remarks: string | null
          student_id: string
          test_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id: string
          test_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string
          test_id?: string
        }
        Relationships: [
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
          created_at: string
          date_taken: string | null
          grade_earned: string | null
          id: string
          marks_obtained: number | null
          percentage: number | null
          question_marks: Json | null
          student_id: string
          test_id: string
        }
        Insert: {
          created_at?: string
          date_taken?: string | null
          grade_earned?: string | null
          id?: string
          marks_obtained?: number | null
          percentage?: number | null
          question_marks?: Json | null
          student_id: string
          test_id: string
        }
        Update: {
          created_at?: string
          date_taken?: string | null
          grade_earned?: string | null
          id?: string
          marks_obtained?: number | null
          percentage?: number | null
          question_marks?: Json | null
          student_id?: string
          test_id?: string
        }
        Relationships: [
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
          questions: Json | null
          section: string | null
          subject: string
          test_date: string | null
          total_marks: number
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
          questions?: Json | null
          section?: string | null
          subject: string
          test_date?: string | null
          total_marks: number
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
          questions?: Json | null
          section?: string | null
          subject?: string
          test_date?: string | null
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
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
        ]
      }
      users: {
        Row: {
          center_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          role: string
          student_id: string | null
          teacher_id: string | null
          updated_at: string
          username: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          role: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
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
            referencedRelation: "centers"
            referencedColumns: ["id"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
