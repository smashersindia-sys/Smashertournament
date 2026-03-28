// ============================================================
// SMASHERS — TypeScript Type Definitions
// ============================================================

export type UserRole = 'admin';

export type TournamentStatus = 'upcoming' | 'active' | 'completed';
export type PaymentStatus = 'pending' | 'paid_upi' | 'paid_cash' | 'waived';
export type FixtureStatus = 'scheduled' | 'in_progress' | 'completed';
export type FinishPosition = 'champion' | 'runner_up' | 'semi_finalist' | 'quarter_finalist' | 'participant';
export type ExpenseType = 'expense' | 'income';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer';
export type RegistrationSource = 'google_form' | 'manual' | 'public_form';
export type RegistrationPaymentMode = 'tap_and_pay' | 'scan_and_pay';
export type PlayerStatus = 'active' | 'pending_approval' | 'rejected';

export interface Tournament {
    id: string;
    name: string;
    tournament_number: number;
    scheduled_date: string;
    status: TournamentStatus;
    registration_open: boolean;
    championship_year: number;
    google_sheet_id?: string;
    google_sheet_tab?: string;
    created_at: string;
}

export interface Category {
    id: string;
    name: string;
    age_group: string;
    gender: string;
    display_order: number;
    entry_fee: number;
}

export interface Player {
    id: string;
    tournament_id: string;
    category_id: string;
    full_name: string;
    gender: string;
    date_of_birth?: string;
    contact_number?: string;
    academy_name?: string;
    city?: string;
    parent_name?: string;
    parent_phone?: string;
    payment_status: PaymentStatus;
    payment_mode_registration?: RegistrationPaymentMode;
    payment_proof_url?: string;
    registration_source: RegistrationSource;
    email?: string;
    status: PlayerStatus;
    registered_at: string;
    notes?: string;
    income_added?: boolean;
    // Joined fields
    category?: Category;
}

export interface Fixture {
    id: string;
    tournament_id: string;
    category_id: string;
    round_number: number;
    round_name: string;
    match_number: number;
    player1_id?: string;
    player2_id?: string;
    player1_score?: number;
    player2_score?: number;
    winner_id?: string;
    is_bye: boolean;
    status: FixtureStatus;
    created_at: string;
    // Joined fields
    player1?: Player;
    player2?: Player;
    winner?: Player;
}

export interface ChampionshipPoints {
    id: string;
    player_id: string;
    tournament_id: string;
    category_id: string;
    player_name: string;
    academy_name?: string;
    championship_year: number;
    finish_position: FinishPosition;
    points_awarded: number;
    awarded_at: string;
}

export interface Expense {
    id: string;
    tournament_id?: string;
    type: ExpenseType;
    category: string;
    description?: string;
    amount: number;
    payment_mode?: PaymentMode;
    status: string;
    responsible_person?: string;
    transaction_date: string;
    notes?: string;
    created_at: string;
}

export interface SeasonArchive {
    id: string;
    championship_year: number;
    category_id: string;
    champion_name?: string;
    champion_academy?: string;
    champion_points?: number;
    full_leaderboard?: Record<string, unknown>;
    archived_at: string;
}

export interface LeaderboardEntry {
    player_name: string;
    academy_name?: string;
    category_id: string;
    matches_played: number;
    wins: number;
    losses: number;
    t1_points: number;
    t2_points: number;
    t3_points: number;
    t4_points: number;
    total_points: number;
    rank: number;
}

export interface FinancialSummary {
    total_income: number;
    total_expenses: number;
    net_pl: number;
    pending_receivables: number;
    pending_payables: number;
}

export interface DashboardStats {
    total_registrations: number;
    paid_count: number;
    pending_count: number;
    categories_active: number;
    category_breakdown: { name: string; count: number }[];
    recent_players: Player[];
    financial_summary: FinancialSummary;
}

// Points system
export const POINTS_MAP: Record<FinishPosition, number> = {
    champion: 50,
    runner_up: 30,
    semi_finalist: 20,
    quarter_finalist: 10,
    participant: 5,
};

// Expense categories
export const EXPENSE_CATEGORIES = [
    'Court Rent', 'Shuttle', 'Umpiring', 'Banner', 'Trophy',
    'Court Booking', 'Catering', 'Transport', 'Prizes', 'Staff',
    'Printing', 'Miscellaneous', 'Other',
] as const;

export const INCOME_CATEGORIES = [
    'Registration Fees', 'Sponsorship', 'Gate Tickets', 'Miscellaneous', 'Other',
] as const;
