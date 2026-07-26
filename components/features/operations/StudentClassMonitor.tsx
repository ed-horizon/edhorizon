'use client'

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Users, Video, Clock, Share2, Plus, ChevronDown, ChevronUp,
    Search, GraduationCap, DollarSign, UserCheck, Loader2, ExternalLink, Check, X,
    BookOpen, Upload, FileText, Trash2, AlertTriangle
} from "lucide-react";
import { cn, formatClassTitle, parseStudentIdAndMobile, formatInIST } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { assignTutorToStudent, cancelLiveClass, deleteClassLogOrSession } from "@/app/(dashboard)/attendance/actions";
import { createClient } from "@/lib/supabase/client";
import { CreateLiveClassDialog } from "@/components/features/teacher/CreateLiveClassDialog";
import { PostClassLogModal } from "@/components/features/teacher/PostClassLogModal";
import { AssignHomeworkDialog, UploadMaterialDialog } from "@/components/features/teacher/StudentActionDialogs";


interface LiveClass {
    id: string;
    title: string;
    meeting_link: string;
    scheduled_at: string;
    status: string;
    teacher_id: string;
    teacher?: { full_name: string };
    tutor_joined_at?: string | null;
    student_joined_at?: string | null;
    parent_verified?: boolean | null;
    parent_dispute_reason?: string | null;
    tutor_joined_late?: boolean | null;
    schedule_id?: string | null;
}

interface ClassSchedule {
    id: string;
    title?: string | null;
    subject?: string | null;
    start_date?: string | null;
    end_date?: string | null;
}

interface StudentWithClasses {
    id: string;
    full_name: string;
    email: string;
    grade_level: string;
    monthly_fee: number;
    classes_per_month: number;
    status: string;
    assigned_teacher_id: string | null;
    assigned_teacher_name: string;
    preferred_meeting_link: string;
    preferred_time: string;
    custom_student_id?: string | null;
    classes: LiveClass[];
    active_schedule?: ClassSchedule | null;
    active_schedules?: ClassSchedule[];
}

interface StudentClassMonitorProps {
    students: StudentWithClasses[];
    teachers: { id: string; full_name: string | null; email: string }[];
}

export function StudentClassMonitor({ students: initialStudents, teachers }: StudentClassMonitorProps) {
    const [students, setStudents] = useState<StudentWithClasses[]>(initialStudents);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [updatingTutorId, setUpdatingTutorId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>("");
    const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile?.role) {
                    setUserRole(profile.role);
                }
            }
        };
        fetchRole();
    }, []);

    const filteredStudents = students.filter(s => {
        const query = searchQuery.toLowerCase();
        return (
            s.full_name?.toLowerCase().includes(query) ||
            s.email?.toLowerCase().includes(query) ||
            s.grade_level?.toLowerCase().includes(query) ||
            s.assigned_teacher_name?.toLowerCase().includes(query)
        );
    });

    const handleAssignTutor = async (studentId: string, teacherId: string) => {
        setUpdatingTutorId(studentId);
        try {
            const actualTeacherId = teacherId === "unassigned" ? null : teacherId;
            const result = await assignTutorToStudent(studentId, actualTeacherId);

            if (result.success) {
                const selectedTeacher = teachers.find(t => t.id === teacherId);
                const teacherName = selectedTeacher?.full_name || "None Assigned";

                setStudents(prev => prev.map(s =>
                    s.id === studentId
                        ? { ...s, assigned_teacher_id: actualTeacherId, assigned_teacher_name: teacherName }
                        : s
                ));

                toast.success(`Successfully assigned tutor: ${teacherName}`);
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

    const handleCancelClass = async (classId: string) => {
        if (!confirm("Are you sure you want to cancel this scheduled class?")) {
            return;
        }
        try {
            const result = await cancelLiveClass(classId);
            if (result.success) {
                toast.success("Class cancelled successfully.");
                window.location.reload();
            } else {
                toast.error(result.error || "Failed to cancel class.");
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
        }
    };

    const getScheduleStats = (sch: ClassSchedule, allClasses: LiveClass[]) => {
        const classesForSch = allClasses.filter(c => {
            if (c.schedule_id === sch.id) return true;
            if (!c.schedule_id) {
                const classTitleLower = (c.title || "").toLowerCase();
                const subjectLower = (sch.title || "").toLowerCase();
                return classTitleLower.includes(subjectLower) || subjectLower.includes(classTitleLower);
            }
            return false;
        });

        const start = new Date(sch.start_date + "T00:00:00");
        const end = new Date(sch.end_date + "T23:59:59");
        const inCycleClasses = classesForSch.filter(c => {
            const d = new Date(c.scheduled_at);
            return d >= start && d <= end;
        });

        const schedCount = inCycleClasses.filter(c => c.status === 'scheduled').length;
        const doneCount = inCycleClasses.filter(c => c.status === 'completed').length;

        return { schedCount, doneCount };
    };

    const handleShareLink = (title: string, link: string) => {
        if (!link) {
            toast.error("No meeting link available to share.");
            return;
        }
        navigator.clipboard.writeText(link);
        toast.success(`Join link copied for "${title}"!`);
    };

    return (
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card overflow-hidden">
            <CardHeader className="border-b border-border/10 p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2.5">
                        <Users className="text-indigo-600 dark:text-indigo-400" size={22} />
                        <span>Student-Centric Class Schedules</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                        Monitor active class logs and manage tutor connections by student.
                    </CardDescription>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                    <Input
                        placeholder="Search student, email, tutor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                    />
                </div>
            </CardHeader>

            {/* Desktop Grid Headers */}
            <div className="hidden md:grid md:grid-cols-12 px-12 py-3 bg-muted/30 border-b border-border/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <div className="col-span-3">Student Info</div>
                <div className="col-span-2">Student ID</div>
                <div className="col-span-1">Class</div>
                <div className="col-span-2">Fees & Package</div>
                <div className="col-span-2">Assigned Tutor</div>
                <div className="col-span-2 text-right pr-6">Schedules / Actions</div>
            </div>

            <CardContent className="p-6">
                <div className="space-y-4">
                    {filteredStudents.map(student => {
                        const isExpanded = expandedStudentId === student.id;

                        // Filter classes by active schedule range or default to current calendar month
                        let filteredStudentClasses = student.classes;
                        const studentSchedules = student.active_schedules || (student.active_schedule ? [student.active_schedule] : []);
                        const hasActiveSchedules = studentSchedules.length > 0;
                        if (hasActiveSchedules) {
                            filteredStudentClasses = student.classes.filter(c => {
                                const d = new Date(c.scheduled_at);
                                return studentSchedules.some(sch => {
                                    const start = new Date(sch.start_date + "T00:00:00");
                                    const end = new Date(sch.end_date + "T23:59:59");
                                    return d >= start && d <= end;
                                });
                            });
                        } else {
                            const currentMonth = new Date().getMonth();
                            const currentYear = new Date().getFullYear();
                            filteredStudentClasses = student.classes.filter(c => {
                                const d = new Date(c.scheduled_at);
                                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                            });
                        }

                        const activeClasses = filteredStudentClasses.filter(c => c.status === 'scheduled');
                        const completedClasses = filteredStudentClasses.filter(c => c.status === 'completed');

                        const completedThisMonth = completedClasses.length;
                        const limit = student.classes_per_month || 12;
                        const isLimitReached = completedThisMonth >= limit;
                        const isNearLimit = completedThisMonth === limit - 1;
                        const showFeeReminder = student.status !== 'active' && (isLimitReached || isNearLimit);

                        return (
                            <div
                                key={student.id}
                                className={cn(
                                    "border-2 rounded-[2rem] overflow-hidden bg-card/40 transition-all",
                                    isExpanded ? 'border-indigo-500/40 shadow-lg' : 'border-border/30 hover:border-indigo-500/10'
                                )}
                            >
                                {/* Student Summary Row */}
                                <div className="flex flex-col md:grid md:grid-cols-12 md:items-center p-6 gap-4">
                                    {/* Student Info */}
                                    <div className="flex items-center gap-3 text-left md:col-span-3">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-50/10 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 flex items-center justify-center font-bold text-base shrink-0">
                                            {student.full_name?.charAt(0) || student.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-foreground truncate">
                                                {student.full_name || 'No Name Set'}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground truncate">{student.email}</p>
                                        </div>
                                    </div>

                                    {/* Student ID & Mobile */}
                                    <div className="md:col-span-2 text-left flex flex-col gap-1">
                                        {(() => {
                                            const { studentId, mobileNumber } = parseStudentIdAndMobile(student.custom_student_id);
                                            return (
                                                <>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[8px] font-black uppercase text-muted-foreground w-7">ID:</span>
                                                        <span className="font-mono text-[9px] font-bold text-indigo-950 dark:text-indigo-200 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                                                            {studentId || "N/A"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[8px] font-black uppercase text-muted-foreground w-7">Mob:</span>
                                                        <span className="font-mono text-[9px] font-bold text-indigo-950 dark:text-indigo-200 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                                                            {mobileNumber || "N/A"}
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Class */}
                                    <div className="md:col-span-1 text-left">
                                        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-none font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                                            {student.grade_level || 'N/A'}
                                        </Badge>
                                    </div>

                                    {/* Fees & Package */}
                                    <div className="md:col-span-2 text-left flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-none font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                                                ₹{student.monthly_fee}/mo
                                            </Badge>
                                            <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-none font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                                                {student.classes_per_month} cls/mo
                                            </Badge>
                                        </div>
                                        {showFeeReminder && (
                                            <span className={cn("text-[9px] font-bold uppercase tracking-wider animate-pulse mt-0.5 block",
                                                isLimitReached ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                                            )}>
                                                {isLimitReached ? "⚠️ Limit Reached" : "⚠️ 1 Class Left"}
                                            </span>
                                        )}
                                    </div>

                                    {/* Assigned Tutor */}
                                    <div className="flex items-center gap-2 md:col-span-2 w-full">
                                        <div className="w-full">
                                            <Select
                                                onValueChange={(val) => handleAssignTutor(student.id, val)}
                                                value={student.assigned_teacher_id || "unassigned"}
                                                disabled={updatingTutorId === student.id}
                                            >
                                                <SelectTrigger className="h-8 w-full rounded-lg border border-muted/50 bg-background text-[11px] font-semibold gap-1 px-2.5">
                                                    {updatingTutorId === student.id ? (
                                                        <Loader2 size={12} className="animate-spin text-indigo-500 mr-1" />
                                                    ) : (
                                                        <UserCheck size={12} className="text-indigo-500 mr-1" />
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
                                    </div>

                                    {/* Class Counts & expand chevron */}
                                    <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap md:col-span-2">
                                        <div className="flex flex-col gap-1 items-end pr-2 text-right">
                                            {studentSchedules.length > 0 ? (
                                                studentSchedules.map((sch: ClassSchedule, idx: number) => {
                                                    const { schedCount, doneCount } = getScheduleStats(sch, student.classes);
                                                    return (
                                                        <div key={sch.id || idx} className="flex flex-col items-end">
                                                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                                                                {sch.title || "Class"}
                                                            </span>
                                                            <div className="flex gap-1 mt-0.5">
                                                                <Badge variant="outline" className="text-[8px] font-black uppercase rounded-full px-1.5 py-0.2 scale-90">
                                                                    {schedCount} Sched
                                                                </Badge>
                                                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-none text-[8px] font-black uppercase rounded-full px-1.5 py-0.2 scale-90">
                                                                    {doneCount} Done
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="flex gap-1.5 items-center">
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 text-slate-600 dark:text-slate-300">
                                                        {activeClasses.length} Sched
                                                    </Badge>
                                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-none text-[8px] font-black uppercase tracking-wider rounded-full px-2 py-0.5">
                                                        {completedClasses.length} Done
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 rounded-full hover:bg-muted"
                                                onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Class Log List */}
                                {isExpanded && (
                                    <div className="p-6 pt-0 border-t border-border/10 bg-muted/10">
                                        <div className="flex justify-between items-center mt-4">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class Schedule History</h4>
                                                {student.active_schedules && student.active_schedules.length > 0 ? (
                                                     <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 space-y-0.5">
                                                         {student.active_schedules.map((sch, idx) => (
                                                             <div key={sch.id || idx}>
                                                                 Subject: <span className="font-bold">{sch.subject}</span> | Active Cycle Range: {formatInIST(sch.start_date)} to {formatInIST(sch.end_date)}
                                                             </div>
                                                         ))}
                                                     </div>
                                                 ) : student.active_schedule ? (
                                                     <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                                                         Active Cycle Range: {formatInIST(student.active_schedule.start_date)} to {formatInIST(student.active_schedule.end_date)}
                                                     </p>
                                                 ) : null}
                                            </div>
                                            <CreateLiveClassDialog
                                                preselectedStudentId={student.id}
                                                preselectedTeacherId={student.assigned_teacher_id || undefined}
                                                triggerButton={
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 gap-1.5"
                                                    >
                                                        <Plus size={10} />
                                                        <span>Compensation Class</span>
                                                    </Button>
                                                }
                                            />
                                        </div>

                                        <div className="overflow-x-auto mt-3 rounded-xl border border-border/20 bg-background overflow-hidden">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-muted/40 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                        <th className="p-4 pl-6">Class Title</th>
                                                        <th className="p-4">Scheduled Date & Time</th>
                                                        <th className="p-4">Assigned Tutor</th>
                                                        <th className="p-4">Status</th>
                                                        <th className="p-4">Audit Check-in</th>
                                                        <th className="p-4 text-right pr-6">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/10">
                                                    {filteredStudentClasses.map(c => (
                                                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                                                            <td className="p-4 pl-6 font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight">
                                                                {(() => {
                                                                    const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                                    return (
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span>{displayTitle}</span>
                                                                            {isCompensation && (
                                                                                <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                                    Comp
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="p-4 text-muted-foreground font-semibold">
                                                                {formatInIST(c.scheduled_at)}
                                                            </td>
                                                            <td className="p-4 text-muted-foreground">
                                                                {c.teacher?.full_name || 'N/A'}
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge className={cn("text-[9px] font-black uppercase border-none rounded-full px-2 py-0.5",
                                                                    c.status === 'completed'
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : c.status === 'cancelled'
                                                                        ? 'bg-muted text-muted-foreground'
                                                                        : 'bg-indigo-100 text-indigo-800'
                                                                )}>
                                                                    {c.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 space-y-0.5 text-[10px]">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-bold text-muted-foreground">Tutor:</span>
                                                                    {c.tutor_joined_at ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                            {formatInIST(c.tutor_joined_at, 'hh:mm a')}
                                                                            {c.tutor_joined_late && (
                                                                                <Badge className="bg-rose-500/10 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-500/20 text-[8px] font-black uppercase ml-1 px-1.5 py-0.2 rounded-full scale-90 inline-flex align-middle">
                                                                                    LATE
                                                                                </Badge>
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-rose-500 font-semibold italic">No Join Log</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-bold text-muted-foreground">Student:</span>
                                                                    {c.student_joined_at ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatInIST(c.student_joined_at, 'hh:mm a')}</span>
                                                                    ) : (
                                                                        <span className="text-rose-500 font-semibold italic">No Join Log</span>
                                                                    )}
                                                                </div>
                                                                {c.status === 'completed' && (
                                                                    <div className="flex items-center gap-1 mt-1 border-t border-border/10 pt-1">
                                                                        <span className="font-bold text-muted-foreground">Parent:</span>
                                                                        {c.parent_verified === true ? (
                                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.2 rounded-full text-[8px] scale-90">Verified</span>
                                                                        ) : c.parent_verified === false ? (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.2 rounded-full text-[8px] scale-90 w-max">Disputed</span>
                                                                                {c.parent_dispute_reason && (
                                                                                    <span className="text-[8px] text-rose-500 font-medium italic block max-w-[150px] truncate" title={c.parent_dispute_reason}>
                                                                                        {c.parent_dispute_reason}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-amber-600 dark:text-amber-400 font-medium italic">Pending</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-right pr-6">
                                                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                                                    <PostClassLogModal
                                                                        classId={c.id}
                                                                        studentId={student.id}
                                                                        studentName={student.full_name}
                                                                        onSuccess={() => window.location.reload()}
                                                                        trigger={
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-indigo-500/20 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 gap-1"
                                                                            >
                                                                                <FileText size={10} />
                                                                                <span>{c.status === 'completed' ? 'Edit Log' : 'Log Class'}</span>
                                                                            </Button>
                                                                        }
                                                                    />
                                                                    <AssignHomeworkDialog
                                                                        studentId={student.id}
                                                                        studentName={student.full_name}
                                                                        onSuccess={() => {}}
                                                                        trigger={
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1"
                                                                            >
                                                                                <BookOpen size={10} />
                                                                                <span>Homework</span>
                                                                            </Button>
                                                                        }
                                                                    />
                                                                    <UploadMaterialDialog
                                                                        studentId={student.id}
                                                                        studentName={student.full_name}
                                                                        onSuccess={() => {}}
                                                                        trigger={
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-amber-500/20 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 gap-1"
                                                                            >
                                                                                <Upload size={10} />
                                                                                <span>Worksheet</span>
                                                                            </Button>
                                                                        }
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleShareLink(c.title, c.meeting_link)}
                                                                        className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-muted/50 gap-1"
                                                                    >
                                                                        <Share2 size={10} />
                                                                        <span>Share Link</span>
                                                                    </Button>
                                                                    {c.status === 'completed' && ['hr', 'operations', 'super_admin', 'admin'].includes(userRole) && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => setDeletingClassId(c.id)}
                                                                            className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-rose-500/25 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1"
                                                                        >
                                                                            <Trash2 size={10} />
                                                                            <span>Delete Log</span>
                                                                        </Button>
                                                                    )}
                                                                    {c.status === 'scheduled' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => handleCancelClass(c.id)}
                                                                            className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1"
                                                                        >
                                                                            <X size={10} />
                                                                            <span>Cancel</span>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredStudentClasses.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-10 text-muted-foreground italic">
                                                                No classes scheduled for this student in this cycle.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredStudents.length === 0 && (
                        <div className="py-16 text-center text-muted-foreground italic text-sm">
                            No student profiles match your search criteria.
                        </div>
                    )}
                </div>
            </CardContent>

            {deletingClassId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-card border border-border/40 p-6 rounded-[2rem] max-w-md w-full mx-4 shadow-2xl space-y-6 text-left">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-rose-600 flex items-center gap-2">
                                <AlertTriangle size={20} />
                                <span>Manage Class Log / Session</span>
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                You can either revert the post-class logs (restoring the scheduled session and clearing all logs/attendance) or completely delete the session row.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <Button
                                onClick={async () => {
                                    const classId = deletingClassId;
                                    setDeletingClassId(null);
                                    try {
                                        const res = await deleteClassLogOrSession(classId, 'revert');
                                        if (res.success) {
                                            toast.success("Class log reverted to scheduled successfully!");
                                            window.location.reload();
                                        } else {
                                            toast.error(res.error || "Failed to revert log");
                                        }
                                    } catch (err) {
                                        toast.error("Failed to revert log");
                                    }
                                }}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 font-bold text-xs"
                            >
                                Revert Log to Scheduled (Clears logs & attendance)
                            </Button>
                            <Button
                                onClick={async () => {
                                    const classId = deletingClassId;
                                    setDeletingClassId(null);
                                    try {
                                        const res = await deleteClassLogOrSession(classId, 'delete');
                                        if (res.success) {
                                            toast.success("Class session deleted successfully!");
                                            window.location.reload();
                                        } else {
                                            toast.error(res.error || "Failed to delete session");
                                        }
                                    } catch (err) {
                                        toast.error("Failed to delete session");
                                    }
                                }}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 font-bold text-xs"
                            >
                                Delete Class Session Completely
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setDeletingClassId(null)}
                                className="w-full rounded-xl h-10 font-bold text-xs"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
