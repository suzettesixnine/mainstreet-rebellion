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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          discussion_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          discussion_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          discussion_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      event_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          description: string | null
          event_date: string
          event_end_date: string | null
          id: string
          image_url: string | null
          location: string | null
          title: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id: string
          description?: string | null
          event_date: string
          event_end_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          title: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          event_date?: string
          event_end_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          title?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          accepts_cash: boolean | null
          accepts_external_payment: boolean | null
          accepts_stripe: boolean | null
          category: Database["public"]["Enums"]["listing_category"]
          created_at: string
          delivery_option: Database["public"]["Enums"]["delivery_option"]
          description: string | null
          digital_file_url: string | null
          id: string
          images: string[] | null
          is_digital: boolean
          price: number
          quantity: number
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          view_count: number
          zip_code: string
        }
        Insert: {
          accepts_cash?: boolean | null
          accepts_external_payment?: boolean | null
          accepts_stripe?: boolean | null
          category?: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          delivery_option?: Database["public"]["Enums"]["delivery_option"]
          description?: string | null
          digital_file_url?: string | null
          id?: string
          images?: string[] | null
          is_digital?: boolean
          price?: number
          quantity?: number
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          view_count?: number
          zip_code: string
        }
        Update: {
          accepts_cash?: boolean | null
          accepts_external_payment?: boolean | null
          accepts_stripe?: boolean | null
          category?: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          delivery_option?: Database["public"]["Enums"]["delivery_option"]
          description?: string | null
          digital_file_url?: string | null
          id?: string
          images?: string[] | null
          is_digital?: boolean
          price?: number
          quantity?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          view_count?: number
          zip_code?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhood_suggestions: {
        Row: {
          author_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          upvote_count: number
          zip_code: string
        }
        Insert: {
          author_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          upvote_count?: number
          zip_code: string
        }
        Update: {
          author_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          upvote_count?: number
          zip_code?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_photo_url: string | null
          created_at: string
          display_name: string | null
          gallery_images: string[] | null
          id: string
          neighborhood_area: string | null
          neighborhood_review_note: string | null
          neighborhood_reviewed_at: string | null
          neighborhood_reviewed_by: string | null
          payment_cashapp: string | null
          payment_paypal: string | null
          payment_venmo: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          display_name?: string | null
          gallery_images?: string[] | null
          id?: string
          neighborhood_area?: string | null
          neighborhood_review_note?: string | null
          neighborhood_reviewed_at?: string | null
          neighborhood_reviewed_by?: string | null
          payment_cashapp?: string | null
          payment_paypal?: string | null
          payment_venmo?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_photo_url?: string | null
          created_at?: string
          display_name?: string | null
          gallery_images?: string[] | null
          id?: string
          neighborhood_area?: string | null
          neighborhood_review_note?: string | null
          neighborhood_reviewed_at?: string | null
          neighborhood_reviewed_by?: string | null
          payment_cashapp?: string | null
          payment_paypal?: string | null
          payment_venmo?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          listing_id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_tiers: {
        Row: {
          created_at: string
          current_period_end: string | null
          featured_slots_reset_at: string | null
          featured_slots_used: number
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["seller_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          featured_slots_reset_at?: string | null
          featured_slots_used?: number
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["seller_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          featured_slots_reset_at?: string | null
          featured_slots_used?: number
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["seller_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      storefronts: {
        Row: {
          banner_url: string | null
          created_at: string | null
          id: string
          operating_hours: Json | null
          slug: string
          tagline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          id?: string
          operating_hours?: Json | null
          slug: string
          tagline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          id?: string
          operating_hours?: Json | null
          slug?: string
          tagline?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suggestion_upvotes: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_upvotes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      tester_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string | null
          invited_by_label: string | null
          invited_reason: string
          status: string
          token_hash: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_by_label?: string | null
          invited_reason?: string
          status?: string
          token_hash: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_by_label?: string | null
          invited_reason?: string
          status?: string
          token_hash?: string
          updated_at?: string
          zip_code?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      delivery_option: "pickup" | "delivery" | "both"
      listing_category:
        | "produce"
        | "baked_goods"
        | "crafts"
        | "services"
        | "prepared_foods"
        | "clothing"
        | "home_goods"
        | "other"
        | "digital_goods"
        | "butcher"
      listing_status: "active" | "reserved" | "sold"
      seller_tier: "free" | "seller" | "pro"
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
      delivery_option: ["pickup", "delivery", "both"],
      listing_category: [
        "produce",
        "baked_goods",
        "crafts",
        "services",
        "prepared_foods",
        "clothing",
        "home_goods",
        "other",
        "digital_goods",
        "butcher",
      ],
      listing_status: ["active", "reserved", "sold"],
      seller_tier: ["free", "seller", "pro"],
    },
  },
} as const
