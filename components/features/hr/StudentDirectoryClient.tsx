"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal, Mail, Calendar, Users, GraduationCap, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { assignTutorToStudent } from "@/app/(dashboard)/attendance/actions";

interface Student {
    id: string;
    full_name: string | null;
    email: string;
    student_details?: {
        status: string;
        enrollment_date: string;
        grade_level: string | null;
        monthly_fee: number;
        classes_per_month: number;
        tutor_hourly_rate?: number | null;
        assigned_teacher?: { full_name: string | null } | null;
        assigned_teacher_2?: { full_name: string | null } | null;
        assigned_teacher_3?: { full_name: string | null } | null;
        assigned_teacher_4?: { full_name: string | null } | null;
        assigned_teacher_5?: { full_name: string | null } | null;
        assigned_teacher_id?: string | null;
        custom_student_id?: string | null;
        parent_email?: string | null;
        subject_name_1?: string | null;
        subject_name_2?: string | null;
        monthly_fee_2?: number | null;
        classes_per_month_2?: number | null;
        assigned_teacher_id_2?: string | null;
        subject_name_3?: string | null;
        monthly_fee_3?: number | null;
        classes_per_month_3?: number | null;
        assigned_teacher_id_3?: string | null;
        subject_name_4?: string | null;
        monthly_fee_4?: number | null;
        classes_per_month_4?: number | null;
        assigned_teacher_id_4?: string | null;
        subject_name_5?: string | null;
        monthly_fee_5?: number | null;
        classes_per_month_5?: number | null;
        assigned_teacher_id_5?: string | null;
    } | null;
}

import { createStudentMember, updateStudentMember, updateStudentStatus } from "@/app/(dashboard)/hr/staff/actions";
import { cn, parseStudentIdAndMobile } from "@/lib/utils";
import { toast } from "sonner";

export default function StudentDirectoryClient({ 
    initialStudents,
    teachers = [],
    currentUserRole = "student"
}: { 
    initialStudents: Student[];
    teachers?: { id: string; full_name: string | null; email: string }[];
    currentUserRole?: string;
}) {
    const isFeesVisible = ["super_admin", "operations"].includes(currentUserRole || "");
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [selectedStatus, setSelectedStatus] = useState<string>("active");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [updatingTutorId, setUpdatingTutorId] = useState<string | null>(null);

    // Enroll Form state
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        grade_level: "9th Grade",
        monthly_fee: 4500,
        classes_per_month: 12,
        tutor_hourly_rate: "",
        custom_student_id: "",
        mobile_number: "",
        parent_email: "",
        subject_name_1: "Maths",
        subject_name_2: "",
        monthly_fee_2: 0,
        classes_per_month_2: 0,
        assigned_teacher_id_2: "",
        subject_name_3: "",
        monthly_fee_3: 0,
        classes_per_month_3: 0,
        assigned_teacher_id_3: "",
        subject_name_4: "",
        monthly_fee_4: 0,
        classes_per_month_4: 0,
        assigned_teacher_id_4: "",
        subject_name_5: "",
        monthly_fee_5: 0,
        classes_per_month_5: 0,
        assigned_teacher_id_5: "",
        assigned_teacher_id: ""
    });

    // Edit Form state
    const [editFormData, setEditFormData] = useState({
        full_name: "",
        email: "",
        grade_level: "",
        monthly_fee: 4500,
        classes_per_month: 12,
        tutor_hourly_rate: "",
        custom_student_id: "",
        mobile_number: "",
        parent_email: "",
        subject_name_1: "Maths",
        subject_name_2: "",
        monthly_fee_2: 0,
        classes_per_month_2: 0,
        assigned_teacher_id_2: "",
        subject_name_3: "",
        monthly_fee_3: 0,
        classes_per_month_3: 0,
        assigned_teacher_id_3: "",
        subject_name_4: "",
        monthly_fee_4: 0,
        classes_per_month_4: 0,
        assigned_teacher_id_4: "",
        subject_name_5: "",
        monthly_fee_5: 0,
        classes_per_month_5: 0,
        assigned_teacher_id_5: "",
        assigned_teacher_id: ""
    });

    const [visibleSubjectsCountAdd, setVisibleSubjectsCountAdd] = useState(1);
    const [visibleSubjectsCountEdit, setVisibleSubjectsCountEdit] = useState(1);

    const activeCount = initialStudents.filter(s => (s.student_details?.status || 'active') === 'active').length;
    const inactiveCount = initialStudents.filter(s => s.student_details?.status === 'inactive').length;

    const filteredStudents = initialStudents.filter(student => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (
            (student.full_name?.toLowerCase().includes(searchLower)) ||
            (student.email?.toLowerCase().includes(searchLower)) ||
            (student.student_details?.assigned_teacher?.full_name?.toLowerCase().includes(searchLower))
        );
        const matchesStatus = (student.student_details?.status || 'active') === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const handleAssignTutor = async (studentId: string, teacherId: string) => {
        setUpdatingTutorId(studentId);
        try {
            const actualTeacherId = teacherId === "unassigned" ? null : teacherId;
            const result = await assignTutorToStudent(studentId, actualTeacherId);
            
            if (result.success) {
                toast.success("Tutor assigned successfully");
            } else {
                toast.error(result.error || "Failed to assign tutor");
            }
        } catch (error) {
            console.error("Assign tutor error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setUpdatingTutorId(null);
        }
    };

    const handleEnrollStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.mobile_number.trim()) {
            toast.error("Mobile number is required");
            return;
        }
        setIsSubmitting(true);
        const result = await createStudentMember({
            ...formData,
            tutor_hourly_rate: formData.tutor_hourly_rate ? Number(formData.tutor_hourly_rate) : null,
            custom_student_id: formData.custom_student_id || undefined,
            mobile_number: formData.mobile_number,
            parent_email: formData.parent_email || undefined,
            subject_name_1: formData.subject_name_1 || "Maths",
            subject_name_2: formData.subject_name_2 || undefined,
            monthly_fee_2: formData.monthly_fee_2,
            classes_per_month_2: formData.classes_per_month_2,
            assigned_teacher_id_2: (formData.assigned_teacher_id_2 === "none" || !formData.assigned_teacher_id_2) ? undefined : formData.assigned_teacher_id_2,
            subject_name_3: formData.subject_name_3 || undefined,
            monthly_fee_3: formData.monthly_fee_3,
            classes_per_month_3: formData.classes_per_month_3,
            assigned_teacher_id_3: (formData.assigned_teacher_id_3 === "none" || !formData.assigned_teacher_id_3) ? undefined : formData.assigned_teacher_id_3,
            subject_name_4: formData.subject_name_4 || undefined,
            monthly_fee_4: formData.monthly_fee_4,
            classes_per_month_4: formData.classes_per_month_4,
            assigned_teacher_id_4: (formData.assigned_teacher_id_4 === "none" || !formData.assigned_teacher_id_4) ? undefined : formData.assigned_teacher_id_4,
            subject_name_5: formData.subject_name_5 || undefined,
            monthly_fee_5: formData.monthly_fee_5,
            classes_per_month_5: formData.classes_per_month_5,
            assigned_teacher_id_5: (formData.assigned_teacher_id_5 === "none" || !formData.assigned_teacher_id_5) ? undefined : formData.assigned_teacher_id_5,
            assigned_teacher_id: (formData.assigned_teacher_id === "none" || !formData.assigned_teacher_id) ? undefined : formData.assigned_teacher_id
        });
        setIsSubmitting(false);
        if (result.success) {
            setIsAddModalOpen(false);
            setFormData({
                full_name: "",
                email: "",
                grade_level: "9th Grade",
                monthly_fee: 4500,
                classes_per_month: 12,
                tutor_hourly_rate: "",
                custom_student_id: "",
                mobile_number: "",
                parent_email: "",
                subject_name_1: "Maths",
                subject_name_2: "",
                monthly_fee_2: 0,
                classes_per_month_2: 0,
                assigned_teacher_id_2: "",
                subject_name_3: "",
                monthly_fee_3: 0,
                classes_per_month_3: 0,
                assigned_teacher_id_3: "",
                subject_name_4: "",
                monthly_fee_4: 0,
                classes_per_month_4: 0,
                assigned_teacher_id_4: "",
                subject_name_5: "",
                monthly_fee_5: 0,
                classes_per_month_5: 0,
                assigned_teacher_id_5: "",
                assigned_teacher_id: ""
            });
            setVisibleSubjectsCountAdd(1);
            toast.success("Student enrolled successfully");
        } else {
            toast.error(result.error);
        }
    };

    const handleStartEdit = (student: Student) => {
        const { studentId, mobileNumber } = parseStudentIdAndMobile(student.student_details?.custom_student_id);
        const sd = student.student_details;
        setEditFormData({
            full_name: student.full_name || "",
            email: student.email || "",
            grade_level: sd?.grade_level || "9th Grade",
            monthly_fee: sd?.monthly_fee ?? 4500,
            classes_per_month: sd?.classes_per_month ?? 12,
            tutor_hourly_rate: sd?.tutor_hourly_rate !== null && sd?.tutor_hourly_rate !== undefined 
                ? String(sd.tutor_hourly_rate) 
                : "",
            custom_student_id: studentId,
            mobile_number: mobileNumber,
            parent_email: sd?.parent_email || "",
            subject_name_1: sd?.subject_name_1 || "Maths",
            subject_name_2: sd?.subject_name_2 || "",
            monthly_fee_2: sd?.monthly_fee_2 ?? 0,
            classes_per_month_2: sd?.classes_per_month_2 ?? 0,
            assigned_teacher_id_2: sd?.assigned_teacher_id_2 || "",
            subject_name_3: sd?.subject_name_3 || "",
            monthly_fee_3: sd?.monthly_fee_3 ?? 0,
            classes_per_month_3: sd?.classes_per_month_3 ?? 0,
            assigned_teacher_id_3: sd?.assigned_teacher_id_3 || "",
            subject_name_4: sd?.subject_name_4 || "",
            monthly_fee_4: sd?.monthly_fee_4 ?? 0,
            classes_per_month_4: sd?.classes_per_month_4 ?? 0,
            assigned_teacher_id_4: sd?.assigned_teacher_id_4 || "",
            subject_name_5: sd?.subject_name_5 || "",
            monthly_fee_5: sd?.monthly_fee_5 ?? 0,
            classes_per_month_5: sd?.classes_per_month_5 ?? 0,
            assigned_teacher_id_5: sd?.assigned_teacher_id_5 || "",
            assigned_teacher_id: sd?.assigned_teacher_id || ""
        });
        const initialCount = 
            sd?.subject_name_5 ? 5 :
            sd?.subject_name_4 ? 4 :
            sd?.subject_name_3 ? 3 :
            sd?.subject_name_2 ? 2 :
            1;
        setVisibleSubjectsCountEdit(initialCount);
        setEditingStudent(student);
        setOpenMenuId(null);
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent) return;
        if (!editFormData.mobile_number.trim()) {
            toast.error("Mobile number is required");
            return;
        }
        setIsSubmitting(true);
        const result = await updateStudentMember(editingStudent.id, {
            full_name: editFormData.full_name,
            email: editFormData.email,
            grade_level: editFormData.grade_level,
            monthly_fee: editFormData.monthly_fee,
            classes_per_month: editFormData.classes_per_month,
            tutor_hourly_rate: editFormData.tutor_hourly_rate ? Number(editFormData.tutor_hourly_rate) : null,
            custom_student_id: editFormData.custom_student_id || undefined,
            mobile_number: editFormData.mobile_number,
            parent_email: editFormData.parent_email || undefined,
            subject_name_1: editFormData.subject_name_1 || "Maths",
            subject_name_2: editFormData.subject_name_2 || undefined,
            monthly_fee_2: editFormData.monthly_fee_2,
            classes_per_month_2: editFormData.classes_per_month_2,
            assigned_teacher_id_2: (editFormData.assigned_teacher_id_2 === "none" || !editFormData.assigned_teacher_id_2) ? undefined : editFormData.assigned_teacher_id_2,
            subject_name_3: editFormData.subject_name_3 || undefined,
            monthly_fee_3: editFormData.monthly_fee_3,
            classes_per_month_3: editFormData.classes_per_month_3,
            assigned_teacher_id_3: (editFormData.assigned_teacher_id_3 === "none" || !editFormData.assigned_teacher_id_3) ? undefined : editFormData.assigned_teacher_id_3,
            subject_name_4: editFormData.subject_name_4 || undefined,
            monthly_fee_4: editFormData.monthly_fee_4,
            classes_per_month_4: editFormData.classes_per_month_4,
            assigned_teacher_id_4: (editFormData.assigned_teacher_id_4 === "none" || !editFormData.assigned_teacher_id_4) ? undefined : editFormData.assigned_teacher_id_4,
            subject_name_5: editFormData.subject_name_5 || undefined,
            monthly_fee_5: editFormData.monthly_fee_5,
            classes_per_month_5: editFormData.classes_per_month_5,
            assigned_teacher_id_5: (editFormData.assigned_teacher_id_5 === "none" || !editFormData.assigned_teacher_id_5) ? undefined : editFormData.assigned_teacher_id_5,
            assigned_teacher_id: (editFormData.assigned_teacher_id === "none" || !editFormData.assigned_teacher_id) ? undefined : editFormData.assigned_teacher_id
        });
        setIsSubmitting(false);
        if (result.success) {
            setEditingStudent(null);
            toast.success("Student profile updated");
        } else {
            toast.error(result.error);
        }
    };

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const result = await updateStudentStatus(id, newStatus);
        if (result.success) {
            toast.success(`Student status updated to ${newStatus}`);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="space-y-10">
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-card p-4 rounded-[2rem] shadow-sm border border-border/40">
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 bg-muted/20 border-none rounded-full h-12 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        />
                    </div>
                    
                    {/* Sliding Segmented Tab */}
                    <div className="flex p-1 bg-muted/40 rounded-full w-full sm:w-fit border border-border/20">
                        <button
                            onClick={() => setSelectedStatus("active")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
                                selectedStatus === "active" 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <span>Active</span>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-extrabold",
                                selectedStatus === "active" ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {activeCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setSelectedStatus("inactive")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
                                selectedStatus === "inactive" 
                                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <span>Inactive</span>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-extrabold",
                                selectedStatus === "inactive" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {inactiveCount}
                            </span>
                        </button>
                    </div>
                </div>

                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-12 px-8 font-bold text-xs uppercase tracking-widest w-full lg:w-auto"
                >
                    Enroll New Student
                </Button>
            </div>

            {/* Enroll Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl border border-border/40 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20 shrink-0">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Enroll Student</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleEnrollStudent} className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 pr-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                    <Input
                                        required
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Student ID (Optional)</label>
                                    <Input
                                        value={formData.custom_student_id}
                                        onChange={(e) => setFormData({ ...formData, custom_student_id: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="e.g. EH-ST-1001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</label>
                                    <Input
                                        required
                                        type="tel"
                                        value={formData.mobile_number}
                                        onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="e.g. +91 9876543210"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">User ID (Login Email)</label>
                                    <Input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="jane@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Parent Email (Optional)</label>
                                    <Input
                                        type="email"
                                        value={formData.parent_email}
                                        onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="parent@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Grade Level</label>
                                    <Input
                                        required
                                        value={formData.grade_level}
                                        onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="e.g. 10th Grade"
                                    />
                                </div>
                                {currentUserRole !== 'operations' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tutor Hourly Rate (₹/hr - optional)</label>
                                        <Input
                                            type="number"
                                            value={formData.tutor_hourly_rate}
                                            onChange={(e) => setFormData({ ...formData, tutor_hourly_rate: e.target.value })}
                                            className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                            placeholder="e.g. 100 (Default uses tutor's hourly rate)"
                                        />
                                    </div>
                                )}

                                <div className="space-y-4 border-t border-border/20 pt-4">
                                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 ml-1">Subject Packages</h4>

                                    {/* Subject 1 (Primary) */}
                                    <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 1 (Primary)</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                <Input
                                                    value={formData.subject_name_1}
                                                    onChange={(e) => setFormData({ ...formData, subject_name_1: e.target.value })}
                                                    placeholder="Maths"
                                                    className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                <Input
                                                    type="number"
                                                    value={formData.monthly_fee}
                                                    onChange={(e) => setFormData({ ...formData, monthly_fee: Number(e.target.value) })}
                                                    placeholder="4500"
                                                    className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                <Input
                                                    type="number"
                                                    value={formData.classes_per_month}
                                                    onChange={(e) => setFormData({ ...formData, classes_per_month: Number(e.target.value) })}
                                                    placeholder="12"
                                                    className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                <Select 
                                                    onValueChange={(val) => setFormData({ ...formData, assigned_teacher_id: val })} 
                                                    value={formData.assigned_teacher_id || "none"}
                                                >
                                                    <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                        <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountAdd >= 2 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 2</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={formData.subject_name_2}
                                                        onChange={(e) => setFormData({ ...formData, subject_name_2: e.target.value })}
                                                        placeholder="Science"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.monthly_fee_2}
                                                        onChange={(e) => setFormData({ ...formData, monthly_fee_2: Number(e.target.value) })}
                                                        placeholder="3500"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.classes_per_month_2}
                                                        onChange={(e) => setFormData({ ...formData, classes_per_month_2: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setFormData({ ...formData, assigned_teacher_id_2: val })} 
                                                        value={formData.assigned_teacher_id_2 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountAdd >= 3 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 3</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={formData.subject_name_3}
                                                        onChange={(e) => setFormData({ ...formData, subject_name_3: e.target.value })}
                                                        placeholder="English"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.monthly_fee_3}
                                                        onChange={(e) => setFormData({ ...formData, monthly_fee_3: Number(e.target.value) })}
                                                        placeholder="3000"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.classes_per_month_3}
                                                        onChange={(e) => setFormData({ ...formData, classes_per_month_3: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setFormData({ ...formData, assigned_teacher_id_3: val })} 
                                                        value={formData.assigned_teacher_id_3 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountAdd >= 4 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 4</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={formData.subject_name_4}
                                                        onChange={(e) => setFormData({ ...formData, subject_name_4: e.target.value })}
                                                        placeholder="Geography"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.monthly_fee_4}
                                                        onChange={(e) => setFormData({ ...formData, monthly_fee_4: Number(e.target.value) })}
                                                        placeholder="3000"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.classes_per_month_4}
                                                        onChange={(e) => setFormData({ ...formData, classes_per_month_4: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setFormData({ ...formData, assigned_teacher_id_4: val })} 
                                                        value={formData.assigned_teacher_id_4 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountAdd >= 5 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 5</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={formData.subject_name_5}
                                                        onChange={(e) => setFormData({ ...formData, subject_name_5: e.target.value })}
                                                        placeholder="History"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.monthly_fee_5}
                                                        onChange={(e) => setFormData({ ...formData, monthly_fee_5: Number(e.target.value) })}
                                                        placeholder="3000"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={formData.classes_per_month_5}
                                                        onChange={(e) => setFormData({ ...formData, classes_per_month_5: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setFormData({ ...formData, assigned_teacher_id_5: val })} 
                                                        value={formData.assigned_teacher_id_5 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountAdd < 5 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full rounded-xl border-dashed border-indigo-500/40 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 text-[10px] font-bold gap-1 mt-2 py-3 h-auto uppercase tracking-wider"
                                            onClick={() => setVisibleSubjectsCountAdd(prev => Math.min(5, prev + 1))}
                                        >
                                            + Add Another Subject ({visibleSubjectsCountAdd}/5)
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 bg-muted/10 border-t border-border/20 flex gap-3 shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsAddModalOpen(false)}
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

            {/* Student Table */}
            <div className="bg-card rounded-[2.5rem] shadow-xl overflow-hidden border border-border/30">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b-border/30">
                            <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic">Student Name</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Grade Level</TableHead>
                            {isFeesVisible && (
                                <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Fee / Mo</TableHead>
                            )}
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Classes Limit</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Contact</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Status</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Assigned Tutor</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Enrollment Date</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((student, index) => {
                            const isLastItem = index >= filteredStudents.length - 2;
                            const { studentId, mobileNumber } = parseStudentIdAndMobile(student.student_details?.custom_student_id);
                            
                            const sd = student.student_details;
                            const totalFee = (sd?.monthly_fee ?? 0) + 
                                             (sd?.monthly_fee_2 ?? 0) + 
                                             (sd?.monthly_fee_3 ?? 0) + 
                                             (sd?.monthly_fee_4 ?? 0) + 
                                             (sd?.monthly_fee_5 ?? 0);
                            const totalClasses = (sd?.classes_per_month ?? 0) + 
                                                 (sd?.classes_per_month_2 ?? 0) + 
                                                 (sd?.classes_per_month_3 ?? 0) + 
                                                 (sd?.classes_per_month_4 ?? 0) + 
                                                 (sd?.classes_per_month_5 ?? 0);

                            // Collect active subjects with their tutors and fees
                            const activeSubjects: { name: string; fee: number; teacherName: string; key: number }[] = [];
                            if (sd?.subject_name_1) {
                                activeSubjects.push({ 
                                    name: sd.subject_name_1, 
                                    fee: sd.monthly_fee ?? 0,
                                    teacherName: sd.assigned_teacher?.full_name || 'Unassigned',
                                    key: 1
                                });
                            } else if (sd?.assigned_teacher) {
                                activeSubjects.push({ 
                                    name: 'Maths', 
                                    fee: sd.monthly_fee ?? 0,
                                    teacherName: sd.assigned_teacher?.full_name || 'Unassigned',
                                    key: 1
                                });
                            }
                            if (sd?.subject_name_2) {
                                activeSubjects.push({ 
                                    name: sd.subject_name_2, 
                                    fee: sd.monthly_fee_2 ?? 0,
                                    teacherName: student.student_details?.assigned_teacher_2?.full_name || 'Unassigned',
                                    key: 2
                                });
                            }
                            if (sd?.subject_name_3) {
                                activeSubjects.push({ 
                                    name: sd.subject_name_3, 
                                    fee: sd.monthly_fee_3 ?? 0,
                                    teacherName: student.student_details?.assigned_teacher_3?.full_name || 'Unassigned',
                                    key: 3
                                });
                            }
                            if (sd?.subject_name_4) {
                                activeSubjects.push({ 
                                    name: sd.subject_name_4, 
                                    fee: sd.monthly_fee_4 ?? 0,
                                    teacherName: student.student_details?.assigned_teacher_4?.full_name || 'Unassigned',
                                    key: 4
                                });
                            }
                            if (sd?.subject_name_5) {
                                activeSubjects.push({ 
                                    name: sd.subject_name_5, 
                                    fee: sd.monthly_fee_5 ?? 0,
                                    teacherName: student.student_details?.assigned_teacher_5?.full_name || 'Unassigned',
                                    key: 5
                                });
                            }

                            return (
                                <TableRow key={student.id} className="hover:bg-muted/20 transition-colors border-b-border/20">
                                    <TableCell className="py-5 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center font-bold",
                                                selectedStatus === 'active' 
                                                    ? "bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 text-indigo-600" 
                                                    : "bg-gradient-to-br from-amber-500/20 to-amber-500/10 text-amber-600"
                                            )}>
                                                {student.full_name?.charAt(0) || student.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                                                    <span>{student.full_name || 'No Name Set'}</span>
                                                    {studentId && (
                                                        <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/40">
                                                            {studentId}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className={cn(
                                            "flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full w-fit mx-auto uppercase tracking-tighter",
                                            selectedStatus === 'active' 
                                                ? "text-indigo-600 bg-indigo-50" 
                                                : "text-amber-600 bg-amber-50"
                                        )}>
                                            <GraduationCap size={12} />
                                            {student.student_details?.grade_level || 'Not Set'}
                                        </div>
                                    </TableCell>
                                    {isFeesVisible && (
                                        <TableCell className="text-center">
                                            {activeSubjects.length > 1 ? (
                                                <div className="flex flex-col gap-1 text-[10px] text-left min-w-[110px] mx-auto w-fit bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                                                    {activeSubjects.map((sub) => (
                                                        <div key={sub.key} className="flex items-center gap-2 justify-between">
                                                            <span className="font-bold text-slate-500 uppercase tracking-tighter shrink-0">{sub.name}:</span>
                                                            <span className="font-extrabold text-indigo-600">₹{sub.fee}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="font-bold text-foreground text-xs">
                                                    ₹{totalFee}
                                                </span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell className="text-center font-bold text-foreground text-xs">
                                        {totalClasses} classes
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                <Mail size={12} className={cn(selectedStatus === 'active' ? "text-indigo-500" : "text-amber-500")} />
                                                {student.email}
                                            </div>
                                            {mobileNumber && (() => {
                                                const cleanMobile = mobileNumber.replace(/\D/g, "");
                                                const formattedMobile = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
                                                return (
                                                    <div className="flex flex-col items-center gap-1 mt-1.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                            <span className={cn(
                                                                "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                                selectedStatus === 'active' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                                                            )}>Cell</span>
                                                            <span>{mobileNumber}</span>
                                                        </div>
                                                        <a
                                                            href={`https://wa.me/${formattedMobile}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all hover:scale-105"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008 0c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-.002 0-.003 0-.005 0-2.002-.001-3.972-.513-5.717-1.488L0 24zm6.59-4.846c1.6.95 2.534 1.483 3.96 1.486 5.315 0 9.64-4.321 9.643-9.637.002-2.576-1.002-5.001-2.827-6.829-1.824-1.826-4.249-2.827-6.828-2.828-5.32 0-9.647 4.322-9.65 9.639-.001 1.516.4 2.99 1.159 4.3l.255.44-1.02 3.722 3.818-1.002.433.256zM17.17 14.39c-.28-.14-1.65-.81-1.91-.9-.26-.1-.45-.14-.64.14-.19.28-.73.9-.9 1.09-.17.19-.34.21-.62.07-1.37-.68-2.31-1.2-3.23-2.78-.24-.41.24-.38.69-1.28.08-.17.04-.31-.02-.45-.06-.14-.54-1.31-.74-1.8-.19-.47-.39-.4-.54-.41-.14-.01-.31-.01-.48-.01-.17 0-.45.06-.69.31-.24.25-.92.9-.92 2.2 0 1.3.95 2.56 1.08 2.74.13.18 1.87 2.85 4.54 4 .64.27 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.26.22-.61.22-1.14.15-1.25-.07-.11-.26-.18-.54-.32z"/>
                                                            </svg>
                                                            <span>Chat on WhatsApp</span>
                                                        </a>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="secondary"
                                            className={`rounded-full border-none font-bold text-[10px] uppercase tracking-wider px-3 py-1 ${
                                                (student.student_details?.status || 'active') === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                    : 'bg-rose-500/10 text-rose-600'
                                            }`}
                                        >
                                            {student.student_details?.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {activeSubjects.length > 1 ? (
                                                <div className="flex flex-col gap-1 text-[10px] text-left min-w-[130px] mx-auto w-fit bg-muted/20 p-2.5 rounded-xl border border-border/10">
                                                    {activeSubjects.map((sub) => (
                                                        <div key={sub.key} className="flex items-center gap-2 justify-between">
                                                            <span className="font-bold text-slate-500 uppercase tracking-tighter shrink-0">{sub.name}:</span>
                                                            <span className="font-extrabold text-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tighter truncate max-w-[80px]" title={sub.teacherName}>{sub.teacherName}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : ["hr", "super_admin", "admin", "operations"].includes(currentUserRole || "") ? (
                                                <div className="w-40 mx-auto">
                                                    <Select 
                                                        onValueChange={(val) => handleAssignTutor(student.id, val)}
                                                        value={student.student_details?.assigned_teacher_id || "unassigned"}
                                                        disabled={updatingTutorId === student.id}
                                                    >
                                                        <SelectTrigger className="h-9 rounded-xl border border-muted/50 bg-background text-[11px] font-bold gap-2">
                                                            {updatingTutorId === student.id ? (
                                                                <Loader2 size={12} className="animate-spin text-indigo-500 mr-1" />
                                                            ) : (
                                                                <Users size={12} className="text-indigo-500 mr-1" />
                                                            )}
                                                            <SelectValue placeholder="Assign Tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="unassigned" className="rounded-lg">Unassigned</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                                                    <Users size={12} className="text-indigo-500" />
                                                    {student.student_details?.assigned_teacher?.full_name || 'Unassigned'}
                                                </div>
                                            )}
                                            {currentUserRole !== 'operations' && student.student_details?.tutor_hourly_rate && (
                                                <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-md mt-1">
                                                    Rate: ₹{student.student_details.tutor_hourly_rate}/hr
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                                            <Calendar size={12} />
                                            {student.student_details?.enrollment_date ? new Date(student.student_details.enrollment_date).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="relative">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 rounded-full"
                                                onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
    
                                            {openMenuId === student.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                    <div className={cn(
                                                        "absolute z-50 w-40 bg-card border border-border/40 rounded-2xl shadow-xl p-2 animate-in fade-in duration-200",
                                                        isLastItem ? "bottom-full mb-1 right-0 origin-bottom-right" : "top-10 right-0 origin-top-right"
                                                    )}>
                                                        <button
                                                            onClick={() => handleStartEdit(student)}
                                                            className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30 flex items-center gap-2"
                                                        >
                                                            Edit Profile
                                                        </button>
                                                        <button
                                                            onClick={() => { handleStatusToggle(student.id, student.student_details?.status || 'active'); setOpenMenuId(null); }}
                                                            className={cn(
                                                                "w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30 flex items-center gap-2",
                                                                (student.student_details?.status || 'active') === 'active' ? "text-rose-500" : "text-emerald-500"
                                                            )}
                                                        >
                                                            {(student.student_details?.status || 'active') === 'active' ? "Deactivate" : "Activate"}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                {filteredStudents.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic">
                        <Users size={48} className="opacity-20 mb-4" />
                        <p>No student records found matching your search.</p>
                    </div>
                )}
            </div>

            {/* Edit Student Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl border border-border/40 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20 shrink-0">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Edit Student Profile</h2>
                            <button onClick={() => setEditingStudent(null)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent} className="flex-1 min-h-0 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-8 space-y-4 pr-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                    <Input
                                        required
                                        value={editFormData.full_name}
                                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Student ID (Optional)</label>
                                    <Input
                                        value={editFormData.custom_student_id}
                                        onChange={(e) => setEditFormData({ ...editFormData, custom_student_id: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="e.g. EH-ST-1001"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</label>
                                    <Input
                                        required
                                        type="tel"
                                        value={editFormData.mobile_number}
                                        onChange={(e) => setEditFormData({ ...editFormData, mobile_number: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="e.g. +91 9876543210"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">User ID (Login Email)</label>
                                    <Input
                                        required
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="jane@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Parent Email (Optional)</label>
                                    <Input
                                        type="email"
                                        value={editFormData.parent_email}
                                        onChange={(e) => setEditFormData({ ...editFormData, parent_email: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="parent@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Grade Level</label>
                                    <Input
                                        required
                                        value={editFormData.grade_level}
                                        onChange={(e) => setEditFormData({ ...editFormData, grade_level: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                        placeholder="e.g. 10th Grade"
                                    />
                                </div>
                                {currentUserRole !== 'operations' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tutor Hourly Rate (₹/hr - optional)</label>
                                        <Input
                                            type="number"
                                            value={editFormData.tutor_hourly_rate}
                                            onChange={(e) => setEditFormData({ ...editFormData, tutor_hourly_rate: e.target.value })}
                                            className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                            placeholder="e.g. 100 (Default uses tutor's hourly rate)"
                                        />
                                    </div>
                                )}

                                <div className="space-y-4 border-t border-border/20 pt-4">
                                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 ml-1">Subject Packages</h4>

                                    {/* Subject 1 (Primary) */}
                                    <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs">
                                        <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 1 (Primary)</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                <Input
                                                    value={editFormData.subject_name_1}
                                                    onChange={(e) => setEditFormData({ ...editFormData, subject_name_1: e.target.value })}
                                                    placeholder="Maths"
                                                    className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                <Input
                                                    type="number"
                                                    value={editFormData.monthly_fee}
                                                    onChange={(e) => setEditFormData({ ...editFormData, monthly_fee: Number(e.target.value) })}
                                                    placeholder="4500"
                                                    className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                <Input
                                                    type="number"
                                                    value={editFormData.classes_per_month}
                                                    onChange={(e) => setEditFormData({ ...editFormData, classes_per_month: Number(e.target.value) })}
                                                    placeholder="12"
                                                    className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                <Select 
                                                    onValueChange={(val) => setEditFormData({ ...editFormData, assigned_teacher_id: val })} 
                                                    value={editFormData.assigned_teacher_id || "none"}
                                                >
                                                    <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                        <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountEdit >= 2 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 2</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={editFormData.subject_name_2}
                                                        onChange={(e) => setEditFormData({ ...editFormData, subject_name_2: e.target.value })}
                                                        placeholder="Science"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.monthly_fee_2}
                                                        onChange={(e) => setEditFormData({ ...editFormData, monthly_fee_2: Number(e.target.value) })}
                                                        placeholder="3500"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.classes_per_month_2}
                                                        onChange={(e) => setEditFormData({ ...editFormData, classes_per_month_2: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setEditFormData({ ...editFormData, assigned_teacher_id_2: val })} 
                                                        value={editFormData.assigned_teacher_id_2 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountEdit >= 3 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 3</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={editFormData.subject_name_3}
                                                        onChange={(e) => setEditFormData({ ...editFormData, subject_name_3: e.target.value })}
                                                        placeholder="English"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.monthly_fee_3}
                                                        onChange={(e) => setEditFormData({ ...editFormData, monthly_fee_3: Number(e.target.value) })}
                                                        placeholder="3000"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.classes_per_month_3}
                                                        onChange={(e) => setEditFormData({ ...editFormData, classes_per_month_3: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setEditFormData({ ...editFormData, assigned_teacher_id_3: val })} 
                                                        value={editFormData.assigned_teacher_id_3 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountEdit >= 4 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 4</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={editFormData.subject_name_4}
                                                        onChange={(e) => setEditFormData({ ...editFormData, subject_name_4: e.target.value })}
                                                        placeholder="Geography"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.monthly_fee_4}
                                                        onChange={(e) => setEditFormData({ ...editFormData, monthly_fee_4: Number(e.target.value) })}
                                                        placeholder="3000"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.classes_per_month_4}
                                                        onChange={(e) => setEditFormData({ ...editFormData, classes_per_month_4: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setEditFormData({ ...editFormData, assigned_teacher_id_4: val })} 
                                                        value={editFormData.assigned_teacher_id_4 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountEdit >= 5 && (
                                        <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/10 text-xs animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Subject 5</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Name</label>
                                                    <Input
                                                        value={editFormData.subject_name_5}
                                                        onChange={(e) => setEditFormData({ ...editFormData, subject_name_5: e.target.value })}
                                                        placeholder="History"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fee (₹)</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.monthly_fee_5}
                                                        onChange={(e) => setEditFormData({ ...editFormData, monthly_fee_5: Number(e.target.value) })}
                                                        placeholder="3000"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classes/Mo</label>
                                                    <Input
                                                        type="number"
                                                        value={editFormData.classes_per_month_5}
                                                        onChange={(e) => setEditFormData({ ...editFormData, classes_per_month_5: Number(e.target.value) })}
                                                        placeholder="8"
                                                        className="h-10 rounded-xl bg-background border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Tutor</label>
                                                    <Select 
                                                        onValueChange={(val) => setEditFormData({ ...editFormData, assigned_teacher_id_5: val })} 
                                                        value={editFormData.assigned_teacher_id_5 || "none"}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl border-none bg-background text-[11px]">
                                                            <SelectValue placeholder="Select Tutor..." />
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
                                    {visibleSubjectsCountEdit < 5 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full rounded-xl border-dashed border-indigo-500/40 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 text-[10px] font-bold gap-1 mt-2 py-3 h-auto uppercase tracking-wider"
                                            onClick={() => setVisibleSubjectsCountEdit(prev => Math.min(5, prev + 1))}
                                        >
                                            + Add Another Subject ({visibleSubjectsCountEdit}/5)
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 bg-muted/10 border-t border-border/20 flex gap-3 shrink-0">
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
        </div>
    );
}
