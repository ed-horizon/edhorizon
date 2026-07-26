import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Calendar, CreditCard, Users, Briefcase, IndianRupee, Clock, Phone } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { HRTeacherAttendanceSheet } from "@/components/features/hr/HRTeacherAttendanceSheet";
import { getTeacherCompletedClasses } from "@/app/(dashboard)/attendance/actions";
import { getRoleDisplayName } from "@/lib/utils";

export default async function StaffProfilePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient();

    if (!id || id === 'undefined') {
        return (
            <div className="p-8 space-y-4 max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-amber-500">Invalid Profile Link</h1>
                <p className="text-muted-foreground">The staff record is missing a valid unique ID. This could happen if the record was just created or is corrupted.</p>
                <Link href="/hr/staff">
                    <Button>Back to Directory</Button>
                </Link>
            </div>
        );
    }

    // Fetch the main profile with staff details
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, staff_details(*)')
        .eq('id', id)
        .single();
    if (error || !profile) {
        return (
            <div className="p-8 space-y-4 max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-red-500">Error Loading Profile</h1>
                <pre className="p-4 bg-muted rounded-xl text-xs overflow-auto">
                    {JSON.stringify({ error, id: id, message: "Profile query failed or returned null" }, null, 2)}
                </pre>
                <Link href="/hr/staff">
                    <Button>Back to Directory</Button>
                </Link>
            </div>
        );
    }
    // If it's a teacher, fetch tutoring stats
    let studentCount = 0;
    let assignedStudents: any[] = [];
    if (profile.role === 'teacher') {
        const { data: studentsData, count } = await supabase
            .from('student_details')
            .select(`
                id,
                tutor_hourly_rate,
                profiles!student_details_id_fkey (
                    full_name,
                    email
                )
            `, { count: 'exact' })
            .eq('assigned_teacher_id', profile.id);
        
        studentCount = count || 0;
        assignedStudents = (studentsData || []).map((s: any) => {
            const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
            return {
                id: s.id,
                tutor_hourly_rate: s.tutor_hourly_rate,
                full_name: prof?.full_name || prof?.email?.split('@')[0] || "Unknown Student",
                email: prof?.email || ""
            };
        });
    }

    // Fetch current month's payroll info
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: activeRun } = await supabase
        .from('payroll_runs')
        .select('id, status')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();

    let currentAccruedSalary = 0;
    if (activeRun) {
        const { data: payrollItem } = await supabase
            .from('payroll_items')
            .select('net_amount')
            .eq('run_id', activeRun.id)
            .eq('staff_id', profile.id)
            .single();

        if (payrollItem) {
            currentAccruedSalary = Number(payrollItem.net_amount);
        }
    }

    let currentMonthLateCount = 0;
    if (profile.role === 'teacher') {
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count } = await supabase
            .from('live_classes')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', id)
            .eq('tutor_joined_late', true)
            .gte('scheduled_at', startOfCurrentMonth);
        currentMonthLateCount = count || 0;
    }

    const completedClasses = await getTeacherCompletedClasses(id);

    const { full_name, email, role, created_at, staff_details } = profile;
    const status = staff_details?.status || 'active';
    const hourlyRate = staff_details?.hourly_rate || 0;
    const joiningDate = staff_details?.joining_date ? new Date(staff_details.joining_date) : new Date(created_at);

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            {/* Header / Back Navigation */}
            <div className="flex items-center gap-4">
                <Link href="/hr/staff">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-serif font-bold tracking-tight italic text-foreground">Staff Profile</h1>
                    <p className="text-sm text-muted-foreground italic">Detailed view of personnel records.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: ID Card */}
                <Card className="rounded-[3rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl relative overflow-hidden md:col-span-1 border-none">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Briefcase size={120} />
                    </div>
                    <CardHeader className="pt-12 text-center pb-6">
                        <div className="mx-auto h-24 w-24 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center text-3xl font-bold mb-4 shadow-inner backdrop-blur-md">
                            {full_name?.charAt(0) || email.charAt(0).toUpperCase()}
                        </div>
                        <CardTitle className="text-2xl font-bold">{full_name || 'No Name Set'}</CardTitle>
                        <CardDescription className="text-indigo-100 uppercase tracking-widest text-[10px] font-black mt-2">
                            {getRoleDisplayName(role, full_name)}
                        </CardDescription>
                        <div className="mt-4 flex justify-center">
                            <Badge className={`border-none uppercase tracking-widest text-[10px] font-black px-4 py-1.5 ${status === 'active' ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-rose-500 text-white hover:bg-rose-600'}`}>
                                {status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 px-8 pb-12">
                        <div className="bg-black/20 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail size={16} className="text-indigo-200" />
                                <span className="opacity-90">{email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar size={16} className="text-indigo-200" />
                                <span className="opacity-90">Joined {format(joiningDate, 'PP')}</span>
                            </div>
                            {staff_details?.employee_id && (
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-200">ID:</span>
                                    <span className="opacity-90 font-mono">{staff_details.employee_id}</span>
                                </div>
                            )}
                            {staff_details?.mobile_number && (
                                <div className="space-y-2 pt-2 border-t border-white/10">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone size={16} className="text-indigo-200" />
                                        <span className="opacity-90">{staff_details.mobile_number}</span>
                                    </div>
                                    <div className="pt-1">
                                        <a
                                            href={`https://wa.me/${staff_details.mobile_number.replace(/\D/g, "").length === 10 ? `91${staff_details.mobile_number.replace(/\D/g, "")}` : staff_details.mobile_number.replace(/\D/g, "")}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex w-full items-center justify-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl transition-all"
                                        >
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008 0c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-.002 0-.003 0-.005 0-2.002-.001-3.972-.513-5.717-1.488L0 24zm6.59-4.846c1.6.95 2.534 1.483 3.96 1.486 5.315 0 9.64-4.321 9.643-9.637.002-2.576-1.002-5.001-2.827-6.829-1.824-1.826-4.249-2.827-6.828-2.828-5.32 0-9.647 4.322-9.65 9.639-.001 1.516.4 2.99 1.159 4.3l.255.44-1.02 3.722 3.818-1.002.433.256zM17.17 14.39c-.28-.14-1.65-.81-1.91-.9-.26-.1-.45-.14-.64.14-.19.28-.73.9-.9 1.09-.17.19-.34.21-.62.07-1.37-.68-2.31-1.2-3.23-2.78-.24-.41.24-.38.69-1.28.08-.17.04-.31-.02-.45-.06-.14-.54-1.31-.74-1.8-.19-.47-.39-.4-.54-.41-.14-.01-.31-.01-.48-.01-.17 0-.45.06-.69.31-.24.25-.92.9-.92 2.2 0 1.3.95 2.56 1.08 2.74.13.18 1.87 2.85 4.54 4 .64.27 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.26.22-.61.22-1.14.15-1.25-.07-.11-.26-.18-.54-.32z"/>
                                            </svg>
                                            Message on WhatsApp
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-8">
                    {/* Financial Overview */}
                    <Card className="rounded-[2.5rem] bg-card shadow-xl border-border/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl italic font-serif">
                                <CreditCard className="text-indigo-500" />
                                Financial Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-muted/30 rounded-3xl p-6 border border-border/50 hover:border-indigo-500/30 transition-colors">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Clock size={14} className="text-indigo-500" /> Hourly Rate
                                    </div>
                                    <div className="text-3xl font-bold tracking-tighter text-foreground">
                                        {hourlyRate > 0 ? `₹${hourlyRate.toLocaleString()}` : <span className="text-lg opacity-40 italic">Not Configure</span>}
                                        <span className="text-sm text-muted-foreground font-normal ml-1">/hr</span>
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-3xl p-6 border border-border/50 hover:border-violet-500/30 transition-colors">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Briefcase size={14} className="text-violet-500" /> Basic Salary
                                    </div>
                                    <div className="text-3xl font-bold tracking-tighter text-foreground">
                                        {profile.staff_details?.basic_salary > 0 ? `₹${profile.staff_details.basic_salary.toLocaleString()}` : <span className="text-lg opacity-40 italic">Not Set</span>}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">Fixed Monthly</div>
                                </div>
                                <div className="bg-muted/30 rounded-3xl p-6 border border-border/50 hover:border-emerald-500/30 transition-colors">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <IndianRupee size={14} className="text-emerald-500" /> Accrued This Month
                                    </div>
                                    <div className="text-3xl font-bold tracking-tighter text-emerald-600">
                                        ₹{currentAccruedSalary.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                                        {format(now, 'MMMM yyyy')} run
                                    </div>
                                </div>
                                <div className="bg-muted/30 rounded-3xl p-6 border border-border/50 hover:border-rose-500/30 transition-colors">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Clock size={14} className="text-rose-500" /> Late Joinings
                                    </div>
                                    <div className="text-3xl font-bold tracking-tighter text-rose-600">
                                        {currentMonthLateCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                                        {format(now, 'MMMM yyyy')}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Role Specific Details - e.g. Teachers */}
                    {role === 'teacher' && (
                        <Card className="rounded-[2.5rem] bg-card shadow-xl border-border/40">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl italic font-serif">
                                    <Briefcase className="text-indigo-500" />
                                    Academic Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Tutor Group Status</h4>
                                            <p className="text-sm text-muted-foreground">Currently managing 1:1 sessions for these students.</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-bold tracking-tighter text-indigo-600">{studentCount}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Students</div>
                                    </div>
                                </div>

                                {assignedStudents.length > 0 && (
                                    <div className="bg-muted/10 rounded-3xl p-6 border border-border/40 space-y-3">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Assigned Students & Payout Rates</h5>
                                        <div className="divide-y divide-border/20">
                                            {assignedStudents.map((student) => (
                                                <div key={student.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                                                    <div>
                                                        <p className="font-bold text-sm text-foreground">{student.full_name}</p>
                                                        <p className="text-[9px] text-muted-foreground font-semibold">{student.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge className={student.tutor_hourly_rate ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none rounded-md font-bold text-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-none rounded-md font-semibold text-xs"}>
                                                            {student.tutor_hourly_rate ? `₹${student.tutor_hourly_rate}/hr` : `₹${hourlyRate}/hr (Base)`}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <HRTeacherAttendanceSheet classes={completedClasses} />
            </div>
        </div>
    );
}
