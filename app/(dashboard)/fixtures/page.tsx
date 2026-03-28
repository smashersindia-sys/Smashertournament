'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { GripVertical, Shuffle, Lock, RotateCcw, FileDown, Check, Edit, Unlock, Undo2 } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { toast } from 'sonner';
import { generateBracket, generateLeagueFixtures, groupByRound, calculateLeagueStandings } from '@/lib/bracket';
import type { Fixture, Player, PaymentStatus } from '@/types';

// ── Payment Status Badge (read-only) ─────────────────────────────────────────
function PaymentStatusBadge({ status }: { status?: PaymentStatus }) {
    if (!status) return null;
    const config: Record<string, { label: string; cls: string }> = {
        paid_upi:  { label: 'PAID',     cls: 'bg-green-100 text-green-700 border-green-200' },
        paid_cash: { label: 'PAID',     cls: 'bg-green-100 text-green-700 border-green-200' },
        pending:   { label: 'PENDING',  cls: 'bg-orange-100 text-orange-700 border-orange-200' },
        not_paid:  { label: 'NOT PAID', cls: 'bg-red-100 text-red-700 border-red-200' },
        waived:    { label: 'WAIVED',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    };
    const { label, cls } = config[status] || { label: status.toUpperCase(), cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${cls}`}>
            {label}
        </span>
    );
}

// ── Payment Status Select (interactive) ──────────────────────────────────────
function PaymentStatusSelect({
    playerId,
    status,
    onUpdate,
}: {
    playerId?: string;
    status?: PaymentStatus;
    onUpdate: (id: string, s: PaymentStatus) => void;
}) {
    if (!playerId) return <PaymentStatusBadge status={status} />;

    const colorMap: Record<string, string> = {
        paid_upi:  'bg-green-100 text-green-700 border-green-200',
        paid_cash: 'bg-green-100 text-green-700 border-green-200',
        pending:   'bg-orange-100 text-orange-700 border-orange-200',
        not_paid:  'bg-red-100 text-red-700 border-red-200',
        waived:    'bg-blue-100 text-blue-700 border-blue-200',
    };
    const cls = colorMap[status || 'pending'] || 'bg-gray-100 text-gray-600 border-gray-200';

    return (
        <select
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 cursor-pointer appearance-none ${cls}`}
            value={status || 'pending'}
            title="Change payment status"
            onChange={(e) => onUpdate(playerId, e.target.value as PaymentStatus)}
            onClick={(e) => e.stopPropagation()}
        >
            <option value="pending">PENDING</option>
            <option value="paid_upi">PAID UPI</option>
            <option value="paid_cash">PAID CASH</option>
            <option value="waived">WAIVED</option>
        </select>
    );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function FixturesPage() {
    const {
        players, categories, selectedTournament,
        fixturesByCategory, formatByCategory, finalizedByCategory, manualModeByCategory,
        activeFixturesTab, setActiveFixturesTab,
        setFixturesForCategory, clearFixturesForCategory,
        setFormatForCategory, setFinalizedForCategory, setManualModeForCategory,
        updatePlayer,
    } = useApp();

    const [resetConfirm, setResetConfirm] = useState<string | null>(null);

    // Derive the active tab: use persisted context value, fall back to first category
    const activeTab = activeFixturesTab && categories.some(c => c.id === activeFixturesTab)
        ? activeFixturesTab
        : categories[0]?.id || '';

    // Sync tab to context when first category changes (e.g., tournament switch)
    useEffect(() => {
        if (categories.length > 0 && (!activeFixturesTab || !categories.some(c => c.id === activeFixturesTab))) {
            setActiveFixturesTab(categories[0].id);
        }
    }, [categories, activeFixturesTab, setActiveFixturesTab]);

    // Player ordering per category for drag-to-reorder
    const [playerOrders, setPlayerOrders] = useState<Record<string, Player[]>>({});
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Get format for active tab
    const format = formatByCategory[activeTab] || 'Knockout';

    // Players per category
    const playersByCategory = useMemo(() => {
        const map: Record<string, Player[]> = {};
        categories.forEach(c => {
            map[c.id] = players.filter(p => p.category_id === c.id);
        });
        return map;
    }, [players, categories]);

    // Get ordered players (custom order or default)
    const getOrderedPlayers = useCallback((categoryId: string): Player[] => {
        return playerOrders[categoryId] || playersByCategory[categoryId] || [];
    }, [playerOrders, playersByCategory]);

    // Drag handlers
    const handleDragStart = (index: number) => { dragItem.current = index; };
    const handleDragEnter = (index: number) => { dragOverItem.current = index; };

    const handleDragEnd = (categoryId: string) => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const currentPlayers = [...getOrderedPlayers(categoryId)];
        const draggedItem = currentPlayers[dragItem.current];
        currentPlayers.splice(dragItem.current, 1);
        currentPlayers.splice(dragOverItem.current, 0, draggedItem);
        setPlayerOrders(prev => ({ ...prev, [categoryId]: currentPlayers }));
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const handleGenerate = useCallback((categoryId: string) => {
        const catPlayers = getOrderedPlayers(categoryId);
        if (catPlayers.length < 2) {
            toast.error('Need at least 2 players to generate fixtures');
            return;
        }
        const currentFormat = formatByCategory[categoryId] || 'Knockout';
        let fixtures: Fixture[];
        if (currentFormat === 'League') {
            fixtures = generateLeagueFixtures(catPlayers, selectedTournament?.id || '', categoryId);
        } else {
            fixtures = generateBracket(catPlayers, selectedTournament?.id || '', categoryId);
        }
        setFixturesForCategory(categoryId, fixtures);
        setFinalizedForCategory(categoryId, false);
        toast.success(`${currentFormat} fixtures generated for ${catPlayers.length} players`);
    }, [getOrderedPlayers, selectedTournament, formatByCategory, setFixturesForCategory, setFinalizedForCategory]);

    const handleSetScore = useCallback((categoryId: string, fixtureId: string, field: 'player1_score' | 'player2_score', value: number) => {
        const fixtures = [...(fixturesByCategory[categoryId] || [])];
        const idx = fixtures.findIndex(f => f.id === fixtureId);
        if (idx === -1) return;
        fixtures[idx] = { ...fixtures[idx], [field]: value };
        setFixturesForCategory(categoryId, fixtures);
    }, [fixturesByCategory, setFixturesForCategory]);

    const handleSetWinner = useCallback((categoryId: string, fixture: Fixture, winnerId: string) => {
        const fixtures = [...(fixturesByCategory[categoryId] || [])];
        const idx = fixtures.findIndex(f => f.id === fixture.id);
        if (idx === -1) return;

        if (winnerId === 'reset') {
            fixtures[idx] = { ...fixtures[idx], winner_id: undefined, status: 'scheduled' };
        } else {
            fixtures[idx] = { ...fixtures[idx], winner_id: winnerId, status: 'completed' };
        }

        const currentFormat = formatByCategory[categoryId] || 'Knockout';

        if (currentFormat === 'Knockout') {
            const currentRound = fixture.round_number;
            const nextRoundFixtures = fixtures.filter(f => f.round_number === currentRound + 1);
            if (nextRoundFixtures.length > 0) {
                const currentRoundMatches = fixtures.filter(f => f.round_number === currentRound);
                const matchIdx = currentRoundMatches.findIndex(f => f.id === fixture.id);
                const nextMatchIdx = Math.floor(matchIdx / 2);
                if (nextMatchIdx < nextRoundFixtures.length) {
                    const nextFixture = nextRoundFixtures[nextMatchIdx];
                    const nIdx = fixtures.findIndex(f => f.id === nextFixture.id);
                    const newWinnerId = fixtures[idx].winner_id;
                    const winnerPlayer = newWinnerId
                        ? (newWinnerId === fixtures[idx].player1_id ? fixtures[idx].player1 : fixtures[idx].player2)
                        : undefined;
                    if (matchIdx % 2 === 0) {
                        fixtures[nIdx] = { ...fixtures[nIdx], player1_id: newWinnerId || undefined, player1: winnerPlayer || undefined };
                    } else {
                        fixtures[nIdx] = { ...fixtures[nIdx], player2_id: newWinnerId || undefined, player2: winnerPlayer || undefined };
                    }
                }
            }
        }

        setFixturesForCategory(categoryId, fixtures);
        toast.success(winnerId === 'reset' ? 'Match reset' : 'Winner recorded');
    }, [fixturesByCategory, formatByCategory, setFixturesForCategory]);

    const handleChangePlayer = useCallback((categoryId: string, fixtureId: string, slot: 'player1' | 'player2', newValue: string) => {
        const fixtures = [...(fixturesByCategory[categoryId] || [])];
        const idx = fixtures.findIndex(f => f.id === fixtureId);
        if (idx === -1) return;

        const allPlayers = playersByCategory[categoryId] || [];
        let newPlayer = allPlayers.find(p => p.id === newValue);

        if (!newPlayer && newValue && newValue !== 'none') {
            newPlayer = {
                id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                full_name: newValue,
                category_id: categoryId,
                tournament_id: selectedTournament?.id || '',
                gender: '',
                payment_status: 'pending',
                registration_source: 'manual',
                registered_at: new Date().toISOString(),
            } as Player;
        }

        const actualId = newPlayer?.id || undefined;
        if (slot === 'player1') {
            fixtures[idx] = { ...fixtures[idx], player1_id: actualId, player1: newPlayer };
        } else {
            fixtures[idx] = { ...fixtures[idx], player2_id: actualId, player2: newPlayer };
        }

        const match = fixtures[idx];
        const hasP1 = match.player1_id || match.player1?.full_name;
        const hasP2 = match.player2_id || match.player2?.full_name;
        let newWinnerId = match.winner_id;

        if (hasP1 && !hasP2) {
            newWinnerId = match.player1_id;
            match.is_bye = true;
            match.status = 'completed';
        } else if (!hasP1 && hasP2) {
            newWinnerId = match.player2_id;
            match.is_bye = true;
            match.status = 'completed';
        } else {
            match.is_bye = false;
            if (newWinnerId && newWinnerId !== match.player1_id && newWinnerId !== match.player2_id) {
                newWinnerId = undefined;
                match.status = 'scheduled';
            }
        }

        fixtures[idx] = { ...match, winner_id: newWinnerId };

        const currentFormat = formatByCategory[categoryId] || 'Knockout';
        if (currentFormat === 'Knockout') {
            const currentRound = match.round_number;
            const nextRoundFixtures = fixtures.filter(f => f.round_number === currentRound + 1);
            if (nextRoundFixtures.length > 0) {
                const currentRoundMatches = fixtures.filter(f => f.round_number === currentRound);
                const matchIdx = currentRoundMatches.findIndex(f => f.id === match.id);
                const nextMatchIdx = Math.floor(matchIdx / 2);
                if (nextMatchIdx < nextRoundFixtures.length) {
                    const nextFixture = nextRoundFixtures[nextMatchIdx];
                    const nIdx = fixtures.findIndex(f => f.id === nextFixture.id);
                    const winnerPlayer = newWinnerId
                        ? (newWinnerId === fixtures[idx].player1_id ? fixtures[idx].player1 : fixtures[idx].player2)
                        : undefined;
                    if (matchIdx % 2 === 0) {
                        fixtures[nIdx] = { ...fixtures[nIdx], player1_id: newWinnerId || undefined, player1: winnerPlayer || undefined };
                    } else {
                        fixtures[nIdx] = { ...fixtures[nIdx], player2_id: newWinnerId || undefined, player2: winnerPlayer || undefined };
                    }
                }
            }
        }

        setFixturesForCategory(categoryId, fixtures);
        toast.success('Player updated');
    }, [fixturesByCategory, playersByCategory, selectedTournament, setFixturesForCategory, formatByCategory]);

    const handleUpdatePaymentStatus = useCallback(async (playerId: string, newStatus: PaymentStatus) => {
        const result = await updatePlayer(playerId, { payment_status: newStatus });
        if (result.success) {
            const label = newStatus === 'paid_upi' ? 'Paid (UPI)' : newStatus === 'paid_cash' ? 'Paid (Cash)' : newStatus === 'waived' ? 'Waived' : 'Pending';
            toast.success(`Payment status updated to ${label}`);
        } else {
            toast.error('Failed to update payment status');
        }
    }, [updatePlayer]);

    const handleFinalize = (categoryId: string) => {
        setFinalizedForCategory(categoryId, true);
        toast.success('Draw finalized — bracket is now locked');
    };

    const handleEditDraw = (categoryId: string) => {
        setFinalizedForCategory(categoryId, false);
        toast.success('Draw unlocked for editing');
    };

    const handleReset = (categoryId: string) => {
        clearFixturesForCategory(categoryId);
        setResetConfirm(null);
        toast.success('Bracket reset');
    };

    const handleFormatChange = (categoryId: string, newFormat: 'Knockout' | 'League') => {
        if (fixturesByCategory[categoryId]) {
            toast.error('Reset the current draw first before changing format');
            return;
        }
        setFormatForCategory(categoryId, newFormat);
    };

    const handleDownloadPDF = async (categoryId: string) => {
        const cat = categories.find(c => c.id === categoryId);
        toast.success(`Generating PDF for ${cat?.name || 'category'}...`);
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            doc.setFontSize(18);
            doc.text(`${selectedTournament?.name || 'Tournament'}`, 15, 15);
            doc.setFontSize(14);
            doc.text(`${cat?.name || ''} — Fixture Sheet`, 15, 25);
            doc.setFontSize(8);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 32);

            const fixtures = fixturesByCategory[categoryId] || [];
            const rounds = groupByRound(fixtures);
            let y = 42;

            rounds.forEach((matches) => {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(matches[0]?.round_name || 'Round', 15, y);
                y += 7;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                matches.forEach(m => {
                    const p1 = m.player1?.full_name || 'BYE';
                    const p2 = m.player2?.full_name || 'BYE';
                    const score = m.status === 'completed' ? `${m.player1_score ?? '-'} : ${m.player2_score ?? '-'}` : 'vs';
                    doc.text(`Match ${m.match_number}: ${p1}  ${score}  ${p2}`, 20, y);
                    y += 5;
                    if (y > 190) { doc.addPage(); y = 15; }
                });
                y += 4;
            });

            doc.save(`fixture-${cat?.age_group || 'bracket'}.pdf`);
            toast.success('PDF downloaded');
        } catch {
            toast.error('Failed to generate PDF');
        }
    };

    const handleSetCustomPlayer = (categoryId: string, fixtureId: string, slot: 'player1' | 'player2') => {
        const name = window.prompt('Enter manual player name (or leave blank to clear):');
        if (name !== null) {
            handleChangePlayer(categoryId, fixtureId, slot, name.trim() || 'none');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Tournament Brackets</h1>
                    <p className="text-xs text-[#4B5563] font-medium">{selectedTournament?.name || 'Tournament'} — Match Management</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveFixturesTab(v)} className="space-y-6">
                <div className="flex flex-col gap-5">
                    {/* Category tabs */}
                    <div className="w-full">
                        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 justify-start w-full">
                            {categories.map(cat => {
                                const count = playersByCategory[cat.id]?.length || 0;
                                const hasFixtures = !!fixturesByCategory[cat.id];
                                const catFmt = formatByCategory[cat.id] || 'Knockout';
                                return (
                                    <TabsTrigger
                                        key={cat.id}
                                        value={cat.id}
                                        className="text-[11px] font-bold uppercase tracking-wider rounded-lg px-4 py-2 bg-[#E5E7EB] text-[#4B5563] data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white shadow-none transition-all whitespace-nowrap"
                                    >
                                        {cat.name} ({count})
                                        {hasFixtures && (
                                            <span className={`ml-1.5 w-1.5 h-1.5 rounded-full inline-block ${catFmt === 'League' ? 'bg-blue-400' : 'bg-yellow-300'} data-[state=active]:bg-white/70`} />
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {/* Format selector + action buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between w-full border-t border-gray-100 pt-5">
                        <div className="flex items-center gap-3 px-3 py-1.5 bg-white border border-gray-100 rounded-xl shadow-xs">
                            <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">Format:</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleFormatChange(activeTab, 'Knockout')}
                                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${format === 'Knockout' ? 'bg-[#2E7D32] text-white shadow-sm' : 'text-[#4B5563] hover:bg-gray-50'}`}
                                >
                                    Knockout
                                </button>
                                <button
                                    onClick={() => handleFormatChange(activeTab, 'League')}
                                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${format === 'League' ? 'bg-[#2E7D32] text-white shadow-sm' : 'text-[#4B5563] hover:bg-gray-50'}`}
                                >
                                    League
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap justify-end">
                            {/* Generate Draw */}
                            {!fixturesByCategory[activeTab] && (
                                <Button
                                    size="sm"
                                    className="gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-lg h-9 px-4 text-[11px] font-bold shadow-xs"
                                    onClick={() => handleGenerate(activeTab)}
                                >
                                    <Shuffle size={14} />
                                    Generate Draw
                                </Button>
                            )}

                            {/* Edit Draw (finalized) */}
                            {fixturesByCategory[activeTab] && finalizedByCategory[activeTab] && (
                                <Button
                                    size="sm"
                                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 px-4 text-[11px] font-bold shadow-xs"
                                    onClick={() => handleEditDraw(activeTab)}
                                >
                                    <Edit size={14} />
                                    Edit Draw
                                </Button>
                            )}

                            {/* Finalize Draw */}
                            {fixturesByCategory[activeTab] && !finalizedByCategory[activeTab] && (
                                <Button
                                    size="sm"
                                    className="gap-2 bg-[#2171F3] hover:bg-[#1964E0] text-white rounded-lg h-9 px-4 text-[11px] font-bold shadow-xs"
                                    onClick={() => handleFinalize(activeTab)}
                                >
                                    <Lock size={14} />
                                    Finalize Draw
                                </Button>
                            )}

                            {/* Reset */}
                            {fixturesByCategory[activeTab] && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 bg-white border-[#FDE8E8] hover:bg-[#FDF2F2] text-[#F05252] rounded-lg h-9 px-4 text-[11px] font-bold shadow-xs"
                                    onClick={() => setResetConfirm(activeTab)}
                                >
                                    <RotateCcw size={14} />
                                    Reset
                                </Button>
                            )}

                            {/* PDF */}
                            {fixturesByCategory[activeTab] && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 bg-white border-gray-200 hover:bg-gray-50 text-[#111827] rounded-lg h-9 px-4 text-[11px] font-bold shadow-xs"
                                    onClick={() => handleDownloadPDF(activeTab)}
                                >
                                    <FileDown size={14} />
                                    PDF
                                </Button>
                            )}

                            {/* Manual Mode */}
                            {fixturesByCategory[activeTab] && (
                                <Button
                                    variant={manualModeByCategory[activeTab] ? 'default' : 'outline'}
                                    size="sm"
                                    className={`gap-2 rounded-lg h-9 px-4 text-[11px] font-bold shadow-xs ${manualModeByCategory[activeTab] ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-white border-amber-200 text-amber-600 hover:bg-amber-50'}`}
                                    onClick={() => setManualModeForCategory(activeTab, !manualModeByCategory[activeTab])}
                                >
                                    {manualModeByCategory[activeTab] ? <Unlock size={14} /> : <Lock size={14} />}
                                    Manual
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {categories.map(cat => {
                    const catBracket = fixturesByCategory[cat.id];
                    const catPlayers = getOrderedPlayers(cat.id);
                    const isFinalized = finalizedByCategory[cat.id];
                    const isManual = manualModeByCategory[cat.id] || false;
                    const catFormat = formatByCategory[cat.id] || 'Knockout';
                    const rounds = catBracket ? groupByRound(catBracket) : new Map();
                    const allCatPlayers = playersByCategory[cat.id] || [];

                    return (
                        <TabsContent key={cat.id} value={cat.id} className="mt-0">
                            <Card className="border-gray-100 shadow-xs rounded-xl bg-white overflow-hidden">
                                <CardHeader className="pb-4 py-5 border-b border-gray-50">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex gap-2 items-center flex-wrap">
                                            <div className="flex flex-col">
                                                <h2 className="text-sm font-bold text-[#111827]">
                                                    {cat.name} {catFormat === 'League' ? 'League' : 'Bracket'}
                                                </h2>
                                                <p className="text-[11px] text-[#4B5563] font-medium">{catPlayers.length} Registered Players</p>
                                            </div>
                                            {isFinalized && (
                                                <Badge className="bg-[#2E7D32] hover:bg-[#2E7D32] text-white border-0 py-0.5 px-2 text-[9px] uppercase font-black rounded-lg">
                                                    Finalized
                                                </Badge>
                                            )}
                                            {catFormat === 'League' && (
                                                <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700 border-0 py-0.5 px-2 text-[9px] uppercase font-black rounded-lg">
                                                    League
                                                </Badge>
                                            )}
                                            {catBracket && (
                                                <span className="text-[10px] text-[#4B5563] font-medium">
                                                    {catBracket.filter(f => f.status === 'completed' && !f.is_bye).length} / {catBracket.filter(f => !f.is_bye).length} matches done
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-6">
                                    {!catBracket ? (
                                        /* ── No bracket yet: show player seeding list ── */
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-sm font-bold text-[#111827] mb-1">
                                                    Player {catFormat === 'League' ? 'List' : 'Seeding Order'}
                                                </h3>
                                                <p className="text-[11px] text-[#4B5563]">
                                                    {catFormat === 'Knockout'
                                                        ? 'Drag to reorder players, then click Generate Draw'
                                                        : 'Click Generate Draw to create a round-robin schedule'}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                {catPlayers.map((p, i) => (
                                                    <div
                                                        key={p.id}
                                                        draggable={catFormat === 'Knockout'}
                                                        onDragStart={() => handleDragStart(i)}
                                                        onDragEnter={() => handleDragEnter(i)}
                                                        onDragEnd={() => handleDragEnd(cat.id)}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg group hover:border-[#2171F3] transition-colors cursor-grab active:cursor-grabbing select-none"
                                                    >
                                                        {catFormat === 'Knockout' && (
                                                            <GripVertical size={14} className="text-gray-300 group-hover:text-[#2171F3]" />
                                                        )}
                                                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}.</span>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-xs font-bold text-[#111827] truncate block">{p.full_name}</span>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <PaymentStatusBadge status={p.payment_status} />
                                                                {p.academy_name && (
                                                                    <span className="text-[9px] text-gray-400 truncate">{p.academy_name}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {catPlayers.length === 0 && (
                                                    <div className="col-span-full py-12 text-center">
                                                        <p className="text-sm font-medium text-gray-400">No players registered in this category yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : catFormat === 'League' ? (
                                        /* ── League Format ── */
                                        <div className="space-y-6">
                                            {/* League Standings */}
                                            {(() => {
                                                const standings = calculateLeagueStandings(catBracket, catPlayers);
                                                return (
                                                    <div className="space-y-3">
                                                        <h3 className="text-sm font-bold text-[#111827]">League Standings</h3>
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                                                                    <TableHead className="w-12 text-center font-bold text-[#111827] py-3 text-xs uppercase">#</TableHead>
                                                                    <TableHead className="font-bold text-[#111827] py-3 text-xs uppercase">Player</TableHead>
                                                                    <TableHead className="font-bold text-[#111827] py-3 text-xs uppercase">Payment</TableHead>
                                                                    <TableHead className="hidden sm:table-cell font-bold text-[#111827] py-3 text-xs uppercase">Academy</TableHead>
                                                                    <TableHead className="text-center w-12 font-bold text-[#111827] py-3 text-xs uppercase">P</TableHead>
                                                                    <TableHead className="text-center w-12 font-bold text-[#111827] py-3 text-xs uppercase">W</TableHead>
                                                                    <TableHead className="text-center w-12 font-bold text-[#111827] py-3 text-xs uppercase">L</TableHead>
                                                                    <TableHead className="text-center w-16 font-bold text-[#111827] py-3 text-xs uppercase">Pts</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {standings.map((s, i) => {
                                                                    const player = allCatPlayers.find(p => p.id === s.playerId);
                                                                    return (
                                                                        <TableRow key={s.playerId} className="border-gray-50 hover:bg-gray-50/30">
                                                                            <TableCell className="text-center py-2">
                                                                                <span className="text-xs font-bold text-[#4B5563]">{i + 1}</span>
                                                                            </TableCell>
                                                                            <TableCell className="py-2 text-sm font-bold text-[#111827]">{s.playerName}</TableCell>
                                                                            <TableCell className="py-2">
                                                                                <PaymentStatusSelect
                                                                                    playerId={player?.id}
                                                                                    status={player?.payment_status}
                                                                                    onUpdate={handleUpdatePaymentStatus}
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="hidden sm:table-cell py-2 text-xs text-[#4B5563]">{s.academyName || '—'}</TableCell>
                                                                            <TableCell className="text-center py-2 text-xs font-bold text-[#4B5563]">{s.played}</TableCell>
                                                                            <TableCell className="text-center py-2 text-xs font-bold text-[#2E7D32]">{s.won}</TableCell>
                                                                            <TableCell className="text-center py-2 text-xs font-bold text-red-500">{s.lost}</TableCell>
                                                                            <TableCell className="text-center py-2">
                                                                                <span className="text-sm font-black text-[#111827]">{s.points}</span>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                );
                                            })()}

                                            {/* League Matches */}
                                            <div className="space-y-3">
                                                <h3 className="text-sm font-bold text-[#111827]">
                                                    All Matches ({catBracket.length})
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {catBracket.map((match: Fixture) => (
                                                        <MatchCard
                                                            key={match.id}
                                                            match={match}
                                                            categoryId={cat.id}
                                                            isManual={isManual}
                                                            isFinalized={isFinalized}
                                                            allCatPlayers={allCatPlayers}
                                                            onSetScore={handleSetScore}
                                                            onSetWinner={handleSetWinner}
                                                            onChangePlayer={(fixtureId, slot, val) => handleChangePlayer(cat.id, fixtureId, slot, val)}
                                                            onCustomPlayer={(fixtureId, slot) => handleSetCustomPlayer(cat.id, fixtureId, slot)}
                                                            onUpdatePayment={handleUpdatePaymentStatus}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Knockout Format ── */
                                        <div className="overflow-x-auto pb-4">
                                            <div className="flex gap-10 min-w-max px-2">
                                                {Array.from(rounds.entries()).map(([roundNum, matches]) => (
                                                    <div key={roundNum} className="flex flex-col gap-6 min-w-[240px]">
                                                        <div className="text-[11px] font-black text-[#888] uppercase tracking-[0.15em] text-center pb-3 border-b border-gray-100 mb-2">
                                                            {matches[0]?.round_name}
                                                        </div>
                                                        <div className="flex flex-col justify-around flex-1 gap-6">
                                                            {matches.map((match: Fixture) => (
                                                                <MatchCard
                                                                    key={match.id}
                                                                    match={match}
                                                                    categoryId={cat.id}
                                                                    isManual={isManual}
                                                                    isFinalized={isFinalized}
                                                                    isKnockout
                                                                    allCatPlayers={allCatPlayers}
                                                                    onSetScore={handleSetScore}
                                                                    onSetWinner={handleSetWinner}
                                                                    onChangePlayer={(fixtureId, slot, val) => handleChangePlayer(cat.id, fixtureId, slot, val)}
                                                                    onCustomPlayer={(fixtureId, slot) => handleSetCustomPlayer(cat.id, fixtureId, slot)}
                                                                    onUpdatePayment={handleUpdatePaymentStatus}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                })}
            </Tabs>

            {/* Fixtures History */}
            {(() => {
                const allCompletedMatches: (Fixture & { categoryName: string })[] = [];
                Object.entries(fixturesByCategory).forEach(([catId, fixtures]) => {
                    const cat = categories.find(c => c.id === catId);
                    fixtures.forEach(f => {
                        if (f.status === 'completed' && !f.is_bye) {
                            allCompletedMatches.push({ ...f, categoryName: cat?.name || 'Unknown' });
                        }
                    });
                });

                if (allCompletedMatches.length === 0) return null;

                return (
                    <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white mt-6">
                        <CardHeader className="pb-4 py-5 border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#FFF6CC] flex items-center justify-center">
                                    <span className="text-sm">📋</span>
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-[#111827]">Fixtures History</h2>
                                    <p className="text-[11px] text-[#4B5563] font-medium">{allCompletedMatches.length} completed matches</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                                        <TableHead className="font-bold text-[#111827] py-3 text-xs uppercase tracking-wider pl-5">Player 1</TableHead>
                                        <TableHead className="font-bold text-[#111827] py-3 text-xs uppercase tracking-wider text-center w-12">Score</TableHead>
                                        <TableHead className="font-bold text-[#111827] py-3 text-xs uppercase tracking-wider">Player 2</TableHead>
                                        <TableHead className="hidden sm:table-cell font-bold text-[#111827] py-3 text-xs uppercase tracking-wider">Winner</TableHead>
                                        <TableHead className="hidden md:table-cell font-bold text-[#111827] py-3 text-xs uppercase tracking-wider">Round</TableHead>
                                        <TableHead className="hidden md:table-cell font-bold text-[#111827] py-3 text-xs uppercase tracking-wider">Category</TableHead>
                                        <TableHead className="hidden lg:table-cell font-bold text-[#111827] py-3 text-xs uppercase tracking-wider pr-5 text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allCompletedMatches.map((match) => {
                                        const winner = match.winner_id === match.player1_id ? match.player1 : match.player2;
                                        return (
                                            <TableRow key={match.id} className="border-gray-50 hover:bg-gray-50/30">
                                                <TableCell className="py-2.5 pl-5">
                                                    <span className={`text-[13px] font-bold ${match.winner_id === match.player1_id ? 'text-[#2E7D32]' : 'text-[#111827]'}`}>
                                                        {match.player1?.full_name || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-center">
                                                    <span className="text-xs font-black text-[#4B5563]">
                                                        {match.player1_score ?? '-'} : {match.player2_score ?? '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <span className={`text-[13px] font-bold ${match.winner_id === match.player2_id ? 'text-[#2E7D32]' : 'text-[#111827]'}`}>
                                                        {match.player2?.full_name || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell py-2.5">
                                                    <Badge className="bg-[#F0FDF4] text-[#2E7D32] border-0 text-[10px] font-bold hover:bg-[#F0FDF4]">
                                                        🏆 {winner?.full_name || '—'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell py-2.5">
                                                    <span className="text-xs font-medium text-[#4B5563]">{match.round_name}</span>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell py-2.5">
                                                    <Badge variant="outline" className="text-[10px] font-bold border-gray-200 text-[#4B5563]">
                                                        {match.categoryName}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell py-2.5 pr-5 text-right">
                                                    <span className="text-[11px] font-medium text-[#4B5563]">
                                                        {new Date(match.created_at).toLocaleDateString()}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            })()}

            {/* Reset confirmation dialog */}
            <Dialog open={!!resetConfirm} onOpenChange={() => setResetConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Bracket?</DialogTitle>
                        <DialogDescription>
                            This will delete all match data for this category. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => resetConfirm && handleReset(resetConfirm)}>Reset</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Reusable Match Card ───────────────────────────────────────────────────────
interface MatchCardProps {
    match: Fixture;
    categoryId: string;
    isManual: boolean;
    isFinalized: boolean;
    isKnockout?: boolean;
    allCatPlayers: Player[];
    onSetScore: (catId: string, fixtureId: string, field: 'player1_score' | 'player2_score', value: number) => void;
    onSetWinner: (catId: string, fixture: Fixture, winnerId: string) => void;
    onChangePlayer: (fixtureId: string, slot: 'player1' | 'player2', val: string) => void;
    onCustomPlayer: (fixtureId: string, slot: 'player1' | 'player2') => void;
    onUpdatePayment: (playerId: string, status: PaymentStatus) => void;
}

function MatchCard({
    match, categoryId, isManual, isFinalized, isKnockout = false,
    allCatPlayers, onSetScore, onSetWinner, onChangePlayer, onCustomPlayer, onUpdatePayment,
}: MatchCardProps) {
    const showScoreInput = (playerId?: string) =>
        isManual || (playerId && match.status !== 'completed' && !match.is_bye &&
            (isKnockout ? !isFinalized : true));

    const renderPlayerSlot = (slot: 'player1' | 'player2') => {
        const player = slot === 'player1' ? match.player1 : match.player2;
        const playerId = slot === 'player1' ? match.player1_id : match.player2_id;
        const score = slot === 'player1' ? match.player1_score : match.player2_score;
        const scoreField = slot === 'player1' ? 'player1_score' as const : 'player2_score' as const;
        const isWinner = match.winner_id && match.winner_id === playerId;
        const isBye = match.is_bye && !playerId;

        return (
            <div className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${isWinner ? 'bg-[#2E7D32]/10 border border-[#2E7D32]/20' : 'bg-gray-50/50'}`}>
                {isKnockout && (
                    <div className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-[#111827] shadow-xs shrink-0">
                        {slot === 'player1' ? '1' : '2'}
                    </div>
                )}

                {isManual ? (
                    <div className="flex-1 min-w-0">
                        <select
                            className="w-full bg-white border border-gray-200 rounded text-xs px-1 py-1 font-bold truncate"
                            value={playerId || (player?.full_name || 'none')}
                            onChange={(e) => {
                                if (e.target.value === 'custom') onCustomPlayer(match.id, slot);
                                else onChangePlayer(match.id, slot, e.target.value);
                            }}
                        >
                            <option value="none">— Empty / BYE —</option>
                            <option value="custom">+ Manual Name...</option>
                            <optgroup label="Registered Players">
                                {allCatPlayers.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                ))}
                            </optgroup>
                            {player && playerId && !allCatPlayers.some(p => p.id === playerId) && (
                                <option value={playerId}>{player.full_name} (Custom)</option>
                            )}
                        </select>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0 flex items-center flex-wrap gap-1">
                        <PaymentStatusSelect
                            playerId={playerId}
                            status={player?.payment_status}
                            onUpdate={onUpdatePayment}
                        />
                        <span className={`text-[13px] font-bold truncate ${isWinner ? 'text-[#1B5E20]' : 'text-[#111827]'}`}>
                            {player?.full_name || (isBye ? 'BYE' : '—')}
                        </span>
                    </div>
                )}

                {showScoreInput(playerId) && (
                    <Input
                        type="number"
                        className="w-10 h-8 text-center text-[12px] font-black p-0 border-gray-200 rounded-lg bg-white"
                        value={score ?? ''}
                        onChange={(e) => onSetScore(categoryId, match.id, scoreField, parseInt(e.target.value) || 0)}
                    />
                )}

                {isWinner && (
                    <Check size={14} className="text-[#2E7D32] shrink-0" strokeWidth={3} />
                )}
            </div>
        );
    };

    const canSetWinner = (isManual || match.status !== 'completed') &&
        (match.player1 || match.player1_id || match.player2 || match.player2_id);

    return (
        <div className={`relative border rounded-2xl p-4 transition-all shadow-xs ${match.status === 'completed' ? 'border-[#F0FDF4] bg-[#F0FDF4]/30' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-[#999] uppercase tracking-tighter">Match #{match.match_number}</span>
                {match.status === 'completed' && (
                    <Badge className="bg-[#2E7D32] border-0 text-[8px] font-bold uppercase h-4 px-1">Done</Badge>
                )}
            </div>

            {renderPlayerSlot('player1')}

            <div className="h-3 flex items-center justify-center">
                <span className="text-[9px] font-bold text-gray-300">VS</span>
            </div>

            {renderPlayerSlot('player2')}

            {canSetWinner && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                    {(match.player1 || match.player1_id) && (
                        <Button
                            size="sm"
                            className={`flex-1 border text-[10px] font-bold h-8 rounded-xl ${match.winner_id === match.player1_id ? 'bg-[#2E7D32] text-white border-[#2E7D32]' : 'bg-white border-gray-200 text-[#111827] hover:bg-gray-50'}`}
                            onClick={() => onSetWinner(categoryId, match, match.player1_id || match.player1?.full_name || '')}
                        >
                            {isKnockout ? `Promote ${match.player1?.full_name || 'P1'}` : 'P1 Win'}
                        </Button>
                    )}
                    {(match.player2 || match.player2_id) && (
                        <Button
                            size="sm"
                            className={`flex-1 border text-[10px] font-bold h-8 rounded-xl ${match.winner_id === match.player2_id ? 'bg-[#2E7D32] text-white border-[#2E7D32]' : 'bg-white border-gray-200 text-[#111827] hover:bg-gray-50'}`}
                            onClick={() => onSetWinner(categoryId, match, match.player2_id || match.player2?.full_name || '')}
                        >
                            {isKnockout ? `Promote ${match.player2?.full_name || 'P2'}` : 'P2 Win'}
                        </Button>
                    )}
                    {isManual && match.status === 'completed' && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-9 px-0 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 h-8 rounded-xl"
                            onClick={() => onSetWinner(categoryId, match, 'reset')}
                            title="Reset Winner"
                        >
                            <Undo2 size={13} />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
