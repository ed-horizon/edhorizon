import { createClient } from "@/lib/supabase/server"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { CalendarDays, Clock, Users, ShieldCheck, ArrowLeft, RefreshCw, X, PlayCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CreateLiveClassDialog } from "@/components/features/teacher/CreateLiveClassDialog"
import { ManageSchedulesDialog } from "@/components/features/teacher/ManageSchedulesDialog"
import { formatTime12Hour } from "@/lib/utils"

const DAYS = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
]

export default async function AdminSchedulesManagement() {
    const supabase = await createClient()

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
                            <CalendarDays className="h-4 w-4" /> Global Schedule Management
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                        <RefreshCw size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2 flex items-center gap-2">Total Active Schedules</p>
                    <p className="text-5xl font-serif font-bold tracking-tighter shadow-sm">{safeSchedules.length}</p>
                </Card>
            </div>

            <Card className="rounded-[2.5rem] bg-card border-border/40 shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/40 p-8">
                    <CardTitle className="text-xl italic font-serif">Academy-Wide Master Schedules</CardTitle>
                    <CardDescription className="italic">Overview containing all automatic class generation patterns active in EdHorizon.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {safeSchedules.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic">
                            <CalendarDays size={48} className="opacity-20 mb-4" />
                            <p>No automated recurring schedules are currently active.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase font-black tracking-widest bg-muted/30 text-muted-foreground">
                                    <tr>
                                        <th className="px-8 py-5">Tutor / Student Pair</th>
                                        <th className="px-6 py-5">Pattern configuration</th>
                                        <th className="px-6 py-5">Time & Duration</th>
                                        <th className="px-6 py-5">Valid Until</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {safeSchedules.map((schedule) => (
                                        <tr key={schedule.id} className="hover:bg-muted/5 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-inner">
                                                        T
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground">{schedule.teacher?.full_name}</p>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                                                            <PlayCircle size={10} className="text-rose-500"/>
                                                            {schedule.student?.full_name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1">
                                                    {schedule.pattern_days.map((d: number) => {
                                                        const dayName = DAYS.find(x => x.value === d)?.label
                                                        return (
                                                            <Badge key={d} className="bg-slate-100 text-slate-600 border-none rounded-md px-2 text-[9px] uppercase font-bold">
                                                                {dayName}
                                                            </Badge>
                                                        )
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {schedule.day_timings && Object.keys(schedule.day_timings).length > 0 ? (
                                                    <div className="flex flex-col gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-2.5 rounded-2xl max-w-[200px] shadow-sm">
                                                        {schedule.pattern_days.map((d: number) => {
                                                            const dayName = DAYS.find(x => x.value === d)?.label
                                                            const timeVal = schedule.day_timings?.[d] || schedule.day_timings?.[String(d)] || schedule.time_of_day
                                                            return (
                                                                <div key={d} className="flex items-center justify-between gap-3 text-xs font-semibold">
                                                                    <span className="text-muted-foreground font-black uppercase text-[8px] tracking-wider bg-indigo-100/60 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded-md min-w-[32px] text-center">{dayName}</span>
                                                                    <Badge variant="outline" className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-bold py-0.5 px-1.5 text-[9px] bg-white dark:bg-card">
                                                                        <Clock size={10}/> {formatTime12Hour(timeVal)}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-muted-foreground font-medium">{schedule.duration_hours}h</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="border-indigo-200 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-bold shadow-sm">
                                                            <Clock size={12}/> {formatTime12Hour(schedule.time_of_day)}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground font-medium">{schedule.duration_hours}h</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="font-bold italic text-foreground tracking-tight">
                                                    {format(parseISO(schedule.end_date), 'MMMM d, yyyy')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 uppercase tracking-widest text-[9px] font-black border-none">
                                                        Operating
                                                    </Badge>
                                                    <ManageSchedulesDialog 
                                                        initialSchedule={schedule} 
                                                        trigger={
                                                            <Button size="sm" variant="outline" className="rounded-xl font-bold uppercase tracking-widest h-8 text-[9px] text-indigo-600 bg-white hover:bg-indigo-50 border-indigo-200 shadow-sm transition-all hover:scale-105">
                                                                Edit
                                                            </Button>
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
