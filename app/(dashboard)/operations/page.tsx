'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Activity, Video, Users, AlertCircle, CheckCircle, 
    Clock, MessageSquare, ClipboardList, HelpCircle, Share2, Plus, LogOut, Check, CreditCard, Loader2, Key, CalendarRange
} from "lucide-react";
import { cn, formatTime12Hour, ensureAbsoluteUrl } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
    getLiveClasses, getPendingClassVerifications, finalizeClassSession, 
    getAllCompletedClassLogs, getStudentsWithClasses, getAllTeachers, onboardStudent,
    getAllRequestsData, updateRescheduleStatus, updateLeaveStatus
} from "@/app/(dashboard)/attendance/actions";
import { getPendingPayments, processPaymentApproval, recordManualPayment } from "@/app/(dashboard)/payments/actions";
import { getLeads, updateLead } from "@/app/(dashboard)/sales/actions";
import { CreateLiveClassDialog } from "@/components/features/teacher/CreateLiveClassDialog";
import { ManageSchedulesDialog } from "@/components/features/teacher/ManageSchedulesDialog";
import { SessionLogsHistory } from "@/components/features/hr/SessionLogsHistory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function OperationsDashboard() {
    const [classes, setClasses] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [homeworkLogs, setHomeworkLogs] = useState<any[]>([]);
    const [completedClasses, setCompletedClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState("Operations");

    // Manual Payment States
    const [showManualPayment, setShowManualPayment] = useState(false);
    const [manualStudentId, setManualStudentId] = useState("");
    const [manualAmount, setManualAmount] = useState("");
    const [manualMonth, setManualMonth] = useState(new Date().getMonth() + 1);
    const [manualYear, setManualYear] = useState(new Date().getFullYear());
    const [manualMethod, setManualMethod] = useState<'bank_transfer' | 'cash' | 'other'>('bank_transfer');
    const [manualTxnId, setManualTxnId] = useState("");
    const [isSavingManualPayment, setIsSavingManualPayment] = useState(false);

    // Quick Password Reset States
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetTargetUser, setResetTargetUser] = useState("");
    const [resetNewPassword, setResetNewPassword] = useState("");
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    useEffect(() => {
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
    
    // Onboarding Form States
    const [showOnboard, setShowOnboard] = useState(false);
    const [onboardName, setOnboardName] = useState("");
    const [onboardEmail, setOnboardEmail] = useState("");
    const [onboardMobile, setOnboardMobile] = useState("");
    const [onboardClass, setOnboardClass] = useState("");
    const [onboardFee, setOnboardFee] = useState("4500");
    const [onboardClassesPerMonth, setOnboardClassesPerMonth] = useState("12");
    const [onboardTeacherId, setOnboardTeacherId] = useState("");
    const [onboardStudentId, setOnboardStudentId] = useState("");
    const [onboardParentEmail, setOnboardParentEmail] = useState("");
    const [onboardSubject1Name, setOnboardSubject1Name] = useState("Maths");
    const [onboardSubject2Name, setOnboardSubject2Name] = useState("");
    const [onboardFee2, setOnboardFee2] = useState("0");
    const [onboardClassesPerMonth2, setOnboardClassesPerMonth2] = useState("0");
    const [onboardTeacherId2, setOnboardTeacherId2] = useState("");
    const [onboardSubject3Name, setOnboardSubject3Name] = useState("");
    const [onboardFee3, setOnboardFee3] = useState("0");
    const [onboardClassesPerMonth3, setOnboardClassesPerMonth3] = useState("0");
    const [onboardTeacherId3, setOnboardTeacherId3] = useState("");
    const [onboardSubject4Name, setOnboardSubject4Name] = useState("");
    const [onboardFee4, setOnboardFee4] = useState("0");
    const [onboardClassesPerMonth4, setOnboardClassesPerMonth4] = useState("0");
    const [onboardTeacherId4, setOnboardTeacherId4] = useState("");
    const [onboardSubject5Name, setOnboardSubject5Name] = useState("");
    const [onboardFee5, setOnboardFee5] = useState("0");
    const [onboardClassesPerMonth5, setOnboardClassesPerMonth5] = useState("0");
    const [onboardTeacherId5, setOnboardTeacherId5] = useState("");
    const [visibleSubjectsCount, setVisibleSubjectsCount] = useState(1);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedClasses, fetchedLeads, fetchedCompleted, fetchedStudents, fetchedTeachers, fetchedRequests, fetchedPayments] = await Promise.all([
                getLiveClasses(),
                getLeads(true),
                getAllCompletedClassLogs(),
                getStudentsWithClasses(),
                getAllTeachers(),
                getAllRequestsData(),
                getPendingPayments()
            ]);
            setClasses(fetchedClasses || []);
            setLeads(fetchedLeads || []);
            setCompletedClasses(fetchedCompleted || []);
            setStudents(fetchedStudents || []);
            setTeachers(fetchedTeachers || []);
            setRescheduleRequests(fetchedRequests.rescheduleRequests || []);
            setLeaveRequests(fetchedRequests.leaveRequests || []);
            setPendingPayments(fetchedPayments || []);

            
            // Set complaints
            setComplaints([
                { id: "c1", parent: "Rajesh Sharma", student: "Aarav", issue: "Parent reports audio lags in Hindi class", status: "pending", date: "Today" },
                { id: "c2", parent: "Neha Patel", student: "Priya", issue: "Math homework link not loading", status: "pending", date: "Yesterday" }
            ]);

            // Set homework tracking logs
            setHomeworkLogs([
                { id: "h1", student: "Aarav Sharma", title: "Hindi Vowels Handwriting", status: "submitted", fileUrl: "https://supabase.co/submissions/aarav_hindi.jpg", date: "Today" },
                { id: "h2", student: "Priya Patel", title: "Math Addition Sheet", status: "assigned", fileUrl: null, date: "Yesterday" }
            ]);
        } catch (error) {
            console.error("Failed to load operations metrics:", error);
            toast.error("Failed to load operations metrics");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleShareLink = (title: string, link: string) => {
        navigator.clipboard.writeText(link);
        toast.success(`Copied join link for "${title}"! Share with parent.`);
    };

    const handleResolveComplaint = (id: string) => {
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: "resolved" } : c));
        toast.success("Parent complaint marked as resolved!");
    };

    const handleUpdateReschedule = async (requestId: string, status: 'approved' | 'rejected') => {
        setIsLoading(true);
        try {
            const res = await updateRescheduleStatus(requestId, status);
            if (res.success) {
                toast.success(`Reschedule request marked as ${status}!`);
                await loadData();
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
                await loadData();
            } else {
                toast.error(res.error || "Failed to update leave request.");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprovePayment = async (paymentId: string) => {
        setIsLoading(true);
        try {
            const res = await processPaymentApproval(paymentId, 'completed');
            if (res.success) {
                toast.success(
                    <div className="flex flex-col gap-1 text-left">
                        <span className="font-bold text-foreground">Payment approved successfully!</span>
                        <span className="text-muted-foreground text-[10px] font-mono">Receipt No: {res.receiptNumber}</span>
                        <a 
                            href={`/payments/receipt/${paymentId}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                            View / Print Receipt
                        </a>
                    </div>
                );
                try {
                    window.open(`/payments/receipt/${paymentId}`, '_blank');
                } catch (e) {
                    console.error("Popup blocked:", e);
                }
                await loadData();
            } else {
                toast.error(res.error || "Failed to approve payment.");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectPayment = async (paymentId: string) => {
        setIsLoading(true);
        try {
            const res = await processPaymentApproval(paymentId, 'failed');
            if (res.success) {
                toast.success("Payment request marked as failed/rejected.");
                await loadData();
            } else {
                toast.error(res.error || "Failed to reject payment.");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOnboardStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onboardName || !onboardEmail || !onboardMobile) {
            toast.error("Name, email and mobile number are mandatory.");
            return;
        }
        
        setIsLoading(true);
        try {
            const { formatStudentIdAndMobile } = await import("@/lib/utils");
            const serializedId = formatStudentIdAndMobile(onboardStudentId, onboardMobile);

            const res = await onboardStudent({
                fullName: onboardName,
                email: onboardEmail,
                gradeLevel: onboardClass || "N/A",
                monthlyFee: Number(onboardFee) || 4500,
                classesPerMonth: Number(onboardClassesPerMonth) || 12,
                assignedTeacherId: onboardTeacherId === "none" || !onboardTeacherId ? undefined : onboardTeacherId,
                customStudentId: serializedId,
                parentEmail: onboardParentEmail || undefined,
                subjectName1: onboardSubject1Name || "Maths",
                subjectName2: onboardSubject2Name || undefined,
                monthlyFee2: Number(onboardFee2) || 0,
                classesPerMonth2: Number(onboardClassesPerMonth2) || 0,
                assignedTeacherId2: onboardTeacherId2 === "none" || !onboardTeacherId2 ? undefined : onboardTeacherId2,
                subjectName3: onboardSubject3Name || undefined,
                monthlyFee3: Number(onboardFee3) || 0,
                classesPerMonth3: Number(onboardClassesPerMonth3) || 0,
                assignedTeacherId3: onboardTeacherId3 === "none" || !onboardTeacherId3 ? undefined : onboardTeacherId3,
                subjectName4: onboardSubject4Name || undefined,
                monthlyFee4: Number(onboardFee4) || 0,
                classesPerMonth4: Number(onboardClassesPerMonth4) || 0,
                assignedTeacherId4: onboardTeacherId4 === "none" || !onboardTeacherId4 ? undefined : onboardTeacherId4,
                subjectName5: onboardSubject5Name || undefined,
                monthlyFee5: Number(onboardFee5) || 0,
                classesPerMonth5: Number(onboardClassesPerMonth5) || 0,
                assignedTeacherId5: onboardTeacherId5 === "none" || !onboardTeacherId5 ? undefined : onboardTeacherId5
            });

            if (res.error) {
                toast.error(`Onboarding failed: ${res.error}`);
            } else {
                toast.success(`Student profile created for "${onboardName}"! Default password is 'password123'.`);
                setShowOnboard(false);
                setOnboardName("");
                setOnboardEmail("");
                setOnboardMobile("");
                setOnboardClass("");
                setOnboardFee("4500");
                setOnboardClassesPerMonth("12");
                setOnboardTeacherId("");
                setOnboardStudentId("");
                setOnboardParentEmail("");
                setOnboardSubject1Name("Maths");
                setOnboardSubject2Name("");
                setOnboardFee2("0");
                setOnboardClassesPerMonth2("0");
                setOnboardTeacherId2("");
                setOnboardSubject3Name("");
                setOnboardFee3("0");
                setOnboardClassesPerMonth3("0");
                setOnboardTeacherId3("");
                setOnboardSubject4Name("");
                setOnboardFee4("0");
                setOnboardClassesPerMonth4("0");
                setOnboardTeacherId4("");
                setOnboardSubject5Name("");
                setOnboardFee5("0");
                setOnboardClassesPerMonth5("0");
                setOnboardTeacherId5("");
                setVisibleSubjectsCount(1);
                await loadData();
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to onboard student");
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualStudentChange = (studentId: string) => {
        setManualStudentId(studentId);
        const selectedStudent = students.find(s => s.id === studentId);
        if (selectedStudent) {
            const details = Array.isArray(selectedStudent.student_details)
                ? selectedStudent.student_details[0]
                : selectedStudent.student_details;
            if (details?.monthly_fee) {
                setManualAmount(String(details.monthly_fee));
            } else {
                setManualAmount("4500");
            }
        }
    };

    const handleRecordManualPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualStudentId || !manualAmount) {
            toast.error("Please select a student and enter amount.");
            return;
        }
        setIsSavingManualPayment(true);
        try {
            const res = await recordManualPayment({
                studentId: manualStudentId,
                amount: Number(manualAmount),
                month: manualMonth,
                year: manualYear,
                method: manualMethod,
                transactionId: manualTxnId
            });
            if (res.success) {
                const newPaymentId = res.payment?.id;
                toast.success(
                    <div className="flex flex-col gap-1 text-left">
                        <span className="font-bold text-foreground">Manual payment recorded and student activated!</span>
                        {res.payment?.receipt_number && (
                            <span className="text-muted-foreground text-[10px] font-mono">Receipt No: {res.payment.receipt_number}</span>
                        )}
                        {newPaymentId && (
                            <a 
                                href={`/payments/receipt/${newPaymentId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                                View / Print Receipt
                            </a>
                        )}
                    </div>
                );
                if (newPaymentId) {
                    try {
                        window.open(`/payments/receipt/${newPaymentId}`, '_blank');
                    } catch (e) {
                        console.error("Popup blocked:", e);
                    }
                }
                setShowManualPayment(false);
                setManualStudentId("");
                setManualAmount("");
                setManualTxnId("");
                await loadData();
            } else {
                toast.error(res.error || "Failed to record manual payment.");
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred.");
        } finally {
            setIsSavingManualPayment(false);
        }
    };

    // Quality Alerts Calculations
    const classesNotMarked = classes.filter(c => 
        (c.status === 'scheduled' || c.status === 'ongoing') && 
        (new Date().getTime() - new Date(c.scheduled_at).getTime() >= 24 * 60 * 60 * 1000)
    );
    const pendingComplaintsCount = complaints.filter(c => c.status === 'pending').length;
    const unpaidLeadsCount = leads.filter(l => l.status === 'converted' && l.value > 4000).length; // Simulated payment pending

    const nowTime = new Date().getTime();
    const lateTutorAlerts = classes.filter(c => {
        if (c.status !== 'scheduled' && c.status !== 'ongoing') return false;
        const startTime = new Date(c.scheduled_at).getTime();
        const elapsed = nowTime - startTime;
        return elapsed > 5 * 60 * 1000 && elapsed < 24 * 60 * 60 * 1000 && !c.tutor_joined_at;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const activeTeacherLeaves = leaveRequests.filter(leave => {
        return leave.status === 'approved' && 
               leave.student?.role === 'teacher' && 
               todayStr >= leave.start_date && 
               todayStr <= leave.end_date;
    });

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const feeReminderAlerts = students.filter(student => {
        if (student.status === 'active') return false;
        const completedThisMonth = (student.classes || []).filter((c: any) => {
            if (c.status !== 'completed') return false;
            const d = new Date(c.scheduled_at);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;
        const limit = student.classes_per_month || 12;
        return completedThisMonth >= limit - 1;
    });

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-left">
            
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-500/10">
                        <Activity size={12} />
                        <span>Operations Hub Active</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
                        {userName}'s Control & QA
                    </h1>
                    <p className="text-xs text-muted-foreground italic font-medium">
                        Monitor live classes, verify attendance logs, process parent complaints, and track homework submissions.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    <CreateLiveClassDialog />
                    <ManageSchedulesDialog />
                    <a href="/admin/schedules">
                        <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md h-10">
                            Class Schedules
                        </Button>
                    </a>
                    <Button 
                        onClick={() => setShowOnboard(true)}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-10"
                    >
                        <Plus className="h-4 w-4" />
                        Onboard Student
                    </Button>
                    <Button 
                        onClick={() => setShowManualPayment(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md h-10"
                    >
                        <CreditCard className="h-4 w-4" />
                        Record Manual Payment
                    </Button>
                    <Button 
                        onClick={() => setShowResetPassword(true)}
                        className="gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md h-10"
                    >
                        <Key className="h-4 w-4" />
                        Reset Password
                    </Button>
                    <ThemeToggle />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[50vh] animate-pulse">
                    <Activity className="text-indigo-600 animate-spin mr-2" size={24} />
                    <span className="text-xs font-black uppercase text-indigo-600/50">Syncing live class connections...</span>
                </div>
            ) : (
                <>
                    {/* QUALITY ALERTS DASHBOARD SECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        
                        <Card className="p-5 border-l-4 border-l-rose-500 rounded-xl bg-card shadow-md flex items-start gap-4">
                            <AlertCircle className="text-rose-500 shrink-0 mt-1" size={20} />
                            <div>
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Class Not Marked</span>
                                <span className="block text-2xl font-extrabold text-foreground mt-1">{classesNotMarked.length} classes</span>
                                <p className="text-[9px] text-rose-500 mt-1 font-semibold">Tutors forgot to log yesterday's sessions.</p>
                            </div>
                        </Card>

                        <Card className="p-5 border-l-4 border-l-amber-500 rounded-xl bg-card shadow-md flex items-start gap-4">
                            <AlertCircle className="text-amber-500 shrink-0 mt-1" size={20} />
                            <div>
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Parent Complaints Pending</span>
                                <span className="block text-2xl font-extrabold text-foreground mt-1">{pendingComplaintsCount} issues</span>
                                <p className="text-[9px] text-amber-500 mt-1 font-semibold">Awaiting technical resolution.</p>
                            </div>
                        </Card>

                        <Card className="p-5 border-l-4 border-l-indigo-500 rounded-xl bg-card shadow-md flex items-start gap-4">
                            <ClipboardList className="text-indigo-500 shrink-0 mt-1" size={20} />
                            <div>
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Student Missed Alerts</span>
                                <span className="block text-2xl font-extrabold text-foreground mt-1">1 alert</span>
                                <p className="text-[9px] text-indigo-500 mt-1 font-semibold">Aarav absent 3 times consecutively.</p>
                            </div>
                        </Card>

                        <Card className="p-5 border-l-4 border-l-emerald-500 rounded-xl bg-card shadow-md flex items-start gap-4">
                            <CheckCircle className="text-emerald-500 shrink-0 mt-1" size={20} />
                            <div>
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Onboarding Pending</span>
                                <span className="block text-2xl font-extrabold text-foreground mt-1">{unpaidLeadsCount} leads</span>
                                <p className="text-[9px] text-emerald-500 mt-1 font-semibold">Payment cleared. Awaiting batches setup.</p>
                            </div>
                        </Card>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-lg flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Schedules Monitor</h3>
                                <p className="text-xs opacity-80">Track all active students, teachers & class links.</p>
                            </div>
                            <Link href="/operations/schedules">
                                <Button size="sm" variant="secondary" className="rounded-xl font-bold">Manage</Button>
                            </Link>
                        </div>
                        <div className="bg-emerald-600 rounded-[2rem] p-6 text-white shadow-lg flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Fees & Ledger</h3>
                                <p className="text-xs opacity-80">Approve payments & audit receipt logs.</p>
                            </div>
                            <Link href="/operations/fee-ledger">
                                <Button size="sm" variant="secondary" className="rounded-xl font-bold">Audit</Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Left Column */}
                        <div className="space-y-6">
                            {/* OPERATIONS CONTROL & QUALITY DESK */}
                            {(lateTutorAlerts.length > 0 || feeReminderAlerts.length > 0) && (
                                <Card className="rounded-[2.5rem] border-2 border-rose-500/20 dark:border-rose-950/40 shadow-xl overflow-hidden bg-card relative">
                                    <div className="absolute right-6 top-6 animate-ping h-2.5 w-2.5 rounded-full bg-rose-500" />
                                    <CardHeader className="bg-rose-50/50 dark:bg-rose-950/10 border-b border-border/10 p-6">
                                        <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-950 dark:text-rose-100">
                                            <AlertCircle className="text-rose-600" size={18} />
                                            <span>Operational Control & Quality Desk</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs text-rose-600/70 dark:text-rose-400/70">
                                            Real-time alerts requiring immediate coordinator resolution.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-5">
                                        
                                        {/* 1. LATE TUTOR ALERTS */}
                                        {lateTutorAlerts.length > 0 && (
                                            <div className="space-y-2.5">
                                                <span className="block text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">🚨 Tutor Late / No-Show Alert ({lateTutorAlerts.length})</span>
                                                <div className="space-y-2">
                                                    {lateTutorAlerts.map(c => (
                                                        <div key={c.id} className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-xs flex justify-between items-center gap-4">
                                                            <div>
                                                                <p className="font-bold text-rose-950 dark:text-rose-200">
                                                                    <span className="underline">{c.teacher?.full_name || 'N/A'}</span> has NOT joined class!
                                                                </p>
                                                                <p className="text-[10px] text-rose-700/80 dark:text-rose-400 mt-0.5">
                                                                    Student: {c.student?.full_name || 'Student'} • Scheduled: {format(new Date(c.scheduled_at), 'hh:mm a')} ({format(new Date(c.scheduled_at), 'MMM dd')})
                                                                </p>
                                                            </div>
                                                            <a href={ensureAbsoluteUrl(c.meeting_link)} target="_blank" rel="noopener noreferrer">
                                                                <Button size="sm" className="h-7 text-[9px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-lg gap-1">
                                                                    <Video size={10} />
                                                                    <span>Join Meeting</span>
                                                                </Button>
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. FEE REMINDER ALERTS */}
                                        {feeReminderAlerts.length > 0 && (
                                            <div className="space-y-2.5">
                                                <span className="block text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">💰 Fee Renewal Alerts ({feeReminderAlerts.length})</span>
                                                <div className="space-y-2">
                                                    {feeReminderAlerts.map(student => {
                                                        const completedThisMonth = (student.classes || []).filter((c: any) => {
                                                            if (c.status !== 'completed') return false;
                                                            const d = new Date(c.scheduled_at);
                                                            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                                                        }).length;
                                                        const limit = student.classes_per_month || 12;
                                                        const isLimitReached = completedThisMonth >= limit;
                                                        return (
                                                            <div key={student.id} className={cn("p-3 border rounded-xl text-xs flex justify-between items-center gap-4",
                                                                isLimitReached 
                                                                    ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30" 
                                                                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30"
                                                            )}>
                                                                <div>
                                                                    <p className={cn("font-bold", isLimitReached ? "text-rose-950 dark:text-rose-200" : "text-amber-950 dark:text-amber-200")}>
                                                                        {student.full_name} ({completedThisMonth}/{limit} Classes)
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                        {isLimitReached ? "Completed all classes. Needs tuition renewal." : "Only 1 class remaining. Needs renewal reminder."}
                                                                    </p>
                                                                </div>
                                                                <Button 
                                                                    size="sm" 
                                                                    onClick={() => {
                                                                        setManualStudentId(student.id);
                                                                        setManualAmount(String(student.monthly_fee || 4500));
                                                                        setShowManualPayment(true);
                                                                    }}
                                                                    className="h-7 text-[9px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3"
                                                                >
                                                                    Record Fee
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        
                                    </CardContent>
                                </Card>
                            )}


                            {/* Homework Tracker Monitor */}
                            <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="border-b border-border/10 pb-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <ClipboardList className="text-indigo-600" size={18} />
                                        <span>Homework Submission Tracking</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">Checks if tutors sent worksheets and tracks parent photo uploads.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                    <th className="p-4 pl-6">Student Name</th>
                                                    <th className="p-4">Homework Worksheet</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4 text-right pr-6">Attachment File</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/10">
                                                {homeworkLogs.map(hw => (
                                                    <tr key={hw.id} className="hover:bg-muted/10 transition-colors">
                                                        <td className="p-4 pl-6 font-semibold text-foreground">
                                                            {hw.student}
                                                        </td>
                                                        <td className="p-4 text-muted-foreground">
                                                            {hw.title}
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge className={cn("text-[9px] font-black uppercase border-none rounded-full px-2.5 py-0.5",
                                                                hw.status === 'submitted' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                                            )}>
                                                                {hw.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-4 text-right pr-6">
                                                            {hw.fileUrl ? (
                                                                <a href={hw.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">
                                                                    View Photo
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted-foreground/35 italic">No photo upload</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Parent Complaints Board */}
                            <Card className="rounded-2xl border border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="border-b border-border/10 pb-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <MessageSquare className="text-rose-500" size={18} />
                                        <span>Parent Complaints Hub</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">Coordinate parent support tickets and replacement teacher requests.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4">
                                    {complaints.map(item => (
                                        <div key={item.id} className="p-4 border border-border/20 rounded-xl bg-card space-y-2 text-xs">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-foreground">Student: {item.student}</p>
                                                    <p className="text-[9px] text-muted-foreground">Parent: {item.parent} ({item.date})</p>
                                                </div>
                                                <Badge className={cn("text-[9px] font-bold border-none rounded-full px-2 py-0.5",
                                                    item.status === 'pending' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                )}>
                                                    {item.status}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground leading-normal">{item.issue}</p>
                                            
                                            {item.status === 'pending' && (
                                                <div className="flex justify-end pt-2">
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleResolveComplaint(item.id)}
                                                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1 px-3"
                                                    >
                                                        <Check size={12} />
                                                        <span>Resolve</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Demo Coordination panel */}
                            <Card className="rounded-2xl border border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="border-b border-border/10 pb-4">
                                    <CardTitle className="text-base font-bold">Demo Coordination Panel</CardTitle>
                                    <CardDescription className="text-xs">Verify completed demos and sync leads status.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 space-y-3">
                                    <div className="p-3 bg-muted/20 border border-border/20 rounded-xl text-xs flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-foreground">Rahul Kumar</p>
                                            <p className="text-[9px] text-muted-foreground">Demo scheduled yesterday • Spoken Hindi</p>
                                        </div>
                                        <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[9px] px-2 py-0.5">Follow up required</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">

                            {/* Tuition Fees Approvals Queue */}
                            <Card className="rounded-2xl border border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="bg-indigo-600/10 border-b border-border/10 pb-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <CreditCard size={18} className="text-indigo-600" />
                                        <span>Tuition Fees Approvals Queue</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Verify and approve pending UPI/Manual QR payment submissions.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4 max-h-[350px] overflow-y-auto">
                                    {pendingPayments.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic text-center py-4">
                                            No pending payment verifications.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {pendingPayments.map((payment) => (
                                                <div key={payment.id} className="p-4 border border-indigo-500/20 rounded-xl bg-indigo-50/5 dark:bg-indigo-950/5 text-xs space-y-2.5">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[8px] bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/10 inline-block mb-1">
                                                                UPI Payment Request
                                                            </span>
                                                            <p className="font-bold text-foreground">
                                                                {payment.student?.full_name || 'Student'}
                                                            </p>
                                                            <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                                                Cycle: {payment.billing_month}/{payment.billing_year}
                                                            </p>
                                                        </div>
                                                        <span className="text-sm font-black text-indigo-600">
                                                            ₹{Number(payment.amount).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="p-2 rounded bg-muted/30 font-mono text-[10px] text-muted-foreground flex justify-between items-center">
                                                        <span>UTR: {payment.transaction_id || 'N/A'}</span>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-5 w-5 rounded-md hover:bg-muted text-muted-foreground"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(payment.transaction_id || '');
                                                                toast.success("UTR copied!");
                                                            }}
                                                        >
                                                            <Share2 size={10} />
                                                        </Button>
                                                    </div>

                                                    <div className="flex justify-end gap-2 pt-1">
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleRejectPayment(payment.id)}
                                                            variant="ghost"
                                                            className="h-8 border border-rose-500/20 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase tracking-wider px-3"
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleApprovePayment(payment.id)}
                                                            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 shadow-md shadow-indigo-600/10"
                                                        >
                                                            Approve & Activate
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>


                            {/* Tutors Currently on Leave Board */}
                            <Card className="rounded-2xl border border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="bg-amber-500/10 border-b border-border/10 pb-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-950 dark:text-amber-100">
                                        <AlertCircle className="text-amber-600" size={18} />
                                        <span>Tutors Currently on Leave</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs text-amber-800/70 dark:text-amber-400/70">
                                        Approved tutor leave requests active today.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5">
                                    {activeTeacherLeaves.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic text-center py-2">No tutors are currently on leave today.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {activeTeacherLeaves.map(leave => (
                                                <div key={leave.id} className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-foreground">{leave.student?.full_name || 'Tutor'}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                            Dates: {leave.start_date} to {leave.end_date}
                                                        </p>
                                                        {leave.reason && (
                                                            <p className="text-muted-foreground mt-1.5 italic bg-background/50 p-2 rounded border border-border/10">"{leave.reason}"</p>
                                                        )}
                                                    </div>
                                                    <Badge className="bg-amber-600 text-white border-none font-bold text-[9px] uppercase px-2 py-0.5">On Leave</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Student Reschedule & Leave Requests Board */}
                            <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="border-b border-border/10 pb-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Activity className="text-indigo-600" size={18} />
                                        <span>Reschedule & Leave Requests</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">Review and manage student schedule adjustments and leaves.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4 max-h-[380px] overflow-y-auto">
                                    {leaveRequests.filter(l => l.status === 'pending').length === 0 && 
                                     rescheduleRequests.filter(r => r.status === 'pending').length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic text-center py-4">No pending leave or reschedule requests.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Leaves */}
                                            {leaveRequests.filter(l => l.status === 'pending').map(leave => (
                                                <div key={leave.id} className="p-4 border border-violet-500/20 rounded-xl bg-violet-50/5 dark:bg-violet-950/5 text-xs space-y-2.5">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest text-[8px] bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded border border-violet-500/10 inline-block mb-1">Leave Request</span>
                                                            <p className="font-bold text-foreground">
                                                                {leave.student?.full_name || 'User'}
                                                            </p>
                                                            <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                                                Dates: {leave.start_date} to {leave.end_date}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-none font-bold text-[9px] px-2 py-0.5">Pending</Badge>
                                                    </div>
                                                    {leave.reason && (
                                                        <p className="text-muted-foreground italic leading-normal bg-background/50 p-2 rounded border border-border/10">"{leave.reason}"</p>
                                                    )}
                                                    {leave.teacher?.full_name && (
                                                        <p className="text-[10px] text-muted-foreground/60">Assigned Tutor: {leave.teacher.full_name}</p>
                                                    )}
                                                    <div className="flex justify-end gap-2 pt-1">
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleUpdateLeave(leave.id, 'rejected')}
                                                            variant="ghost"
                                                            className="h-8 border border-rose-500/20 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase tracking-wider px-3"
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleUpdateLeave(leave.id, 'approved')}
                                                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 shadow-md shadow-emerald-600/10"
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Reschedules */}
                                            {rescheduleRequests.filter(r => r.status === 'pending').map(req => (
                                                <div key={req.id} className="p-4 border border-indigo-500/20 rounded-xl bg-indigo-50/5 dark:bg-indigo-950/5 text-xs space-y-2.5">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[8px] bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/10 inline-block mb-1">Reschedule Proposal</span>
                                                            <p className="font-bold text-foreground">{req.student?.full_name || 'Student'}</p>
                                                            <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                                                Class: {req.class?.title || 'Study Class'}
                                                            </p>
                                                            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[10px] mt-1">
                                                                Proposed: {req.requested_date} @ {formatTime12Hour(req.requested_time)}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-none font-bold text-[9px] px-2 py-0.5">Pending</Badge>
                                                    </div>
                                                    {req.reason && (
                                                        <p className="text-muted-foreground italic leading-normal bg-background/50 p-2 rounded border border-border/10">Reason: "{req.reason}"</p>
                                                    )}
                                                    {req.teacher?.full_name && (
                                                        <p className="text-[10px] text-muted-foreground/60">Assigned Tutor: {req.teacher.full_name}</p>
                                                    )}
                                                    <div className="flex justify-end gap-2 pt-1">
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleUpdateReschedule(req.id, 'rejected')}
                                                            variant="ghost"
                                                            className="h-8 border border-rose-500/20 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase tracking-wider px-3"
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleUpdateReschedule(req.id, 'approved')}
                                                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 shadow-md shadow-emerald-600/10"
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            


                        </div>

                    </div>
                </>
            )}
                {/* ONBOARDING MODAL DIALOG */}
            {showOnboard && (
                <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <Card className="w-full max-w-[460px] rounded-2xl p-6 bg-card border-none shadow-2xl relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute right-4 top-4 text-muted-foreground rounded-full z-10"
                            onClick={() => setShowOnboard(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        
                        <CardHeader className="px-0 pb-4 shrink-0">
                            <CardTitle className="font-serif text-xl font-bold">Onboard New Admission</CardTitle>
                            <CardDescription className="text-xs">Clear payment and trigger student portal setup.</CardDescription>
                        </CardHeader>
                        
                        <form onSubmit={handleOnboardStudent} className="flex flex-col flex-1 min-h-0">
                            <div className="overflow-y-auto pr-1 flex-1 space-y-4 text-xs pb-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-name">Student Full Name *</Label>
                                    <Input 
                                        id="student-name"
                                        required
                                        value={onboardName}
                                        onChange={(e) => setOnboardName(e.target.value)}
                                        placeholder="e.g. Rohan Sen"
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-id">Student ID (Optional)</Label>
                                    <Input 
                                        id="student-id"
                                        value={onboardStudentId}
                                        onChange={(e) => setOnboardStudentId(e.target.value)}
                                        placeholder="e.g. EH-ST-1001"
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-email">User ID (Login Email) *</Label>
                                    <Input 
                                        id="student-email"
                                        required
                                        type="email"
                                        value={onboardEmail}
                                        onChange={(e) => setOnboardEmail(e.target.value)}
                                        placeholder="e.g. rohan@edhorizon.com"
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="parent-email">Parent Email (Optional)</Label>
                                    <Input 
                                        id="parent-email"
                                        type="email"
                                        value={onboardParentEmail}
                                        onChange={(e) => setOnboardParentEmail(e.target.value)}
                                        placeholder="parent@example.com"
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-mobile">Parent Mobile Number *</Label>
                                    <Input 
                                        id="student-mobile"
                                        required
                                        value={onboardMobile}
                                        onChange={(e) => setOnboardMobile(e.target.value)}
                                        placeholder="e.g. 9876543210"
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-class">Grade</Label>
                                    <Input 
                                        id="student-class"
                                        value={onboardClass}
                                        onChange={(e) => setOnboardClass(e.target.value)}
                                        placeholder="e.g. Class 3"
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>

                                <div className="space-y-4 border-t border-border/10 pt-4">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-600">Subject Packages</h4>
                                    
                                    {/* Subject 1 (Primary) */}
                                    <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 1 (Primary)</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-name">Subject Name</Label>
                                                <Input 
                                                    id="sub1-name"
                                                    value={onboardSubject1Name}
                                                    onChange={(e) => setOnboardSubject1Name(e.target.value)}
                                                    placeholder="e.g. Maths"
                                                    className="rounded-xl h-10 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-fee">Fee (₹)</Label>
                                                <Input 
                                                    id="sub1-fee"
                                                    value={onboardFee}
                                                    onChange={(e) => setOnboardFee(e.target.value)}
                                                    placeholder="4500"
                                                    className="rounded-xl h-10 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-classes">Classes / Month</Label>
                                                <Input 
                                                    id="sub1-classes"
                                                    value={onboardClassesPerMonth}
                                                    onChange={(e) => setOnboardClassesPerMonth(e.target.value)}
                                                    placeholder="12"
                                                    className="rounded-xl h-10 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-tutor">Assign Tutor</Label>
                                                <Select onValueChange={setOnboardTeacherId} value={onboardTeacherId}>
                                                    <SelectTrigger id="sub1-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                                        <SelectValue placeholder="Assign tutor..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border border-border/40">
                                                        <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                        {teachers.map(t => (
                                                            <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                {t.full_name || t.email}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subject 2 */}
                                    {visibleSubjectsCount >= 2 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 2</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-name">Subject Name</Label>
                                                    <Input 
                                                        id="sub2-name"
                                                        value={onboardSubject2Name}
                                                        onChange={(e) => setOnboardSubject2Name(e.target.value)}
                                                        placeholder="e.g. Science"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-fee">Fee (₹)</Label>
                                                    <Input 
                                                        id="sub2-fee"
                                                        value={onboardFee2}
                                                        onChange={(e) => setOnboardFee2(e.target.value)}
                                                        placeholder="3500"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-classes">Classes / Month</Label>
                                                    <Input 
                                                        id="sub2-classes"
                                                        value={onboardClassesPerMonth2}
                                                        onChange={(e) => setOnboardClassesPerMonth2(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId2} value={onboardTeacherId2}>
                                                        <SelectTrigger id="sub2-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subject 3 */}
                                    {visibleSubjectsCount >= 3 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 3</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-name">Subject Name</Label>
                                                    <Input 
                                                        id="sub3-name"
                                                        value={onboardSubject3Name}
                                                        onChange={(e) => setOnboardSubject3Name(e.target.value)}
                                                        placeholder="e.g. English"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-fee">Fee (₹)</Label>
                                                    <Input 
                                                        id="sub3-fee"
                                                        value={onboardFee3}
                                                        onChange={(e) => setOnboardFee3(e.target.value)}
                                                        placeholder="3000"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-classes">Classes / Month</Label>
                                                    <Input 
                                                        id="sub3-classes"
                                                        value={onboardClassesPerMonth3}
                                                        onChange={(e) => setOnboardClassesPerMonth3(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId3} value={onboardTeacherId3}>
                                                        <SelectTrigger id="sub3-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subject 4 */}
                                    {visibleSubjectsCount >= 4 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 4</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-name">Subject Name</Label>
                                                    <Input 
                                                        id="sub4-name"
                                                        value={onboardSubject4Name}
                                                        onChange={(e) => setOnboardSubject4Name(e.target.value)}
                                                        placeholder="e.g. Geography"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-fee">Fee (₹)</Label>
                                                    <Input 
                                                        id="sub4-fee"
                                                        value={onboardFee4}
                                                        onChange={(e) => setOnboardFee4(e.target.value)}
                                                        placeholder="3000"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-classes">Classes / Month</Label>
                                                    <Input 
                                                        id="sub4-classes"
                                                        value={onboardClassesPerMonth4}
                                                        onChange={(e) => setOnboardClassesPerMonth4(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId4} value={onboardTeacherId4}>
                                                        <SelectTrigger id="sub4-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subject 5 */}
                                    {visibleSubjectsCount >= 5 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 5</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-name">Subject Name</Label>
                                                    <Input 
                                                        id="sub5-name"
                                                        value={onboardSubject5Name}
                                                        onChange={(e) => setOnboardSubject5Name(e.target.value)}
                                                        placeholder="e.g. History"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-fee">Fee (₹)</Label>
                                                    <Input 
                                                        id="sub5-fee"
                                                        value={onboardFee5}
                                                        onChange={(e) => setOnboardFee5(e.target.value)}
                                                        placeholder="3000"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-classes">Classes / Month</Label>
                                                    <Input 
                                                        id="sub5-classes"
                                                        value={onboardClassesPerMonth5}
                                                        onChange={(e) => setOnboardClassesPerMonth5(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId5} value={onboardTeacherId5}>
                                                        <SelectTrigger id="sub5-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Subject Package Button */}
                                    {visibleSubjectsCount < 5 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full rounded-xl border-dashed border-indigo-500/40 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 text-[11px] font-bold gap-1 mt-2 py-4 h-auto"
                                            onClick={() => setVisibleSubjectsCount(prev => Math.min(5, prev + 1))}
                                        >
                                            + Add Another Subject Package ({visibleSubjectsCount}/5)
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border/10 shrink-0">
                                <Button 
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl font-bold uppercase tracking-wider h-11 text-xs"
                                    onClick={() => setShowOnboard(false)}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider h-11 text-xs px-6"
                                >
                                    Create Student
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* MANUAL FEE UPDATE DIALOG */}
            {showManualPayment && (
                <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-[440px] rounded-[2rem] p-8 bg-card border-none shadow-2xl relative">
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute right-4 top-4 text-muted-foreground rounded-full"
                            onClick={() => { setShowManualPayment(false); setManualStudentId(""); setManualAmount(""); setManualTxnId(""); }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        
                        <CardHeader className="px-0 pb-4">
                            <CardTitle className="font-serif text-xl font-bold">Record Direct Payout / Offline Fee</CardTitle>
                            <CardDescription className="text-xs">
                                Update fees received directly via bank account, cash, or check.
                            </CardDescription>
                        </CardHeader>
                        
                        <form onSubmit={handleRecordManualPaymentSubmit} className="space-y-4 text-xs">
                            {/* Student Selection */}
                            <div className="space-y-1.5">
                                <Label htmlFor="manual-student-select">Select Student *</Label>
                                <Select onValueChange={handleManualStudentChange} value={manualStudentId}>
                                    <SelectTrigger id="manual-student-select" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                        <SelectValue placeholder="Select student profile..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-border/40">
                                        {students.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="rounded-lg">
                                                {s.full_name} ({s.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <Label htmlFor="manual-fee-amount">Amount Received (₹) *</Label>
                                <Input 
                                    id="manual-fee-amount"
                                    required
                                    type="number"
                                    value={manualAmount}
                                    onChange={(e) => setManualAmount(e.target.value)}
                                    placeholder="4500"
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>

                            {/* Month and Year Select */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-billing-month">Billing Month *</Label>
                                    <select 
                                        id="manual-billing-month"
                                        value={manualMonth}
                                        onChange={(e) => setManualMonth(Number(e.target.value))}
                                        className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <option key={m} value={m}>
                                                {format(new Date(2026, m - 1, 1), 'MMMM')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-billing-year">Billing Year *</Label>
                                    <select 
                                        id="manual-billing-year"
                                        value={manualYear}
                                        onChange={(e) => setManualYear(Number(e.target.value))}
                                        className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                    >
                                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                                        <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Payment Method Select */}
                            <div className="space-y-1.5">
                                <Label htmlFor="manual-payment-method">Payment Method *</Label>
                                <Select onValueChange={(val: any) => setManualMethod(val)} value={manualMethod}>
                                    <SelectTrigger id="manual-payment-method" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                        <SelectValue placeholder="Select method..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-border/40">
                                        <SelectItem value="bank_transfer" className="rounded-lg">Direct Bank Transfer</SelectItem>
                                        <SelectItem value="cash" className="rounded-lg">Cash Payout</SelectItem>
                                        <SelectItem value="other" className="rounded-lg">Other / Check / UPI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Transaction ID / Bank Reference */}
                            <div className="space-y-1.5">
                                <Label htmlFor="manual-txn-reference">Txn Reference ID / Notes (Optional)</Label>
                                <Input 
                                    id="manual-txn-reference"
                                    value={manualTxnId}
                                    onChange={(e) => setManualTxnId(e.target.value)}
                                    placeholder="e.g. UTR1234567890"
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>

                            {/* Submit buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button 
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl font-bold uppercase tracking-wider"
                                    onClick={() => { setShowManualPayment(false); setManualStudentId(""); setManualAmount(""); setManualTxnId(""); }}
                                    disabled={isSavingManualPayment}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    disabled={isSavingManualPayment || !manualStudentId}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider gap-2 flex items-center"
                                >
                                    {isSavingManualPayment ? (
                                        <>
                                            <Loader2 className="animate-spin" size={12} />
                                            <span>Recording...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            <span>Record Payout</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* QUICK PASSWORD RESET DIALOG */}
            {showResetPassword && (
                <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 text-left">
                    <Card className="w-full max-w-[440px] rounded-[2rem] p-8 bg-card border-none shadow-2xl relative">
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute right-4 top-4 text-muted-foreground rounded-full"
                            onClick={() => { setShowResetPassword(false); setResetTargetUser(""); setResetNewPassword(""); }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        
                        <CardHeader className="px-0 pb-4">
                            <CardTitle className="font-serif text-xl font-bold flex items-center gap-2">
                                <Key className="text-amber-500" size={20} />
                                <span>Quick Password Reset</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Reset account password for any Student, Parent, Tutor or Staff member.
                            </CardDescription>
                        </CardHeader>
                        
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!resetTargetUser || !resetNewPassword) {
                                toast.error("Please select a user and enter a new password.");
                                return;
                            }
                            if (resetNewPassword.length < 6) {
                                toast.error("Password must be at least 6 characters long.");
                                return;
                            }
                            setIsResettingPassword(true);
                            try {
                                const { updateUserPassword } = await import("@/app/(dashboard)/super-admin/users/actions");
                                const res = await updateUserPassword(resetTargetUser, resetNewPassword);
                                if (res.success) {
                                    toast.success("User password reset successfully!");
                                    setShowResetPassword(false);
                                    setResetTargetUser("");
                                    setResetNewPassword("");
                                } else {
                                    toast.error(res.error || "Failed to reset password.");
                                }
                            } catch (err: any) {
                                toast.error(err.message || "An unexpected error occurred.");
                            } finally {
                                setIsResettingPassword(false);
                            }
                        }} className="space-y-4 text-xs">
                            {/* User Selection */}
                            <div className="space-y-1.5">
                                <Label htmlFor="reset-user-select">Select Profile *</Label>
                                <Select onValueChange={setResetTargetUser} value={resetTargetUser}>
                                    <SelectTrigger id="reset-user-select" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                        <SelectValue placeholder="Select user profile..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-border/40 max-h-[300px]">
                                        <div className="px-2 py-1.5 text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/5 select-none rounded">
                                            Students ({students.length})
                                        </div>
                                        {students.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="rounded-lg">
                                                {s.full_name || s.email} (Student)
                                            </SelectItem>
                                        ))}
                                        <div className="px-2 py-1.5 text-[10px] font-black uppercase text-purple-500 bg-purple-500/5 mt-2 select-none rounded">
                                            Tutors & Staff ({teachers.length})
                                        </div>
                                        {teachers.map(t => (
                                            <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                {t.full_name || t.email} (Tutor)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* New Password */}
                            <div className="space-y-1.5">
                                <Label htmlFor="reset-password-input">New Password *</Label>
                                <Input 
                                    id="reset-password-input"
                                    required
                                    type="password"
                                    value={resetNewPassword}
                                    onChange={(e) => setResetNewPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 chars)"
                                    className="rounded-xl h-10 text-xs"
                                    disabled={isResettingPassword}
                                />
                            </div>

                            {/* Submit buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button 
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl font-bold uppercase tracking-wider"
                                    onClick={() => { setShowResetPassword(false); setResetTargetUser(""); setResetNewPassword(""); }}
                                    disabled={isResettingPassword}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    disabled={isResettingPassword || !resetTargetUser || !resetNewPassword}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider gap-2 flex items-center h-10"
                                >
                                    {isResettingPassword ? (
                                        <>
                                            <Loader2 className="animate-spin" size={12} />
                                            <span>Resetting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Key className="h-3.5 w-3.5" />
                                            <span>Reset Password</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Historical Session Logs */}
            <div className="w-full pt-4">
                <SessionLogsHistory completedClasses={completedClasses} />
            </div>

        </div>
    );
}

// Quick Dialog Close helper
function X({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
    )
}
