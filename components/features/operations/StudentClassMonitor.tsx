'use client'

import { useState } from "react";
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
    BookOpen, Upload, FileText
} from "lucide-react";
import { cn, formatClassTitle } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { assignTutorToStudent, cancelLiveClass } from "@/app/(dashboard)/attendance/actions";
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

            <CardContent className="p-6">
                <div className="space-y-4">
                    {filteredStudents.map(student => {
                        const isExpanded = expandedStudentId === student.id;
                        const activeClasses = student.classes.filter(c => c.status === 'scheduled');
                        const completedClasses = student.classes.filter(c => c.status === 'completed');
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();
                        const completedThisMonth = student.classes.filter(c => {
                            if (c.status !== 'completed') return false;
                            const d = new Date(c.scheduled_at);
                            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                        }).length;
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
                                    <div className="flex items-center gap-4 text-left md:col-span-5">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-50/10 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0">
                                            {student.full_name?.charAt(0) || student.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                                                <span>{student.full_name || 'No Name Set'}</span>
                                                {student.custom_student_id && (
                                                    <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/40">
                                                        {student.custom_student_id}
                                                    </span>
                                                )}
                                                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-none font-bold text-[9px] px-2 py-0.5 rounded-full">
                                                    {student.grade_level}
                                                </Badge>
                                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-none font-bold text-[9px] px-2 py-0.5 rounded-full">
                                                    ₹{student.monthly_fee}/mo
                                                </Badge>
                                                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-none font-bold text-[9px] px-2 py-0.5 rounded-full">
                                                    {student.classes_per_month} classes/mo
                                                </Badge>
                                                {showFeeReminder && (
                                                    <Badge className={cn("border-none font-bold text-[9px] px-2 py-0.5 rounded-full animate-pulse",
                                                        isLimitReached 
                                                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400" 
                                                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                                    )}>
                                                        {isLimitReached ? "⚠️ Limit Reached" : "⚠️ 1 Class Left"}
                                                    </Badge>
                                                )}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{student.email}</p>
                                        </div>
                                    </div>

                                    {/* Interactive Tutor Assignment */}
                                    <div className="flex items-center gap-2 md:col-span-3 w-full">
                                        <span className="text-[9px] font-black uppercase text-muted-foreground shrink-0 md:hidden">Tutor:</span>
                                        <div className="w-full max-w-[220px]">
                                            <Select 
                                                onValueChange={(val) => handleAssignTutor(student.id, val)}
                                                value={student.assigned_teacher_id || "unassigned"}
                                                disabled={updatingTutorId === student.id}
                                            >
                                                <SelectTrigger className="h-9 w-full rounded-xl border border-muted/50 bg-background text-[11px] font-bold gap-2">
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

                                    {/* Class Counts and Schedule Button */}
                                    <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap md:col-span-4">
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-wider rounded-full px-2 py-0.5">
                                                {activeClasses.length} Scheduled
                                            </Badge>
                                            {completedClasses.length > 0 && (
                                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-none text-[8px] font-black uppercase tracking-wider rounded-full px-2 py-0.5">
                                                    {completedClasses.length} Done
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Pre-filled Schedule Action */}
                                            <CreateLiveClassDialog 
                                                preselectedStudentId={student.id}
                                                preselectedTeacherId={student.assigned_teacher_id || undefined}
                                                triggerButton={
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-9 text-[9px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 gap-1.5"
                                                    >
                                                        <Plus size={10} />
                                                        <span>Compensation Class</span>
                                                    </Button>
                                                }
                                            />

                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-9 w-9 rounded-full hover:bg-muted"
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
                                        <div className="overflow-x-auto mt-4 rounded-xl border border-border/20 bg-background overflow-hidden">
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
                                                    {student.classes.map(c => (
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
                                                                {format(new Date(c.scheduled_at), 'EEE, MMM dd')} • {format(new Date(c.scheduled_at), 'hh:mm a')}
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
                                                                            {format(new Date(c.tutor_joined_at), 'hh:mm a')}
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
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{format(new Date(c.student_joined_at), 'hh:mm a')}</span>
                                                                    ) : (
                                                                        <span className="text-rose-500 font-semibold italic">No Join Log</span>
                                                                    )}
                                                                </div>
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
                                                    {student.classes.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-10 text-muted-foreground italic">
                                                                No classes scheduled for this student yet.
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
        </Card>
    );
}
