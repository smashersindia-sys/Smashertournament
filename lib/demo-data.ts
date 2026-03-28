// ============================================================
// SMASHERS — Demo Data for when Supabase is not configured
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type {
    Tournament, Category, Player, Fixture,
    ChampionshipPoints, Expense, DashboardStats,
    LeaderboardEntry, FinancialSummary,
} from '@/types';

// ---- CATEGORIES ----
export const DEMO_CATEGORIES: Category[] = [
    { id: uuidv4(), name: 'Under 9 Boys', age_group: 'U9', gender: 'Boys', display_order: 1, entry_fee: 600 },
    { id: uuidv4(), name: 'Under 9 Girls', age_group: 'U9', gender: 'Girls', display_order: 2, entry_fee: 600 },
    { id: uuidv4(), name: 'Under 11 Boys', age_group: 'U11', gender: 'Boys', display_order: 3, entry_fee: 600 },
    { id: uuidv4(), name: 'Under 11 Girls', age_group: 'U11', gender: 'Girls', display_order: 4, entry_fee: 600 },
    { id: uuidv4(), name: 'Under 13 Boys', age_group: 'U13', gender: 'Boys', display_order: 5, entry_fee: 600 },
    { id: uuidv4(), name: 'Under 13 Girls', age_group: 'U13', gender: 'Girls', display_order: 6, entry_fee: 600 },
    { id: uuidv4(), name: 'Under 15 Boys', age_group: 'U15', gender: 'Boys', display_order: 7, entry_fee: 800 },
    { id: uuidv4(), name: 'Under 15 Girls', age_group: 'U15', gender: 'Girls', display_order: 8, entry_fee: 800 },
    { id: uuidv4(), name: 'Under 17 Boys', age_group: 'U17', gender: 'Boys', display_order: 9, entry_fee: 800 },
    { id: uuidv4(), name: 'Under 17 Girls', age_group: 'U17', gender: 'Girls', display_order: 10, entry_fee: 800 },
    { id: uuidv4(), name: 'Under 19 Boys', age_group: 'U19', gender: 'Boys', display_order: 11, entry_fee: 1000 },
    { id: uuidv4(), name: 'Under 19 Girls', age_group: 'U19', gender: 'Girls', display_order: 12, entry_fee: 1000 },
    { id: uuidv4(), name: 'Open', age_group: 'Open', gender: 'Mixed', display_order: 13, entry_fee: 1000 },
];

// ---- TOURNAMENTS ----
export const DEMO_TOURNAMENTS: Tournament[] = [
    {
        id: uuidv4(), name: 'Smashers Championship 2026 — Tournament 1',
        tournament_number: 1, scheduled_date: '2026-04-05', status: 'active',
        registration_open: true, championship_year: 2026, created_at: new Date().toISOString(),
    },
    {
        id: uuidv4(), name: 'Smashers Championship 2026 — Tournament 2',
        tournament_number: 2, scheduled_date: '2026-07-15', status: 'upcoming',
        registration_open: false, championship_year: 2026, created_at: new Date().toISOString(),
    },
    {
        id: uuidv4(), name: 'Smashers Championship 2026 — Tournament 3',
        tournament_number: 3, scheduled_date: '2026-09-20', status: 'upcoming',
        registration_open: false, championship_year: 2026, created_at: new Date().toISOString(),
    },
    {
        id: uuidv4(), name: 'Smashers Championship 2026 — Tournament 4',
        tournament_number: 4, scheduled_date: '2026-12-10', status: 'upcoming',
        registration_open: false, championship_year: 2026, created_at: new Date().toISOString(),
    },
];

// ---- DEMO PLAYERS ----
const firstNames = ['Arjun', 'Priya', 'Rohan', 'Sneha', 'Vikram', 'Ananya', 'Karthik', 'Divya', 'Aditya', 'Meera', 'Rahul', 'Sanya', 'Dev', 'Isha', 'Nikhil', 'Pooja'];
const lastNames = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Gupta', 'Iyer', 'Kumar', 'Singh', 'Das', 'Joshi', 'Rao', 'Verma'];
const academies = ['Shuttle Stars Academy', 'Ace Badminton Club', 'Pro Shuttlers', 'Victory Sports Academy', 'Smash Point Academy', 'Elite Badminton School'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDemoPlayers(tournamentId: string, categories: Category[]): Player[] {
    const players: Player[] = [];
    const paymentStatuses: Player['payment_status'][] = ['paid_upi', 'paid_cash', 'pending', 'waived'];

    categories.forEach((cat) => {
        const count = Math.floor(Math.random() * 10) + 4; // 4-13 players per category
        for (let i = 0; i < count; i++) {
            const firstName = randomFrom(firstNames);
            const lastName = randomFrom(lastNames);
            players.push({
                id: uuidv4(),
                tournament_id: tournamentId,
                category_id: cat.id,
                full_name: `${firstName} ${lastName}`,
                gender: cat.gender === 'Girls' ? 'Girl' : cat.gender === 'Mixed' ? randomFrom(['Boy', 'Girl']) : 'Boy',
                date_of_birth: '2014-05-15',
                academy_name: randomFrom(academies),
                city: randomFrom(cities),
                parent_name: `Mr. ${lastName}`,
                parent_phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
                payment_status: randomFrom(paymentStatuses),
                registration_source: Math.random() > 0.3 ? 'google_form' : 'manual',
                status: 'active',
                registered_at: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
                category: cat,
            });
        }
    });
    return players;
}

// ---- DEMO EXPENSES ----
export function generateDemoExpenses(tournamentId: string): Expense[] {
    return [
        { id: uuidv4(), tournament_id: tournamentId, type: 'income', category: 'Registration Fees', description: 'Player registration fees', amount: 25000, payment_mode: 'upi', status: 'paid', responsible_person: 'Admin', transaction_date: '2026-03-15', created_at: new Date().toISOString() },
        { id: uuidv4(), tournament_id: tournamentId, type: 'income', category: 'Sponsorship', description: 'Local sponsor contribution', amount: 15000, payment_mode: 'bank_transfer', status: 'paid', responsible_person: 'Admin', transaction_date: '2026-03-10', created_at: new Date().toISOString() },
        { id: uuidv4(), tournament_id: tournamentId, type: 'expense', category: 'Court Booking', description: 'Sports complex rental (2 courts)', amount: 8000, payment_mode: 'upi', status: 'paid', responsible_person: 'Raj', transaction_date: '2026-03-20', created_at: new Date().toISOString() },
        { id: uuidv4(), tournament_id: tournamentId, type: 'expense', category: 'Trophy', description: 'Trophies and medals', amount: 5000, payment_mode: 'cash', status: 'paid', responsible_person: 'Priya', transaction_date: '2026-03-22', created_at: new Date().toISOString() },
        { id: uuidv4(), tournament_id: tournamentId, type: 'expense', category: 'Banner', description: 'Event banners and standees', amount: 3000, payment_mode: 'upi', status: 'pending', responsible_person: 'Amit', transaction_date: '2026-03-25', created_at: new Date().toISOString() },
        { id: uuidv4(), tournament_id: tournamentId, type: 'expense', category: 'Catering', description: 'Refreshments for players', amount: 4500, payment_mode: 'cash', status: 'paid', responsible_person: 'Meera', transaction_date: '2026-04-05', created_at: new Date().toISOString() },
    ];
}

// ---- DEMO LEADERBOARD ----
export function generateDemoLeaderboard(categories: Category[]): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    categories.forEach((cat) => {
        const numPlayers = Math.floor(Math.random() * 8) + 5;
        for (let i = 0; i < numPlayers; i++) {
            const firstName = randomFrom(firstNames);
            const lastName = randomFrom(lastNames);
            const t1 = [50, 30, 20, 10, 5, 5, 5, 0][Math.min(i, 7)];
            entries.push({
                player_name: `${firstName} ${lastName}`,
                academy_name: randomFrom(academies),
                category_id: cat.id,
                matches_played: Math.max(0, 4 - Math.min(i, 3)),
                wins: Math.max(0, 4 - Math.min(i, 4)),
                losses: Math.min(i, 3),
                t1_points: t1,
                t2_points: 0,
                t3_points: 0,
                t4_points: 0,
                total_points: t1,
                rank: i + 1,
            });
        }
    });
    return entries;
}
