'use client';

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Users, GraduationCap, Calendar, Clock, CreditCard, Activity, Check, CheckCircle2, 
    ShieldAlert, Video, Key, Plus, Lock, Unlock, Mail, Edit, Trash2, Search, Filter,
    ArrowLeft, Loader2, ClipboardList, MessageSquare, AlertTriangle, ShieldCheck
} from "lucide-react";
import { cn, formatTime12Hour, ensureAbsoluteUrl, formatClassTitle } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

// Import My Students Private Actions
import { 
    getPrivateTutors, getPrivateStudents, getPrivateSchedules, 
    getPrivateClassLogs, getPrivateRequests, getPrivatePayments,
    createPrivateTutor, createPrivateStudent, getPrivateStudentsWithClasses
} from "./actions";

import { updateStaffStatus, updateStaffMember } from "@/app/(dashboard)/hr/staff/actions";
import { updateStudentMember, updateStudentStatus } from "@/app/(dashboard)/hr/staff/actions";
import { assignTutorToStudent, modifyClassLog } from "@/app/(dashboard)/attendance/actions";
import { processPaymentApproval, recordManualPayment } from "@/app/(dashboard)/payments/actions";

import { StudentClassMonitor } from "@/components/features/operations/StudentClassMonitor";
import { SessionLogsHistory } from "@/components/features/hr/SessionLogsHistory";
import { PostClassLogModal } from "@/components/features/teacher/PostClassLogModal";
import { AssignHomeworkDialog, UploadMaterialDialog } from "@/components/features/teacher/StudentActionDialogs";

export default function PrivateStudentsDashboard() {
    const [activeTab, setActiveTab] = useState<'today' | 'tutors' | 'students' | 'schedules' | 'logs' | 'billing'>('today');
    const [isLoading, setIsLoading] = useState(true);

    // Lists
    const [tutors, setTutors] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [studentsWithClasses, setStudentsWithClasses] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [classLogs, setClassLogs] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // Search and filters
    const [searchQuery, setSearchQuery] = useState("");

    // Modals
    const [showAddTutor, setShowAddTutor] = useState(false);
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [editingStudent, setEditingStudent] = useState<any>(null);

    // Form states
    const [tutorFormData, setTutorFormData] = useState({ full_name: "", email: "", employee_id: "" });
    const [studentFormData, setStudentFormData] = useState({
        full_name: "", email: "", grade_level: "9th Grade", monthly_fee: 4500,
        classes_per_month: 12, tutor_hourly_rate: "", custom_student_id: "",
        mobile_number: "", assigned_teacher_id: ""
    });
    const [paymentFormData, setPaymentFormData] = useState({
        studentId: "", amount: "", month: new Date().getMonth() + 1,
        year: new Date().getFullYear(), method: 'bank_transfer' as const, transactionId: ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedTutors, fetchedStudents, fetchedStudentsWithClasses, fetchedSchedules, fetchedLogs, fetchedRequests, fetchedPayments] = await Promise.all([
                getPrivateTutors(),
                getPrivateStudents(),
                getPrivateStudentsWithClasses(),
                getPrivateSchedules(),
                getPrivateClassLogs(),
                getPrivateRequests(),
                getPrivatePayments()
            ]);
            setTutors(fetchedTutors || []);
            setStudents(fetchedStudents || []);
            setStudentsWithClasses(fetchedStudentsWithClasses || []);
            setSchedules(fetchedSchedules || []);
            setClassLogs(fetchedLogs || []);
            setRescheduleRequests(fetchedRequests.rescheduleRequests || []);
            setLeaveRequests(fetchedRequests.leaveRequests || []);
            setPayments(fetchedPayments || []);
        } catch (error) {
            console.error("Failed to load private dashboard:", error);
            toast.error("Failed to load private student records");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handlers
    const handleAddTutor = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const res = await createPrivateTutor(tutorFormData);
        setIsSubmitting(false);
        if (res.success) {
            toast.success("Private tutor invited successfully");
            setShowAddTutor(false);
            setTutorFormData({ full_name: "", email: "", employee_id: "" });
            await loadData();
        } else {
            toast.error(res.error || "Failed to invite tutor");
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentFormData.assigned_teacher_id) {
            toast.error("Please select a locked tutor first");
            return;
        }
        setIsSubmitting(true);
        const res = await createPrivateStudent({
            ...studentFormData,
            tutor_hourly_rate: studentFormData.tutor_hourly_rate ? Number(studentFormData.tutor_hourly_rate) : null,
            custom_student_id: studentFormData.custom_student_id || undefined
        });
        setIsSubmitting(false);
        if (res.success) {
            toast.success("Private student enrolled successfully");
            setShowAddStudent(false);
            setStudentFormData({
                full_name: "", email: "", grade_level: "9th Grade", monthly_fee: 4500,
                classes_per_month: 12, tutor_hourly_rate: "", custom_student_id: "",
                mobile_number: "", assigned_teacher_id: ""
            });
            await loadData();
        } else {
            toast.error(res.error || "Failed to enroll student");
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentFormData.studentId || !paymentFormData.amount) {
            toast.error("Please select a student and enter amount");
            return;
        }
        setIsSubmitting(true);
        const res = await recordManualPayment({
            studentId: paymentFormData.studentId,
            amount: Number(paymentFormData.amount),
            month: Number(paymentFormData.month),
            year: Number(paymentFormData.year),
            method: paymentFormData.method,
            transactionId: paymentFormData.transactionId
        });
        setIsSubmitting(false);
        if (res.success) {
            toast.success("Manual payment recorded and student activated!");
            setShowAddPayment(false);
            setPaymentFormData({
                studentId: "", amount: "", month: new Date().getMonth() + 1,
                year: new Date().getFullYear(), method: 'bank_transfer', transactionId: ""
            });
            await loadData();
        } else {
            toast.error(res.error || "Failed to record payment");
        }
    };

    const handleUnlockTutor = async (id: string) => {
        const res = await updateStaffStatus(id, 'active');
        if (res.success) {
            toast.success("Tutor unlocked and made active in directory");
            await loadData();
        } else {
            toast.error(res.error);
        }
    };

    const handleLockTutor = async (id: string) => {
        const res = await updateStaffStatus(id, 'locked');
        if (res.success) {
            toast.success("Tutor locked successfully");
            await loadData();
        } else {
            toast.error(res.error);
        }
    };

    const handleUpdateStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStaff) return;
        setIsSubmitting(true);
        const result = await updateStaffMember(editingStaff.id, {
            full_name: editingStaff.full_name || "",
            email: editingStaff.email,
            role: 'teacher',
            hourly_rate: editingStaff.staff_details?.hourly_rate || 0,
            employee_id: editingStaff.staff_details?.employee_id || ""
        });
        setIsSubmitting(false);
        if (result.success) {
            setEditingStaff(null);
            toast.success("Staff profile updated");
            await loadData();
        } else {
            toast.error(result.error);
        }
    };

    const handleUpdateStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        setIsSubmitting(true);
        const result = await updateStudentMember(editingStudent.id, {
            full_name: editingStudent.full_name,
            email: editingStudent.email,
            grade_level: editingStudent.grade_level,
            monthly_fee: editingStudent.monthly_fee,
            classes_per_month: editingStudent.classes_per_month,
            tutor_hourly_rate: editingStudent.tutor_hourly_rate ? Number(editingStudent.tutor_hourly_rate) : null,
            custom_student_id: editingStudent.custom_student_id || undefined,
            mobile_number: editingStudent.mobile_number
        });
        setIsSubmitting(false);
        if (result.success) {
            setEditingStudent(null);
            toast.success("Student profile updated");
            await loadData();
        } else {
            toast.error(result.error);
        }
    };

    const handleApprovePayment = async (paymentId: string) => {
        setIsLoading(true);
        try {
            const res = await processPaymentApproval(paymentId, 'completed');
            if (res.success) {
                toast.success("Private payment approved successfully!");
                await loadData();
            } else {
                toast.error(res.error || "Failed to approve payment");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectPayment = async (paymentId: string) => {
        setIsLoading(true);
        try {
            const res = await processPaymentApproval(paymentId, 'failed');
            if (res.success) {
                toast.success("Private payment request rejected");
                await loadData();
            } else {
                toast.error(res.error || "Failed to reject payment");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Filters
    const filteredTutors = tutors.filter(t => 
        t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredStudents = students.filter(s => 
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-left p-6">
            
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-purple-500/10">
                        <Lock size={12} />
                        <span>Private Academy Desk</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mt-1 flex items-center gap-3">
                        My Students Dashboard
                    </h1>
                    <p className="text-xs text-muted-foreground italic font-medium">
                        Private workspace for managing locked tutors, assigned students, custom schedules, and billing logs.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    <Button 
                        onClick={() => setShowAddTutor(true)}
                        className="gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md h-10"
                    >
                        <Plus className="h-4 w-4" />
                        Lock New Tutor
                    </Button>
                    <Button 
                        onClick={() => setShowAddStudent(true)}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-10"
                    >
                        <Plus className="h-4 w-4" />
                        Enroll Student
                    </Button>
                    <Button 
                        onClick={() => setShowAddPayment(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md h-10"
                    >
                        <CreditCard className="h-4 w-4" />
                        Record payment
                    </Button>
                    <ThemeToggle />
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex p-1 bg-muted/40 rounded-full w-fit border border-border/20">
                {(['today', 'tutors', 'students', 'schedules', 'logs', 'billing'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                        className={cn(
                            "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2",
                            activeTab === tab 
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        {tab === 'today' && <Activity size={14} />}
                        {tab === 'tutors' && <Users size={14} />}
                        {tab === 'students' && <GraduationCap size={14} />}
                        {tab === 'schedules' && <Calendar size={14} />}
                        {tab === 'logs' && <Clock size={14} />}
                        {tab === 'billing' && <CreditCard size={14} />}
                        <span className="capitalize">
                            {tab === 'logs' ? 'Class Logs' : tab === 'today' ? "Today's Classes" : tab}
                        </span>
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="text-purple-600 animate-spin mr-2" size={24} />
                    <span className="text-xs font-black uppercase text-purple-600/50">Synchronizing private controls...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    
                    {/* TUTORS TAB */}
                    {activeTab === 'tutors' && (
                        <div className="space-y-6">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    placeholder="Search locked tutors by name/email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 bg-muted/20 border-none rounded-full h-12 outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>

                            <Card className="rounded-[2.5rem] bg-card border-border/40 shadow-xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-b-border/30">
                                            <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic">Tutor Name</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Contact</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Hourly Pay</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Joined Date</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-right pr-8">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTutors.map(t => (
                                            <TableRow key={t.id} className="hover:bg-muted/20 transition-colors border-b-border/20">
                                                <TableCell className="py-5 pl-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                                                            {t.full_name?.charAt(0) || t.email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-foreground">{t.full_name || 'No Name Set'}</p>
                                                            <p className="text-[10px] text-purple-600 font-black uppercase tracking-tighter">
                                                                Private Educator {t.staff_details?.employee_id && <span className="font-mono text-muted-foreground ml-1">({t.staff_details.employee_id})</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-medium text-xs text-muted-foreground">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Mail size={12} className="text-purple-500" />
                                                        {t.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-xs">
                                                    {t.staff_details?.hourly_rate ? `₹${t.staff_details.hourly_rate}/hr` : <span className="opacity-40 italic">No hourly</span>}
                                                </TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground">
                                                    {t.staff_details?.joining_date ? new Date(t.staff_details.joining_date).toLocaleDateString() : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right pr-8">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            onClick={() => setEditingStaff(t)}
                                                            className="rounded-xl font-bold uppercase tracking-wider text-[10px] h-8 gap-1"
                                                        >
                                                            <Edit size={10} /> Edit
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleUnlockTutor(t.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] h-8 gap-1"
                                                        >
                                                            <Unlock size={10} /> Unlock Tutor
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredTutors.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic">
                                        <Users size={48} className="opacity-20 mb-4" />
                                        <p>No locked tutors found.</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* STUDENTS TAB */}
                    {activeTab === 'students' && (
                        <div className="space-y-6">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    placeholder="Search private students by name/email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-12 bg-muted/20 border-none rounded-full h-12 outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>

                            <Card className="rounded-[2.5rem] bg-card border-border/40 shadow-xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-b-border/30">
                                            <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic">Student Name</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Grade Level</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Fee / Mo</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Classes Limit</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Assigned Tutor</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Status</TableHead>
                                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-right pr-8">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.map(s => {
                                            const details = s.student_details;
                                            return (
                                                <TableRow key={s.id} className="hover:bg-muted/20 transition-colors border-b-border/20">
                                                    <TableCell className="py-5 pl-8 font-bold">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                                                                {s.full_name?.charAt(0) || s.email.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-foreground">{s.full_name || 'No Name'}</p>
                                                                <p className="text-[9px] text-muted-foreground normal-case font-mono">{s.email}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-xs">{details?.grade_level || 'Not Set'}</TableCell>
                                                    <TableCell className="text-center font-bold text-xs">₹{details?.monthly_fee || 0}</TableCell>
                                                    <TableCell className="text-center font-bold text-xs">{details?.classes_per_month || 12} classes</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                                                            <Users size={12} className="text-purple-500" />
                                                            {details?.assigned_teacher?.full_name || 'Unassigned'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className={cn("rounded-full font-bold text-[9px] uppercase px-2.5 py-0.5",
                                                            details?.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                                        )}>
                                                            {details?.status || 'active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                onClick={() => {
                                                                    const parsed = details?.custom_student_id?.split(':') || [];
                                                                    setEditingStudent({
                                                                        id: s.id,
                                                                        full_name: s.full_name || "",
                                                                        email: s.email,
                                                                        grade_level: details?.grade_level || "",
                                                                        monthly_fee: details?.monthly_fee || 4500,
                                                                        classes_per_month: details?.classes_per_month || 12,
                                                                        tutor_hourly_rate: details?.tutor_hourly_rate || "",
                                                                        custom_student_id: parsed[0] || "",
                                                                        mobile_number: parsed[1] || ""
                                                                    });
                                                                }}
                                                                className="rounded-xl font-bold uppercase tracking-wider text-[10px] h-8 gap-1"
                                                            >
                                                                <Edit size={10} /> Edit
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="secondary"
                                                                onClick={async () => {
                                                                    const nextStatus = details?.status === 'active' ? 'inactive' : 'active';
                                                                    const res = await updateStudentStatus(s.id, nextStatus);
                                                                    if (res.success) {
                                                                        toast.success(`Student status updated to ${nextStatus}`);
                                                                        await loadData();
                                                                    } else {
                                                                        toast.error(res.error);
                                                                    }
                                                                }}
                                                                className={cn("rounded-xl font-bold uppercase tracking-wider text-[10px] h-8",
                                                                    details?.status === 'active' ? 'text-rose-500 bg-rose-50 hover:bg-rose-100 border-rose-200' : 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                                                )}
                                                            >
                                                                {details?.status === 'active' ? 'Deactivate' : 'Activate'}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {filteredStudents.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic">
                                        <GraduationCap size={48} className="opacity-20 mb-4" />
                                        <p>No students assigned to locked tutors.</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* TODAY'S CLASSES TAB */}
                    {activeTab === 'today' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <h2 className="text-xl font-serif font-bold italic tracking-tight text-indigo-950 dark:text-indigo-50">Today's Class Sessions</h2>
                                </div>
                                <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1">
                                    {(() => {
                                        const todayStr = new Date().toDateString();
                                        return classLogs.filter(c => new Date(c.scheduled_at).toDateString() === todayStr).length;
                                    })()} Sessions
                                </Badge>
                            </div>

                            {(() => {
                                const todayStr = new Date().toDateString();
                                const todayClasses = classLogs.filter(c => new Date(c.scheduled_at).toDateString() === todayStr);

                                if (todayClasses.length === 0) {
                                    return (
                                        <Card className="rounded-[2rem] border-2 border-dashed border-muted bg-muted/5 p-12 text-center">
                                            <Video size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
                                            <p className="text-sm text-muted-foreground italic font-semibold">No live classes scheduled for today.</p>
                                            <p className="text-xs text-muted-foreground/60 italic mt-1">Check the student profiles to schedule new sessions.</p>
                                        </Card>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                                        {todayClasses.map((c) => (
                                            <Card key={c.id} className="rounded-[2rem] border border-border/40 shadow-lg bg-card hover:border-indigo-500/20 hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between">
                                                <div className="p-6 space-y-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            {(() => {
                                                                const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                                return (
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h3 className="font-serif font-bold text-base text-indigo-950 dark:text-indigo-50 leading-tight">{displayTitle}</h3>
                                                                        {isCompensation && (
                                                                            <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                                                                                Comp
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                            <p className="text-xs text-muted-foreground italic mt-2">
                                                                Student: <span className="font-bold text-foreground">{c.student?.full_name || 'Unassigned'}</span>
                                                            </p>
                                                            <p className="text-xs text-muted-foreground italic mt-0.5">
                                                                Tutor: <span className="font-bold text-foreground">{c.teacher?.full_name || 'N/A'}</span>
                                                            </p>
                                                        </div>
                                                        <Badge className={cn("font-black uppercase tracking-wider text-[9px] px-2.5 py-1 border-none rounded-full",
                                                            c.status === 'completed' 
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                                : c.status === 'cancelled'
                                                                ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                                : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/20'
                                                        )}>
                                                            {c.status}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic bg-muted/30 p-2.5 rounded-xl w-fit">
                                                        <div className="flex items-center gap-1">
                                                            <Clock size={12} className="text-indigo-500" />
                                                            <span>{format(new Date(c.scheduled_at), 'hh:mm a')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-6 pt-0 border-t border-border/10 bg-muted/5 mt-auto">
                                                    <div className="flex items-center gap-2 pt-4 flex-wrap">
                                                        {c.status === 'completed' ? (
                                                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs font-bold w-full justify-center">
                                                                <CheckCircle2 size={16} />
                                                                <span>Session Logged</span>
                                                            </div>
                                                        ) : c.status === 'cancelled' ? (
                                                            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-xs font-bold w-full justify-center">
                                                                <AlertTriangle size={16} />
                                                                <span>Session Cancelled</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-2 w-full">
                                                                <div className="flex items-center gap-2 w-full flex-wrap">
                                                                    <a href={ensureAbsoluteUrl(c.meeting_link)} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[80px]">
                                                                        <Button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[9px] h-9 gap-1 shadow-lg shadow-indigo-600/10">
                                                                             <span>Join</span>
                                                                        </Button>
                                                                    </a>
                                                                    
                                                                    <PostClassLogModal
                                                                        classId={c.id}
                                                                        studentId={c.student?.id || ""}
                                                                        studentName={c.student?.full_name || ""}
                                                                        onSuccess={async () => {
                                                                            await loadData();
                                                                        }}
                                                                        trigger={
                                                                            <Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[9px] h-9 border-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50/50 flex-1 min-w-[80px]">
                                                                                Log Class
                                                                            </Button>
                                                                        }
                                                                    />
                                                                </div>
                                                                {c.student && (
                                                                    <div className="flex items-center gap-2 w-full">
                                                                        <AssignHomeworkDialog 
                                                                            studentId={c.student.id} 
                                                                            studentName={c.student.full_name} 
                                                                            onSuccess={() => {}} 
                                                                            trigger={
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="outline" 
                                                                                    className="h-9 text-[9px] font-bold uppercase tracking-wider rounded-xl border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 flex-1"
                                                                                >
                                                                                    Homework
                                                                                </Button>
                                                                            }
                                                                        />
                                                                        <UploadMaterialDialog 
                                                                            studentId={c.student.id} 
                                                                            studentName={c.student.full_name} 
                                                                            onSuccess={() => {}} 
                                                                            trigger={
                                                                                <Button 
                                                                                    size="sm" 
                                                                                    variant="outline" 
                                                                                    className="h-9 text-[9px] font-bold uppercase tracking-wider rounded-xl border-2 border-amber-500/20 text-amber-600 hover:bg-amber-50 flex-1"
                                                                                >
                                                                                    Worksheet
                                                                                </Button>
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* SCHEDULES TAB */}
                    {activeTab === 'schedules' && (
                        <div className="space-y-6">
                            <StudentClassMonitor students={studentsWithClasses} teachers={tutors} />
                        </div>
                    )}

                    {/* CLASS LOGS TAB */}
                    {activeTab === 'logs' && (
                        <div className="grid grid-cols-1 gap-8">
                            <SessionLogsHistory completedClasses={classLogs.filter(c => c.status === 'completed')} />
                        </div>
                    )}

                    {/* BILLING TAB */}
                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            <Card className="rounded-[2.5rem] bg-card border border-border/40 shadow-xl overflow-hidden">
                                <CardHeader className="bg-purple-600/10 border-b border-border/10 p-6">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <CreditCard size={18} className="text-purple-600" />
                                        <span>Tuition Fees Approvals Queue (Private)</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Verify and approve payment submissions for private academy students.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="border-b-border/30">
                                                <th className="py-4 pl-8 text-xs font-bold">Student Name</th>
                                                <th className="py-4 text-xs font-bold text-center">Amount Paid</th>
                                                <th className="py-4 text-xs font-bold text-center">Cycle Month</th>
                                                <th className="py-4 text-xs font-bold text-center">Status</th>
                                                <th className="py-4 text-xs font-bold text-center">Receipt No</th>
                                                <th className="py-4 pr-8 text-xs font-bold text-right">Actions</th>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payments.map(p => (
                                                <TableRow key={p.id} className="hover:bg-muted/15 transition-colors border-b-border/15">
                                                    <td className="py-4 pl-8 font-bold">{p.student?.full_name || 'No Student'}</td>
                                                    <td className="py-4 text-center font-bold text-xs">₹{p.amount}</td>
                                                    <td className="py-4 text-center text-xs text-muted-foreground font-semibold">
                                                        {format(new Date(p.billing_year || new Date().getFullYear(), (p.billing_month || 1) - 1, 1), 'MMMM yyyy')}
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <Badge variant="secondary" className={cn("rounded-full font-bold text-[9px] uppercase px-2.5 py-0.5",
                                                            p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : p.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                                                        )}>
                                                            {p.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 text-center font-mono text-xs font-bold">{p.receipt_number || '—'}</td>
                                                    <td className="py-4 pr-8 text-right">
                                                        {p.status === 'pending' ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button 
                                                                    size="sm" 
                                                                    onClick={() => handleApprovePayment(p.id)}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-bold uppercase h-8"
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost"
                                                                    onClick={() => handleRejectPayment(p.id)}
                                                                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-[9px] font-bold uppercase h-8"
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic font-medium">Processed</span>
                                                        )}
                                                    </td>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {payments.length === 0 && (
                                        <div className="py-10 text-center text-xs text-muted-foreground italic">
                                            No payment transactions found for private students.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </div>
            )}

            {/* MODALS SECTION */}

            {/* ADD TUTOR MODAL */}
            {showAddTutor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Lock & Invite New Tutor</h2>
                            <button onClick={() => setShowAddTutor(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleAddTutor} className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                <Input
                                    required
                                    value={tutorFormData.full_name}
                                    onChange={(e) => setTutorFormData({ ...tutorFormData, full_name: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="Tutor Full Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                <Input
                                    required
                                    type="email"
                                    value={tutorFormData.email}
                                    onChange={(e) => setTutorFormData({ ...tutorFormData, email: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="tutor@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Employee ID</label>
                                <Input
                                    value={tutorFormData.employee_id}
                                    onChange={(e) => setTutorFormData({ ...tutorFormData, employee_id: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="EMP_PVT_01"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowAddTutor(false)}
                                    className="flex-1 rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    {isSubmitting ? "Inviting..." : "Lock & Invite Tutor"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD STUDENT MODAL */}
            {showAddStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Enroll Private Student</h2>
                            <button onClick={() => setShowAddStudent(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleAddStudent} className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                <Input
                                    required
                                    value={studentFormData.full_name}
                                    onChange={(e) => setStudentFormData({ ...studentFormData, full_name: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="Student Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                <Input
                                    required
                                    type="email"
                                    value={studentFormData.email}
                                    onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="student@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</label>
                                <Input
                                    required
                                    value={studentFormData.mobile_number}
                                    onChange={(e) => setStudentFormData({ ...studentFormData, mobile_number: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="e.g. +91 9876543210"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Grade Level</label>
                                <Input
                                    required
                                    value={studentFormData.grade_level}
                                    onChange={(e) => setStudentFormData({ ...studentFormData, grade_level: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="e.g. 10th Grade"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monthly Fee (₹)</label>
                                    <Input
                                        required
                                        type="number"
                                        value={studentFormData.monthly_fee}
                                        onChange={(e) => setStudentFormData({ ...studentFormData, monthly_fee: Number(e.target.value) })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes / Month</label>
                                    <Input
                                        required
                                        type="number"
                                        value={studentFormData.classes_per_month}
                                        onChange={(e) => setStudentFormData({ ...studentFormData, classes_per_month: Number(e.target.value) })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Locked Tutor</label>
                                <select
                                    value={studentFormData.assigned_teacher_id}
                                    onChange={(e) => setStudentFormData({ ...studentFormData, assigned_teacher_id: e.target.value })}
                                    className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-purple-500 text-sm font-medium"
                                    required
                                >
                                    <option value="">Select Tutor...</option>
                                    {tutors.map(t => (
                                        <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Custom Student ID (Optional)</label>
                                <Input
                                    value={studentFormData.custom_student_id}
                                    onChange={(e) => setStudentFormData({ ...studentFormData, custom_student_id: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="e.g. EH-PVT-001"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowAddStudent(false)}
                                    className="flex-1 rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    {isSubmitting ? "Enrolling..." : "Enroll Student"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT TUTOR MODAL */}
            {editingStaff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Edit Private Tutor Profile</h2>
                            <button onClick={() => setEditingStaff(null)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStaffSubmit} className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                <Input
                                    required
                                    value={editingStaff.full_name || ""}
                                    onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                <Input
                                    required
                                    type="email"
                                    value={editingStaff.email}
                                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Employee ID</label>
                                <Input
                                    value={editingStaff.staff_details?.employee_id || ""}
                                    onChange={(e) => setEditingStaff({
                                        ...editingStaff,
                                        staff_details: { ...editingStaff.staff_details, employee_id: e.target.value }
                                    })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hourly Rate (₹)</label>
                                <Input
                                    required
                                    type="number"
                                    value={editingStaff.staff_details?.hourly_rate || 0}
                                    onChange={(e) => setEditingStaff({
                                        ...editingStaff,
                                        staff_details: { ...editingStaff.staff_details, hourly_rate: Number(e.target.value) }
                                    })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditingStaff(null)}
                                    className="flex-1 rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT STUDENT MODAL */}
            {editingStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Edit Private Student</h2>
                            <button onClick={() => setEditingStudent(null)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudentSubmit} className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                <Input
                                    required
                                    value={editingStudent.full_name}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                <Input
                                    required
                                    type="email"
                                    value={editingStudent.email}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</label>
                                <Input
                                    required
                                    value={editingStudent.mobile_number}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, mobile_number: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Grade Level</label>
                                <Input
                                    required
                                    value={editingStudent.grade_level}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, grade_level: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monthly Fee (₹)</label>
                                    <Input
                                        required
                                        type="number"
                                        value={editingStudent.monthly_fee}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, monthly_fee: Number(e.target.value) })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes / Month</label>
                                    <Input
                                        required
                                        type="number"
                                        value={editingStudent.classes_per_month}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, classes_per_month: Number(e.target.value) })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Custom Student ID</label>
                                <Input
                                    value={editingStudent.custom_student_id}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, custom_student_id: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditingStudent(null)}
                                    className="flex-1 rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RECORD PAYMENT MODAL */}
            {showAddPayment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Record Private Student Payment</h2>
                            <button onClick={() => setShowAddPayment(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleAddPayment} className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Private Student</label>
                                <select
                                    value={paymentFormData.studentId}
                                    onChange={(e) => {
                                        const sId = e.target.value;
                                        const sObj = students.find(s => s.id === sId);
                                        setPaymentFormData({
                                            ...paymentFormData,
                                            studentId: sId,
                                            amount: sObj?.student_details?.monthly_fee ? String(sObj.student_details.monthly_fee) : "4500"
                                        });
                                    }}
                                    className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-purple-500 text-sm font-medium"
                                    required
                                >
                                    <option value="">Select Student...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Amount Paid (₹)</label>
                                <Input
                                    required
                                    type="number"
                                    value={paymentFormData.amount}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cycle Month</label>
                                    <select
                                        value={paymentFormData.month}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, month: Number(e.target.value) })}
                                        className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-purple-500 text-sm font-medium"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                {format(new Date(2020, i, 1), 'MMMM')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cycle Year</label>
                                    <Input
                                        required
                                        type="number"
                                        value={paymentFormData.year}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, year: Number(e.target.value) })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Payment Method</label>
                                <select
                                    value={paymentFormData.method}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value as any })}
                                    className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-purple-500 text-sm font-medium"
                                >
                                    <option value="bank_transfer">Bank Transfer / UPI</option>
                                    <option value="cash">Cash</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Transaction ID / Reference (Optional)</label>
                                <Input
                                    value={paymentFormData.transactionId}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionId: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
                                    placeholder="Txn ID"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowAddPayment(false)}
                                    className="flex-1 rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    {isSubmitting ? "Recording..." : "Record Payment"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

// A local inline close icon since Lucide X was missing or might clash
function X({ size = 16 }: { size?: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    );
}
