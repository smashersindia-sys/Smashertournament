'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trophy, Calendar, Plus, Link2, Edit, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TournamentsPage() {
    const { tournaments, updateTournament, addTournament, setSelectedTournament } = useApp();
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [sheetDialogId, setSheetDialogId] = useState<string | null>(null);
    const [newTournament, setNewTournament] = useState({
        name: '', tournament_number: 1, scheduled_date: '', championship_year: 2026,
    });
    const [editTournament, setEditTournament] = useState<{
        id: string; name: string; tournament_number: number; scheduled_date: string; championship_year: number;
    } | null>(null);
    const [sheetId, setSheetId] = useState('');
    const [sheetTab, setSheetTab] = useState('');

    const handleCreate = async () => {
        if (!newTournament.name || !newTournament.scheduled_date) {
            toast.error('Please fill all required fields');
            return;
        }
        const { success } = await addTournament({
            ...newTournament,
            status: 'upcoming',
            registration_open: true,
        });
        if (success) {
            toast.success('Tournament created');
            setCreateOpen(false);
            setNewTournament({ name: '', tournament_number: 1, scheduled_date: '', championship_year: 2026 });
        }
    };

    const handleOpenEdit = (t: typeof tournaments[0]) => {
        setEditTournament({
            id: t.id,
            name: t.name,
            tournament_number: t.tournament_number,
            scheduled_date: t.scheduled_date,
            championship_year: t.championship_year,
        });
        setEditOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editTournament) return;
        if (!editTournament.name || !editTournament.scheduled_date) {
            toast.error('Please fill all required fields');
            return;
        }
        const { success } = await updateTournament(editTournament.id, {
            name: editTournament.name,
            tournament_number: editTournament.tournament_number,
            scheduled_date: editTournament.scheduled_date,
            championship_year: editTournament.championship_year,
        });
        if (success) {
            toast.success('Tournament updated');
            setEditOpen(false);
            setEditTournament(null);
        }
    };

    const handleMarkCompleted = async (id: string) => {
        const { success } = await updateTournament(id, { status: 'completed' as const });
        if (success) toast.success('Tournament marked as completed');
    };

    const handleCloseTournament = async (id: string) => {
        const { success } = await updateTournament(id, { status: 'completed' as const, registration_open: false });
        if (success) toast.success('Tournament closed');
    };

    const handleLinkSheet = async () => {
        if (!sheetDialogId) return;
        const { success } = await updateTournament(sheetDialogId, { google_sheet_id: sheetId, google_sheet_tab: sheetTab });
        if (success) {
            toast.success('Google Sheet linked');
            setSheetDialogId(null);
            setSheetId('');
            setSheetTab('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-[#111827]">Tournament Management</h1>
                        <p className="text-xs text-[#4B5563] font-medium">Manage the 4-tournament championship series</p>
                    </div>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger
                            render={
                                <Button className="gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl h-9 px-4 text-xs font-bold shadow-xs transition-all" />
                            }
                        >
                            <Plus size={16} />
                            Create Tournament
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl border-gray-100 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-[#111827]">New Tournament</DialogTitle>
                                <DialogDescription className="text-[#4B5563]">Add a tournament to the {newTournament.championship_year} series</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-[#111827]">Tournament Name</Label>
                                    <Input placeholder="Smashers Oct 2026" className="rounded-xl border-gray-100 shadow-sm" value={newTournament.name} onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-[#111827]">Tournament #</Label>
                                        <Select value={String(newTournament.tournament_number)} onValueChange={(v) => v && setNewTournament(prev => ({ ...prev, tournament_number: Number(v) }))}>
                                            <SelectTrigger className="rounded-xl border-gray-100 shadow-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                                {[1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>Tournament {n}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-[#111827]">Season Year</Label>
                                        <Input type="number" className="rounded-xl border-gray-100 shadow-sm" value={newTournament.championship_year} onChange={(e) => setNewTournament(prev => ({ ...prev, championship_year: Number(e.target.value) }))} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-[#111827]">Start Date</Label>
                                    <Input type="date" className="rounded-xl border-gray-100 shadow-sm" value={newTournament.scheduled_date} onChange={(e) => setNewTournament(prev => ({ ...prev, scheduled_date: e.target.value }))} />
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" className="rounded-xl px-6" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} className="bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl px-6 font-bold shadow-sm">Initialize</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Tournament cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tournaments.map((t) => (
                        <Card key={t.id} className="border-gray-100 shadow-xs hover:shadow-md transition-all rounded-xl overflow-hidden bg-white group">
                            <CardHeader className="pb-4 pt-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center group-hover:scale-105 transition-transform">
                                            <Trophy size={18} className="text-[#2E7D32]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <CardTitle className="text-sm font-bold text-[#111827]">{t.name}</CardTitle>
                                            <span className="text-[10px] font-extrabold text-[#2E7D32] uppercase tracking-wider">Tournament {t.tournament_number || '—'}</span>
                                        </div>
                                    </div>
                                    <Badge className={`text-[9px] font-black uppercase rounded-lg border-0 px-2 py-0.5 shadow-none ${t.status === 'active' ? 'bg-[#2E7D32] text-white' :
                                        t.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-orange-50 text-orange-600'
                                        }`}>
                                        {t.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pb-5">
                                <div className="flex items-center justify-between py-1 border-b border-gray-50 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-[#4B5563]" />
                                        <span className="text-xs font-bold text-[#111827]">
                                            {format(new Date(t.scheduled_date), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-[#4B5563] uppercase">Registration</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black ${t.registration_open ? 'text-[#2E7D32]' : 'text-[#4B5563]'}`}>
                                                {t.registration_open ? 'OPEN' : 'CLOSED'}
                                            </span>
                                            <Switch
                                                checked={t.registration_open}
                                                onCheckedChange={async (checked) => {
                                                    const { success } = await updateTournament(t.id, { registration_open: checked });
                                                    if (success) toast.success(checked ? 'Registration opened' : 'Registration closed');
                                                }}
                                                className="data-[state=checked]:bg-[#2E7D32] scale-75"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Link2 size={12} className="text-[#4B5563]" />
                                            <span className="text-[11px] font-bold text-[#4B5563] uppercase">Google Sheet</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-6 py-0 px-2 rounded-lg text-[9px] font-black tracking-wider ${t.google_sheet_id ? 'text-[#2B7D32] bg-[#F0FDF4]' : 'text-[#1565C0] bg-blue-50'}`}
                                            onClick={() => setSheetDialogId(t.id)}
                                        >
                                            {t.google_sheet_id ? 'CONFIGURED' : 'UNLINKED'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 pt-1 flex-wrap">
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl h-9 text-[11px] font-bold bg-white border-gray-100 hover:bg-gray-50 flex items-center gap-2 shadow-xs transition-all"
                                        onClick={() => {
                                            setSelectedTournament(t);
                                            toast.success(`Switched to ${t.name}`);
                                        }}
                                    >
                                        <Eye size={14} /> View
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 rounded-xl h-9 text-[11px] font-bold bg-white border-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center gap-2 shadow-xs transition-all"
                                        onClick={() => handleOpenEdit(t)}
                                    >
                                        <Edit size={14} /> Edit
                                    </Button>
                                    {t.status === 'upcoming' && (
                                        <Button
                                            className="flex-1 rounded-xl h-9 text-[11px] font-bold bg-[#2E7D32] hover:bg-[#1B5E20] shadow-xs transition-all"
                                            onClick={async () => {
                                                const { success } = await updateTournament(t.id, { status: 'active' as const });
                                                if (success) toast.success('Tournament is now live');
                                            }}
                                        >
                                            Go Live
                                        </Button>
                                    )}
                                    {t.status === 'active' && (
                                        <>
                                            <Button
                                                className="flex-1 rounded-xl h-9 text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-xs transition-all flex items-center gap-1.5"
                                                onClick={() => handleMarkCompleted(t.id)}
                                            >
                                                <CheckCircle size={14} /> Mark as Completed
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1 rounded-xl h-9 text-[11px] font-bold border-red-100 text-red-600 hover:bg-red-50 shadow-xs transition-all flex items-center gap-1.5"
                                                onClick={() => handleCloseTournament(t.id)}
                                            >
                                                <XCircle size={14} /> Close
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Edit Tournament Dialog */}
                <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTournament(null); }}>
                    <DialogContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-[#111827]">Edit Tournament</DialogTitle>
                            <DialogDescription className="text-[#4B5563]">Update tournament details</DialogDescription>
                        </DialogHeader>
                        {editTournament && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-[#111827]">Tournament Name</Label>
                                    <Input className="rounded-xl border-gray-100 shadow-sm" value={editTournament.name} onChange={(e) => setEditTournament(prev => prev ? { ...prev, name: e.target.value } : prev)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-[#111827]">Tournament #</Label>
                                        <Select value={String(editTournament.tournament_number)} onValueChange={(v) => v && setEditTournament(prev => prev ? { ...prev, tournament_number: Number(v) } : prev)}>
                                            <SelectTrigger className="rounded-xl border-gray-100 shadow-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                                {[1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>Tournament {n}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-[#111827]">Season Year</Label>
                                        <Input type="number" className="rounded-xl border-gray-100 shadow-sm" value={editTournament.championship_year} onChange={(e) => setEditTournament(prev => prev ? { ...prev, championship_year: Number(e.target.value) } : prev)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-[#111827]">Start Date</Label>
                                    <Input type="date" className="rounded-xl border-gray-100 shadow-sm" value={editTournament.scheduled_date} onChange={(e) => setEditTournament(prev => prev ? { ...prev, scheduled_date: e.target.value } : prev)} />
                                </div>
                            </div>
                        )}
                        <DialogFooter className="gap-2">
                            <Button variant="outline" className="rounded-xl px-6" onClick={() => { setEditOpen(false); setEditTournament(null); }}>Cancel</Button>
                            <Button onClick={handleSaveEdit} className="bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl px-6 font-bold shadow-sm">Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Link Google Sheet Dialog */}
                <Dialog open={!!sheetDialogId} onOpenChange={() => setSheetDialogId(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Link Google Sheet</DialogTitle>
                            <DialogDescription>
                                Paste the Google Sheet ID and tab name to sync registrations
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Google Sheet ID</Label>
                                <Input
                                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                                    value={sheetId}
                                    onChange={(e) => setSheetId(e.target.value)}
                                />
                                <p className="text-xs text-[#757575]">
                                    Found in your Sheet URL: docs.google.com/spreadsheets/d/<strong>[THIS PART]</strong>/edit
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Tab Name</Label>
                                <Input
                                    placeholder="Form Responses 1"
                                    value={sheetTab}
                                    onChange={(e) => setSheetTab(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSheetDialogId(null)}>Cancel</Button>
                            <Button onClick={handleLinkSheet} className="bg-[#2E7D32] hover:bg-[#1B5E20]">Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
