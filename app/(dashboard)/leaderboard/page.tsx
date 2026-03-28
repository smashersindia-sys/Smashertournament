'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Medal, Download, Lock, RotateCcw, Trophy } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { toast } from 'sonner';
import type { LeaderboardEntry } from '@/types';

export default function LeaderboardPage() {
    const { categories, getLeaderboardEntries, fixturesByCategory } = useApp();
    const [activeTab, setActiveTab] = useState(categories[0]?.id || '');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [freezeConfirm, setFreezeConfirm] = useState(false);
    const [resetConfirm, setResetConfirm] = useState(false);

    // Manual point overrides
    const [overrides, setOverrides] = useState<Record<string, Record<string, Partial<LeaderboardEntry>>>>({});

    // Compute leaderboard from fixture results
    const getEntriesForCategory = (categoryId: string): LeaderboardEntry[] => {
        const computed = getLeaderboardEntries(categoryId);

        // Apply manual overrides if any
        const catOverrides = overrides[categoryId] || {};
        const entries = computed.map(e => {
            const override = catOverrides[e.player_name];
            if (override) {
                const merged = { ...e, ...override };
                merged.total_points = (merged.t1_points || 0) + (merged.t2_points || 0) + (merged.t3_points || 0) + (merged.t4_points || 0);
                return merged;
            }
            return e;
        });

        // Re-sort and re-rank
        entries.sort((a, b) => b.total_points - a.total_points);
        entries.forEach((e, i) => { e.rank = i + 1; });

        return entries;
    };

    const handlePointOverride = (categoryId: string, playerName: string, field: keyof LeaderboardEntry, value: number) => {
        setOverrides(prev => ({
            ...prev,
            [categoryId]: {
                ...(prev[categoryId] || {}),
                [playerName]: {
                    ...(prev[categoryId]?.[playerName] || {}),
                    [field]: value,
                },
            },
        }));
    };

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-amber-50 border-l-4 border-l-amber-400';
            case 2: return 'bg-gray-50 border-l-4 border-l-gray-400';
            case 3: return 'bg-orange-50/50 border-l-4 border-l-orange-300';
            default: return '';
        }
    };

    const handleFreeze = () => {
        toast.success('Leaderboard frozen for ' + selectedYear);
        setFreezeConfirm(false);
    };

    const handleReset = () => {
        setOverrides({});
        toast.success('Manual overrides reset');
        setResetConfirm(false);
    };

    const exportCSV = () => {
        const cat = categories.find(c => c.id === activeTab);
        const entries = getEntriesForCategory(activeTab);
        const headers = ['Rank', 'Player', 'Academy', 'T1', 'T2', 'T3', 'T4', 'Total'];
        const rows = entries.map(e => [e.rank, e.player_name, e.academy_name || '', e.t1_points, e.t2_points, e.t3_points, e.t4_points, e.total_points]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `leaderboard-${cat?.age_group || 'all'}-${selectedYear}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('Leaderboard CSV exported');
    };

    const exportPDF = async () => {
        const cat = categories.find(c => c.id === activeTab);
        const entries = getEntriesForCategory(activeTab);

        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            doc.setFontSize(16);
            doc.text('Championship Leaderboard ' + selectedYear, 15, 15);
            doc.setFontSize(12);
            doc.text(cat?.name || 'All Categories', 15, 23);

            let y = 35;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Rank', 15, y); doc.text('Player', 30, y); doc.text('Academy', 90, y);
            doc.text('T1', 140, y); doc.text('T2', 152, y); doc.text('T3', 164, y); doc.text('T4', 176, y);
            doc.text('Total', 188, y);
            y += 6;
            doc.setFont('helvetica', 'normal');

            entries.forEach(e => {
                doc.text(String(e.rank), 15, y);
                doc.text(e.player_name, 30, y);
                doc.text(e.academy_name || '—', 90, y);
                doc.text(String(e.t1_points), 140, y);
                doc.text(String(e.t2_points), 152, y);
                doc.text(String(e.t3_points), 164, y);
                doc.text(String(e.t4_points), 176, y);
                doc.setFont('helvetica', 'bold');
                doc.text(String(e.total_points), 188, y);
                doc.setFont('helvetica', 'normal');
                y += 5;
                if (y > 280) { doc.addPage(); y = 15; }
            });

            doc.save(`leaderboard-${cat?.age_group || 'all'}-${selectedYear}.pdf`);
            toast.success('PDF downloaded');
        } catch {
            toast.error('Failed to generate PDF');
        }
    };

    // Check if any fixtures exist
    const hasAnyFixtures = Object.keys(fixturesByCategory).length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Championship Standings</h1>
                    <p className="text-xs text-[#4B5563] font-medium">Player rankings for the {selectedYear} season</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <Select value={selectedYear} onValueChange={(v) => v && setSelectedYear(v)}>
                        <SelectTrigger className="w-[140px] bg-white border-gray-100 rounded-xl shadow-xs h-9 text-xs font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                            <SelectItem value="2026">Season 2026</SelectItem>
                            <SelectItem value="2025">Season 2025</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex border border-gray-100 bg-white p-1 rounded-xl shadow-xs h-9">
                        <Button variant="ghost" size="sm" className="h-full gap-2 text-[#4B5563] hover:bg-gray-50 rounded-lg px-3 text-[11px] font-bold" onClick={exportCSV}>
                            <Download size={14} />
                            CSV
                        </Button>
                        <div className="w-[1px] bg-gray-100 my-1 mx-1" />
                        <Button variant="ghost" size="sm" className="h-full gap-2 text-[#4B5563] hover:bg-gray-50 rounded-lg px-3 text-[11px] font-bold" onClick={exportPDF}>
                            <Download size={14} />
                            PDF
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" className="h-9 border-gray-100 bg-white shadow-xs text-red-500 hover:bg-red-50 hover:border-red-100 gap-2 rounded-xl px-4 text-xs font-bold" onClick={() => setResetConfirm(true)}>
                        <RotateCcw size={14} />
                        Reset Overrides
                    </Button>
                </div>
            </div>

            {!hasAnyFixtures && (
                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-12 text-center">
                        <Trophy size={48} className="mx-auto mb-4 text-gray-200" />
                        <p className="text-md font-bold text-[#111827] mb-1">No fixture data yet</p>
                        <p className="text-xs text-[#4B5563]">Generate fixtures in the Fixtures page to see leaderboard rankings. Points are calculated automatically from match results.</p>
                    </CardContent>
                </Card>
            )}

            {hasAnyFixtures && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
                        {categories.map(cat => (
                            <TabsTrigger
                                key={cat.id}
                                value={cat.id}
                                className="text-[11px] font-bold uppercase tracking-wider rounded-xl px-4 py-2 bg-white border border-gray-100 data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white shadow-xs transition-all"
                            >
                                {cat.age_group} {cat.gender !== 'Mixed' ? cat.gender.charAt(0) : ''}
                                {fixturesByCategory[cat.id] ? ' ✓' : ''}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {categories.map(cat => {
                        const entries = getEntriesForCategory(cat.id);
                        return (
                            <TabsContent key={cat.id} value={cat.id} className="mt-0">
                                <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                                                    <TableHead className="w-16 text-center font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Rank</TableHead>
                                                    <TableHead className="font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Player Detail</TableHead>
                                                    <TableHead className="hidden sm:table-cell font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Academy</TableHead>
                                                    <TableHead className="text-center w-12 font-bold text-[#111827] py-3.5 text-[10px] uppercase">MP</TableHead>
                                                    <TableHead className="text-center w-12 font-bold text-[#111827] py-3.5 text-[10px] uppercase">W</TableHead>
                                                    <TableHead className="text-center w-12 font-bold text-[#111827] py-3.5 text-[10px] uppercase">L</TableHead>
                                                    <TableHead className="text-center w-16 font-bold text-[#111827] py-3.5 text-[10px] uppercase">T1</TableHead>
                                                    <TableHead className="text-center w-16 font-bold text-[#111827] py-3.5 text-[10px] uppercase">T2</TableHead>
                                                    <TableHead className="text-center w-16 font-bold text-[#111827] py-3.5 text-[10px] uppercase">T3</TableHead>
                                                    <TableHead className="text-center w-16 font-bold text-[#111827] py-3.5 text-[10px] uppercase">T4</TableHead>
                                                    <TableHead className="text-center w-20 font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Points</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {entries.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={11} className="text-center py-24 text-[#4B5563]">
                                                            <Trophy size={40} className="mx-auto mb-3 text-gray-200" />
                                                            <p className="text-md font-bold text-[#111827]">No rankings yet</p>
                                                            <p className="text-xs">Generate fixtures for this category and record match results.</p>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : entries.map(entry => (
                                                    <TableRow key={entry.rank + entry.player_name} className={`border-gray-50 hover:bg-gray-50/30 transition-colors ${getRankStyle(entry.rank)}`}>
                                                        <TableCell className="text-center py-3">
                                                            <div className="flex items-center justify-center">
                                                                {entry.rank <= 3 ? (
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-xs ${entry.rank === 1 ? 'bg-amber-100 border border-amber-200' :
                                                                        entry.rank === 2 ? 'bg-gray-100 border border-gray-200' :
                                                                            'bg-[#FFD180]/30 border border-[#FFD180]/50'
                                                                        }`}>
                                                                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-[#4B5563]">{entry.rank}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-[14px] font-bold text-[#111827]">{entry.player_name}</span>
                                                                <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-tight sm:hidden">{entry.academy_name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell py-3 text-[13px] font-medium text-[#4B5563]">
                                                            {entry.academy_name || 'Individual'}
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <span className="text-xs font-bold text-[#4B5563]">{entry.matches_played}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <span className="text-xs font-bold text-[#2E7D32]">{entry.wins}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <span className="text-xs font-bold text-red-500">{entry.losses}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <Input
                                                                type="number"
                                                                className="w-12 h-7 text-center text-[12px] font-bold text-[#4B5563] p-0 border-gray-200 rounded-lg bg-white focus:bg-white mx-auto"
                                                                value={entry.t1_points}
                                                                onChange={(e) => handlePointOverride(cat.id, entry.player_name, 't1_points', parseInt(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <Input
                                                                type="number"
                                                                className="w-12 h-7 text-center text-[12px] font-bold text-[#4B5563] p-0 border-gray-200 rounded-lg bg-white focus:bg-white mx-auto"
                                                                value={entry.t2_points}
                                                                onChange={(e) => handlePointOverride(cat.id, entry.player_name, 't2_points', parseInt(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <Input
                                                                type="number"
                                                                className="w-12 h-7 text-center text-[12px] font-bold text-[#4B5563] p-0 border-gray-200 rounded-lg bg-white focus:bg-white mx-auto"
                                                                value={entry.t3_points}
                                                                onChange={(e) => handlePointOverride(cat.id, entry.player_name, 't3_points', parseInt(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <Input
                                                                type="number"
                                                                className="w-12 h-7 text-center text-[12px] font-bold text-[#4B5563] p-0 border-gray-200 rounded-lg bg-white focus:bg-white mx-auto"
                                                                value={entry.t4_points}
                                                                onChange={(e) => handlePointOverride(cat.id, entry.player_name, 't4_points', parseInt(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center py-3">
                                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FFF6CC] border border-[#FFD600]/30 shadow-xs">
                                                                <span className="text-[18px] font-black text-[#875800]">
                                                                    {entry.total_points}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            )}

            {/* Freeze Dialog */}
            <Dialog open={freezeConfirm} onOpenChange={setFreezeConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Freeze Leaderboard?</DialogTitle>
                        <DialogDescription>This will lock the {selectedYear} championship standings. Rankings will be archived permanently.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFreezeConfirm(false)}>Cancel</Button>
                        <Button onClick={handleFreeze} className="bg-amber-500 hover:bg-amber-600">Freeze</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Dialog */}
            <Dialog open={resetConfirm} onOpenChange={setResetConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Manual Overrides?</DialogTitle>
                        <DialogDescription>This will remove all manually edited points. Computed points from fixtures will remain.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetConfirm(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReset}>Reset Overrides</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
