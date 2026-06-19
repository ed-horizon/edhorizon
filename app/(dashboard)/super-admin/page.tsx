'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Users, DollarSign, Activity, TrendingUp, Briefcase, 
    AlertCircle, CheckCircle2, Star, BarChart3, Clock, Check, ShieldAlert, Video, Calendar, Loader2
} from "lucide-react";
import { cn, formatTime12Hour, getRoleDisplayName } from "@/lib/utils";
import { getSuperAdminAnalytics } from "./actions";
import { getSuperAdminShiftReport } from "@/app/(dashboard)/staff-shifts/actions";
import Link from "next/link";
import { 
    getLiveClasses, getAllCompletedClassLogs, getAllRequestsData, 
    updateRescheduleStatus, updateLeaveStatus, getStudentsWithClasses, getAllTeachers
} from "@/app/(dashboard)/attendance/actions";
import { StudentClassMonitor } from "@/components/features/operations/StudentClassMonitor";
import { toast } from "sonner";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";

export default function SuperAdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [complaintsList, setComplaintsList] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [completedClasses, setCompletedClasses] = useState<any[]>([]);
    const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [userName, setUserName] = useState("Founder");
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    // Staff Shift logs tracking states
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [shiftReport, setShiftReport] = useState<any>(null);
    const [isShiftsLoading, setIsShiftsLoading] = useState(true);
    const [shiftActiveTab, setShiftActiveTab] = useState<'today' | 'monthly'>('today');

    const loadShiftReport = async (monthStr: string) => {
        setIsShiftsLoading(true);
        try {
            const res = await getSuperAdminShiftReport(monthStr);
            if (res.success) {
                setShiftReport(res);
            } else {
                toast.error(res.error || "Failed to load staff shifts report");
            }
        } catch (err) {
            console.error("Failed fetching shifts:", err);
            toast.error("Failed syncing staff tracker logs");
        } finally {
            setIsShiftsLoading(false);
        }
    };

    const loadOperationalData = async () => {
        try {
            const [analytics, fetchedClasses, fetchedCompleted, fetchedRequests, fetchedStudents, fetchedTeachers] = await Promise.all([
                getSuperAdminAnalytics(),
                getLiveClasses(),
                getAllCompletedClassLogs(),
                getAllRequestsData(),
                getStudentsWithClasses(),
                getAllTeachers(),
                loadShiftReport(selectedMonth)
            ]);
            setData(analytics);
            if (analytics?.complaints) {
                setComplaintsList(analytics.complaints);
            }
            setClasses(fetchedClasses || []);
            setCompletedClasses(fetchedCompleted || []);
            setRescheduleRequests(fetchedRequests.rescheduleRequests || []);
            setLeaveRequests(fetchedRequests.leaveRequests || []);
            setStudents(fetchedStudents || []);
            setTeachers(fetchedTeachers || []);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
            toast.error("Failed to sync control room metrics");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadShiftReport(selectedMonth);
    }, [selectedMonth]);

    useEffect(() => {
        loadOperationalData();
        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();
                if (profile?.full_name) {
                    setUserName(profile.full_name);
                } else if (user.email) {
                    setUserName(user.email.split('@')[0]);
                }
            }
        };
        fetchProfile();
    }, []);

    const handleUpdateReschedule = async (requestId: string, status: 'approved' | 'rejected') => {
        setIsLoading(true);
        try {
            const res = await updateRescheduleStatus(requestId, status);
            if (res.success) {
                toast.success(`Reschedule request marked as ${status}!`);
                await loadOperationalData();
            } else {
                toast.error(res.error || "Failed to update reschedule request.");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateLeave = async (leaveId: string, status: 'approved' | 'rejected') => {
        setIsLoading(true);
        try {
            const res = await updateLeaveStatus(leaveId, status);
            if (res.success) {
                toast.success(`Leave request marked as ${status}!`);
                await loadOperationalData();
            } else {
                toast.error(res.error || "Failed to update leave request.");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolveComplaint = (id: string) => {
        setComplaintsList(prev => 
            prev.map(c => c.id === id ? { ...c, status: 'resolved' } : c)
        );
        toast.success("Support ticket marked as resolved!");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[70vh] animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-[2rem] bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                        <Activity className="text-indigo-600 animate-spin" size={32} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600/50 dark:text-indigo-400/50 italic">
                        Booting CEO Control Room...
                    </p>
                </div>
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const nowTime = new Date().getTime();
    const lateTutorAlerts = classes.filter(c => {
        if (c.status !== 'scheduled' && c.status !== 'ongoing') return false;
        const startTime = new Date(c.scheduled_at).getTime();
        const elapsed = nowTime - startTime;
        return elapsed > 10 * 60 * 1000 && elapsed < 24 * 60 * 60 * 1000 && !c.tutor_joined_at;
    });

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
                        <ShieldAlert size={12} />
                        <span>System Control Active</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        {userName}'s Control Room
                    </h1>
                    <p className="text-xs text-muted-foreground italic font-medium leading-normal">
                        Real-time student registries, tutor operations, CRM metrics, and support tickets log.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/15 px-4 py-2 rounded-xl shadow-sm text-xs">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Live Database Synced</span>
                    </div>
                    <ThemeToggle />
                </div>
            </div>

            {/* Top Row: 5 KPI Cards representing basic metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                
                {/* 1. Total Active Students */}
                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden transition-all hover:scale-[1.01]">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Students</span>
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Users size={16} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-3xl font-extrabold text-foreground">{data.totalActiveStudents}</div>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                            <span>+{Math.round(data.studentGrowth)}% admissions</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Total Leads */}
                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden transition-all hover:scale-[1.01]">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Leads</span>
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                            <TrendingUp size={16} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-3xl font-extrabold text-foreground">{data.totalLeads}</div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Registrations from CRM</p>
                    </CardContent>
                </Card>

                {/* 3. New Admissions */}
                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden transition-all hover:scale-[1.01]">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Admissions</span>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <CheckCircle2 size={16} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-3xl font-extrabold text-foreground">+{data.newAdmissionsThisMonth}</div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Registered this month</p>
                    </CardContent>
                </Card>

                {/* 4. Revenue Collected */}
                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden border-b-4 border-b-emerald-500 transition-all hover:scale-[1.01]">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Collected</span>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <DollarSign size={16} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.revenueCollected)}</div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Collected tuition fees</p>
                    </CardContent>
                </Card>

                {/* 5. Pending Payments */}
                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden border-b-4 border-b-rose-500 transition-all hover:scale-[1.01]">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Payments</span>
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
                            <Clock size={16} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(data.pendingPayments)}</div>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Outstanding fee balances</p>
                    </CardContent>
                </Card>

            </div>

            {/* Middle Row: Visual Analytics Panels (Demo Conversion & Student Attendance Rates) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Demo Conversion Rate Block (5 columns) */}
                <Card className="lg:col-span-5 rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/10 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <TrendingUp className="text-indigo-600" size={18} />
                            <span>Demo Class Conversion Rate</span>
                        </CardTitle>
                        <CardDescription className="text-xs">CRM pipeline conversion percentage from demo to enrolled student.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center space-y-6">
                        
                        {/* Circular Progress Gauge */}
                        <div className="relative h-36 w-36 flex items-center justify-center">
                            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle 
                                    className="text-muted/20" 
                                    strokeWidth="10" 
                                    stroke="currentColor" 
                                    fill="transparent" 
                                    r="38" 
                                    cx="50" 
                                    cy="50" 
                                />
                                <circle 
                                    className="text-indigo-600 transition-all duration-1000" 
                                    strokeWidth="10" 
                                    strokeDasharray={`${2 * Math.PI * 38}`}
                                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - data.demoConversionRate / 100)}`}
                                    strokeLinecap="round" 
                                    stroke="currentColor" 
                                    fill="transparent" 
                                    r="38" 
                                    cx="50" 
                                    cy="50" 
                                />
                            </svg>
                            <div className="absolute text-center">
                                <span className="text-3xl font-extrabold text-foreground">{data.demoConversionRate}%</span>
                                <span className="block text-[8px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Won Rate</span>
                            </div>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4 text-center text-xs border-t border-border/10 pt-4">
                            <div>
                                <span className="text-muted-foreground block text-[9px] font-bold uppercase">Average conversion</span>
                                <span className="font-extrabold text-foreground mt-0.5 block">High Performance</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block text-[9px] font-bold uppercase">Industry standard</span>
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">Exceeded by 14%</span>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Student Attendance Rate Summary (7 columns) */}
                <Card className="lg:col-span-7 rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/10 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <BarChart3 className="text-indigo-600" size={18} />
                            <span>Student Attendance Summary</span>
                        </CardTitle>
                        <CardDescription className="text-xs">Overall ratio of present, absent, and late logs recorded by teachers.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        
                        {/* Summary indicator */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <span className="block text-5xl font-extrabold text-indigo-950 dark:text-indigo-50">{data.attendanceSummary.rate}%</span>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Attendance Average</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold">
                                <div className="space-y-0.5 text-center">
                                    <span className="block text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-md border border-emerald-500/10">Present</span>
                                    <span className="font-bold text-foreground block text-[10px] mt-1">{data.attendanceSummary.present || 28} logs</span>
                                </div>
                                <div className="space-y-0.5 text-center">
                                    <span className="block text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded-md border border-rose-500/10">Absent</span>
                                    <span className="font-bold text-foreground block text-[10px] mt-1">{data.attendanceSummary.absent || 2} logs</span>
                                </div>
                                <div className="space-y-0.5 text-center">
                                    <span className="block text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-md border border-amber-500/10">Late</span>
                                    <span className="font-bold text-foreground block text-[10px] mt-1">{data.attendanceSummary.late || 1} logs</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress visualizer bar */}
                        <div className="space-y-2">
                            <div className="h-3.5 w-full bg-muted rounded-full overflow-hidden flex">
                                <div 
                                    className="bg-emerald-500 h-full transition-all" 
                                    style={{ width: `${data.attendanceSummary.rate}%` }} 
                                    title="Present"
                                />
                                <div 
                                    className="bg-rose-500 h-full transition-all" 
                                    style={{ width: `${100 - data.attendanceSummary.rate - 2}%` }} 
                                    title="Absent"
                                />
                                <div 
                                    className="bg-amber-500 h-full transition-all" 
                                    style={{ width: `2%` }} 
                                    title="Late"
                                />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                <span>90% Safety Threshold</span>
                                <span>Target: 95%</span>
                            </div>
                        </div>

                    </CardContent>
                </Card>

            </div>

            {/* Bottom Row: Controls Grids (Tutors, Sales, Complaints) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* Left Area: Tutor wise classes count & Tutor Performance ratings (6 columns) */}
                <Card className="xl:col-span-6 rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/10 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Briefcase className="text-indigo-600" size={18} />
                            <span>Tutor performance & Monthly class count</span>
                        </CardTitle>
                        <CardDescription className="text-xs">Class hours taught by tutors and rating based on student performance logs.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                        <th className="p-4">Tutor Profile</th>
                                        <th className="p-4">Classes Taught</th>
                                        <th className="p-4 text-right">Founder Performance Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {data.teacherPerformanceList.map((t: any) => (
                                        <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-4">
                                                <p className="font-semibold text-foreground">{t.name}</p>
                                                <p className="text-[9px] text-muted-foreground">{t.email}</p>
                                            </td>
                                            <td className="p-4 font-bold text-foreground">
                                                {t.totalClasses} classes
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-1.5 text-amber-500 font-bold">
                                                    <Star size={12} fill="currentColor" />
                                                    <span>{t.rating} / 5.0</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Area: Sales Representative CRM Performance tracking (6 columns) */}
                <Card className="xl:col-span-6 rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/10 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <TrendingUp className="text-indigo-600" size={18} />
                            <span>Sales team performance indices</span>
                        </CardTitle>
                        <CardDescription className="text-xs">Individual reps assigned leads count, closed deals, and revenue generation.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                        <th className="p-4">Representative</th>
                                        <th className="p-4">Pipeline</th>
                                        <th className="p-4">Conversion</th>
                                        <th className="p-4 text-right">Revenue Won</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {data.salesPerformanceList.map((sr: any) => (
                                        <tr key={sr.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-4 font-semibold text-foreground">
                                                {sr.name}
                                            </td>
                                            <td className="p-4 font-medium text-muted-foreground">
                                                {sr.closedWon} / {sr.totalLeads} won
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground">{sr.conversionRate}%</span>
                                                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden hidden sm:block">
                                                        <div className="bg-indigo-600 h-full" style={{ width: `${sr.conversionRate}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(sr.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* REAL-TIME OPERATIONS MONITOR (Founder Control Room Alerts) */}
            {lateTutorAlerts.length > 0 && (
                <div className="grid grid-cols-1 gap-6">
                    {/* Late Tutor Alerts Card */}
                    <Card className="rounded-[2.5rem] border-2 border-rose-500/20 dark:border-rose-950/40 shadow-xl overflow-hidden bg-card">
                        <CardHeader className="bg-rose-50/50 dark:bg-rose-950/10 border-b border-border/10 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-950 dark:text-rose-100">
                                <AlertCircle className="text-rose-600 animate-pulse" size={18} />
                                <span>Tutor Late & No-Show Alerts</span>
                            </CardTitle>
                            <CardDescription className="text-xs">Tutors who have not joined classes 10+ minutes after scheduled start.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            {lateTutorAlerts.map(c => (
                                <div key={c.id} className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-xs flex justify-between items-center gap-4 animate-pulse">
                                    <div>
                                        <p className="font-bold text-rose-950 dark:text-rose-200">Tutor: {c.teacher?.full_name || 'N/A'}</p>
                                        <p className="text-[10px] text-rose-700/80 dark:text-rose-400 mt-0.5">
                                            Student: {c.student?.full_name || 'Student'} • Scheduled: {format(new Date(c.scheduled_at), 'hh:mm a')} ({format(new Date(c.scheduled_at), 'MMM dd')})
                                        </p>
                                    </div>
                                    <Badge className="bg-rose-600 text-white font-bold text-[9px] uppercase px-2.5 py-0.5 border-none">Late 10m+</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Student centric scheduling & cancellation monitor */}
            {!isLoading && (
                <div className="grid grid-cols-1 gap-6">
                    <StudentClassMonitor students={students} teachers={teachers} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Student Reschedule & Leave Requests Board */}
                <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card overflow-hidden">
                    <CardHeader className="border-b border-border/10 pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Calendar className="text-indigo-600" size={18} />
                            <span>Reschedule & Leave Requests Queue</span>
                        </CardTitle>
                        <CardDescription className="text-xs">Founder review panel for schedule overrides and student leave logs.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        {leaveRequests.filter(l => l.status === 'pending').length === 0 && 
                         rescheduleRequests.filter(r => r.status === 'pending').length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-4">No pending leave or reschedule requests.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Leaves */}
                                <div className="space-y-4 text-left">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl w-fit">Pending Leaves</span>
                                    {leaveRequests.filter(l => l.status === 'pending').length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic pl-2">No pending leaves.</p>
                                    ) : (
                                        leaveRequests.filter(l => l.status === 'pending').map(leave => (
                                            <div key={leave.id} className="p-4 border border-violet-500/20 rounded-xl bg-violet-50/5 dark:bg-violet-950/5 text-xs space-y-2.5">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-foreground">
                                                             {leave.student?.full_name || 'User'}
                                                        </p>
                                                        <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                                            Dates: {leave.start_date} to {leave.end_date}
                                                        </p>
                                                    </div>
                                                    <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-none font-bold text-[9px] px-2 py-0.5">Pending</Badge>
                                                </div>
                                                <p className="text-muted-foreground leading-normal bg-background/50 p-2.5 rounded-xl border border-border/10 italic">
                                                    "Reason: {leave.reason || 'No reason specified'}"
                                                </p>
                                                <div className="flex gap-2 justify-end">
                                                    <Button 
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleUpdateLeave(leave.id, 'rejected')}
                                                        className="h-8 rounded-lg text-[10px] font-bold uppercase"
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleUpdateLeave(leave.id, 'approved')}
                                                        className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase px-4"
                                                    >
                                                        Approve Leave
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Reschedules */}
                                <div className="space-y-4 text-left">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl w-fit">Pending Reschedules</span>
                                    {rescheduleRequests.filter(r => r.status === 'pending').length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic pl-2">No pending reschedules.</p>
                                    ) : (
                                        rescheduleRequests.filter(r => r.status === 'pending').map(req => (
                                            <div key={req.id} className="p-4 border border-indigo-500/20 rounded-xl bg-indigo-50/5 dark:bg-indigo-950/5 text-xs space-y-2.5">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-foreground">{req.student?.full_name || 'Student'}</p>
                                                        <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                                            Requested Date: {req.requested_date} at {formatTime12Hour(req.requested_time)}
                                                        </p>
                                                    </div>
                                                    <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-none font-bold text-[9px] px-2 py-0.5">Pending</Badge>
                                                </div>
                                                <p className="text-muted-foreground leading-normal bg-background/50 p-2.5 rounded-xl border border-border/10 italic">
                                                    "Reason: {req.reason || 'No reason specified'}"
                                                </p>
                                                <div className="flex gap-2 justify-end">
                                                    <Button 
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleUpdateReschedule(req.id, 'rejected')}
                                                        className="h-8 rounded-lg text-[10px] font-bold uppercase"
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleUpdateReschedule(req.id, 'approved')}
                                                        className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase px-4"
                                                    >
                                                        Approve Reschedule
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Staff Directory Card */}
                <Card className="rounded-[2.5rem] bg-card border border-border/40 shadow-2xl p-8">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div>
                            <h3 className="text-xl font-bold text-foreground font-serif italic text-left">Staff Directory</h3>
                            <p className="text-sm text-muted-foreground italic tracking-tight text-left">Active academy profiles & payroll details</p>
                        </div>
                        <Link href="/hr/staff" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">View All</Link>
                    </div>

                    <div className="space-y-4 text-left">
                        {data.recentStaff?.map((staff: any) => (
                            <div key={staff.id} className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-card hover:border-indigo-600/35 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:scale-110 transition-transform">
                                        {staff.full_name?.charAt(0) || staff.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground tracking-tight">{staff.full_name || staff.email.split('@')[0]}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                                            {getRoleDisplayName(staff.role, staff.full_name)}
                                            {staff.staff_details?.employee_id && (
                                                <span className="text-muted-foreground ml-2 normal-case font-mono">({staff.staff_details.employee_id})</span>
                                            )}
                                        </p>
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

            {/* STAFF SHIFTS TRACKER CONSOLE */}
            <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card overflow-hidden">
                <CardHeader className="border-b border-border/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 font-serif italic text-left">
                            <Clock className="text-indigo-600 animate-pulse" size={22} />
                            <span>Staff Work Shifts Tracker</span>
                        </CardTitle>
                        <CardDescription className="text-xs text-left">
                            Monitor real-time shift status (Active/Offline) and monthly working hours registry for Sales, Operations, HR, and Admin teams.
                        </CardDescription>
                        
                        {/* Clean inline metrics summary */}
                        {!isShiftsLoading && shiftReport?.staffStats && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground pt-1.5 text-left">
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>Active Now:</span>
                                    <strong className="text-foreground">{shiftReport.staffStats.filter((s: any) => s.isActive).length} online</strong>
                                </div>
                                <span className="text-muted-foreground/30">•</span>
                                <div>
                                    <span>Today's Total:</span>
                                    <strong className="text-foreground"> {shiftReport.staffStats.reduce((acc: number, curr: any) => acc + (curr.totalTodayHours || 0), 0).toFixed(1)} hrs</strong>
                                </div>
                                <span className="text-muted-foreground/30">•</span>
                                <div>
                                    <span>Monthly Total:</span>
                                    <strong className="text-indigo-600 dark:text-indigo-400"> {shiftReport.staffStats.reduce((acc: number, curr: any) => acc + (curr.totalMonthlyHours || 0), 0).toFixed(1)} hrs</strong>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Selector dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Month:</span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-background border border-border/60 text-foreground text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                            >
                                {(() => {
                                    const options = [];
                                    const d = new Date();
                                    for (let i = 0; i < 6; i++) {
                                        const temp = new Date(d.getFullYear(), d.getMonth() - i, 1);
                                        const label = temp.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                                        const val = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
                                        options.push(
                                            <option key={val} value={val}>
                                                {label}
                                            </option>
                                        );
                                    }
                                    return options;
                                })()}
                            </select>
                        </div>

                        {/* View Tabs */}
                        <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border/30">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShiftActiveTab('today')}
                                className={cn(
                                    "h-8 rounded-lg text-xs font-bold uppercase tracking-wider px-3.5",
                                    shiftActiveTab === 'today'
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Today's Status
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShiftActiveTab('monthly')}
                                className={cn(
                                    "h-8 rounded-lg text-xs font-bold uppercase tracking-wider px-3.5",
                                    shiftActiveTab === 'monthly'
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Monthly logs
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {isShiftsLoading ? (
                        <div className="flex items-center justify-center py-16 animate-pulse">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Syncing shift data...</p>
                            </div>
                        </div>
                    ) : !shiftReport?.staffStats || shiftReport.staffStats.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground italic text-xs">
                            No staff shifts records found for this period.
                        </div>
                    ) : (
                        <div>
                            {/* Tab 1: Today's Status table */}
                            {shiftActiveTab === 'today' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                <th className="p-4 pl-6">Staff Member</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4">Shift Clock In</th>
                                                <th className="p-4">Shift Clock Out</th>
                                                <th className="p-4 text-right pr-6">Today's Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {shiftReport.staffStats.map((staff: any) => {
                                                const todayStr = new Date().toISOString().split('T')[0];
                                                const todayShifts = staff.shifts.filter((s: any) => {
                                                    const d = new Date(s.clock_in);
                                                    return d.toISOString().split('T')[0] === todayStr;
                                                });
                                                const latestTodayShift = staff.currentShift || todayShifts[0];

                                                return (
                                                    <tr key={staff.profile.id} className="hover:bg-muted/10 transition-colors">
                                                        <td className="p-4 pl-6">
                                                            <p className="font-semibold text-foreground">
                                                                {staff.profile.full_name || staff.profile.email.split('@')[0]}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                                                                {getRoleDisplayName(staff.profile.role, staff.profile.full_name)}
                                                            </p>
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge className={cn(
                                                                "text-[9px] font-black uppercase border-none rounded-full px-2.5 py-0.5",
                                                                staff.isActive 
                                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400" 
                                                                    : "bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400"
                                                            )}>
                                                                {staff.isActive ? "Online" : "Offline"}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-4 text-muted-foreground">
                                                            {latestTodayShift ? (
                                                                <span>
                                                                    {new Date(latestTodayShift.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground/35 italic">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {staff.isActive ? (
                                                                <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 text-[9px] uppercase tracking-wider">
                                                                    Active Now
                                                                </span>
                                                            ) : latestTodayShift && latestTodayShift.clock_out ? (
                                                                <span className="text-muted-foreground">
                                                                    {new Date(latestTodayShift.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground/35 italic">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right pr-6 font-extrabold text-foreground">
                                                            {staff.totalTodayHours > 0 ? `${staff.totalTodayHours} hrs` : <span className="text-muted-foreground/35 italic">0 hrs</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Tab 2: Monthly Logs list */}
                            {shiftActiveTab === 'monthly' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                <th className="p-4">Staff Member</th>
                                                <th className="p-4">Shift Clock In</th>
                                                <th className="p-4">Shift Clock Out</th>
                                                <th className="p-4 text-right">Shift Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/10">
                                            {(() => {
                                                // Extract all logs flatly and sort by clock_in desc
                                                const allLogs: any[] = [];
                                                shiftReport.staffStats.forEach((staff: any) => {
                                                    staff.shifts.forEach((s: any) => {
                                                        allLogs.push({
                                                            ...s,
                                                            profile: staff.profile
                                                        });
                                                    });
                                                });
                                                allLogs.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());

                                                if (allLogs.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan={4} className="p-8 text-center text-muted-foreground italic">
                                                                No shift logs registered for this month.
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                return allLogs.map((log: any) => {
                                                    const formatTime = (isoString: string | null) => {
                                                        if (!isoString) return "-";
                                                        const d = new Date(isoString);
                                                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ", " + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                                    };

                                                    const durationText = () => {
                                                        const mins = log.durationMinutes || 0;
                                                        if (mins < 60) return `${mins} mins`;
                                                        const hrs = Math.floor(mins / 60);
                                                        const remMins = mins % 60;
                                                        return remMins > 0 ? `${hrs} hrs ${remMins} mins` : `${hrs} hrs`;
                                                    };

                                                    return (
                                                        <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-4">
                                                                <p className="font-semibold text-foreground">
                                                                    {log.profile.full_name || log.profile.email.split('@')[0]}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                                                                    {getRoleDisplayName(log.profile.role, log.profile.full_name)}
                                                                </p>
                                                            </td>
                                                            <td className="p-4 text-muted-foreground">
                                                                {formatTime(log.clock_in)}
                                                            </td>
                                                            <td className="p-4">
                                                                {log.clock_out ? (
                                                                    <span className="text-muted-foreground">{formatTime(log.clock_out)}</span>
                                                                ) : (
                                                                    <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 text-[9px] uppercase tracking-wider">
                                                                        Active Shift
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-right font-extrabold text-foreground">
                                                                {durationText()}
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Full Width Row: Complaints & Support Tickets log */}
            <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                <CardHeader className="border-b border-border/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <AlertCircle className="text-rose-500 animate-pulse" size={18} />
                            <span>Complaints & support issues feed</span>
                        </CardTitle>
                        <CardDescription className="text-xs">Parent feedback complaints registry requiring review and action.</CardDescription>
                    </div>
                    <Badge className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 uppercase font-black text-[9px] px-2.5 py-1 border-none rounded-full shrink-0">
                        {complaintsList.filter(c => c.status === 'pending').length} tickets active
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Student & Parent</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4">Filed</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Control Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {complaintsList.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="p-4">
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", 
                                                c.category === 'Technical' && "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
                                                c.category === 'Billing' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                                                c.category === 'Content' && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                                                c.category === 'Scheduling' && "bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400"
                                            )}>
                                                {c.category}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold text-foreground">{c.studentName}</p>
                                            <p className="text-[9px] text-muted-foreground">Parent: {c.parentName}</p>
                                        </td>
                                        <td className="p-4 max-w-[300px] text-muted-foreground truncate" title={c.description}>
                                            {c.description}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {c.date}
                                        </td>
                                        <td className="p-4">
                                            <Badge className={cn("text-[9px] font-black uppercase border-none rounded-full px-2.5 py-0.5", 
                                                c.status === 'resolved' 
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse'
                                            )}>
                                                {c.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            {c.status === 'pending' ? (
                                                <Button 
                                                    onClick={() => handleResolveComplaint(c.id)}
                                                    className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 flex items-center justify-center gap-1.5 ml-auto shadow-sm"
                                                >
                                                    <Check size={12} />
                                                    <span>Resolve</span>
                                                </Button>
                                            ) : (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px] flex items-center justify-end gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-500/10 rounded-lg w-fit ml-auto">
                                                    <CheckCircle2 size={12} /> Closed
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
