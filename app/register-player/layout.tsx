import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Register — Smashers Championship",
    description: "Register for the Smashers Badminton Championship. Fill in your details and submit your registration.",
};

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
                    <span className="text-xl mr-2">🏸</span>
                    <span className="text-lg font-bold text-[#2E7D32] tracking-tight">SMASHERS</span>
                    <span className="text-sm font-medium text-[#4B5563] ml-2">Player Registration</span>
                </div>
            </header>
            <main className="max-w-2xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
