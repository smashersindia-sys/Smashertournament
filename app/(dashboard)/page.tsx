'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CreditCard, Clock, Layers, UserPlus, GitBranch, Trophy } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { format } from 'date-fns';
import type { Player } from '@/types';

export default function DashboardPage() {
    const { players, categories, expenses, selectedTournament, isLoading, pendingRegistrations, approvePlayer, rejectPlayer } = useApp();

    const stats = useMemo(() => {
        const paid = players.filter(p => p.payment_status === 'paid_upi' || p.payment_status === 'paid_cash').length;
        const pending = players.filter(p => p.payment_status === 'pending').length;
        const categoriesUsed = new Set(players.map(p => p.category_id)).size;

        const categoryBreakdown = categories.map(cat => ({
            name: cat.age_group + ' ' + (cat.gender === 'Mixed' ? '' : cat.gender.charAt(0)),
            fullName: cat.name,
            count: players.filter(p => p.category_id === cat.id).length,
        })).filter(c => c.count > 0);

        const totalIncome = expenses.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
        const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);

        return {
            total: players.length,
            paid,
            pending,
            categoriesActive: categoriesUsed,
            categoryBreakdown,
            totalIncome,
            totalExpenses,
            netPL: totalIncome - totalExpenses,
        };
    }, [players, categories, expenses]);

    const recentPlayers = useMemo(() => {
        return [...players]
            .sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
            .slice(0, 10);
    }, [players]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
                    ))}
                </div>
                <Skeleton className="h-80" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">
                        Dashboard
                    </h1>
                    <p className="text-xs text-[#4B5563] font-medium">Overview for {selectedTournament?.name || 'Smashers Tournament'}</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/players" className="inline-flex items-center justify-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl h-9 px-3 text-xs font-bold shadow-xs whitespace-nowrap transition-colors">
                        <UserPlus size={14} />
                        Add Player
                    </Link>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-semibold text-[#4B5563]">Registrations</p>
                                <p className="text-2xl font-bold text-[#111827] mt-1">{stats.total}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                                <Users size={20} className="text-[#2E7D32]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-semibold text-[#4B5563]">Paid</p>
                                <p className="text-2xl font-bold text-[#2E7D32] mt-1">{stats.paid}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                                <CreditCard size={20} className="text-[#2E7D32]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-semibold text-[#4B5563]">Pending</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">{stats.pending}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-red-50/50 flex items-center justify-center">
                                <Clock size={20} className="text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-semibold text-[#4B5563]">Categories</p>
                                <p className="text-2xl font-bold text-[#111827] mt-1">{stats.categoriesActive}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-[#1565C0]">
                                <Layers size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Registrations */}
                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                    <CardHeader className="p-5 pb-0">
                        <CardTitle className="text-md font-bold text-[#111827]">Recent Registrations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        {recentPlayers.length === 0 ? (
                            <div className="text-center py-12 text-[#4B5563] text-sm">No registrations yet</div>
                        ) : (
                            <div className="space-y-4">
                                {recentPlayers.slice(0, 5).map((player) => (
                                    <div key={player.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-xs font-bold text-[#2E7D32]">
                                                {player.full_name.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[#111827]">{player.full_name}</span>
                                                <span className="text-[11px] text-[#4B5563] font-medium">{player.category?.name}</span>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`text-[9px] uppercase font-bold py-0.5 px-2 border-0 shadow-none ${player.payment_status === 'paid_upi' ? 'bg-[#F0FDF4] text-[#2E7D32]' :
                                                player.payment_status === 'paid_cash' ? 'bg-teal-50 text-teal-700' :
                                                    player.payment_status === 'pending' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
                                                }`}
                                        >
                                            {player.payment_status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                        {recentPlayers.length > 0 && (
                            <Link href="/players" className="block mt-6 text-center text-xs font-bold text-[#2E7D32] hover:underline">
                                View all players →
                            </Link>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                    <CardHeader className="p-5 pb-0">
                        <CardTitle className="text-md font-bold text-[#111827]">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between py-1">
                            <span className="text-sm font-semibold text-[#4B5563]">Income</span>
                            <span className="text-sm font-bold text-[#111827]">Rs {stats.totalIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <span className="text-sm font-semibold text-[#4B5563]">Expenses</span>
                            <span className="text-sm font-bold text-[#111827]">Rs {stats.totalExpenses.toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-[#111827]">Net P&L</span>
                            <span className={`text-md font-bold ${stats.netPL >= 0 ? 'text-[#2E7D32]' : 'text-red-600'}`}>
                                Rs {stats.netPL.toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Registrations */}
            {pendingRegistrations.length > 0 && (
                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white border-l-4 border-l-amber-400">
                    <CardHeader className="p-5 pb-0">
                        <CardTitle className="text-md font-bold text-[#111827] flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-black">{pendingRegistrations.length}</span>
                            New Registrations — Pending Approval
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="space-y-3">
                            {pendingRegistrations.map((player: Player) => (
                                <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-[13px] font-extrabold text-amber-700">
                                        {player.full_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#111827] truncate">{player.full_name}</p>
                                        <div className="flex flex-wrap gap-2 text-[10px] text-[#4B5563] font-medium">
                                            <span>{player.contact_number || player.email || '—'}</span>
                                            <span>•</span>
                                            <span>{player.category?.name || '—'}</span>
                                        </div>
                                    </div>
                                    {player.payment_proof_url && (
                                        <a href={player.payment_proof_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                            <img src={player.payment_proof_url} alt="Payment" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                                        </a>
                                    )}
                                    <div className="flex gap-1.5 shrink-0">
                                        <Button
                                            size="sm"
                                            className="h-8 px-3 text-[10px] font-bold bg-[#2E7D32] hover:bg-[#1B5E20] rounded-lg shadow-xs"
                                            onClick={() => approvePlayer(player.id)}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 text-[10px] font-bold border-red-200 text-red-500 hover:bg-red-50 rounded-lg"
                                            onClick={() => rejectPlayer(player.id)}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2">
                <Link href="/players">
                    <Card className="border-gray-100 shadow-xs hover:shadow-sm transition-all cursor-pointer group rounded-xl bg-white border border-gray-100">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                <Users size={18} className="text-[#2E7D32]" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-[#111827]">Manage Players</p>
                                <p className="text-[11px] text-[#4B5563] font-medium leading-normal">Registration & payments</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/fixtures">
                    <Card className="border-gray-100 shadow-xs hover:shadow-sm transition-all cursor-pointer group rounded-xl bg-white border border-gray-100">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                <GitBranch size={18} className="text-[#1565C0]" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-[#111827]">Draw Brackets</p>
                                <p className="text-[11px] text-[#4B5563] font-medium leading-normal">Generate tournament logs</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/leaderboard">
                    <Card className="border-gray-100 shadow-xs hover:shadow-sm transition-all cursor-pointer group rounded-xl bg-white border border-gray-100">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                <Trophy size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-[#111827]">Leaderboard</p>
                                <p className="text-[11px] text-[#4B5563] font-medium leading-normal">Live rankings & points</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
