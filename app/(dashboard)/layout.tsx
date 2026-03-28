'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, Trophy, Users, GitBranch, Medal,
    Wallet, Settings, Menu, X, LogOut, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppProvider, useApp } from '@/lib/app-context';
import { toast } from 'sonner';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/players', label: 'Players', icon: Users },
    { href: '/fixtures', label: 'Fixtures', icon: GitBranch },
    { href: '/leaderboard', label: 'Leaderboard', icon: Medal },
    { href: '/expenses', label: 'Expenses', icon: Wallet },
    { href: '/settings', label: 'Settings', icon: Settings },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { tournaments, selectedTournament, setSelectedTournament } = useApp();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            toast.success('Logged out');
            router.push('/login');
        } catch {
            toast.error('Failed to logout');
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200
          flex flex-col
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <span className="text-xl mr-2">🏸</span>
                    <span className="text-lg font-bold text-[#2E7D32] tracking-tight">SMASHERS</span>
                    <button
                        className="ml-auto lg:hidden text-gray-400 hover:text-gray-600"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-[#F0FDF4] text-[#2E7D32]'
                                        : 'text-[#4B5563] hover:bg-gray-100 hover:text-[#111827]'
                                    }
                `}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / User info */}
                <div className="p-4 border-t border-gray-100 mt-auto bg-gray-50/50">
                    <div className="flex flex-col gap-3">
                        <div className="px-2">
                            <p className="text-xs font-semibold text-[#111827] truncate">Admin</p>
                            <p className="text-[10px] text-[#4B5563] truncate">Tournament Manager</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2 border-gray-200 text-[#4B5563] hover:text-red-600 hover:border-red-100 hover:bg-red-50"
                            onClick={handleLogout}
                        >
                            <LogOut size={14} />
                            <span className="text-xs">Logout</span>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
                    <button
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={22} />
                    </button>

                    {/* Tournament selector - Centered */}
                    <div className="flex-1 flex justify-center">
                        <div className="relative group">
                            <select
                                value={selectedTournament?.id || ''}
                                onChange={(e) => {
                                    const t = tournaments.find(t => t.id === e.target.value);
                                    if (t) setSelectedTournament(t);
                                }}
                                className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-semibold text-[#111827] cursor-pointer hover:border-gray-300 transition-colors shadow-sm focus:outline-hidden focus:ring-2 focus:ring-[#2E7D32]/10"
                            >
                                <option value="" disabled>Select Tournament</option>
                                {tournaments.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} {t.status === 'active' ? '(active)' : t.status === 'upcoming' ? '(upcoming)' : '(completed)'}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#111827]">Admin</span>
                            <Badge variant="secondary" className="bg-[#F0FDF4] text-[#2E7D32] border-0 text-[10px] font-bold">Admin</Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-500 p-2"
                            onClick={handleLogout}
                        >
                            <LogOut size={18} />
                        </Button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppProvider>
            <DashboardShell>{children}</DashboardShell>
        </AppProvider>
    );
}
