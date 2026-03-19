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
      incident_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          incident_id: string
          is_internal: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          incident_id: string
          is_internal?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          incident_id?: string
          is_internal?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_comments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          incident_id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          incident_id: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          incident_id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          affected_systems: string | null
          analyst_notes: string | null
          assigned_analyst_id: string | null
          country_context: string
          description: string
          expert_summary: string | null
          id: string
          location: string | null
          proof_file_url: string | null
          public_reference: string | null
          region: string | null
          remediation_steps: string | null
          reported_at: string
          reporter_id: string
          resolution_verification: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          type: Database["public"]["Enums"]["incident_type"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_state: Database["public"]["Enums"]["cert_validation_state"]
        }
        Insert: {
          affected_systems?: string | null
          analyst_notes?: string | null
          assigned_analyst_id?: string | null
          country_context?: string
          description: string
          expert_summary?: string | null
          id?: string
          location?: string | null
          proof_file_url?: string | null
          public_reference?: string | null
          region?: string | null
          remediation_steps?: string | null
          reported_at?: string
          reporter_id: string
          resolution_verification?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          type: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_state?: Database["public"]["Enums"]["cert_validation_state"]
        }
        Update: {
          affected_systems?: string | null
          analyst_notes?: string | null
          assigned_analyst_id?: string | null
          country_context?: string
          description?: string
          expert_summary?: string | null
          id?: string
          location?: string | null
          proof_file_url?: string | null
          public_reference?: string | null
          region?: string | null
          remediation_steps?: string | null
          reported_at?: string
          reporter_id?: string
          resolution_verification?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          type?: Database["public"]["Enums"]["incident_type"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_state?: Database["public"]["Enums"]["cert_validation_state"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          organization: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_bulletins: {
        Row: {
          advisory_ids: string[]
          audit_notes: string | null
          author_id: string | null
          bulletin_date: string
          content: string
          country_context: string
          created_at: string
          cyber_principles: string | null
          id: string
          incident_ids: string[]
          iso_alignment: string | null
          published_at: string | null
          source_references: string | null
          status: Database["public"]["Enums"]["bulletin_status"]
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          advisory_ids?: string[]
          audit_notes?: string | null
          author_id?: string | null
          bulletin_date?: string
          content: string
          country_context?: string
          created_at?: string
          cyber_principles?: string | null
          id?: string
          incident_ids?: string[]
          iso_alignment?: string | null
          published_at?: string | null
          source_references?: string | null
          status?: Database["public"]["Enums"]["bulletin_status"]
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          advisory_ids?: string[]
          audit_notes?: string | null
          author_id?: string | null
          bulletin_date?: string
          content?: string
          country_context?: string
          created_at?: string
          cyber_principles?: string | null
          id?: string
          incident_ids?: string[]
          iso_alignment?: string | null
          published_at?: string | null
          source_references?: string | null
          status?: Database["public"]["Enums"]["bulletin_status"]
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vulnerability_advisories: {
        Row: {
          advisory_id: string | null
          advisory_status: Database["public"]["Enums"]["advisory_status"]
          affected_products: string | null
          country_context: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string
          remediation: string | null
          severity: Database["public"]["Enums"]["advisory_severity"]
          source_name: string
          source_url: string
          standards_notes: string | null
          summary: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          advisory_id?: string | null
          advisory_status?: Database["public"]["Enums"]["advisory_status"]
          affected_products?: string | null
          country_context?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string
          remediation?: string | null
          severity?: Database["public"]["Enums"]["advisory_severity"]
          source_name: string
          source_url: string
          standards_notes?: string | null
          summary: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          advisory_id?: string | null
          advisory_status?: Database["public"]["Enums"]["advisory_status"]
          affected_products?: string | null
          country_context?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string
          remediation?: string | null
          severity?: Database["public"]["Enums"]["advisory_severity"]
          source_name?: string
          source_url?: string
          standards_notes?: string | null
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      advisory_severity:
        | "informational"
        | "low"
        | "medium"
        | "high"
        | "critical"
      advisory_status: "new" | "tracking" | "mitigated" | "archived"
      app_role:
        | "citizen"
        | "analyst"
        | "admin"
        | "authority"
        | "specialist"
        | "reader"
      bulletin_status: "draft" | "review" | "published" | "archived"
      cert_validation_state:
        | "pending_review"
        | "needs_information"
        | "validated"
        | "mitigated"
        | "closed"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_status:
        | "reported"
        | "under_analysis"
        | "confirmed"
        | "resolved"
        | "rejected"
        | "alert"
      incident_type:
        | "phishing"
        | "fraude"
        | "malware"
        | "attaque_reseau"
        | "fuite_donnees"
        | "piratage"
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
      advisory_severity: ["informational", "low", "medium", "high", "critical"],
      advisory_status: ["new", "tracking", "mitigated", "archived"],
      app_role: [
        "citizen",
        "analyst",
        "admin",
        "authority",
        "specialist",
        "reader",
      ],
      bulletin_status: ["draft", "review", "published", "archived"],
      cert_validation_state: [
        "pending_review",
        "needs_information",
        "validated",
        "mitigated",
        "closed",
      ],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_status: [
        "reported",
        "under_analysis",
        "confirmed",
        "resolved",
        "rejected",
        "alert",
      ],
      incident_type: [
        "phishing",
        "fraude",
        "malware",
        "attaque_reseau",
        "fuite_donnees",
        "piratage",
      ],
    },
  },
} as const
