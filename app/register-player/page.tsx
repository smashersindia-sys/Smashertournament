'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Upload, Loader2, IndianRupee, QrCode } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Tournament, Category } from '@/types';

export default function RegisterPlayerPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [paymentFile, setPaymentFile] = useState<File | null>(null);

    const [form, setForm] = useState({
        full_name: '',
        contact_number: '',
        email: '',
        tournament_id: '',
        category_id: '',
        gender: 'Boy',
        academy_name: '',
    });

    useEffect(() => {
        const loadData = async () => {
            if (isSupabaseConfigured()) {
                const [{ data: cats }, { data: tourns }] = await Promise.all([
                    supabase.from('categories').select('*').order('display_order'),
                    supabase.from('tournaments').select('*').eq('registration_open', true).order('tournament_number'),
                ]);
                setCategories(cats || []);
                setTournaments(tourns || []);
            }
            setIsLoading(false);
        };
        loadData();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPaymentFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!form.full_name || !form.contact_number || !form.tournament_id || !form.category_id) {
            alert('Please fill in Name, Phone, Tournament, and Category.');
            return;
        }

        setIsSubmitting(true);

        try {
            let paymentProofUrl: string | null = null;

            // Upload payment proof if provided
            if (paymentFile && isSupabaseConfigured()) {
                const fileExt = paymentFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('payment-proofs')
                    .upload(fileName, paymentFile);

                if (uploadError) {
                    console.error('Upload failed:', uploadError);
                } else if (uploadData) {
                    const { data: urlData } = supabase.storage
                        .from('payment-proofs')
                        .getPublicUrl(uploadData.path);
                    paymentProofUrl = urlData.publicUrl;
                }
            }

            if (isSupabaseConfigured()) {
                const { error } = await supabase.from('players').insert({
                    id: crypto.randomUUID(),
                    tournament_id: form.tournament_id,
                    category_id: form.category_id,
                    full_name: form.full_name,
                    gender: form.gender,
                    contact_number: form.contact_number,
                    email: form.email || null,
                    academy_name: form.academy_name || null,
                    payment_proof_url: paymentProofUrl,
                    payment_status: 'pending',
                    registration_source: 'public_form',
                    status: 'pending_approval',
                    registered_at: new Date().toISOString(),
                });

                if (error) {
                    console.error('Registration failed:', error);
                    alert('Registration failed: ' + error.message);
                    setIsSubmitting(false);
                    return;
                }
            }

            setSubmitted(true);
        } catch (err) {
            console.error('Error:', err);
            alert('Something went wrong. Please try again.');
        }

        setIsSubmitting(false);
    };

    if (submitted) {
        return (
            <Card className="border-gray-100 shadow-lg rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-[#2E7D32]" />
                    </div>
                    <h2 className="text-xl font-bold text-[#111827] mb-2">Registration Submitted!</h2>
                    <p className="text-sm text-[#4B5563] max-w-md mx-auto">
                        Your registration has been received and is pending approval by the tournament admin.
                        You will be added to the player list once approved.
                    </p>
                    <Button
                        className="mt-6 bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl font-bold shadow-xs"
                        onClick={() => { setSubmitted(false); setForm({ full_name: '', contact_number: '', email: '', tournament_id: '', category_id: '', gender: 'Boy', academy_name: '' }); setPaymentFile(null); }}
                    >
                        Register Another Player
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-gray-100 shadow-lg rounded-2xl overflow-hidden bg-white">
            <CardHeader className="p-6 pb-2">
                <CardTitle className="text-xl font-bold text-[#111827]">Player Registration</CardTitle>
                <CardDescription className="text-sm text-[#4B5563]">
                    Register for the Smashers Championship. Fill in your details below.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-[#2E7D32]" size={24} />
                    </div>
                ) : !isSupabaseConfigured() ? (
                    <div className="text-center py-12 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                            <span className="text-xl">⚙️</span>
                        </div>
                        <p className="text-sm font-bold text-[#111827]">Registration Not Available Yet</p>
                        <p className="text-xs text-[#4B5563] max-w-sm mx-auto">
                            The database connection has not been configured. Please contact the tournament organizer for registration details.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Full Name *</Label>
                            <Input
                                placeholder="Enter your full name"
                                className="rounded-xl border-gray-200 bg-gray-50/50 h-11 text-sm focus:bg-white"
                                value={form.full_name}
                                onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Phone Number *</Label>
                                <Input
                                    type="tel"
                                    placeholder="+91 98XXXXXXXX"
                                    className="rounded-xl border-gray-200 bg-gray-50/50 h-11 text-sm focus:bg-white"
                                    value={form.contact_number}
                                    onChange={(e) => setForm(f => ({ ...f, contact_number: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Email ID</Label>
                                <Input
                                    type="email"
                                    placeholder="your@email.com"
                                    className="rounded-xl border-gray-200 bg-gray-50/50 h-11 text-sm focus:bg-white"
                                    value={form.email}
                                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Select Tournament *</Label>
                            <select
                                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10"
                                value={form.tournament_id}
                                onChange={(e) => setForm(f => ({ ...f, tournament_id: e.target.value }))}
                            >
                                <option value="">Choose a tournament...</option>
                                {tournaments.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Category *</Label>
                                <select
                                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10"
                                    value={form.category_id}
                                    onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
                                >
                                    <option value="">Choose category...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} — ₹{c.entry_fee || 600}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Gender</Label>
                                <select
                                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/10"
                                    value={form.gender}
                                    onChange={(e) => setForm(f => ({ ...f, gender: e.target.value }))}
                                >
                                    <option value="Boy">Boy</option>
                                    <option value="Girl">Girl</option>
                                </select>
                            </div>
                        </div>

                        {/* Entry Fee Display */}
                        {form.category_id && (() => {
                            const selectedCat = categories.find(c => c.id === form.category_id);
                            const fee = selectedCat?.entry_fee || 600;
                            return (
                                <div className="rounded-xl border border-[#2E7D32]/20 bg-[#F0FDF4] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                            <IndianRupee size={20} className="text-[#2E7D32]" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">Entry Fee for {selectedCat?.name}</p>
                                            <p className="text-xl font-bold text-[#2E7D32]">₹{fee}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* UPI Payment Section */}
                        {form.category_id && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <QrCode size={16} className="text-[#2E7D32]" />
                                    <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Pay via UPI</Label>
                                </div>
                                <div className="flex flex-col items-center gap-2 py-3">
                                    <div className="w-40 h-40 rounded-xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center">
                                        <div className="text-center">
                                            <QrCode size={48} className="text-gray-300 mx-auto mb-2" />
                                            <p className="text-[10px] text-gray-400 font-medium">UPI QR Code</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[#4B5563] font-medium text-center">
                                        Scan the QR code above or use UPI ID to pay
                                    </p>
                                    <p className="text-[10px] text-gray-400 text-center">
                                        After payment, upload the screenshot below
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Academy / Coach Name</Label>
                            <Input
                                placeholder="Optional"
                                className="rounded-xl border-gray-200 bg-gray-50/50 h-11 text-sm focus:bg-white"
                                value={form.academy_name}
                                onChange={(e) => setForm(f => ({ ...f, academy_name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-[#111827] uppercase tracking-wider">Upload Payment Screenshot</Label>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#2E7D32]/30 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {paymentFile ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckCircle size={16} className="text-[#2E7D32]" />
                                        <span className="text-sm font-medium text-[#111827]">{paymentFile.name}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <Upload size={20} className="text-gray-400" />
                                        <span className="text-xs text-[#4B5563] font-medium">Click to upload or drag and drop</span>
                                        <span className="text-[10px] text-gray-400">PNG, JPG up to 5MB</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 bg-[#2E7D32] hover:bg-[#1B5E20] rounded-xl text-sm font-bold shadow-xs mt-2"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin mr-2" size={16} /> Submitting...</>
                            ) : (
                                'Submit Registration'
                            )}
                        </Button>

                        <p className="text-[10px] text-center text-gray-400 mt-2">
                            Your registration will be reviewed by the admin before being approved.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
