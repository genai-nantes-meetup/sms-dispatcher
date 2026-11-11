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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      recipients: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          attempts: number
          brevo_message_id: string | null
          claimed_at: string | null
          content: string
          created_at: string
          created_by: string
          error: string | null
          id: string
          import_batch_id: string | null
          phone: string
          recipient_id: string | null
          recipient_name: string
          scheduled_at: string
          sent_at: string | null
          source: Database["public"]["Enums"]["sms_source"]
          status: Database["public"]["Enums"]["sms_status"]
        }
        Insert: {
          attempts?: number
          brevo_message_id?: string | null
          claimed_at?: string | null
          content: string
          created_at?: string
          created_by?: string
          error?: string | null
          id?: string
          import_batch_id?: string | null
          phone: string
          recipient_id?: string | null
          recipient_name: string
          scheduled_at?: string
          sent_at?: string | null
          source?: Database["public"]["Enums"]["sms_source"]
          status?: Database["public"]["Enums"]["sms_status"]
        }
        Update: {
          attempts?: number
          brevo_message_id?: string | null
          claimed_at?: string | null
          content?: string
          created_at?: string
          created_by?: string
          error?: string | null
          id?: string
          import_batch_id?: string | null
          phone?: string
          recipient_id?: string | null
          recipient_name?: string
          scheduled_at?: string
          sent_at?: string | null
          source?: Database["public"]["Enums"]["sms_source"]
          status?: Database["public"]["Enums"]["sms_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_due_sms: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          brevo_message_id: string | null
          claimed_at: string | null
          content: string
          created_at: string
          created_by: string
          error: string | null
          id: string
          import_batch_id: string | null
          phone: string
          recipient_id: string | null
          recipient_name: string
          scheduled_at: string
          sent_at: string | null
          source: Database["public"]["Enums"]["sms_source"]
          status: Database["public"]["Enums"]["sms_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "sms_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_allowed_email: { Args: { _email: string }; Returns: boolean }
      is_allowed_user: { Args: never; Returns: boolean }
      timeout_stuck_sms: { Args: never; Returns: number }
    }
    Enums: {
      sms_source: "form" | "csv"
      sms_status: "scheduled" | "sending" | "sent" | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      sms_source: ["form", "csv"],
      sms_status: ["scheduled", "sending", "sent", "failed"],
    },
  },
} as const
