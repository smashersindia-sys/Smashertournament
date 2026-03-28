'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, Download, X, ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Player, PaymentStatus, RegistrationPaymentMode } from '@/types';

const ROWS_PER_PAGE = 20;

export default function PlayersPage() {
    const { players, categories, selectedTournament, isLoading, addPlayer, updatePlayer, deletePlayer } = useApp();

    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterGender, setFilterGender] = useState('all');
    const [filterPayment, setFilterPayment] = useState('all');
    const [page, setPage] = useState(1);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [newPlayer, setNewPlayer] = useState({
        full_name: '', gender: 'Boy', date_of_birth: '', academy_name: '',
        contact_number: '', city: '', parent_name: '', parent_phone: '', category_id: '', notes: '',
        payment_mode_registration: '' as string,
    });

    const [editForm, setEditForm] = useState({
        full_name: '', gender: '', date_of_birth: '', academy_name: '',
        contact_number: '', category_id: '',
        payment_mode_registration: '' as string,
    });

    // Filter and search
    const filtered = useMemo(() => {
        return players.filter(p => {
            if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) &&
                !(p.academy_name || '').toLowerCase().includes(search.toLowerCase())) return false;
            if (filterCategory !== 'all' && p.category_id !== filterCategory) return false;
            if (filterGender !== 'all' && p.gender !== filterGender) return false;
            if (filterPayment !== 'all' && p.payment_status !== filterPayment) return false;
            return true;
        });
    }, [players, search, filterCategory, filterGender, filterPayment]);

    const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
    const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

    const handleAddPlayer = async () => {
        if (!newPlayer.full_name || !newPlayer.category_id) {
            toast.error('Name and category are required');
            return;
        }
        const { success } = await addPlayer({
            ...newPlayer,
            tournament_id: selectedTournament?.id || '',
            payment_status: 'pending' as PaymentStatus,
            payment_mode_registration: newPlayer.payment_mode_registration as RegistrationPaymentMode || undefined,
            registration_source: 'manual',
            category: categories.find(c => c.id === newPlayer.category_id),
        } as Omit<Player, 'id' | 'registered_at'>);
        
        if (success) {
            toast.success('Player added');
            setAddOpen(false);
            setNewPlayer({ full_name: '', gender: 'Boy', date_of_birth: '', academy_name: '', contact_number: '', city: '', parent_name: '', parent_phone: '', category_id: '', notes: '', payment_mode_registration: '' });
        }
    };

    const handleOpenEdit = (player: Player) => {
        setEditForm({
            full_name: player.full_name,
            gender: player.gender,
            date_of_birth: player.date_of_birth || '',
            academy_name: player.academy_name || '',
            contact_number: player.contact_number || '',
            category_id: player.category_id,
            payment_mode_registration: player.payment_mode_registration || '',
        });
        setEditOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedPlayer) return;
        if (!editForm.full_name) {
            toast.error('Name is required');
            return;
        }
        const updates: Partial<Player> = {
            full_name: editForm.full_name,
            gender: editForm.gender,
            date_of_birth: editForm.date_of_birth || undefined,
            academy_name: editForm.academy_name || undefined,
            contact_number: editForm.contact_number || undefined,
            category_id: editForm.category_id,
            payment_mode_registration: editForm.payment_mode_registration as RegistrationPaymentMode || undefined,
            category: categories.find(c => c.id === editForm.category_id),
        };
        const { success } = await updatePlayer(selectedPlayer.id, updates);
        if (success) {
            // Update local selectedPlayer to reflect changes
            setSelectedPlayer({ ...selectedPlayer, ...updates });
            toast.success('Player updated');
            setEditOpen(false);
        }
    };

    const handleUpdatePayment = async (id: string, status: PaymentStatus) => {
        const { success } = await updatePlayer(id, { payment_status: status });
        if (success) {
            if (selectedPlayer?.id === id) setSelectedPlayer({ ...selectedPlayer, payment_status: status });
            toast.success('Payment status updated');
        }
    };

    const handleDelete = async (id: string) => {
        const { success } = await deletePlayer(id);
        if (success) {
            setDeleteConfirm(null);
            setSelectedPlayer(null);
            toast.success('Player deleted');
        }
    };

    const exportCSV = () => {
        const headers = ['Name', 'Contact Number', 'Category', 'Gender', 'DOB', 'Academy/Coach', 'City', 'Parent', 'Phone', 'Payment Mode', 'Payment Status', 'Source', 'Registered'];
        const rows = filtered.map(p => [
            p.full_name, p.contact_number || '', p.category?.name || '', p.gender,
            p.date_of_birth || '', p.academy_name || '',
            p.city || '', p.parent_name || '', p.parent_phone || '',
            p.payment_mode_registration || '', p.payment_status, p.registration_source,
            format(new Date(p.registered_at), 'yyyy-MM-dd'),
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `players-${selectedTournament?.tournament_number || ''}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('CSV exported');
    };

    if (isLoading) {
        return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Players</h1>
                    <p className="text-xs text-[#4B5563] font-medium">{players.length} players registered for this tournament</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 bg-white border-gray-200 rounded-xl h-9 px-3 text-xs font-bold shadow-xs transition-all hover:bg-gray-50" onClick={exportCSV}>
                        <Download size={14} />
                        Export CSV
                    </Button>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger
                            render={
                                <Button className="gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl h-9 px-3 text-xs font-bold shadow-xs transition-all" />
                            }
                        >
                            <UserPlus size={14} />
                            Add Player
                        </DialogTrigger>
                        <DialogContent className="max-w-lg rounded-2xl border-gray-100 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold text-[#111827]">Add New Player</DialogTitle>
                                <DialogDescription className="text-xs text-[#4B5563]">Registration for walk-in players</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-3 py-3">
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Player Name *</Label>
                                    <Input placeholder="Enter full name" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={newPlayer.full_name} onChange={(e) => setNewPlayer(p => ({ ...p, full_name: e.target.value }))} />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Contact Number (Parent / Guardian)</Label>
                                    <Input placeholder="Phone number" type="tel" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={newPlayer.contact_number} onChange={(e) => setNewPlayer(p => ({ ...p, contact_number: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Date of Birth</Label>
                                    <Input type="date" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={newPlayer.date_of_birth} onChange={(e) => setNewPlayer(p => ({ ...p, date_of_birth: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Gender</Label>
                                    <Select value={newPlayer.gender} onValueChange={(v) => v && setNewPlayer(p => ({ ...p, gender: v }))}>
                                        <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                            <SelectItem value="Boy">Boy</SelectItem>
                                            <SelectItem value="Girl">Girl</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Category *</Label>
                                    <Select value={newPlayer.category_id} onValueChange={(v) => v && setNewPlayer(p => ({ ...p, category_id: v }))}>
                                        <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue placeholder="Select competitive category..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Academy / Coach Name</Label>
                                    <Input placeholder="Academy or Coach Name" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={newPlayer.academy_name} onChange={(e) => setNewPlayer(p => ({ ...p, academy_name: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Mode of Payment</Label>
                                    <Select value={newPlayer.payment_mode_registration} onValueChange={(v) => v && setNewPlayer(p => ({ ...p, payment_mode_registration: v }))}>
                                        <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                            <SelectItem value="tap_and_pay">Tap & Pay</SelectItem>
                                            <SelectItem value="scan_and_pay">Scan & Pay</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
                                <Button variant="outline" className="rounded-xl h-10 px-6 text-xs font-bold border-gray-200" onClick={() => setAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddPlayer} className="bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl h-10 px-8 text-xs font-bold shadow-xs">Register Player</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search by name, academy or city..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="pl-10 h-11 bg-gray-50 border-transparent focus:bg-white focus:border-gray-200 rounded-xl transition-all shadow-inner text-sm"
                            />
                        </div>
                        <Select value={filterCategory} onValueChange={(v) => { if (v) { setFilterCategory(v); setPage(1); } }}>
                            <SelectTrigger className="w-[160px] h-11 rounded-xl border-gray-100 shadow-xs text-xs font-bold bg-white">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border-gray-100">
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterPayment} onValueChange={(v) => { if (v) { setFilterPayment(v); setPage(1); } }}>
                            <SelectTrigger className="w-[140px] h-11 rounded-xl border-gray-100 shadow-xs text-xs font-bold bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border-gray-100">
                                <SelectItem value="all">All Payments</SelectItem>
                                <SelectItem value="paid_upi">Paid (UPI)</SelectItem>
                                <SelectItem value="paid_cash">Paid (Cash)</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="waived">Waived</SelectItem>
                            </SelectContent>
                        </Select>
                        {(search || filterCategory !== 'all' || filterGender !== 'all' || filterPayment !== 'all') && (
                            <Button variant="ghost" className="h-11 px-3 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 text-xs font-bold" onClick={() => { setSearch(''); setFilterCategory('all'); setFilterGender('all'); setFilterPayment('all'); setPage(1); }}>
                                <X size={14} /> Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                                <TableHead className="font-bold text-[#111827] py-3.5 pl-5 text-xs uppercase tracking-wider">Player Detail</TableHead>
                                <TableHead className="hidden md:table-cell font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Category</TableHead>
                                <TableHead className="hidden sm:table-cell font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Academy / Coach</TableHead>
                                <TableHead className="font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Payment Status</TableHead>
                                <TableHead className="hidden lg:table-cell font-bold text-[#111827] py-3.5 text-right pr-5 text-xs uppercase tracking-wider">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paged.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-24 text-[#4B5563]">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={40} className="text-gray-200 mb-2" />
                                            <p className="text-md font-bold text-[#111827]">No players found</p>
                                            <p className="text-xs">Adjust filters or search for another term.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paged.map((player) => (
                                    <TableRow key={player.id} className="cursor-pointer hover:bg-gray-50/30 transition-colors border-gray-50" onClick={() => setSelectedPlayer(player)}>
                                        <TableCell className="py-3 pl-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[13px] font-extrabold text-[#2E7D32]">
                                                    {player.full_name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-bold text-[#111827]">{player.full_name}</span>
                                                    <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-tight">{player.gender}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell py-3">
                                            <Badge variant="outline" className="bg-white text-[#4B5563] border-gray-200 rounded-md text-[10px] font-bold px-2 py-0.5">
                                                {player.category?.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-[#111827] leading-tight">{player.academy_name || 'Individual'}</span>
                                                <span className="text-[11px] font-medium text-[#4B5563]">{player.city || ''}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge variant="secondary" className={`text-[9px] font-extrabold uppercase shadow-none border-0 px-2 ${player.payment_status.startsWith('paid') ? 'bg-[#F0FDF4] text-[#2E7D32]' :
                                                player.payment_status === 'pending' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
                                                }`}>
                                                {player.payment_status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell py-3 text-right pr-5">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-bold text-[#111827]">{format(new Date(player.registered_at), 'MMM d, yyyy')}</span>
                                                <span className="text-[10px] font-medium text-[#4B5563]">{format(new Date(player.registered_at), 'hh:mm a')}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/30">
                            <span className="text-[11px] font-medium text-[#4B5563]">
                                Showing <span className="text-[#111827] font-bold">{(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)}</span> of <span className="text-[#111827] font-bold">{filtered.length}</span> players
                            </span>
                            <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-gray-200 bg-white shadow-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                    <ChevronLeft size={14} />
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-gray-200 bg-white shadow-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Player Detail Modal */}
            <Dialog open={!!selectedPlayer && !editOpen} onOpenChange={() => setSelectedPlayer(null)}>
                <DialogContent className="max-w-lg">
                    {selectedPlayer && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#2E7D32]/10 flex items-center justify-center text-sm font-bold text-[#2E7D32]">
                                        {selectedPlayer.full_name.charAt(0)}
                                    </div>
                                    {selectedPlayer.full_name}
                                </DialogTitle>
                                <DialogDescription>{selectedPlayer.category?.name || 'Unknown category'}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-[#757575]">Gender</span><p className="font-medium">{selectedPlayer.gender}</p></div>
                                    <div><span className="text-[#757575]">DOB</span><p className="font-medium">{selectedPlayer.date_of_birth || '—'}</p></div>
                                    <div><span className="text-[#757575]">Contact Number</span><p className="font-medium">{selectedPlayer.contact_number || '—'}</p></div>
                                    <div><span className="text-[#757575]">Academy / Coach</span><p className="font-medium">{selectedPlayer.academy_name || '—'}</p></div>
                                    <div><span className="text-[#757575]">City</span><p className="font-medium">{selectedPlayer.city || '—'}</p></div>
                                    <div><span className="text-[#757575]">Parent</span><p className="font-medium">{selectedPlayer.parent_name || '—'}</p></div>
                                    <div><span className="text-[#757575]">Phone</span><p className="font-medium">{selectedPlayer.parent_phone || '—'}</p></div>
                                    <div><span className="text-[#757575]">Payment Mode</span><p className="font-medium">{selectedPlayer.payment_mode_registration ? selectedPlayer.payment_mode_registration.replace('_', ' ') : '—'}</p></div>
                                    <div><span className="text-[#757575]">Source</span><p className="font-medium">{selectedPlayer.registration_source}</p></div>
                                    <div><span className="text-[#757575]">Registered</span><p className="font-medium">{format(new Date(selectedPlayer.registered_at), 'MMM d, yyyy')}</p></div>
                                </div>

                                {/* Payment status selector */}
                                <div className="space-y-2 pt-2 border-t">
                                    <Label>Payment Status</Label>
                                    <Select
                                        value={selectedPlayer.payment_status}
                                        onValueChange={(v) => v && handleUpdatePayment(selectedPlayer.id, v as PaymentStatus)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="paid_upi">Paid (UPI)</SelectItem>
                                            <SelectItem value="paid_cash">Paid (Cash)</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="waived">Waived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedPlayer.payment_proof_url && (
                                    <div className="space-y-2 pt-2">
                                        <Label>Payment Proof</Label>
                                        <div className="border rounded-lg p-2 bg-gray-50">
                                            <img src={selectedPlayer.payment_proof_url} alt="Payment proof" className="rounded max-h-48 w-full object-contain" />
                                        </div>
                                    </div>
                                )}

                                {selectedPlayer.notes && (
                                    <div className="space-y-1 pt-2">
                                        <Label>Notes</Label>
                                        <p className="text-sm text-[#757575]">{selectedPlayer.notes}</p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="gap-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mr-auto"
                                    onClick={() => setDeleteConfirm(selectedPlayer.id)}
                                >
                                    <Trash2 size={14} className="mr-1" />
                                    Delete
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => handleOpenEdit(selectedPlayer)}
                                >
                                    <Edit size={14} />
                                    Edit Player
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedPlayer(null)}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Player Modal */}
            <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); }}>
                <DialogContent className="max-w-lg rounded-2xl border-gray-100 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827]">Edit Player</DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5563]">Update player details</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3 py-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Player Name *</Label>
                            <Input className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={editForm.full_name} onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Contact Number</Label>
                            <Input type="tel" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={editForm.contact_number} onChange={(e) => setEditForm(p => ({ ...p, contact_number: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Date of Birth</Label>
                            <Input type="date" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={editForm.date_of_birth} onChange={(e) => setEditForm(p => ({ ...p, date_of_birth: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Gender</Label>
                            <Select value={editForm.gender} onValueChange={(v) => v && setEditForm(p => ({ ...p, gender: v }))}>
                                <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                    <SelectItem value="Boy">Boy</SelectItem>
                                    <SelectItem value="Girl">Girl</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Category</Label>
                            <Select value={editForm.category_id} onValueChange={(v) => v && setEditForm(p => ({ ...p, category_id: v }))}>
                                <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Academy / Coach Name</Label>
                            <Input className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={editForm.academy_name} onChange={(e) => setEditForm(p => ({ ...p, academy_name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Mode of Payment</Label>
                            <Select value={editForm.payment_mode_registration} onValueChange={(v) => v && setEditForm(p => ({ ...p, payment_mode_registration: v }))}>
                                <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                    <SelectItem value="tap_and_pay">Tap & Pay</SelectItem>
                                    <SelectItem value="scan_and_pay">Scan & Pay</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
                        <Button variant="outline" className="rounded-xl h-10 px-6 text-xs font-bold border-gray-200" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} className="bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl h-10 px-8 text-xs font-bold shadow-xs">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Player?</DialogTitle>
                        <DialogDescription>This action cannot be undone. The player will be permanently removed.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
