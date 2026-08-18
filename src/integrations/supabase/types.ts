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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          case_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          case_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          case_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          evidence_id: string | null
          id: string
          location_id: string | null
          occurred_at: string
          title: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          evidence_id?: string | null
          id?: string
          location_id?: string | null
          occurred_at?: string
          title: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          evidence_id?: string | null
          id?: string
          location_id?: string | null
          occurred_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_number: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          opened_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          case_number: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          case_number?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          opened_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      evidence: {
        Row: {
          case_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          legally_obtained: boolean
          location_id: string | null
          notes: string | null
          occurred_at: string | null
          source: string | null
          suspect_id: string | null
          title: string
          updated_at: string
          vehicle_id: string | null
          verification_status: string
          victim_id: string | null
          witness_id: string | null
        }
        Insert: {
          case_id: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          legally_obtained?: boolean
          location_id?: string | null
          notes?: string | null
          occurred_at?: string | null
          source?: string | null
          suspect_id?: string | null
          title: string
          updated_at?: string
          vehicle_id?: string | null
          verification_status?: string
          victim_id?: string | null
          witness_id?: string | null
        }
        Update: {
          case_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          legally_obtained?: boolean
          location_id?: string | null
          notes?: string | null
          occurred_at?: string | null
          source?: string | null
          suspect_id?: string | null
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          verification_status?: string
          victim_id?: string | null
          witness_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_suspect_id_fkey"
            columns: ["suspect_id"]
            isOneToOne: false
            referencedRelation: "suspects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_victim_id_fkey"
            columns: ["victim_id"]
            isOneToOne: false
            referencedRelation: "victims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_witness_id_fkey"
            columns: ["witness_id"]
            isOneToOne: false
            referencedRelation: "witnesses"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          case_id: string
          created_at: string
          evidence_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          evidence_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          evidence_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_files_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          case_id: string | null
          created_at: string
          created_by: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          occurred_at: string | null
        }
        Insert: {
          address?: string | null
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          occurred_at?: string | null
        }
        Update: {
          address?: string | null
          case_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          occurred_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      suspects: {
        Row: {
          case_id: string
          contact: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          reference_no: string | null
        }
        Insert: {
          case_id: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          reference_no?: string | null
        }
        Update: {
          case_id?: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suspects_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspects_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      vehicles: {
        Row: {
          case_id: string
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          make_model: string | null
          notes: string | null
          owner_reference: string | null
          registration_number: string
          vehicle_type: string | null
        }
        Insert: {
          case_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          make_model?: string | null
          notes?: string | null
          owner_reference?: string | null
          registration_number: string
          vehicle_type?: string | null
        }
        Update: {
          case_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          make_model?: string | null
          notes?: string | null
          owner_reference?: string | null
          registration_number?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      victims: {
        Row: {
          case_id: string
          contact: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          reference_no: string | null
        }
        Insert: {
          case_id: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          reference_no?: string | null
        }
        Update: {
          case_id?: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "victims_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "victims_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      witness_statements: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          id: string
          statement: string
          statement_date: string
          witness_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          statement: string
          statement_date?: string
          witness_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          statement?: string
          statement_date?: string
          witness_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "witness_statements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witness_statements_witness_id_fkey"
            columns: ["witness_id"]
            isOneToOne: false
            referencedRelation: "witnesses"
            referencedColumns: ["id"]
          },
        ]
      }
      witnesses: {
        Row: {
          case_id: string
          contact: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          name: string
          notes: string | null
          reference_no: string | null
        }
        Insert: {
          case_id: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          reference_no?: string | null
        }
        Update: {
          case_id?: string
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "witnesses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "witnesses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authorized: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "investigator" | "viewer"
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
      app_role: ["admin", "investigator", "viewer"],
    },
  },
} as const
