import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, CreditCard, Clock, AlertTriangle, ShieldAlert, Award, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { AttendanceVerificationList } from "@/components/features/admin/AttendanceVerificationList";
import { getPendingClassVerifications, getAllCompletedClassLogs } from "@/app/(dashboard)/attendance/actions";
import { DashboardActions } from "@/components/features/hr/DashboardActions";
import { SessionLogsHistory } from "@/components/features/hr/SessionLogsHistory";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CreateLiveClassDialog } from "@/components/features/teacher/CreateLiveClassDialog";
import { ManageSchedulesDialog } from "@/components/features/teacher/ManageSchedulesDialog";
import { PostClassLogModal } from "@/components/features/teacher/PostClassLogModal";
import { Button } from "@/components/ui/button";
import { HRLeavesQueue } from "@/components/features/hr/HRLeavesQueue";

export default async function HRDashboard() {
    const supabase = await createClient();
    const pendingClasses = await getPendingClassVerifications();
    const completedClasses = await getAllCompletedClassLogs();

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id || '')
        .single();
    const hrName = profile?.full_name || user?.email?.split('@')[0] || "HR";

    // 1. Fetch live staff stats
    const { count: totalStaff } = await supabase
        .from('staff_details')
        .select('*', { count: 'exact', head: true });

    const { data: recentStaff } = await supabase
        .from('profiles')
        .select('*, staff_details(*)')
        .neq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(4);

    // 2. Fetch total payroll for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: activeRun } = await supabase
        .from('payroll_runs')
        .select('id, status')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();

    let currentPayrollTotal = 0;
    if (activeRun) {
        const { data: payrollItems } = await supabase
            .from('payroll_items')
            .select('amount')
            .eq('payroll_run_id', activeRun.id);
            
        if (payrollItems) {
            currentPayrollTotal = payrollItems.reduce((sum, item) => sum + Number(item.amount), 0);
        }
    }

    // 3. SCAN FOR MISSING ATTENDANCE (Attendance forgets warning)
    // Query scheduled classes that are in the past (scheduled_at < now) but status is still 'scheduled'
    const { data: missingAttendanceClasses } = await supabase
        .from('live_classes')
        .select(`
            id,
            title,
            scheduled_at,
            student_id,
            teacher:profiles!teacher_id(full_name),
            student:profiles!student_id(full_name)
        `)
        .eq('status', 'scheduled')
        .lt('scheduled_at', now.toISOString());

    // 4. Fetch leave requests from student_leaves
    const { data: dbLeaveRequests } = await supabase
        .from('student_leaves')
        .select(`
            id,
            start_date,
            end_date,
            reason,
            status,
            created_at,
            student:profiles!student_id(full_name, role),
            teacher:profiles!teacher_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    const leaveRequests = (dbLeaveRequests || []).map((l: any) => {
        const diffTime = Math.abs(new Date(l.end_date).getTime() - new Date(l.start_date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return {
            id: l.id,
            studentName: l.student?.full_name || 'Student',
            applicantRole: l.student?.role || 'student',
            tutorName: l.teacher?.full_name || 'N/A',
            reason: l.reason || 'Personal reasons',
            days: `${diffDays} day${diffDays > 1 ? 's' : ''}`,
            status: l.status,
            date: format(new Date(l.created_at || new Date()), 'MMM dd')
        };
    });

    const resignations = [
        { id: "r1", teacherName: "Tutor Rohini", notice: "Moving out of city", date: "Last week", status: "Reviewing" }
    ];

    const tutorComplaints = [
        { id: "tc1", teacherName: "Mr. Shyam", complaint: "Class started 10 minutes late, parent requested time check", source: "Operations team Alert", date: "Yesterday" }
    ];

    return (
        <div className="p-8 space-y-10 text-left">
            {/* Header section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{hrName}'s HR Command Center</h1>
                    <p className="text-xs text-muted-foreground italic font-medium mt-1">Manage staff onboarding, verify tutor class logs, and process salary payout disbursements.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <CreateLiveClassDialog />
                    <ManageSchedulesDialog />
                    <ThemeToggle />
                </div>
            </div>

            {/* ATTENDANCE ALERTS SECTION: ALERTS IF TUTOR FORGOT TO MARK */}
            {missingAttendanceClasses && missingAttendanceClasses.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-500/35 rounded-2xl p-5 flex items-start gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
                    <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={24} />
                    <div className="space-y-1.5 flex-1">
                        <span className="text-[10px] font-black uppercase text-rose-600 tracking-widest block">Forgot Attendance Alert</span>
                        <h4 className="font-bold text-sm text-indigo-950 dark:text-rose-100">
                            Attendance logs are missing for {missingAttendanceClasses.length} past scheduled classes:
                        </h4>
                        <div className="space-y-1.5 pt-2">
                            {missingAttendanceClasses.map(c => {
                                const teacherName = Array.isArray(c.teacher) ? c.teacher[0]?.full_name : (c.teacher as any)?.full_name;
                                const studentName = Array.isArray(c.student) ? c.student[0]?.full_name : (c.student as any)?.full_name;
                                return (
                                    <div key={c.id} className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-rose-500/10 pt-1.5">
                                        <span>
                                            <span className="font-bold text-foreground">{teacherName || 'N/A'}</span> forgot to log attendance for student <span className="font-bold text-foreground">{studentName || 'N/A'}</span>.
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] bg-rose-100 dark:bg-rose-950 px-2 py-1 rounded font-bold">
                                                Scheduled: {format(new Date(c.scheduled_at), 'MMM dd, hh:mm a')}
                                            </span>
                                            <PostClassLogModal 
                                                classId={c.id}
                                                studentId={c.student_id}
                                                studentName={studentName || 'Student'}
                                                trigger={
                                                    <Button size="sm" className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase px-3 shadow-none">
                                                        Log Session
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Total Staff Card */}
                <Card className="rounded-[2rem] bg-card border border-border/40 shadow-xl overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users size={120} />
                    </div>
                    <CardHeader className="pb-2">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit text-indigo-500 mb-2">
                            <Users size={24} />
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-bold tracking-tighter text-foreground">{totalStaff || 0}</div>
                        <p className="text-xs text-muted-foreground mt-2 italic">Teachers, Sales reps, and Operations managers</p>
                    </CardContent>
                </Card>

                {/* Payroll Pulse Card */}
                <Card className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <div className="p-3 bg-white/20 rounded-2xl w-fit mb-2">
                            <CreditCard size={24} />
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-80">Payroll Cycle</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold tracking-tighter italic">₹{currentPayrollTotal.toLocaleString()}</div>
                        <div className="text-sm font-bold opacity-80 mt-1">{format(now, 'MMM yyyy')}</div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full w-fit uppercase tracking-tighter">
                            <Clock size={14} />
                            <span>{activeRun?.status === 'paid' ? 'Finalized' : 'Processing Draft'}</span>
                        </div>
                    </CardContent>
                </Card>

                <DashboardActions />
            </div>

            {/* Verification Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AttendanceVerificationList pendingClasses={pendingClasses} />
                
                <Card className="rounded-[2rem] bg-card border border-border/40 shadow-2xl p-8">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div>
                            <h3 className="text-xl font-bold text-foreground font-serif italic">Staff Directory</h3>
                            <p className="text-sm text-muted-foreground italic tracking-tight">Active academy profiles & payroll details</p>
                        </div>
                        <Link href="/hr/staff" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">View All</Link>
                    </div>

                    <div className="space-y-4">
                        {recentStaff?.map((staff: any) => (
                            <div key={staff.id} className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-card hover:border-indigo-600/35 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:scale-110 transition-transform">
                                        {staff.full_name?.charAt(0) || staff.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground tracking-tight">{staff.full_name || staff.email.split('@')[0]}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">{staff.role}</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none font-black uppercase tracking-widest text-[10px] px-3 py-1">
                                    {staff.staff_details?.status || 'Active'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* LEAVES, RESIGNATIONS & COMPLAINTS SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Leave Requests */}
                <Card className="rounded-[2rem] border-border/40 shadow-xl bg-card p-6 space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <Clock className="text-indigo-600" size={18} />
                        <span>Leave Requests Log</span>
                    </h3>
                    <HRLeavesQueue initialLeaves={leaveRequests} />
                </Card>

                {/* Resignation Records */}
                <Card className="rounded-[2rem] border-border/40 shadow-xl bg-card p-6 space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <FileText className="text-indigo-600" size={18} />
                        <span>Resignations Log</span>
                    </h3>
                    <div className="space-y-3">
                        {resignations.map(res => (
                            <div key={res.id} className="p-3 bg-muted/20 border border-border/20 rounded-xl text-xs flex justify-between items-center">
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground">{res.teacherName}</p>
                                    <p className="text-muted-foreground text-[10px]">{res.notice} ({res.date})</p>
                                </div>
                                <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[9px] px-2 py-0.5">{res.status}</Badge>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Complaints against Tutors */}
                <Card className="rounded-[2rem] border-border/40 shadow-xl bg-card p-6 space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <AlertTriangle className="text-rose-500 animate-pulse" size={18} />
                        <span>Complaints Against Tutors</span>
                    </h3>
                    <div className="space-y-3">
                        {tutorComplaints.map(item => (
                            <div key={item.id} className="p-3 bg-rose-50/30 border border-rose-500/10 rounded-xl text-xs space-y-1">
                                <div className="flex justify-between items-center font-bold">
                                    <span className="text-foreground">{item.teacherName}</span>
                                    <span className="text-[9px] text-muted-foreground">{item.date}</span>
                                </div>
                                <p className="text-muted-foreground text-[10px] leading-normal">{item.complaint}</p>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>

            {/* Historical Session Logs */}
            <div className="w-full pt-4">
                <SessionLogsHistory completedClasses={completedClasses} />
            </div>
        </div>
    );
}
