import Sidebar from "@/components/shared/Sidebar";
import { MobileNav } from "@/components/shared/MobileNav";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col relative">
                {/* Mobile Header */}
                <header className="md:hidden flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <MobileNav />
                        <span className="font-serif font-bold text-xl text-indigo-900 dark:text-indigo-100 italic font-black uppercase tracking-tighter">EdHorizon</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-12">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
