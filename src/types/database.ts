export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "driver" | "owner" | "both" | "admin";
export type VehicleType = "compact" | "sedan" | "suv" | "truck" | "van" | "ev";
export type SpaceCategory =
  | "all"
  | "covered"
  | "ev_charging"
  | "daily"
  | "monthly"
  | "event"
  | "airport";
export type AccessType =
  | "instant_keypad"
  | "app_remote"
  | "qr_scanner"
  | "on_site_attendant"
  | "physical_permit";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type PublicationStatus = "draft" | "published" | "paused" | "archived";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "refunded"
  | "recovered";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type EventType =
  | "status_change"
  | "access_issue"
  | "extension"
  | "resolution"
  | "cancellation";
export type ReportType =
  | "access_failure"
  | "spot_blocked"
  | "dispute"
  | "moderation"
  | "damage";
export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          is_superhost: boolean;
          response_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_superhost?: boolean;
          response_time?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          is_superhost?: boolean;
          response_time?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parking_spaces: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          address: string;
          neighborhood: string;
          city: string;
          latitude: number;
          longitude: number;
          price_per_hour: number;
          price_per_day: number;
          price_per_month: number | null;
          category: SpaceCategory;
          photos: string[];
          rating: number;
          review_count: number;
          is_covered: boolean;
          has_ev_charging: boolean;
          ev_charger_type: string | null;
          verification_status: VerificationStatus;
          publication_status: PublicationStatus;
          is_demo_seed: boolean;
          walking_distance: string;
          max_vehicle_type: VehicleType;
          clearance_feet: number;
          height_clearance_inches: number | null;
          space_dimensions: string | null;
          is_accessible: boolean;
          is_authorized: boolean;
          authorized_at: string | null;
          draft_step: number | null;
          access_type: AccessType;
          access_instructions: string;
          security_features: string[];
          rules: string[];
          recovery_guaranteed: boolean;
          flexible_extension_supported: boolean;
          available_slots_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description: string;
          address: string;
          neighborhood: string;
          city?: string;
          latitude: number;
          longitude: number;
          price_per_hour: number;
          price_per_day: number;
          price_per_month?: number | null;
          category?: SpaceCategory;
          photos?: string[];
          rating?: number;
          review_count?: number;
          is_covered?: boolean;
          has_ev_charging?: boolean;
          ev_charger_type?: string | null;
          verification_status?: VerificationStatus;
          publication_status?: PublicationStatus;
          is_demo_seed?: boolean;
          walking_distance?: string;
          max_vehicle_type?: VehicleType;
          clearance_feet: number;
          height_clearance_inches?: number | null;
          space_dimensions?: string | null;
          is_accessible?: boolean;
          is_authorized?: boolean;
          authorized_at?: string | null;
          draft_step?: number | null;
          access_type?: AccessType;
          access_instructions?: string;
          security_features?: string[];
          rules?: string[];
          recovery_guaranteed?: boolean;
          flexible_extension_supported?: boolean;
          available_slots_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string;
          address?: string;
          neighborhood?: string;
          city?: string;
          latitude?: number;
          longitude?: number;
          price_per_hour?: number;
          price_per_day?: number;
          price_per_month?: number | null;
          category?: SpaceCategory;
          photos?: string[];
          rating?: number;
          review_count?: number;
          is_covered?: boolean;
          has_ev_charging?: boolean;
          ev_charger_type?: string | null;
          verification_status?: VerificationStatus;
          publication_status?: PublicationStatus;
          is_demo_seed?: boolean;
          walking_distance?: string;
          max_vehicle_type?: VehicleType;
          clearance_feet?: number;
          height_clearance_inches?: number | null;
          space_dimensions?: string | null;
          is_accessible?: boolean;
          is_authorized?: boolean;
          authorized_at?: string | null;
          draft_step?: number | null;
          access_type?: AccessType;
          access_instructions?: string;
          security_features?: string[];
          rules?: string[];
          recovery_guaranteed?: boolean;
          flexible_extension_supported?: boolean;
          available_slots_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parking_spaces_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      availability_rules: {
        Row: {
          id: string;
          space_id: string;
          day_of_week: number | null;
          start_time: string;
          end_time: string;
          is_blocked: boolean;
          specific_date: string | null;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          day_of_week?: number | null;
          start_time: string;
          end_time: string;
          is_blocked?: boolean;
          specific_date?: string | null;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          day_of_week?: number | null;
          start_time?: string;
          end_time?: string;
          is_blocked?: boolean;
          specific_date?: string | null;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_rules_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "parking_spaces";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          id: string;
          booking_reference: string;
          driver_id: string;
          space_id: string;
          start_time: string;
          end_time: string;
          booking_status: BookingStatus;
          payment_status: PaymentStatus;
          hourly_rate: number;
          subtotal: number;
          service_fee: number;
          tax: number;
          total_price: number;
          vehicle_model: string;
          vehicle_type: VehicleType;
          license_plate: string;
          access_code: string;
          can_extend: boolean;
          recovery_status: "none" | "reported" | "recovered";
          alternative_space_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_reference: string;
          driver_id: string;
          space_id: string;
          start_time: string;
          end_time: string;
          booking_status?: BookingStatus;
          payment_status?: PaymentStatus;
          hourly_rate: number;
          subtotal: number;
          service_fee?: number;
          tax?: number;
          total_price: number;
          vehicle_model: string;
          vehicle_type?: VehicleType;
          license_plate: string;
          access_code: string;
          can_extend?: boolean;
          recovery_status?: "none" | "reported" | "recovered";
          alternative_space_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_reference?: string;
          driver_id?: string;
          space_id?: string;
          start_time?: string;
          end_time?: string;
          booking_status?: BookingStatus;
          payment_status?: PaymentStatus;
          hourly_rate?: number;
          subtotal?: number;
          service_fee?: number;
          tax?: number;
          total_price?: number;
          vehicle_model?: string;
          vehicle_type?: VehicleType;
          license_plate?: string;
          access_code?: string;
          can_extend?: boolean;
          recovery_status?: "none" | "reported" | "recovered";
          alternative_space_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "parking_spaces";
            referencedColumns: ["id"];
          }
        ];
      };
      booking_events: {
        Row: {
          id: string;
          booking_id: string;
          event_type: EventType;
          from_status: string | null;
          to_status: string | null;
          note: string | null;
          created_by: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          event_type: EventType;
          from_status?: string | null;
          to_status?: string | null;
          note?: string | null;
          created_by?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          event_type?: EventType;
          from_status?: string | null;
          to_status?: string | null;
          note?: string | null;
          created_by?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          space_id: string;
          reviewer_id: string;
          rating: number;
          feedback: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          space_id: string;
          reviewer_id: string;
          rating: number;
          feedback: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          space_id?: string;
          reviewer_id?: string;
          rating?: number;
          feedback?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "parking_spaces";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_spaces: {
        Row: {
          id: string;
          user_id: string;
          space_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          space_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          space_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_spaces_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_spaces_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "parking_spaces";
            referencedColumns: ["id"];
          }
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          booking_id: string | null;
          space_id: string | null;
          report_type: ReportType;
          description: string;
          status: ReportStatus;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          booking_id?: string | null;
          space_id?: string | null;
          report_type: ReportType;
          description: string;
          status?: ReportStatus;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          booking_id?: string | null;
          space_id?: string | null;
          report_type?: ReportType;
          description?: string;
          status?: ReportStatus;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_booking_atomic: {
        Args: {
          p_driver_id: string;
          p_space_id: string;
          p_start_time: string;
          p_end_time: string;
          p_vehicle_model: string;
          p_vehicle_type: VehicleType;
          p_license_plate: string;
          p_service_fee?: number;
          p_tax_rate?: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
