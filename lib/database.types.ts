export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          app_role: "user" | "content_editor" | "admin"
          avatar_url: string | null
          email_confirmed: boolean
          status: "active" | "inactive" | "suspended" | "pending_verification"
          stripe_customer_id: string | null
          subscription_status: "free" | "trial" | "premium" | "cancelled"
          subscription_tier: string | null
          trial_started_at: string | null
          trial_ends_at: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          app_role?: "user" | "content_editor" | "admin"
          avatar_url?: string | null
          email_confirmed?: boolean
          status?: "active" | "inactive" | "suspended" | "pending_verification"
          stripe_customer_id?: string | null
          subscription_status?: "free" | "trial" | "premium" | "cancelled"
          subscription_tier?: string | null
          trial_started_at?: string | null
          trial_ends_at?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          app_role?: "user" | "content_editor" | "admin"
          avatar_url?: string | null
          email_confirmed?: boolean
          status?: "active" | "inactive" | "suspended" | "pending_verification"
          stripe_customer_id?: string | null
          subscription_status?: "free" | "trial" | "premium" | "cancelled"
          subscription_tier?: string | null
          trial_started_at?: string | null
          trial_ends_at?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "user" | "content_editor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
