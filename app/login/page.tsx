'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Logged in successfully');
                router.push('/');
            } else {
                toast.error(data.error || 'Invalid credentials');
            }
        } catch {
            toast.error('An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Logo & Branding */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2E7D32] text-white text-2xl font-bold mb-2">
                        🏸
                    </div>
                    <h1 className="text-3xl font-bold text-[#212121] tracking-tight">SMASHERS</h1>
                    <p className="text-sm text-[#757575]">Tournament Management Platform</p>
                </div>

                <Card className="shadow-lg border-0">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl">Admin Login</CardTitle>
                        <CardDescription>Sign in to manage your tournaments</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@smashers.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-xs text-center text-[#757575]">
                    © 2026 Smashers Badminton Championship
                </p>
            </div>
        </div>
    );
}
