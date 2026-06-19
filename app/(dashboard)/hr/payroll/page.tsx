import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, Clock, CheckCircle2, AlertCircle, Calendar, Users, FileText, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

export default async function PayrollManagement() {
    const supabase = await createClient();

    // 1. Fetch active payroll runs
    const { data: runs } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    // 2. Fetch current month metrics
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Fetch all teachers
    const { data: teachersData } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            staff_details (
                hourly_rate,
                status
            )
        `)
        .eq('role', 'teacher');

    const teachers = (teachersData || []).map((t: any) => {
        const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return {
            id: t.id,
            full_name: t.full_name || t.email.split('@')[0],
            email: t.email,
            hourly_rate: Number(details?.hourly_rate || 0),
            status: details?.status || 'active'
        };
    });

    // Fetch verified live classes for this month
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999).toISOString();

    const { data: verifiedClasses } = await supabase
        .from('live_classes')
        .select('teacher_id, duration_hours, student_id, student_attendance(status)')
        .eq('verification_status', 'verified')
        .gte('scheduled_at', startOfMonth)
        .lte('scheduled_at', endOfMonth);

    // Fetch all student details to get custom tutor hourly rates
    const { data: studentDetailsData } = await supabase
        .from('student_details')
        .select('id, tutor_hourly_rate');

    const studentRates = Object.fromEntries(
        (studentDetailsData || []).map((s: any) => [s.id, s.tutor_hourly_rate !== null ? Number(s.tutor_hourly_rate) : null])
    );

    // Map teacher classes, hours, and custom payouts
    const teacherStats = Object.fromEntries(teachers.map(t => [t.id, { count: 0, hours: 0, payout: 0 }]));
    verifiedClasses?.forEach((c: any) => {
        const att = Array.isArray(c.student_attendance) ? c.student_attendance[0] : c.student_attendance;
        if (att?.status === 'absent') {
            return; // Skip calculating this for the teacher (Student No Show)
        }
        if (teacherStats[c.teacher_id]) {
            const teacher = teachers.find(t => t.id === c.teacher_id);
            const baseRate = teacher?.hourly_rate || 0;
            const customStudentRate = c.student_id ? studentRates[c.student_id] : null;
            const rate = (customStudentRate !== null && customStudentRate !== undefined && !isNaN(customStudentRate) && customStudentRate > 0) 
                ? customStudentRate 
                : baseRate;

            const hours = Number(c.duration_hours || 1.0);
            teacherStats[c.teacher_id].count += 1;
            teacherStats[c.teacher_id].hours += hours;
            teacherStats[c.teacher_id].payout += hours * rate;
        }
    });

    const teacherPayouts = teachers.map(t => {
        const stats = teacherStats[t.id] || { count: 0, hours: 0, payout: 0 };
        return {
            ...t,
            classes_taken: stats.count,
            hours_taken: stats.hours,
            total_payout: stats.payout
        };
    });

    const totalStaffCount = teachers.length;
    const totalClassesTaken = verifiedClasses?.length || 0;
    const totalAmountAccrued = teacherPayouts.reduce((sum, t) => sum + t.total_payout, 0);

    return (
        <div className="space-y-10 text-left max-w-7xl mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/10 pb-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                        <CreditCard className="text-emerald-600 dark:text-emerald-500" size={36} />
                        <span>Staff & Payroll Portal</span>
                    </h1>
                    <p className="text-xs text-muted-foreground italic font-medium mt-1">
                        Calculate staff payouts based on total classes taken and verify dynamic ledger entries.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            {/* Aggregates Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[2rem] bg-indigo-50 dark:bg-indigo-950/20 border-none shadow-sm p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-105 transition-transform text-indigo-600">
                        <Users size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                        <Users size={14} /> Total Staff
                    </p>
                    <p className="text-4xl font-extrabold text-indigo-900 dark:text-indigo-100 tracking-tighter">{totalStaffCount} Tutors</p>
                </Card>

                <Card className="rounded-[2rem] bg-amber-50 dark:bg-amber-950/20 border-none shadow-sm p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-105 transition-transform text-amber-600">
                        <Calendar size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                        <Calendar size={14} /> Classes Taken This Month
                    </p>
                    <p className="text-4xl font-extrabold text-amber-900 dark:text-amber-100 tracking-tighter">{totalClassesTaken} Classes</p>
                </Card>

                <Card className="rounded-[2rem] bg-emerald-500 text-white border-none shadow-2xl p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-105 transition-transform">
                        <PiggyBank size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2 flex items-center gap-2">
                        <PiggyBank size={14} /> Total Accrued Payout
                    </p>
                    <p className="text-4xl font-extrabold tracking-tighter">₹{totalAmountAccrued.toLocaleString()}</p>
                </Card>
            </div>

            {/* Current Month Payout Breakdown */}
            <Card className="rounded-[2.5rem] bg-card border border-border/30 shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/20 p-8 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <FileText size={20} className="text-indigo-600" />
                            <span>Current Month Payout Summary</span>
                        </CardTitle>
                        <CardDescription className="text-xs italic mt-0.5">
                            Real-time payouts computed from verified classes in {format(now, 'MMMM yyyy')}.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {teacherPayouts.length === 0 ? (
                        <div className="p-16 text-center text-muted-foreground italic bg-muted/5">
                            No teacher profiles registered.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-[10px] uppercase font-black tracking-widest bg-muted/30 text-muted-foreground border-b border-border/10">
                                    <tr>
                                        <th className="px-8 py-5">Tutor Name</th>
                                        <th className="px-6 py-5 text-center">Status</th>
                                        <th className="px-6 py-5 text-center">Base Rate</th>
                                        <th className="px-6 py-5 text-center">Classes Taken</th>
                                        <th className="px-6 py-5 text-center">Hours Completed</th>
                                        <th className="px-8 py-5 text-right">Accrued Payout</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {teacherPayouts.map((t) => (
                                        <tr key={t.id} className="hover:bg-muted/5 transition-colors group">
                                            <td className="px-8 py-5 flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 font-bold group-hover:scale-105 transition-transform shadow-inner">
                                                    {t.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{t.full_name}</p>
                                                    <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{t.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <Badge className={`rounded-full border-none font-bold text-[9px] uppercase tracking-wider px-2.5 py-0.5 ${
                                                    t.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                                }`}>
                                                    {t.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-slate-300">
                                                ₹{t.hourly_rate}/hr
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-indigo-600">
                                                {t.classes_taken} classes
                                            </td>
                                            <td className="px-6 py-5 text-center font-semibold text-muted-foreground">
                                                {t.hours_taken}h
                                            </td>
                                            <td className="px-8 py-5 text-right font-extrabold text-foreground text-base">
                                                ₹{t.total_payout.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Historical Payroll Runs */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold px-2">Archived Payroll Cycles</h3>
                    <Badge variant="outline" className="rounded-full border-muted-foreground/30 text-muted-foreground px-4 py-1">HISTORY LOG</Badge>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {runs?.map((run) => (
                        <Card key={run.id} className="rounded-[2rem] bg-card border border-border/30 hover:shadow-lg transition-all p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                                        run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                                    }`}>
                                        {run.status === 'completed' ? <CheckCircle2 size={28} /> : <Clock size={28} />}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-foreground">
                                            {format(new Date(run.year, run.month - 1), 'MMMM yyyy')}
                                        </h4>
                                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                                            <Calendar size={12} /> Fiscal Cycle
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-12">
                                    <div className="text-center md:text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                                        <Badge className={`rounded-full px-4 py-1.5 font-bold uppercase text-[9px] ${
                                            run.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                                        }`}>
                                            {run.status}
                                        </Badge>
                                    </div>
                                    <div className="text-center md:text-right min-w-[120px]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Actions</p>
                                        <Link href={`/hr/payroll/${run.id}`}>
                                            <Button variant="ghost" className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 rounded-xl">View Details</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {(!runs || runs.length === 0) && (
                        <div className="py-20 flex flex-col items-center justify-center bg-card rounded-[3rem] border border-dashed border-border/50 text-muted-foreground italic">
                            <AlertCircle size={48} className="opacity-20 mb-4" />
                            <p>No payroll history found yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
