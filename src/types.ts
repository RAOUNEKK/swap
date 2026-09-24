export type SkillCategory = 'Creative' | 'Technology' | 'Languages' | 'Music' | 'Business' | 'Lifestyle';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  icon: string;
}

export interface Profile {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  timezone: string;
  location: string;
  rating_avg: number;
  rating_count: number;
  hours_balance: number;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  skill?: Skill;
  can_teach: boolean;
  wants_to_learn: boolean;
  proficiency: number;
  urgency: number;
  notes: string;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  day_of_week: number;
  start_hour: number;
  end_hour: number;
}

export type SwapStatus =
  | 'proposed'
  | 'accepted'
  | 'declined'
  | 'scheduled'
  | 'completed'
  | 'confirmed'
  | 'cancelled'
  | 'reviewed';

export interface Swap {
  id: string;
  requester_id: string;
  provider_id: string;
  skill_taught_id: string;
  skill_offered_id: string;
  status: SwapStatus;
  duration_minutes: number;
  scheduled_at: string | null;
  requester_completed: boolean;
  provider_completed: boolean;
  completed_at: string | null;
  confirmed_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  requester?: Profile;
  provider?: Profile;
  skill_taught?: Skill;
  skill_offered?: Skill;
}

export interface Message {
  id: string;
  swap_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  user_id: string;
  swap_id: string | null;
  amount: number;
  reason: string;
  created_at: string;
}

export interface Review {
  id: string;
  swap_id: string;
  reviewer_id: string;
  reviewee_id: string;
  skill_id: string | null;
  rating: number;
  body: string;
  created_at: string;
  reviewer?: Profile;
  reviewee?: Profile;
  skill?: Skill;
}

export interface SkillRatingSummary {
  reviewee_id: string;
  skill_id: string;
  avg_rating: number;
  rating_count: number;
}

export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  Creative: 'sun',
  Technology: 'cyan',
  Languages: 'violet',
  Music: 'ink',
  Business: 'coral',
  Lifestyle: 'ink',
};

export const CATEGORY_TAG_CLASS: Record<SkillCategory, string> = {
  Creative: 'skill-tag-creative',
  Technology: 'skill-tag-tech',
  Languages: 'skill-tag-language',
  Music: 'skill-tag-music',
  Business: 'skill-tag-business',
  Lifestyle: 'skill-tag-lifestyle',
};

export const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function daysForLang(lang: 'en' | 'ar'): string[] {
  return lang === 'ar' ? DAYS_AR : DAYS_EN;
}

export const SWAP_STATUS_LABELS_EN: Record<SwapStatus, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  declined: 'Declined',
  scheduled: 'Scheduled',
  completed: 'Completed',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  reviewed: 'Reviewed',
};

export const SWAP_STATUS_LABELS_AR: Record<SwapStatus, string> = {
  proposed: 'مقترح',
  accepted: 'مقبول',
  declined: 'مرفوض',
  scheduled: 'مجدول',
  completed: 'مكتمل',
  confirmed: 'مؤكد',
  cancelled: 'ملغى',
  reviewed: 'مُقيّم',
};

export function swapStatusLabelsForLang(lang: 'en' | 'ar'): Record<SwapStatus, string> {
  return lang === 'ar' ? SWAP_STATUS_LABELS_AR : SWAP_STATUS_LABELS_EN;
}

// Kept for backwards compatibility — returns English labels
export const DAYS = DAYS_EN;
export const SWAP_STATUS_LABELS = SWAP_STATUS_LABELS_EN;

export type NotificationType = 'swap_proposed' | 'swap_accepted' | 'swap_scheduled';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string | null;
  data: {
    partner_name?: string;
    skill_taught?: string;
    skill_offered?: string;
    scheduled_at?: string;
  };
  read: boolean;
  created_at: string;
}

export const SWAP_STATUS_COLORS: Record<SwapStatus, string> = {
  proposed: 'bg-coral-100 text-coral-700',
  accepted: 'bg-cyan-100 text-cyan-700',
  declined: 'bg-ink-100 text-ink-400',
  scheduled: 'bg-sun-100 text-sun-700',
  completed: 'bg-cyan-100 text-cyan-700',
  confirmed: 'bg-sun-100 text-sun-700',
  cancelled: 'bg-coral-100 text-coral-700',
  reviewed: 'bg-violet-100 text-violet-700',
};
