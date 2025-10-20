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
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: string
          scheduled_for: string | null
          sent_at: string | null
          target_audience: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: string
          scheduled_for?: string | null
          sent_at?: string | null
          target_audience?: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: string
          scheduled_for?: string | null
          sent_at?: string | null
          target_audience?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
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
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birthday: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          m3u_link: string | null
          player_link: string | null
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          m3u_link?: string | null
          player_link?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          m3u_link?: string | null
          player_link?: string | null
          referral_code?: string | null
          updated_at?: string
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
      subscriptions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          ends_at: string | null
          id: string
          paid_at: string | null
          plan: string
          processor: string
          processor_invoice_id: string | null
          referral_code_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          paid_at?: string | null
          plan: string
          processor?: string
          processor_invoice_id?: string | null
          referral_code_id?: string | null
          status: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: string
          paid_at?: string | null
          plan?: string
          processor?: string
          processor_invoice_id?: string | null
          referral_code_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
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
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      prepare_referral_code: {
        Args: { raw: string }
        Returns: string
      }
      refresh_referral_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
