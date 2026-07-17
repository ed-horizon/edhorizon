import { createClient } from "@/lib/supabase/server"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { ShieldCheck, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CreateLiveClassDialog } from "@/components/features/teacher/CreateLiveClassDialog"
import { ManageSchedulesDialog } from "@/components/features/teacher/ManageSchedulesDialog"
import { SchedulesClient } from "@/components/features/admin/SchedulesClient"
import { redirect } from "next/navigation"

export default async function AdminSchedulesManagement() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '')) {
        redirect('/')
    }

    // Fetch all active schedules across the academy
    const { data: schedules } = await supabase
        .from('class_schedules')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name, email),
            student:profiles!student_id(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

    const safeSchedules = schedules || []

    return (
        <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/admin">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full shadow-sm hover:scale-105 transition-transform">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground italic flex items-center gap-3">
                            <span className="text-indigo-600">Operations Hub</span>
                        </h1>
                        <p className="text-muted-foreground mt-1 italic text-lg flex items-center gap-2">
                            Global Schedule Management
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                    <CreateLiveClassDialog />
                    <ManageSchedulesDialog />
                    <div className="hidden md:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-full shadow-sm">
                        <ShieldCheck className="text-indigo-600" size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Admin Authority Active</span>
                    </div>
                    <ThemeToggle />
                </div>
            </div>

            <SchedulesClient initialSchedules={safeSchedules} />
        </div>
    )
}
