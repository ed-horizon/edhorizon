'use client'

import Link from "next/link";
import { NAV_ITEMS } from "@/lib/constants";
import { cn, getRoleDisplayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/(auth)/login/actions";
import StaffShiftToggle from "@/components/shared/StaffShiftToggle";

export default function Sidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState("student");
    const [fullName, setFullName] = useState("");
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    setRole(profile.role);
                    if (profile.full_name) {
                        setFullName(profile.full_name);
                    }
                }
            }
        };
        getUser();
    }, [supabase]);

    const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

    if (!user) return null;

    return (
        <div className="group relative hidden md:flex h-full w-20 flex-col bg-[#111111] py-8 transition-all duration-300 hover:w-64 lg:w-24 lg:hover:w-64">
            {/* Logo Section */}
            <div className="mb-12 flex items-center justify-center px-4 overflow-hidden shrink-0">
                <Link href="/" className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-lg ring-2 ring-white/10 transition-transform hover:scale-110">
                        <Image
                            src="/logo.jpg"
                            alt="EdHorizon Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span className="whitespace-nowrap font-serif text-xl font-bold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        EdHorizon
                    </span>
                </Link>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 space-y-2 px-3 overflow-y-auto min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filteredNav.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={index}
                            href={item.href}
                            className={cn(
                                "relative flex h-12 items-center gap-4 rounded-xl px-3 transition-all duration-200",
                                isActive
                                    ? "bg-white/10 text-white shadow-indigo-500/20"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {isActive && (
                                <div className="absolute -left-3 h-8 w-1.5 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            )}
                            <item.icon className={cn("h-6 w-6 shrink-0", isActive && "text-indigo-400")} />
                            <span className="whitespace-nowrap font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                {item.title}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section: User & Profile */}
            <div className="mt-auto space-y-4 px-3 border-t border-white/5 pt-6 shrink-0">
                {/* Staff Shift Toggle Card */}
                <StaffShiftToggle role={role} isSidebar={true} />

                <Link href="/settings" className="flex h-12 items-center gap-4 rounded-xl px-3 text-slate-400 hover:bg-white/5 hover:text-white transition-all">
                    <Settings className="h-6 w-6 shrink-0" />
                    <span className="whitespace-nowrap font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">Settings</span>
                </Link>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4 px-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-indigo-500/50 shadow-lg">
                            <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex flex-col whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <span className="text-sm font-semibold text-white truncate max-w-[120px]">{fullName || user.email?.split('@')[0]}</span>
                            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">{getRoleDisplayName(role)}</span>
                        </div>
                    </div>

                    <form action={signOut}>
                        <Button
                            variant="ghost"
                            className="h-12 w-full justify-start gap-4 rounded-xl px-3 text-rose-400 hover:bg-rose-500/10 hover:text-rose-500"
                            type="submit"
                        >
                            <LogOut className="h-6 w-6 shrink-0" />
                            <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                Sign Out
                            </span>
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
