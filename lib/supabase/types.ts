// Auto-gerado a partir do schema — não editar manualmente
// Para regenerar: npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type DealType       = "oficial" | "privado" | "publico"
export type DealMode       = "regular" | "super"
export type DealStatus     = "formacao" | "ativo" | "finalizado"
export type DealCategory   = "social" | "fitness" | "checkin" | "free"
export type Distribution   = "winner" | "top3" | "proportional"
export type PaymentMethod  = "pix" | "cripto" | "cartao"
export type ParticipantStatus = "active" | "eliminated" | "winner"
export type InviteStatus   = "pending" | "accepted" | "declined"
export type TdpReason      = "deal_join" | "deal_win" | "deal_create" | "daily_checkin" | "streak_7d" | "streak_30d" | "referral" | "social_link" | "promo"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row:    Profile
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
      }
      deals: {
        Row:    Deal
        Insert: DealInsert
        Update: Partial<DealInsert>
      }
      deal_participants: {
        Row:    DealParticipant
        Insert: DealParticipantInsert
        Update: Partial<DealParticipantInsert>
      }
      deal_invites: {
        Row:    DealInvite
        Insert: DealInviteInsert
        Update: Partial<DealInviteInsert>
      }
      tdp_transactions: {
        Row:    TdpTransaction
        Insert: TdpTransactionInsert
        Update: never
      }
      daily_checkins: {
        Row:    DailyCheckin
        Insert: DailyCheckinInsert
        Update: never
      }
    }
    Views:    Record<string, never>
    Functions: Record<string, never>
    Enums:    Record<string, never>
  }
}

// ── Profile ────────────────────────────────────────────────────────────────────

export interface Profile {
  id:                string        // uuid — FK auth.users
  username:          string
  display_name:      string
  avatar_url:        string | null
  tdp_points:        number
  streak_days:       number
  last_checkin:      string | null // ISO timestamptz
  super_deal_used:   boolean
  referral_code:     string
  referred_by:       string | null // uuid FK profiles
  referral_count:    number
  created_at:        string
}

export type ProfileInsert = Omit<Profile, "created_at" | "tdp_points" | "streak_days" | "referral_count" | "super_deal_used">

// ── Deal ───────────────────────────────────────────────────────────────────────

export interface Deal {
  id:                   string       // uuid
  title:                string
  description:          string | null
  creator_id:           string       // uuid FK profiles
  type:                 DealType
  mode:                 DealMode
  status:               DealStatus
  category:             DealCategory
  verification_type:    string       // 'social_followers', 'fitness_steps', etc.
  verification_channels: string[]    // ['x', 'strava', 'manual']
  entry_amount:         number       // BRL
  fee_pct:              number       // 3 (fixo sobre o pote dos perdedores)
  distribution:         Distribution
  payment_method:       PaymentMethod
  max_participants:     number
  allow_requests:       boolean
  start_date:           string       // ISO date
  end_date:             string       // ISO date
  winner_id:            string | null
  created_at:           string
}

export type DealInsert = Omit<Deal, "id" | "created_at" | "winner_id" | "status"> & { status?: DealStatus }

// ── Deal Participant ───────────────────────────────────────────────────────────

export interface DealParticipant {
  id:               string
  deal_id:          string
  user_id:          string
  joined_at:        string
  status:           ParticipantStatus
  start_snapshot:   Record<string, number> | null  // { followers: 12840 }
  current_snapshot: Record<string, number> | null
  rank:             number | null
}

export type DealParticipantInsert = Omit<DealParticipant, "id" | "joined_at" | "rank"> & { rank?: number }

// ── Deal Invite ────────────────────────────────────────────────────────────────

export interface DealInvite {
  id:          string
  deal_id:     string
  invitee_id:  string
  invited_by:  string
  status:      InviteStatus
  created_at:  string
}

export type DealInviteInsert = Omit<DealInvite, "id" | "created_at" | "status">

// ── TDP Transactions ───────────────────────────────────────────────────────────

export interface TdpTransaction {
  id:         string
  user_id:    string
  amount:     number    // positivo = ganho, negativo = gasto
  reason:     TdpReason
  deal_id:    string | null
  created_at: string
}

export type TdpTransactionInsert = Omit<TdpTransaction, "id" | "created_at">

// ── Daily Checkin ──────────────────────────────────────────────────────────────

export interface DailyCheckin {
  id:            string
  user_id:       string
  checked_in_at: string
  date:          string  // ISO date — unique per user per day
}

export type DailyCheckinInsert = Omit<DailyCheckin, "id">

// ── Computed helpers ───────────────────────────────────────────────────────────

export interface DealWithParticipants extends Deal {
  participants: (DealParticipant & { profile: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">; socialHandle?: string })[]
  participant_count: number
  pot_total: number   // entry_amount * participant_count
  net_pot: number     // pot_total * (1 - fee_pct/100)
}
