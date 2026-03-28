'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
    TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock,
    Plus, Download, Edit, Trash2, Wallet, Users,
} from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import type { Expense, ExpenseType, PaymentMode } from '@/types';

export default function ExpensesPage() {
    const { expenses, selectedTournament, addExpense, updateExpense, deleteExpense } = useApp();
    const [activeTab, setActiveTab] = useState('overview');
    const [addOpen, setAddOpen] = useState(false);
    const [addType, setAddType] = useState<ExpenseType>('expense');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [customCategory, setCustomCategory] = useState('');
    const [formData, setFormData] = useState({
        category: '', description: '', amount: '', payment_mode: 'upi' as PaymentMode,
        status: 'pending', responsible_person: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
    });

    const summary = useMemo(() => {
        const income = expenses.filter(e => e.type === 'income');
        const exp = expenses.filter(e => e.type === 'expense');
        const totalIncome = income.reduce((s, e) => s + Number(e.amount), 0);
        const totalExpenses = exp.reduce((s, e) => s + Number(e.amount), 0);
        const pendingReceivables = income.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount), 0);
        const pendingPayables = exp.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount), 0);
        return { totalIncome, totalExpenses, netPL: totalIncome - totalExpenses, pendingReceivables, pendingPayables };
    }, [expenses]);

    const handleAdd = () => {
        if (!formData.category || !formData.amount) {
            toast.error('Category and amount are required');
            return;
        }
        const finalCategory = formData.category === 'Other' && customCategory ? customCategory : formData.category;
        addExpense({
            tournament_id: selectedTournament?.id,
            type: addType,
            category: finalCategory,
            description: formData.description,
            amount: parseFloat(formData.amount),
            payment_mode: formData.payment_mode,
            status: formData.status,
            responsible_person: formData.responsible_person,
            transaction_date: formData.transaction_date,
            notes: formData.notes,
        });
        toast.success(`${addType === 'income' ? 'Income' : 'Expense'} added`);
        setAddOpen(false);
        resetForm();
    };

    const handleEdit = (expense: Expense) => {
        setEditingId(expense.id);
        setAddType(expense.type);
        setFormData({
            category: expense.category,
            description: expense.description || '',
            amount: String(expense.amount),
            payment_mode: (expense.payment_mode as PaymentMode) || 'upi',
            status: expense.status,
            responsible_person: expense.responsible_person || '',
            transaction_date: expense.transaction_date,
            notes: expense.notes || '',
        });
        setAddOpen(true);
    };

    const handleUpdate = () => {
        if (!editingId) return;
        const finalCategory = formData.category === 'Other' && customCategory ? customCategory : formData.category;
        updateExpense(editingId, {
            category: finalCategory,
            description: formData.description,
            amount: parseFloat(formData.amount),
            payment_mode: formData.payment_mode,
            status: formData.status,
            responsible_person: formData.responsible_person,
            transaction_date: formData.transaction_date,
            notes: formData.notes,
        });
        toast.success('Entry updated');
        setAddOpen(false);
        setEditingId(null);
        resetForm();
    };

    const handleDelete = (id: string) => {
        deleteExpense(id);
        setDeleteConfirm(null);
        toast.success('Entry deleted');
    };

    const resetForm = () => {
        setFormData({ category: '', description: '', amount: '', payment_mode: 'upi', status: 'pending', responsible_person: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
        setCustomCategory('');
        setEditingId(null);
    };

    const exportCSV = () => {
        const headers = ['Type', 'Category', 'Description', 'Amount', 'Mode', 'Status', 'Person', 'Date'];
        const rows = expenses.map(e => [e.type, e.category, e.description || '', e.amount, e.payment_mode || '', e.status, e.responsible_person || '', e.transaction_date]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `finances-T${selectedTournament?.tournament_number || ''}.csv`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('CSV exported');
    };

    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
    }, [expenses]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">Financials</h1>
                    <p className="text-xs text-[#4B5563] font-medium">{selectedTournament?.name || 'Tournament'} Budget Tracking</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 bg-white border-gray-200 rounded-xl h-9 px-3 text-xs font-bold shadow-xs transition-all hover:bg-gray-50" onClick={exportCSV}>
                        <Download size={14} /> Export
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => { setAddType('income'); setAddOpen(true); }}
                        className="gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl h-9 px-3 text-xs font-bold shadow-xs transition-all"
                    >
                        <Plus size={14} /> Income
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => { setAddType('expense'); setAddOpen(true); }}
                        className="gap-2 bg-red-600 hover:bg-red-700 rounded-xl h-9 px-3 text-xs font-bold shadow-xs transition-all"
                    >
                        <Plus size={14} /> Expense
                    </Button>
                    <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
                        <DialogContent className="max-w-md rounded-2xl border-gray-100 shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold text-[#111827]">{editingId ? 'Edit Entry' : `Add ${addType === 'income' ? 'Income' : 'Expense'}`}</DialogTitle>
                                <DialogDescription className="text-xs text-[#4B5563]">Record tournament related financial transactions</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Category *</Label>
                                        <Select value={formData.category} onValueChange={(v) => v && setFormData(p => ({ ...p, category: v }))}>
                                            <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                                {(addType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formData.category === 'Other' && (
                                            <Input
                                                placeholder="Enter custom category name..."
                                                className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white mt-2"
                                                value={customCategory}
                                                onChange={(e) => setCustomCategory(e.target.value)}
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Amount (₹) *</Label>
                                        <Input type="number" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Description</Label>
                                    <Input placeholder="What was this for?" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Payment Mode</Label>
                                        <Select value={formData.payment_mode} onValueChange={(v) => v && setFormData(p => ({ ...p, payment_mode: v as PaymentMode }))}>
                                            <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="upi">UPI</SelectItem>
                                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Status</Label>
                                        <Select value={formData.status} onValueChange={(v) => v && setFormData(p => ({ ...p, status: v }))}>
                                            <SelectTrigger className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                                <SelectItem value="paid">{addType === 'income' ? 'Received' : 'Paid'}</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Date</Label>
                                        <Input type="date" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={formData.transaction_date} onChange={(e) => setFormData(p => ({ ...p, transaction_date: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Responsible Person</Label>
                                        <Input placeholder="Name" className="rounded-xl border-gray-100 bg-gray-50/50 h-10 text-sm focus:bg-white" value={formData.responsible_person} onChange={(e) => setFormData(p => ({ ...p, responsible_person: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
                                <Button variant="outline" className="rounded-xl h-10 px-6 text-xs font-bold border-gray-200" onClick={() => { setAddOpen(false); resetForm(); }}>Cancel</Button>
                                <Button onClick={editingId ? handleUpdate : handleAdd} className={`rounded-xl h-10 px-8 text-xs font-bold shadow-xs ${addType === 'income' ? 'bg-[#2E7D32] hover:bg-[#1B5E20]' : 'bg-red-600 hover:bg-red-700'}`}>
                                    {editingId ? 'Update Entry' : `Save ${addType === 'income' ? 'Income' : 'Expense'}`}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-gray-100 shadow-xs rounded-xl bg-white overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Total Income</p>
                                <p className="text-xl font-bold text-[#2E7D32]">Rs {summary.totalIncome.toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                                <TrendingUp size={18} className="text-[#2E7D32]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gray-100 shadow-xs rounded-xl bg-white overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Total Expenses</p>
                                <p className="text-xl font-bold text-red-600">Rs {summary.totalExpenses.toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                                <TrendingDown size={18} className="text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gray-100 shadow-xs rounded-xl bg-white overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Net P&L Status</p>
                                <p className={`text-xl font-bold ${summary.netPL >= 0 ? 'text-[#2E7D32]' : 'text-red-600'}`}>
                                    {summary.netPL >= 0 ? '+' : ''}Rs {summary.netPL.toLocaleString()}
                                </p>
                            </div>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary.netPL >= 0 ? 'bg-[#F0FDF4]' : 'bg-red-50'}`}>
                                <Wallet size={18} className={summary.netPL >= 0 ? 'text-[#2E7D32]' : 'text-red-600'} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
                    <TabsTrigger value="overview" className="text-[11px] font-bold uppercase tracking-wider rounded-xl px-4 py-2 bg-white border border-gray-100 data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white shadow-xs transition-all">All Entries</TabsTrigger>
                    <TabsTrigger value="income" className="text-[11px] font-bold uppercase tracking-wider rounded-xl px-4 py-2 bg-white border border-gray-100 data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white shadow-xs transition-all">Income</TabsTrigger>
                    <TabsTrigger value="expenses" className="text-[11px] font-bold uppercase tracking-wider rounded-xl px-4 py-2 bg-white border border-gray-100 data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white shadow-xs transition-all">Expenses</TabsTrigger>
                    <TabsTrigger value="volunteers" className="text-[11px] font-bold uppercase tracking-wider rounded-xl px-4 py-2 bg-white border border-gray-100 data-[state=active]:bg-[#2E7D32] data-[state=active]:text-white shadow-xs transition-all">Attendance</TabsTrigger>
                </TabsList>

                {['overview', 'income', 'expenses'].map(tab => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                        <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden bg-white">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 border-gray-100">
                                            <TableHead className="font-bold text-[#111827] py-3.5 pl-5 text-xs uppercase tracking-wider">Detail</TableHead>
                                            <TableHead className="hidden sm:table-cell font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Description</TableHead>
                                            <TableHead className="font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Amount</TableHead>
                                            <TableHead className="font-bold text-[#111827] py-3.5 text-xs uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="hidden lg:table-cell font-bold text-[#111827] py-3.5 text-right pr-5 text-xs uppercase tracking-wider">Date</TableHead>
                                            <TableHead className="w-20"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedExpenses
                                            .filter(e => tab === 'overview' || e.type === (tab === 'expenses' ? 'expense' : 'income'))
                                            .map(entry => (
                                                <TableRow key={entry.id} className="border-gray-50 hover:bg-gray-50/30 transition-colors">
                                                    <TableCell className="py-3 pl-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-[#111827]">{entry.category}</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <Badge variant="outline" className={`text-[8px] font-extrabold uppercase px-1 py-0 leading-none h-3.5 border-0 ${entry.type === 'income' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                                    {entry.type}
                                                                </Badge>
                                                                <span className="text-[10px] font-bold text-[#4B5563] uppercase">{entry.payment_mode}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell py-3 text-[13px] font-medium text-[#4B5563]">{entry.description || '—'}</TableCell>
                                                    <TableCell className={`py-3 text-[14px] font-extrabold ${entry.type === 'income' ? 'text-[#2E7D32]' : 'text-red-600'}`}>
                                                        {entry.type === 'income' ? '+' : '-'}Rs {Number(entry.amount).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <Badge variant="secondary" className={`text-[9px] font-extrabold uppercase shadow-none border-0 px-2 ${entry.status === 'paid' ? 'bg-[#F0FDF4] text-[#2E7D32]' : 'bg-red-50 text-red-600'}`}>
                                                            {entry.status === 'paid' ? (entry.type === 'income' ? 'Received' : 'Paid') : 'Pending'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell py-3 text-right pr-5 text-[11px] font-bold text-[#111827]">
                                                        {format(new Date(entry.transaction_date), 'MMM d, yyyy')}
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4">
                                                        <div className="flex gap-1 justify-end">
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#4B5563] hover:bg-gray-100 rounded-lg" onClick={() => handleEdit(entry)}>
                                                                <Edit size={12} />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setDeleteConfirm(entry.id)}>
                                                                <Trash2 size={12} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}

                {/* Volunteers Tab */}
                <TabsContent value="volunteers" className="mt-0">
                    <Card className="border-gray-100 shadow-xs rounded-xl bg-white overflow-hidden">
                        <CardContent className="py-16 text-center text-[#4B5563]">
                            <Users size={40} className="mx-auto mb-3 text-gray-200" />
                            <p className="text-sm font-bold text-[#111827]">Attendance Tracker</p>
                            <p className="text-xs mt-1">Add volunteers, assign coordinators, and track attendance</p>
                            <Button variant="outline" size="sm" className="mt-6 gap-1.5 h-9 rounded-xl border-gray-200 text-xs font-bold transition-all hover:bg-gray-50 shadow-xs">
                                <Plus size={14} /> Add Volunteer
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Delete confirmation */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Entry?</DialogTitle>
                        <DialogDescription>This will permanently remove this financial entry.</DialogDescription>
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
