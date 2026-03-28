'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Tournament, Category, Player, Expense, Fixture, PlayerStatus } from '@/types';
import { toast } from 'sonner';
import { DEMO_CATEGORIES, DEMO_TOURNAMENTS, generateDemoPlayers, generateDemoExpenses } from '@/lib/demo-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { calculateCategoryResults } from '@/lib/points';
import type { LeaderboardEntry } from '@/types';

interface AppState {
    tournaments: Tournament[];
    categories: Category[];
    selectedTournament: Tournament | null;
    players: Player[];
    expenses: Expense[];
    pendingRegistrations: Player[];
    isLoading: boolean;
    // Fixture brackets stored per category
    fixturesByCategory: Record<string, Fixture[]>;
    // Format per category
    formatByCategory: Record<string, 'Knockout' | 'League'>;
    // Finalized state per category
    finalizedByCategory: Record<string, boolean>;
    // Manual edit mode state per category
    manualModeByCategory: Record<string, boolean>;
    // Persisted active tab for fixtures page
    activeFixturesTab: string;
}

interface AppContextType extends AppState {
    setSelectedTournament: (t: Tournament) => void;
    refreshPlayers: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
    refreshTournaments: () => Promise<void>;
    refreshPendingRegistrations: () => Promise<void>;
    addPlayer: (player: Omit<Player, 'id' | 'registered_at'>) => Promise<{ success: boolean; error?: string }>;
    updatePlayer: (id: string, updates: Partial<Player>) => Promise<{ success: boolean; error?: string }>;
    deletePlayer: (id: string) => Promise<{ success: boolean; error?: string }>;
    approvePlayer: (id: string) => Promise<{ success: boolean; error?: string }>;
    rejectPlayer: (id: string) => Promise<{ success: boolean; error?: string }>;
    addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
    updateExpense: (id: string, updates: Partial<Expense>) => Promise<{ success: boolean; error?: string }>;
    deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;
    addTournament: (tournament: Omit<Tournament, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
    updateTournament: (id: string, updates: Partial<Tournament>) => Promise<{ success: boolean; error?: string }>;
    addCategory: (category: Omit<Category, 'id'>) => Promise<{ success: boolean; error?: string }>;
    updateCategory: (id: string, updates: Partial<Category>) => Promise<{ success: boolean; error?: string }>;
    // Fixture management
    setFixturesForCategory: (categoryId: string, fixtures: Fixture[]) => void;
    clearFixturesForCategory: (categoryId: string) => void;
    setFormatForCategory: (categoryId: string, format: 'Knockout' | 'League') => void;
    setFinalizedForCategory: (categoryId: string, finalized: boolean) => void;
    setManualModeForCategory: (categoryId: string, manualMode: boolean) => void;
    setActiveFixturesTab: (categoryId: string) => void;
    // Leaderboard
    getLeaderboardEntries: (categoryId: string) => LeaderboardEntry[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AppState>({
        tournaments: [],
        categories: [],
        selectedTournament: null,
        players: [],
        expenses: [],
        pendingRegistrations: [],
        isLoading: true,
        fixturesByCategory: {},
        formatByCategory: {},
        finalizedByCategory: {},
        manualModeByCategory: {},
        activeFixturesTab: '',
    });

    const [useSupabase, setUseSupabase] = useState(false);

    // Initialize data
    useEffect(() => {
        const init = async () => {
            if (isSupabaseConfigured()) {
                try {
                    const [{ data: cats, error: catsError }, { data: tourns, error: tournsError }] = await Promise.all([
                        supabase.from('categories').select('*').order('display_order'),
                        supabase.from('tournaments').select('*').order('tournament_number'),
                    ]);
                    if (catsError) console.error('Failed to fetch categories:', catsError);
                    if (tournsError) console.error('Failed to fetch tournaments:', tournsError);
                    const categories = cats || [];
                    const tournaments = tourns || [];
                    const selected = tournaments.find((t: Tournament) => t.status === 'active') || tournaments[0] || null;

                    let players: Player[] = [];
                    let expenses: Expense[] = [];
                    let pendingRegistrations: Player[] = [];
                    let fixturesByCategory: Record<string, Fixture[]> = {};
                    let formatByCategory: Record<string, 'Knockout' | 'League'> = {};

                    if (selected) {
                        const [
                            { data: p, error: pError },
                            { data: e, error: eError },
                            { data: pending, error: pendingError },
                            { data: fixtures, error: fixturesError },
                        ] = await Promise.all([
                            supabase.from('players').select('*, category:categories(*)').eq('tournament_id', selected.id).or('status.eq.active,status.is.null'),
                            supabase.from('expenses').select('*').eq('tournament_id', selected.id),
                            supabase.from('players').select('*, category:categories(*)').eq('tournament_id', selected.id).eq('status', 'pending_approval'),
                            supabase.from('fixtures').select('*').eq('tournament_id', selected.id),
                        ]);
                        if (pError) console.error('Failed to fetch players:', pError);
                        if (eError) console.error('Failed to fetch expenses:', eError);
                        if (pendingError) console.error('Failed to fetch pending registrations:', pendingError);
                        if (fixturesError) console.error('Failed to fetch fixtures:', fixturesError);
                        players = p || [];
                        expenses = e || [];
                        pendingRegistrations = pending || [];

                        // Group fixtures by category and infer format from round_name
                        if (fixtures && fixtures.length > 0) {
                            fixtures.forEach((f: Fixture) => {
                                if (!fixturesByCategory[f.category_id]) {
                                    fixturesByCategory[f.category_id] = [];
                                }
                                // Infer format: League fixtures have round_name === 'League'
                                if (!formatByCategory[f.category_id]) {
                                    formatByCategory[f.category_id] = f.round_name === 'League' ? 'League' : 'Knockout';
                                }
                                // Resolve player references
                                const p1 = players.find(pl => pl.id === f.player1_id);
                                const p2 = players.find(pl => pl.id === f.player2_id);
                                fixturesByCategory[f.category_id].push({
                                    ...f,
                                    player1: p1,
                                    player2: p2,
                                });
                            });
                        }
                    }

                    setUseSupabase(true);
                    setState(prev => ({
                        ...prev,
                        categories,
                        tournaments,
                        selectedTournament: selected,
                        players,
                        expenses,
                        pendingRegistrations,
                        fixturesByCategory,
                        formatByCategory,
                        isLoading: false,
                    }));
                    return;
                } catch (err) {
                    console.error('Supabase init failed, falling back to demo data:', err);
                    // Fall through to local data mode
                }
            }

            // Local data mode (uses demo data structure for initial categories/tournaments)
            const categories = DEMO_CATEGORIES;
            const tournaments = DEMO_TOURNAMENTS;
            const selected = tournaments[0];
            const players = generateDemoPlayers(selected.id, categories);
            const expenses = generateDemoExpenses(selected.id);

            setState(prev => ({
                ...prev,
                categories,
                tournaments,
                selectedTournament: selected,
                players,
                expenses,
                pendingRegistrations: [],
                isLoading: false,
            }));
        };
        init();
    }, []);

    const setSelectedTournament = useCallback(async (t: Tournament) => {
        setState(prev => ({ ...prev, isLoading: true, selectedTournament: t }));
        if (useSupabase) {
            const [
                { data: p, error: pError },
                { data: e, error: eError },
                { data: pending, error: pendingError },
                { data: fixtures, error: fixturesError },
            ] = await Promise.all([
                supabase.from('players').select('*, category:categories(*)').eq('tournament_id', t.id).or('status.eq.active,status.is.null'),
                supabase.from('expenses').select('*').eq('tournament_id', t.id),
                supabase.from('players').select('*, category:categories(*)').eq('tournament_id', t.id).eq('status', 'pending_approval'),
                supabase.from('fixtures').select('*').eq('tournament_id', t.id),
            ]);
            if (pError) console.error('Failed to fetch players:', pError);
            if (eError) console.error('Failed to fetch expenses:', eError);
            if (pendingError) console.error('Failed to fetch pending:', pendingError);
            if (fixturesError) console.error('Failed to fetch fixtures:', fixturesError);

            const activePlayers = p || [];
            const fixturesByCategory: Record<string, Fixture[]> = {};
            const formatByCategory: Record<string, 'Knockout' | 'League'> = {};
            if (fixtures && fixtures.length > 0) {
                fixtures.forEach((f: Fixture) => {
                    if (!fixturesByCategory[f.category_id]) {
                        fixturesByCategory[f.category_id] = [];
                    }
                    if (!formatByCategory[f.category_id]) {
                        formatByCategory[f.category_id] = f.round_name === 'League' ? 'League' : 'Knockout';
                    }
                    const p1 = activePlayers.find(pl => pl.id === f.player1_id);
                    const p2 = activePlayers.find(pl => pl.id === f.player2_id);
                    fixturesByCategory[f.category_id].push({ ...f, player1: p1, player2: p2 });
                });
            }

            setState(prev => ({
                ...prev,
                players: activePlayers,
                expenses: e || [],
                pendingRegistrations: pending || [],
                fixturesByCategory,
                formatByCategory,
                isLoading: false,
            }));
        } else {
            const players = generateDemoPlayers(t.id, state.categories);
            const expenses = generateDemoExpenses(t.id);
            setState(prev => ({ ...prev, players, expenses, pendingRegistrations: [], fixturesByCategory: {}, isLoading: false }));
        }
    }, [useSupabase, state.categories]);

    const refreshPlayers = useCallback(async () => {
        if (!state.selectedTournament || !useSupabase) return;
        const { data, error } = await supabase.from('players').select('*, category:categories(*)').eq('tournament_id', state.selectedTournament.id).or('status.eq.active,status.is.null');
        if (error) console.error('Failed to refresh players:', error);
        setState(prev => ({ ...prev, players: data || [] }));
    }, [state.selectedTournament, useSupabase]);

    const refreshPendingRegistrations = useCallback(async () => {
        if (!state.selectedTournament || !useSupabase) return;
        const { data, error } = await supabase.from('players').select('*, category:categories(*)').eq('tournament_id', state.selectedTournament.id).eq('status', 'pending_approval');
        if (error) console.error('Failed to refresh pending registrations:', error);
        setState(prev => ({ ...prev, pendingRegistrations: data || [] }));
    }, [state.selectedTournament, useSupabase]);

    const refreshExpenses = useCallback(async () => {
        if (!state.selectedTournament || !useSupabase) return;
        const { data, error } = await supabase.from('expenses').select('*').eq('tournament_id', state.selectedTournament.id);
        if (error) console.error('Failed to refresh expenses:', error);
        setState(prev => ({ ...prev, expenses: data || [] }));
    }, [state.selectedTournament, useSupabase]);

    const refreshTournaments = useCallback(async () => {
        if (!useSupabase) return;
        const { data } = await supabase.from('tournaments').select('*').order('tournament_number');
        setState(prev => ({ ...prev, tournaments: data || [] }));
    }, [useSupabase]);

    // Helper: auto-create income entry when a player is marked as paid
    const autoAddIncome = useCallback(async (player: { id: string; full_name: string; category_id: string; tournament_id: string }, categories: Category[]) => {
        const category = categories.find(c => c.id === player.category_id);
        const entryFee = category?.entry_fee || 600;

        const incomeEntry = {
            id: crypto.randomUUID(),
            tournament_id: player.tournament_id,
            type: 'income' as const,
            category: 'Registration Fees',
            description: `Player: ${player.full_name}`,
            amount: entryFee,
            payment_mode: 'upi',
            status: 'paid',
            responsible_person: '',
            transaction_date: new Date().toISOString().split('T')[0],
            notes: `Auto-added for player registration`,
            created_at: new Date().toISOString(),
        };

        if (useSupabase) {
            const { error } = await supabase.from('expenses').insert(incomeEntry);
            if (error) {
                console.error('Failed to auto-add income:', error);
                toast.error('Failed to auto-add income: ' + error.message);
                return false;
            }
            // Mark player as income_added
            await supabase.from('players').update({ income_added: true }).eq('id', player.id);
        }

        // Update local state
        setState(prev => ({
            ...prev,
            expenses: [incomeEntry as Expense, ...prev.expenses],
            players: prev.players.map(p => p.id === player.id ? { ...p, income_added: true } : p),
        }));

        toast.success(`₹${entryFee} income auto-added for ${player.full_name}`);
        return true;
    }, [useSupabase]);

    const addPlayer = useCallback(async (player: Omit<Player, 'id' | 'registered_at'>) => {
        const newPlayer: Player = { ...player, id: crypto.randomUUID(), registered_at: new Date().toISOString() } as Player;
        if (!newPlayer.status) newPlayer.status = 'active';
        const isPaid = newPlayer.payment_status === 'paid_upi' || newPlayer.payment_status === 'paid_cash';
        
        if (useSupabase && state.selectedTournament) {
            const dbPlayer = {
                id: newPlayer.id,
                tournament_id: newPlayer.tournament_id,
                category_id: newPlayer.category_id,
                full_name: newPlayer.full_name,
                gender: newPlayer.gender,
                date_of_birth: newPlayer.date_of_birth || null,
                academy_name: newPlayer.academy_name || null,
                city: newPlayer.city || null,
                parent_name: newPlayer.parent_name || null,
                parent_phone: newPlayer.parent_phone || null,
                payment_status: newPlayer.payment_status,
                payment_proof_url: newPlayer.payment_proof_url || null,
                registration_source: newPlayer.registration_source,
                contact_number: newPlayer.contact_number || null,
                payment_mode_registration: newPlayer.payment_mode_registration || null,
                email: newPlayer.email || null,
                status: newPlayer.status || 'active',
                registered_at: newPlayer.registered_at,
                notes: newPlayer.notes || null,
                income_added: false,
            };
            
            const { error } = await supabase.from('players').insert(dbPlayer);
            if (error) {
                console.error('Failed to insert player:', error);
                toast.error('Failed to save player: ' + error.message);
                return { success: false, error: error.message }; // Stop execution, don't update local state
            }
            refreshPlayers();
        }
        setState(prev => ({ ...prev, players: [newPlayer, ...prev.players] }));

        // Auto-add income if player is added with paid status
        if (isPaid) {
            await autoAddIncome(newPlayer, state.categories);
        }
        return { success: true };
    }, [useSupabase, state.selectedTournament, state.categories, refreshPlayers, autoAddIncome]);

    const updatePlayer = useCallback(async (id: string, updates: Partial<Player>) => {
        // Check if payment status is changing to paid
        const currentPlayer = state.players.find(p => p.id === id);
        const isBecomingPaid = updates.payment_status &&
            (updates.payment_status === 'paid_upi' || updates.payment_status === 'paid_cash') &&
            currentPlayer &&
            currentPlayer.payment_status !== 'paid_upi' &&
            currentPlayer.payment_status !== 'paid_cash';

        if (useSupabase) {
            // Explicitly pick only columns that exist in the DB schema
            const dbUpdates: Record<string, unknown> = {};
            const dbFields = [
                'tournament_id', 'category_id', 'full_name', 'gender', 'date_of_birth',
                'academy_name', 'city', 'parent_name', 'parent_phone',
                'payment_status', 'payment_proof_url',
                'registration_source', 'contact_number', 'payment_mode_registration',
                'email', 'status', 'notes', 'income_added',
            ] as const;
            for (const key of dbFields) {
                if (key in updates) {
                    dbUpdates[key] = (updates as Record<string, unknown>)[key];
                }
            }
            const { error } = await supabase.from('players').update(dbUpdates).eq('id', id);
            if (error) {
                console.error('Failed to update player:', error);
                toast.error('Failed to update player: ' + error.message);
                return { success: false, error: error.message };
            } else {
                refreshPlayers();
            }
        }
        setState(prev => {
            const updatedPlayers = prev.players.map(p => p.id === id ? { ...p, ...updates } : p);
            // Also refresh embedded player refs inside fixtures so the UI updates without a page reload
            const updatedFixtures: Record<string, Fixture[]> = {};
            for (const [catId, fixtures] of Object.entries(prev.fixturesByCategory)) {
                updatedFixtures[catId] = fixtures.map(f => ({
                    ...f,
                    player1: f.player1_id === id ? { ...f.player1!, ...updates } : f.player1,
                    player2: f.player2_id === id ? { ...f.player2!, ...updates } : f.player2,
                }));
            }
            return {
                ...prev,
                players: updatedPlayers,
                fixturesByCategory: updatedFixtures,
            };
        });

        // Auto-add income when payment status becomes paid and income not yet added
        if (isBecomingPaid && currentPlayer && !currentPlayer.income_added) {
            await autoAddIncome(currentPlayer, state.categories);
            await refreshExpenses();
        }
        return { success: true };
    }, [useSupabase, state.players, state.categories, refreshPlayers, refreshExpenses, autoAddIncome]);

    const deletePlayer = useCallback(async (id: string) => {
        if (useSupabase) {
            const { error } = await supabase.from('players').delete().eq('id', id);
            if (error) return { success: false, error: error.message };
            refreshPlayers();
        }
        setState(prev => ({
            ...prev,
            players: prev.players.filter(p => p.id !== id),
        }));
        return { success: true };
    }, [useSupabase, refreshPlayers]);

    const approvePlayer = useCallback(async (id: string) => {
        if (useSupabase) {
            const { error } = await supabase.from('players').update({ status: 'active' }).eq('id', id);
            if (error) {
                toast.error('Failed to approve player: ' + error.message);
                return { success: false, error: error.message };
            } else {
                refreshPlayers();
                refreshPendingRegistrations();
                toast.success('Player approved and added to active roster');
            }
        }
        // Move from pending to active in local state
        setState(prev => {
            const player = prev.pendingRegistrations.find(p => p.id === id);
            if (!player) return prev;
            const updatedPlayer = { ...player, status: 'active' as PlayerStatus };
            return {
                ...prev,
                pendingRegistrations: prev.pendingRegistrations.filter(p => p.id !== id),
                players: [updatedPlayer, ...prev.players],
            };
        });
        return { success: true };
    }, [useSupabase, refreshPlayers, refreshPendingRegistrations]);

    const rejectPlayer = useCallback(async (id: string) => {
        if (useSupabase) {
            const { error } = await supabase.from('players').update({ status: 'rejected' }).eq('id', id);
            if (error) {
                toast.error('Failed to reject player: ' + error.message);
                return { success: false, error: error.message };
            } else {
                refreshPendingRegistrations();
                toast.success('Registration rejected');
            }
        }
        setState(prev => ({
            ...prev,
            pendingRegistrations: prev.pendingRegistrations.filter(p => p.id !== id),
        }));
        return { success: true };
    }, [useSupabase, refreshPendingRegistrations]);

    const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'created_at'>) => {
        const newExpense: Expense = { ...expense, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        if (useSupabase) {
            const { error } = await supabase.from('expenses').insert(newExpense);
            if (error) return { success: false, error: error.message };
            refreshExpenses();
        }
        setState(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
        return { success: true };
    }, [useSupabase, refreshExpenses]);

    const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
        if (useSupabase) {
            const { error } = await supabase.from('expenses').update(updates).eq('id', id);
            if (error) return { success: false, error: error.message };
            refreshExpenses();
        }
        setState(prev => ({
            ...prev,
            expenses: prev.expenses.map(e => e.id === id ? { ...e, ...updates } : e),
        }));
        return { success: true };
    }, [useSupabase, refreshExpenses]);

    const deleteExpense = useCallback(async (id: string) => {
        if (useSupabase) {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) return { success: false, error: error.message };
            refreshExpenses();
        }
        setState(prev => ({
            ...prev,
            expenses: prev.expenses.filter(e => e.id !== id),
        }));
        return { success: true };
    }, [useSupabase, refreshExpenses]);

    const addTournament = useCallback(async (tournament: Omit<Tournament, 'id' | 'created_at'>) => {
        const newTournament: Tournament = { ...tournament, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        if (useSupabase) {
            const { error } = await supabase.from('tournaments').insert(newTournament);
            if (error) return { success: false, error: error.message };
            refreshTournaments();
        }
        setState(prev => ({ ...prev, tournaments: [...prev.tournaments, newTournament] }));
        return { success: true };
    }, [useSupabase, refreshTournaments]);

    const updateTournament = useCallback(async (id: string, updates: Partial<Tournament>) => {
        if (useSupabase) {
            const { error } = await supabase.from('tournaments').update(updates).eq('id', id);
            if (error) return { success: false, error: error.message };
            refreshTournaments();
        }
        setState(prev => ({
            ...prev,
            tournaments: prev.tournaments.map(t => t.id === id ? { ...t, ...updates } : t),
            selectedTournament: prev.selectedTournament?.id === id ? { ...prev.selectedTournament, ...updates } : prev.selectedTournament,
        }));
        return { success: true };
    }, [useSupabase, refreshTournaments]);

    const refreshCategories = useCallback(async () => {
        if (!useSupabase) return;
        const { data } = await supabase.from('categories').select('*').order('display_order');
        setState(prev => ({ ...prev, categories: data || [] }));
    }, [useSupabase]);

    const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
        const newCategory: Category = { ...category, id: crypto.randomUUID() };
        if (!newCategory.entry_fee) newCategory.entry_fee = 600;
        if (useSupabase) {
            const dbCategory = {
                id: newCategory.id,
                name: newCategory.name,
                age_group: newCategory.age_group,
                gender: newCategory.gender,
                display_order: newCategory.display_order,
                entry_fee: newCategory.entry_fee,
            };
            const { error } = await supabase.from('categories').insert(dbCategory);
            if (error) {
                console.error('Failed to insert category:', error);
                toast.error('Failed to save category: ' + error.message);
                return { success: false, error: error.message };
            } else {
                refreshCategories();
            }
        }
        setState(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
        return { success: true };
    }, [useSupabase, refreshCategories]);

    const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
        if (useSupabase) {
            const { error } = await supabase.from('categories').update(updates).eq('id', id);
            if (error) {
                console.error('Failed to update category:', error);
                toast.error('Failed to update category: ' + error.message);
                return { success: false, error: error.message };
            } else {
                refreshCategories();
            }
        }
        setState(prev => ({
            ...prev,
            categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c),
        }));
        return { success: true };
    }, [useSupabase, refreshCategories]);

    // ---- Fixture management ----
    const setFixturesForCategory = useCallback((categoryId: string, fixtures: Fixture[]) => {
        setState(prev => ({
            ...prev,
            fixturesByCategory: { ...prev.fixturesByCategory, [categoryId]: fixtures },
        }));

        // Persist to Supabase
        if (useSupabase && state.selectedTournament) {
            // Strip joined fields before saving
            const dbFixtures = fixtures.map(f => ({
                id: f.id,
                tournament_id: f.tournament_id,
                category_id: f.category_id,
                round_number: f.round_number,
                round_name: f.round_name,
                match_number: f.match_number,
                player1_id: f.player1_id || null,
                player2_id: f.player2_id || null,
                player1_score: f.player1_score ?? null,
                player2_score: f.player2_score ?? null,
                winner_id: f.winner_id || null,
                is_bye: f.is_bye,
                status: f.status,
                created_at: f.created_at,
            }));
            supabase.from('fixtures').upsert(dbFixtures, { onConflict: 'id' }).then(({ error }) => {
                if (error) console.error('Failed to persist fixtures:', error);
            });
        }
    }, [useSupabase, state.selectedTournament]);

    const clearFixturesForCategory = useCallback((categoryId: string) => {
        // Delete from Supabase first
        if (useSupabase && state.selectedTournament) {
            supabase.from('fixtures')
                .delete()
                .eq('tournament_id', state.selectedTournament.id)
                .eq('category_id', categoryId)
                .then(({ error }) => {
                    if (error) console.error('Failed to delete fixtures from DB:', error);
                });
        }

        setState(prev => {
            const next = { ...prev.fixturesByCategory };
            delete next[categoryId];
            const nextFinalized = { ...prev.finalizedByCategory };
            delete nextFinalized[categoryId];
            const nextFormat = { ...prev.formatByCategory };
            delete nextFormat[categoryId];
            const nextManualMode = { ...prev.manualModeByCategory };
            delete nextManualMode[categoryId];
            return { ...prev, fixturesByCategory: next, finalizedByCategory: nextFinalized, formatByCategory: nextFormat, manualModeByCategory: nextManualMode };
        });
    }, [useSupabase, state.selectedTournament]);

    const setFormatForCategory = useCallback((categoryId: string, format: 'Knockout' | 'League') => {
        setState(prev => ({
            ...prev,
            formatByCategory: { ...prev.formatByCategory, [categoryId]: format },
        }));
    }, []);

    const setFinalizedForCategory = useCallback((categoryId: string, finalized: boolean) => {
        setState(prev => ({
            ...prev,
            finalizedByCategory: { ...prev.finalizedByCategory, [categoryId]: finalized },
        }));
    }, []);

    const setManualModeForCategory = useCallback((categoryId: string, manualMode: boolean) => {
        setState(prev => ({
            ...prev,
            manualModeByCategory: { ...prev.manualModeByCategory, [categoryId]: manualMode },
        }));
    }, []);

    const setActiveFixturesTab = useCallback((categoryId: string) => {
        setState(prev => ({ ...prev, activeFixturesTab: categoryId }));
    }, []);

    // ---- Leaderboard ----
    const getLeaderboardEntries = useCallback((categoryId: string): LeaderboardEntry[] => {
        // Gather all completed knockout fixtures across all categories for current tournament
        const allFixtures = state.fixturesByCategory;
        const entries: LeaderboardEntry[] = [];
        const playerPointsMap = new Map<string, { name: string; academy?: string; points: number[]; matchesPlayed: number; wins: number; losses: number }>();

        // Get the the tournament number for current selected tournament
        const currentTournament = state.selectedTournament;
        if (!currentTournament) return [];

        const tIdx = currentTournament.tournament_number - 1; // 0-indexed (T1=0, T2=1, ...)

        // Process fixtures for this category
        const catFixtures = allFixtures[categoryId] || [];
        if (catFixtures.length === 0) return [];

        const format = state.formatByCategory[categoryId] || 'Knockout';

        // Build match stats from fixtures
        const playerStatsMap = new Map<string, { matchesPlayed: number; wins: number; losses: number }>();

        const trackMatch = (playerId: string, won: boolean) => {
            if (!playerStatsMap.has(playerId)) {
                playerStatsMap.set(playerId, { matchesPlayed: 0, wins: 0, losses: 0 });
            }
            const s = playerStatsMap.get(playerId)!;
            s.matchesPlayed++;
            if (won) s.wins++;
            else s.losses++;
        };

        // Count matches for all completed, non-bye fixtures
        catFixtures.forEach(f => {
            if (f.status === 'completed' && f.winner_id && !f.is_bye) {
                if (f.player1_id) trackMatch(f.player1_id, f.winner_id === f.player1_id);
                if (f.player2_id) trackMatch(f.player2_id, f.winner_id === f.player2_id);
            }
        });

        if (format === 'Knockout') {
            // Use points calculation logic
            const totalRounds = Math.max(...catFixtures.map(f => f.round_number));
            const results = calculateCategoryResults(catFixtures, totalRounds);

            results.forEach(r => {
                const player = state.players.find(p => p.id === r.playerId);
                if (!player) return;

                const key = player.full_name;
                const stats = playerStatsMap.get(r.playerId) || { matchesPlayed: 0, wins: 0, losses: 0 };
                if (!playerPointsMap.has(key)) {
                    playerPointsMap.set(key, {
                        name: player.full_name,
                        academy: player.academy_name,
                        points: [0, 0, 0, 0],
                        matchesPlayed: stats.matchesPlayed,
                        wins: stats.wins,
                        losses: stats.losses,
                    });
                }
                const entry = playerPointsMap.get(key)!;
                if (tIdx >= 0 && tIdx < 4) {
                    entry.points[tIdx] = r.points;
                }
                entry.matchesPlayed = stats.matchesPlayed;
                entry.wins = stats.wins;
                entry.losses = stats.losses;
            });
        } else {
            // League format - points based on wins
            catFixtures.forEach(f => {
                if (f.status === 'completed' && f.winner_id) {
                    const winner = state.players.find(p => p.id === f.winner_id);
                    if (winner) {
                        const key = winner.full_name;
                        const stats = playerStatsMap.get(f.winner_id) || { matchesPlayed: 0, wins: 0, losses: 0 };
                        if (!playerPointsMap.has(key)) {
                            playerPointsMap.set(key, {
                                name: winner.full_name,
                                academy: winner.academy_name,
                                points: [0, 0, 0, 0],
                                matchesPlayed: stats.matchesPlayed,
                                wins: stats.wins,
                                losses: stats.losses,
                            });
                        }
                        const entry = playerPointsMap.get(key)!;
                        if (tIdx >= 0 && tIdx < 4) {
                            entry.points[tIdx] += 2;
                        }
                    }
                }
            });

            // Also register players with 0 points
            const catPlayers = state.players.filter(p => p.category_id === categoryId);
            catPlayers.forEach(p => {
                if (!playerPointsMap.has(p.full_name)) {
                    const stats = playerStatsMap.get(p.id) || { matchesPlayed: 0, wins: 0, losses: 0 };
                    playerPointsMap.set(p.full_name, {
                        name: p.full_name,
                        academy: p.academy_name,
                        points: [0, 0, 0, 0],
                        matchesPlayed: stats.matchesPlayed,
                        wins: stats.wins,
                        losses: stats.losses,
                    });
                }
            });
        }

        playerPointsMap.forEach((data) => {
            entries.push({
                player_name: data.name,
                academy_name: data.academy,
                category_id: categoryId,
                matches_played: data.matchesPlayed,
                wins: data.wins,
                losses: data.losses,
                t1_points: data.points[0],
                t2_points: data.points[1],
                t3_points: data.points[2],
                t4_points: data.points[3],
                total_points: data.points.reduce((a, b) => a + b, 0),
                rank: 0,
            });
        });

        // Sort: highest points first, then wins as tiebreaker, then fewer losses
        entries.sort((a, b) => {
            if (b.total_points !== a.total_points) return b.total_points - a.total_points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.losses - b.losses;
        });
        entries.forEach((e, i) => { e.rank = i + 1; });

        return entries;
    }, [state.fixturesByCategory, state.formatByCategory, state.players, state.selectedTournament]);

    return (
        <AppContext.Provider value={{
            ...state,
            setSelectedTournament,
            refreshPlayers,
            refreshExpenses,
            refreshTournaments,
            refreshPendingRegistrations,
            addPlayer,
            updatePlayer,
            deletePlayer,
            approvePlayer,
            rejectPlayer,
            addExpense,
            updateExpense,
            deleteExpense,
            addTournament,
            updateTournament,
            addCategory,
            updateCategory,
            setFixturesForCategory,
            clearFixturesForCategory,
            setFormatForCategory,
            setFinalizedForCategory,
            setManualModeForCategory,
            setActiveFixturesTab,
            getLeaderboardEntries,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
