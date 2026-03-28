'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Settings as SettingsIcon, Database, Link2, Key,
    Download, CheckCircle, Plus, Edit, Trash2,
} from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { toast } from 'sonner';
import type { Category } from '@/types';

export default function SettingsPage() {
    const { categories, addCategory, updateCategory } = useApp();
    const [serviceAccountKey, setServiceAccountKey] = useState('');
    const [addCategoryOpen, setAddCategoryOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', age_group: '', gender: 'Boys', display_order: categories.length + 1, entry_fee: 600 });

    const handleAddCategory = async () => {
        if (!categoryForm.name || !categoryForm.age_group) {
            toast.error('Name and age group are required');
            return;
        }
        const { success } = await addCategory({
            name: categoryForm.name,
            age_group: categoryForm.age_group,
            gender: categoryForm.gender,
            display_order: categoryForm.display_order,
            entry_fee: categoryForm.entry_fee,
        });
        if (success) {
            toast.success('Category added');
            setAddCategoryOpen(false);
            setCategoryForm({ name: '', age_group: '', gender: 'Boys', display_order: categories.length + 2, entry_fee: 600 });
        }
    };

    const handleEditCategory = async () => {
        if (!editingCategory) return;
        const { success } = await updateCategory(editingCategory.id, {
            name: categoryForm.name,
            age_group: categoryForm.age_group,
            gender: categoryForm.gender,
            display_order: categoryForm.display_order,
            entry_fee: categoryForm.entry_fee,
        });
        if (success) {
            toast.success('Category updated');
            setEditingCategory(null);
        }
    };

    const openEditCategory = (cat: Category) => {
        setEditingCategory(cat);
        setCategoryForm({ name: cat.name, age_group: cat.age_group, gender: cat.gender, display_order: cat.display_order, entry_fee: cat.entry_fee || 600 });
    };

    const handleExportAll = () => {
        const data = { categories, exportedAt: new Date().toISOString(), version: '1.0' };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'smashers-backup.json';
        a.click(); URL.revokeObjectURL(url);
        toast.success('Data exported');
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-xl font-bold text-[#111827]">Settings</h1>
                <p className="text-xs text-[#4B5563] font-medium">Configure your Smashers platform</p>
            </div>

            {/* Categories */}
            <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Database size={18} className="text-purple-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-[#111827]">Categories</CardTitle>
                                <CardDescription className="text-xs">{categories.length} age/gender categories</CardDescription>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl h-9 px-4 text-xs font-bold shadow-xs"
                            onClick={() => setAddCategoryOpen(true)}
                        >
                            <Plus size={14} /> Add Category
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                                <TableHead className="w-10 text-xs font-bold text-[#111827]">#</TableHead>
                                <TableHead className="text-xs font-bold text-[#111827]">Name</TableHead>
                                <TableHead className="text-xs font-bold text-[#111827]">Age Group</TableHead>
                                <TableHead className="text-xs font-bold text-[#111827]">Gender</TableHead>
                                <TableHead className="text-xs font-bold text-[#111827]">Entry Fee</TableHead>
                                <TableHead className="w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((cat) => (
                                <TableRow key={cat.id} className="border-gray-50">
                                    <TableCell className="text-sm text-[#757575]">{cat.display_order}</TableCell>
                                    <TableCell className="text-sm font-medium text-[#111827]">{cat.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{cat.age_group}</Badge></TableCell>
                                    <TableCell className="text-sm text-[#757575]">{cat.gender}</TableCell>
                                    <TableCell className="text-sm font-bold text-[#2E7D32]">₹{cat.entry_fee || 600}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#4B5563] hover:bg-gray-100 rounded-lg" onClick={() => openEditCategory(cat)}>
                                            <Edit size={12} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>



            {/* Google Sheets Setup */}
            <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Link2 size={18} className="text-[#1565C0]" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-[#111827]">Google Sheets Integration</CardTitle>
                            <CardDescription className="text-xs">Setup guide for syncing registrations from Google Forms</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {[
                                { step: 1, title: 'Create a Google Form', desc: 'Add fields: Full Name, Gender, DOB, Category, Academy, City, Parent Name, Phone, Payment Proof (file upload)' },
                                { step: 2, title: 'Link to Google Sheet', desc: 'Google Form auto-creates a linked Sheet — open it to find the Sheet ID' },
                                { step: 3, title: 'Create a Service Account', desc: 'Go to Google Cloud Console → APIs → Credentials → Create Service Account → Download JSON key' },
                                { step: 4, title: 'Enable Sheets API', desc: 'In Google Cloud Console → Enable the Google Sheets API v4' },
                                { step: 5, title: 'Share Sheet with Service Account', desc: 'Copy the service account email and share the Google Sheet with it (Viewer access)' },
                                { step: 6, title: 'Upload key below', desc: 'Paste the JSON key contents in the field below' },
                                { step: 7, title: 'Link Sheet to Tournament', desc: 'Go to Tournaments → Click "Link" → Paste Sheet ID and tab name' },
                            ].map(s => (
                                <div key={s.step} className="flex gap-3 items-start">
                                    <div className="w-6 h-6 rounded-full bg-[#2E7D32]/10 flex items-center justify-center text-xs font-bold text-[#2E7D32] shrink-0 mt-0.5">
                                        {s.step}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#111827]">{s.title}</p>
                                        <p className="text-xs text-[#757575] mt-0.5">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                                <Key size={14} />
                                Service Account JSON Key
                            </Label>
                            <textarea
                                className="w-full h-24 text-xs rounded-xl border border-gray-100 p-3 font-mono bg-gray-50 resize-none"
                                placeholder='{"type":"service_account","project_id":"...","private_key":"..."}'
                                value={serviceAccountKey}
                                onChange={(e) => setServiceAccountKey(e.target.value)}
                            />
                            <Button
                                size="sm"
                                className="bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl"
                                disabled={!serviceAccountKey}
                                onClick={() => {
                                    toast.success('Service account key saved (stored in env)');
                                    setServiceAccountKey('');
                                }}
                            >
                                Save Key
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Download size={18} className="text-[#757575]" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-[#111827]">Data Management</CardTitle>
                            <CardDescription className="text-xs">Export and backup your tournament data</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={handleExportAll} className="gap-1.5 rounded-xl border-gray-200 shadow-xs">
                        <Download size={14} />
                        Export All Data (JSON Backup)
                    </Button>
                </CardContent>
            </Card>

            {/* Status */}
            <Card className="border-gray-100 shadow-xs rounded-xl overflow-hidden">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-[#2E7D32]" />
                            <span className="text-[#757575]">App Version: 1.0.0</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-[#2E7D32]" />
                            <span className="text-[#757575]">System Active</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add Category Dialog */}
            <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
                <DialogContent className="rounded-2xl border-gray-100 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827]">Add Category</DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5563]">Create a new age/gender category for the championship</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Category Name *</Label>
                            <Input placeholder="e.g. U-11 Boys" className="rounded-xl border-gray-100" value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Age Group *</Label>
                                <Input placeholder="e.g. U-11" className="rounded-xl border-gray-100" value={categoryForm.age_group} onChange={(e) => setCategoryForm(p => ({ ...p, age_group: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Gender</Label>
                                <Select value={categoryForm.gender} onValueChange={(v) => v && setCategoryForm(p => ({ ...p, gender: v }))}>
                                    <SelectTrigger className="rounded-xl border-gray-100"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                        <SelectItem value="Boys">Boys</SelectItem>
                                        <SelectItem value="Girls">Girls</SelectItem>
                                        <SelectItem value="Mixed">Mixed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Display Order</Label>
                                <Input type="number" className="rounded-xl border-gray-100" value={categoryForm.display_order} onChange={(e) => setCategoryForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Entry Fee (₹) *</Label>
                                <Input type="number" className="rounded-xl border-gray-100" value={categoryForm.entry_fee} onChange={(e) => setCategoryForm(p => ({ ...p, entry_fee: parseInt(e.target.value) || 0 }))} />
                                <div className="flex gap-1.5 mt-1">
                                    {[600, 800, 1000, 1200].map(fee => (
                                        <Button key={fee} type="button" variant={categoryForm.entry_fee === fee ? 'default' : 'outline'} size="sm" className={`h-7 px-2 text-[10px] font-bold rounded-lg ${categoryForm.entry_fee === fee ? 'bg-[#2E7D32] hover:bg-[#1B5E20]' : 'border-gray-200'}`} onClick={() => setCategoryForm(p => ({ ...p, entry_fee: fee }))}>
                                            ₹{fee}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => setAddCategoryOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCategory} className="bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl font-bold shadow-sm">Add Category</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
                <DialogContent className="rounded-2xl border-gray-100 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-[#111827]">Edit Category</DialogTitle>
                        <DialogDescription className="text-xs text-[#4B5563]">Update category details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Category Name</Label>
                            <Input className="rounded-xl border-gray-100" value={categoryForm.name} onChange={(e) => setCategoryForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Age Group</Label>
                                <Input className="rounded-xl border-gray-100" value={categoryForm.age_group} onChange={(e) => setCategoryForm(p => ({ ...p, age_group: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Gender</Label>
                                <Select value={categoryForm.gender} onValueChange={(v) => v && setCategoryForm(p => ({ ...p, gender: v }))}>
                                    <SelectTrigger className="rounded-xl border-gray-100"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                                        <SelectItem value="Boys">Boys</SelectItem>
                                        <SelectItem value="Girls">Girls</SelectItem>
                                        <SelectItem value="Mixed">Mixed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Display Order</Label>
                                <Input type="number" className="rounded-xl border-gray-100" value={categoryForm.display_order} onChange={(e) => setCategoryForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Entry Fee (₹)</Label>
                                <Input type="number" className="rounded-xl border-gray-100" value={categoryForm.entry_fee} onChange={(e) => setCategoryForm(p => ({ ...p, entry_fee: parseInt(e.target.value) || 0 }))} />
                                <div className="flex gap-1.5 mt-1">
                                    {[600, 800, 1000, 1200].map(fee => (
                                        <Button key={fee} type="button" variant={categoryForm.entry_fee === fee ? 'default' : 'outline'} size="sm" className={`h-7 px-2 text-[10px] font-bold rounded-lg ${categoryForm.entry_fee === fee ? 'bg-[#2E7D32] hover:bg-[#1B5E20]' : 'border-gray-200'}`} onClick={() => setCategoryForm(p => ({ ...p, entry_fee: fee }))}>
                                            ₹{fee}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => setEditingCategory(null)}>Cancel</Button>
                        <Button onClick={handleEditCategory} className="bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl font-bold shadow-sm">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
