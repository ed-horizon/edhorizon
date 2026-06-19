'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, User, Settings } from "lucide-react"
import { NAV_ITEMS } from "@/lib/constants"
import { cn, getRoleDisplayName } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signOut } from "@/app/(auth)/login/actions"
import Link from "next/link"
import StaffShiftToggle from "@/components/shared/StaffShiftToggle"

export function MobileNav() {
    const pathname = usePathname()
    const [user, setUser] = useState<any>(null)
    const [role, setRole] = useState("student")
    const [fullName, setFullName] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, full_name')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    setRole(profile.role)
                    if (profile.full_name) {
                        setFullName(profile.full_name)
                    }
                }
            }
        }
        getUser()
    }, [supabase])

    const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role))

    if (!user) return null

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="fixed inset-y-0 left-0 z-50 h-full w-[80%] max-w-sm translate-x-0 border-r bg-[#111111] p-0 duration-300 data-[state=closed]:duration-200 sm:rounded-none">
                <div className="flex h-full flex-col py-8 px-6">
                    {/* Header */}
                    <div className="mb-10 flex items-center gap-3 shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">EH</div>
                        <span className="font-serif text-xl font-bold text-white">EdHorizon</span>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 space-y-2 overflow-y-auto min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {filteredNav.map((item, index) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={index}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex h-12 items-center gap-4 rounded-xl px-4 transition-all duration-200",
                                        isActive
                                            ? "bg-white/10 text-white"
                                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <item.icon className={cn("h-5 w-5", isActive && "text-indigo-400")} />
                                    <span className="font-medium">{item.title}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Bottom */}
                    <div className="mt-auto space-y-6 pt-6 border-t border-white/5 shrink-0">
                        <div className="flex items-center gap-4 px-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-white truncate max-w-[150px]">{fullName || user.email?.split('@')[0]}</span>
                                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">{getRoleDisplayName(role)}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Staff Shift Toggle Card */}
                            <StaffShiftToggle role={role} />

                            <Link href="/settings" onClick={() => setIsOpen(false)}>
                                <Button variant="ghost" className="h-12 w-full justify-start gap-4 rounded-xl px-4 text-slate-400 hover:bg-white/5 hover:text-white">
                                    <Settings className="h-5 w-5" />
                                    <span>Settings</span>
                                </Button>
                            </Link>

                            <form action={signOut}>
                                <Button
                                    variant="ghost"
                                    className="h-12 w-full justify-start gap-4 rounded-xl px-4 text-rose-400 hover:bg-rose-500/10 hover:text-rose-500"
                                    type="submit"
                                >
                                    <LogOut className="h-5 w-5" />
                                    <span>Sign Out</span>
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
