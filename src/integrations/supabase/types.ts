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
      account_credits: {
        Row: {
          amount_cents: number
          applied_at: string | null
          applied_to_invoice_id: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          applied_at?: string | null
          applied_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          source_id?: string | null
          source_type?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          applied_at?: string | null
          applied_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_credits_applied_to_invoice_id_fkey"
            columns: ["applied_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notes: {
        Row: {
          admin_id: string
          admin_name: string | null
          content: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          admin_id: string
          admin_name?: string | null
          content: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          admin_id?: string
          admin_name?: string | null
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      backup_status: {
        Row: {
          backup_size_mb: number | null
          backup_type: string
          created_at: string
          id: string
          last_backup_at: string | null
          last_restore_test_at: string | null
          last_restore_test_by: string | null
          last_restore_test_notes: string | null
          metadata: Json | null
          retention_days: number
          status: string
          updated_at: string
        }
        Insert: {
          backup_size_mb?: number | null
          backup_type?: string
          created_at?: string
          id?: string
          last_backup_at?: string | null
          last_restore_test_at?: string | null
          last_restore_test_by?: string | null
          last_restore_test_notes?: string | null
          metadata?: Json | null
          retention_days?: number
          status?: string
          updated_at?: string
        }
        Update: {
          backup_size_mb?: number | null
          backup_type?: string
          created_at?: string
          id?: string
          last_backup_at?: string | null
          last_restore_test_at?: string | null
          last_restore_test_by?: string | null
          last_restore_test_notes?: string | null
          metadata?: Json | null
          retention_days?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      change_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          deployed_at: string | null
          deployed_by: string | null
          description: string
          expected_impact: string
          id: string
          incident_id: string | null
          risk_level: string
          rollback_plan: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          deployed_at?: string | null
          deployed_by?: string | null
          description?: string
          expected_impact?: string
          id?: string
          incident_id?: string | null
          risk_level?: string
          rollback_plan?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          deployed_at?: string | null
          deployed_by?: string | null
          description?: string
          expected_impact?: string
          id?: string
          incident_id?: string | null
          risk_level?: string
          rollback_plan?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_records_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      data_lifecycle_events: {
        Row: {
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          performed_by: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          performed_by: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          performed_by?: string
        }
        Relationships: []
      }
      dr_documents: {
        Row: {
          content: string
          created_at: string
          edited_by: string
          id: string
          is_current: boolean
          section: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          edited_by: string
          id?: string
          is_current?: boolean
          section: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          edited_by?: string
          id?: string
          is_current?: boolean
          section?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      elevation_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          denial_reason: string | null
          denied_at: string | null
          denied_by: string | null
          expires_at: string
          id: string
          reason: string
          requested_role: string
          requester_id: string
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          expires_at: string
          id?: string
          reason: string
          requested_role: string
          requester_id: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          expires_at?: string
          id?: string
          reason?: string
          requested_role?: string
          requester_id?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fraud_markers: {
        Row: {
          created_at: string
          description: string
          id: string
          marker_type: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          marker_type: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          marker_type?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      fulfillment: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          sent_at: string | null
          sent_by_admin_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          sent_at?: string | null
          sent_by_admin_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          sent_at?: string | null
          sent_by_admin_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_linked_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          incident_id: string
          linked_by: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          incident_id: string
          linked_by: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          incident_id?: string
          linked_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_linked_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_updates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          incident_id: string
          is_public: boolean
          message: string
          status_change: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          incident_id: string
          is_public?: boolean
          message: string
          status_change?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          incident_id?: string
          is_public?: boolean
          message?: string
          status_change?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          owner_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          owner_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          owner_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          discount_cents: number
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          last_email_sent_at: string | null
          last_email_type: string | null
          notes: string | null
          paid_at: string | null
          plan_id: number | null
          plan_name: string | null
          referral_code_id: string | null
          refund_amount_cents: number | null
          refunded_at: string | null
          refunded_by: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          discount_cents?: number
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          notes?: string | null
          paid_at?: string | null
          plan_id?: number | null
          plan_name?: string | null
          referral_code_id?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          discount_cents?: number
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          notes?: string | null
          paid_at?: string | null
          plan_id?: number | null
          plan_name?: string | null
          referral_code_id?: string | null
          refund_amount_cents?: number | null
          refunded_at?: string | null
          refunded_by?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_stats"
            referencedColumns: ["code_id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document_type: string
          document_version: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_type: string
          document_version: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_type?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_address: string | null
          notification_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          notification_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          notification_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_clicks_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          alerts: boolean
          announcements: boolean
          created_at: string
          email_feature_announcements: boolean
          email_payment_receipts: boolean
          email_promotional_offers: boolean
          email_subscription_updates: boolean
          id: string
          info: boolean
          updated_at: string
          user_id: string
          warnings: boolean
        }
        Insert: {
          alerts?: boolean
          announcements?: boolean
          created_at?: string
          email_feature_announcements?: boolean
          email_payment_receipts?: boolean
          email_promotional_offers?: boolean
          email_subscription_updates?: boolean
          id?: string
          info?: boolean
          updated_at?: string
          user_id: string
          warnings?: boolean
        }
        Update: {
          alerts?: boolean
          announcements?: boolean
          created_at?: string
          email_feature_announcements?: boolean
          email_payment_receipts?: boolean
          email_promotional_offers?: boolean
          email_subscription_updates?: boolean
          id?: string
          info?: boolean
          updated_at?: string
          user_id?: string
          warnings?: boolean
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          message_template: string
          name: string
          priority: string
          title_template: string
          type: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          message_template: string
          name: string
          priority?: string
          title_template: string
          type?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          message_template?: string
          name?: string
          priority?: string
          title_template?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: string | null
          click_url: string | null
          clicks: number | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_sent_at: string | null
          message: string
          priority: string
          recurrence_interval: string | null
          recurrence_type: string | null
          scheduled_for: string | null
          sent_at: string | null
          target_audience: string
          template_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          click_url?: string | null
          clicks?: number | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          message: string
          priority?: string
          recurrence_interval?: string | null
          recurrence_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          target_audience?: string
          template_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          click_url?: string | null
          clicks?: number | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          message?: string
          priority?: string
          recurrence_interval?: string | null
          recurrence_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          target_audience?: string
          template_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      operational_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          email_sent_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_received_cents: number | null
          chain: string | null
          created_at: string
          currency: string
          from_address: string | null
          id: string
          invoice_id: string
          method: string
          processor_data: Json | null
          processor_payment_id: string | null
          provider: string | null
          received_at: string | null
          status: string
          to_address: string | null
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_received_cents?: number | null
          chain?: string | null
          created_at?: string
          currency?: string
          from_address?: string | null
          id?: string
          invoice_id: string
          method?: string
          processor_data?: Json | null
          processor_payment_id?: string | null
          provider?: string | null
          received_at?: string | null
          status?: string
          to_address?: string | null
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_received_cents?: number | null
          chain?: string | null
          created_at?: string
          currency?: string
          from_address?: string | null
          id?: string
          invoice_id?: string
          method?: string
          processor_data?: Json | null
          processor_payment_id?: string | null
          provider?: string | null
          received_at?: string | null
          status?: string
          to_address?: string | null
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
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
      payout_logs: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          processed_at: string | null
          processed_by: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string
          devices: number
          display_order: number
          duration: string
          highlighted: boolean
          id: number
          name: string
          period: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description: string
          devices?: number
          display_order?: number
          duration: string
          highlighted?: boolean
          id?: number
          name: string
          period: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string
          devices?: number
          display_order?: number
          duration?: string
          highlighted?: boolean
          id?: number
          name?: string
          period?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birthday: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          m3u_link: string | null
          phone: string | null
          player_link: string | null
          referral_code: string | null
          state: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_used: boolean | null
          updated_at: string
          used_referral_code: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          m3u_link?: string | null
          phone?: string | null
          player_link?: string | null
          referral_code?: string | null
          state?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string
          used_referral_code?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          m3u_link?: string | null
          phone?: string | null
          player_link?: string | null
          referral_code?: string | null
          state?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string
          used_referral_code?: string | null
          username?: string | null
        }
        Relationships: []
      }
      referral_alert_thresholds: {
        Row: {
          code_id: string
          created_at: string
          id: string
          last_triggered_at: string | null
          threshold_type: string
          threshold_value: number
        }
        Insert: {
          code_id: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          threshold_type: string
          threshold_value: number
        }
        Update: {
          code_id?: string
          created_at?: string
          id?: string
          last_triggered_at?: string | null
          threshold_type?: string
          threshold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_alert_thresholds_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_alert_thresholds_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "referral_stats"
            referencedColumns: ["code_id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          clicked_at: string
          code_id: string
          converted: boolean
          id: string
          ip_address: string | null
          referrer_url: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          code_id: string
          converted?: boolean
          id?: string
          ip_address?: string | null
          referrer_url?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          code_id?: string
          converted?: boolean
          id?: string
          ip_address?: string | null
          referrer_url?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_clicks_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "referral_stats"
            referencedColumns: ["code_id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          discount_amount_cents: number | null
          discount_type: string | null
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number | null
          plan_type: string | null
          trial_hours: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          discount_amount_cents?: number | null
          discount_type?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          plan_type?: string | null
          trial_hours?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          discount_amount_cents?: number | null
          discount_type?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          plan_type?: string | null
          trial_hours?: number | null
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          code_id: string
          created_at: string
          id: string
          note: string | null
          session_id: string | null
          visitor_id: string | null
        }
        Insert: {
          code_id: string
          created_at?: string
          id?: string
          note?: string | null
          session_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          code_id?: string
          created_at?: string
          id?: string
          note?: string | null
          session_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "referral_stats"
            referencedColumns: ["code_id"]
          },
        ]
      }
      referrer_commissions: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          notes: string | null
          pending_cents: number
          referrer_id: string
          total_earned_cents: number
          total_paid_cents: number
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          pending_cents?: number
          referrer_id: string
          total_earned_cents?: number
          total_paid_cents?: number
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          pending_cents?: number
          referrer_id?: string
          total_earned_cents?: number
          total_paid_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      retention_policies: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          entity_type: string
          id: string
          retention_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          entity_type: string
          id?: string
          retention_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          entity_type?: string
          id?: string
          retention_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      retry_queue: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          operation_data: Json
          operation_type: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          operation_data?: Json
          operation_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          operation_data?: Json
          operation_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      runbook_incident_links: {
        Row: {
          created_at: string
          id: string
          incident_id: string
          linked_by: string
          runbook_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_id: string
          linked_by: string
          runbook_id: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_id?: string
          linked_by?: string
          runbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runbook_incident_links_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runbook_incident_links_runbook_id_fkey"
            columns: ["runbook_id"]
            isOneToOne: false
            referencedRelation: "runbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      runbooks: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sla_snapshots: {
        Row: {
          actual_value: number
          calculated_at: string
          created_at: string
          id: string
          month_year: string
          status: string
          target_id: string
        }
        Insert: {
          actual_value: number
          calculated_at?: string
          created_at?: string
          id?: string
          month_year: string
          status?: string
          target_id: string
        }
        Update: {
          actual_value?: number
          calculated_at?: string
          created_at?: string
          id?: string
          month_year?: string
          status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_snapshots_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "sla_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_targets: {
        Row: {
          created_at: string
          created_by: string | null
          critical_threshold: number
          description: string | null
          display_name: string
          id: string
          metric_name: string
          target_unit: string
          target_value: number
          updated_at: string
          warning_threshold: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          critical_threshold: number
          description?: string | null
          display_name: string
          id?: string
          metric_name: string
          target_unit?: string
          target_value: number
          updated_at?: string
          warning_threshold: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          critical_threshold?: number
          description?: string | null
          display_name?: string
          id?: string
          metric_name?: string
          target_unit?: string
          target_value?: number
          updated_at?: string
          warning_threshold?: number
        }
        Relationships: []
      }
      staff_activity_log: {
        Row: {
          action_type: string
          admin_email: string | null
          admin_id: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          billing_cycle: string
          created_at: string
          device_count: number
          id: string
          plan_name: string
          price_usd: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_cycle: string
          created_at?: string
          device_count: number
          id?: string
          plan_name: string
          price_usd: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          device_count?: number
          id?: string
          plan_name?: string
          price_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          ends_at: string | null
          id: string
          paid_at: string | null
          plan: string
          plan_id: number | null
          processor: string
          processor_client_id: string | null
          processor_invoice_id: string | null
          processor_order_id: string | null
          provisioned_at: string | null
          provisioned_by: string | null
          provisioning_status: string
          referral_code_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          paid_at?: string | null
          plan: string
          plan_id?: number | null
          processor?: string
          processor_client_id?: string | null
          processor_invoice_id?: string | null
          processor_order_id?: string | null
          provisioned_at?: string | null
          provisioned_by?: string | null
          provisioning_status?: string
          referral_code_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          paid_at?: string | null
          plan?: string
          plan_id?: number | null
          processor?: string
          processor_client_id?: string | null
          processor_invoice_id?: string | null
          processor_order_id?: string | null
          provisioned_at?: string | null
          provisioned_by?: string | null
          provisioning_status?: string
          referral_code_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_stats"
            referencedColumns: ["code_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_event_log: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          status?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      trial_ip_usage: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string
          id: string
          ip_address: string | null
          last_accessed_at: string
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type: string
          id?: string
          ip_address?: string | null
          last_accessed_at?: string
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string
          id?: string
          ip_address?: string | null
          last_accessed_at?: string
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      referral_stats: {
        Row: {
          active: boolean | null
          code: string | null
          code_id: string | null
          created_at: string | null
          expires_at: string | null
          label: string | null
          max_uses: number | null
          paid_subscriptions: number | null
          revenue_cents: number | null
          total_uses: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      detect_device_type: {
        Args: { user_agent_string: string }
        Returns: string
      }
      generate_referral_code: { Args: never; Returns: string }
      get_admin_role: { Args: { _user_id: string }; Returns: string }
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      prepare_referral_code: { Args: { raw: string }; Returns: string }
      refresh_referral_stats: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "super_admin"
        | "support_agent"
        | "billing_admin"
        | "analyst"
        | "fulfillment_agent"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "super_admin",
        "support_agent",
        "billing_admin",
        "analyst",
        "fulfillment_agent",
      ],
    },
  },
} as const
