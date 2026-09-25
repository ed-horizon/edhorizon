
'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, X, Clock, Save, Sparkles, Star, BookOpen, FileText } from "lucide-react"
import { markStudentAttendance, finalizeClassSession } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface Student {
    id: string;
    full_name: string;
    email: string;
}

interface AttendanceSheetProps {
    classId: string;
    students: Student[];
    initialAttendance?: Record<string, 'present' | 'absent' | 'late'>;
    isCompleted?: boolean;
}

export function AttendanceSheet({ classId, students, initialAttendance = {}, isCompleted = false }: AttendanceSheetProps) {
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>(() => {
        if (Object.keys(initialAttendance).length > 0) return initialAttendance;
        const initial: Record<string, 'present' | 'absent' | 'late'> = {};
        students.forEach(s => { initial[s.id] = 'present'; });
        return initial;
    });
    
    const [topicTaught, setTopicTaught] = useState("")
    const [homeworkGiven, setHomeworkGiven] = useState("")
    const [performance, setPerformance] = useState<'Good' | 'Average' | 'Needs Improvement'>('Good')
    const [parentNote, setParentNote] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const router = useRouter()

    const updateStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
        setAttendance(prev => ({ ...prev, [studentId]: status }))
    }

    const saveDraftAttendance = async () => {
        setIsSaving(true)
        try {
            const promises = Object.entries(attendance).map(([studentId, status]) => 
                markStudentAttendance(classId, studentId, status)
            )
            await Promise.all(promises)
            toast.success("Draft attendance updated!")
        } catch (error) {
            toast.error("Failed to save draft attendance")
        } finally {
            setIsSaving(false)
        }
    }

    const handleFinalizeSession = async () => {
        // Check if any student is marked present or late
        const hasPresentStudent = Object.values(attendance).some(status => status === 'present' || status === 'late');
        
        if (hasPresentStudent && !topicTaught.trim()) {
            toast.error("Please enter the Topic Taught before submitting this class session.");
            return;
        }

        if (!window.confirm("Are you sure? Once finalized, the session will be submitted for payroll calculation and locked.")) return;
        
        setIsCompleting(true)
        try {
            const studentAttendances = Object.entries(attendance).map(([studentId, status]) => ({
                studentId,
                status
            }));

            const result = await finalizeClassSession(
                classId,
                studentAttendances,
                hasPresentStudent ? topicTaught.trim() : "Student No Show",
                hasPresentStudent ? homeworkGiven.trim() : "N/A",
                hasPresentStudent ? performance : "Needs Improvement",
                parentNote.trim()
            );

            if (result.success) {
                toast.success("Session finalized and submitted for payroll verification!")
                router.push('/teacher')
            } else {
                toast.error(result.error || "Failed to submit class report")
            }
        } catch (error: any) {
            toast.error(error?.message || "Failed to finalize session")
        } finally {
            setIsCompleting(false)
        }
    }

    return (
        <Card className="rounded-[2.5rem] border-border/40 shadow-2xl overflow-hidden bg-white dark:bg-[#0a0a0a]">
            <CardHeader className="p-6 md:p-10 border-b border-border/40">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
                            <CardTitle className="text-2xl md:text-3xl font-serif font-bold italic tracking-tight">
                                Session Mark-Sheet & Topic Log
                            </CardTitle>
                        </div>
                        <CardDescription className="italic text-xs md:text-sm">
                            Log student presence, enter syllabus topic taught, and finalize this session for payroll verification.
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button 
                            variant="outline"
                            onClick={saveDraftAttendance}
                            disabled={isSaving || isCompleted || isCompleting}
                            className="h-12 md:h-14 px-6 md:px-8 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] gap-2 md:gap-3"
                        >
                            <Save size={18} />
                            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
                        </Button>

                        <Button 
                            onClick={handleFinalizeSession}
                            disabled={isSaving || isCompleted || isCompleting}
                            className="h-12 md:h-14 px-6 md:px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 md:gap-3 shadow-xl shadow-emerald-600/20"
                        >
                            <Check size={18} />
                            <span>{isCompleting ? "Submitting..." : isCompleted ? "Submitted & Locked" : "Finalize & Submit Session"}</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 md:p-10 space-y-8">
                {/* 1. Student Attendance List */}
                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic">
                        Student Attendance Status
                    </Label>
                    <div className="divide-y divide-border/40 border border-border/40 rounded-2xl overflow-hidden">
                        {students.map((student) => {
                            const currentStatus = attendance[student.id] || 'present';
                            return (
                                <div key={student.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
                                            {student.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-base md:text-lg text-foreground">{student.full_name}</h4>
                                            <p className="text-xs text-muted-foreground italic">{student.email}</p>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "flex items-center gap-2 p-1.5 bg-muted/20 rounded-2xl border border-border/40 w-fit self-start sm:self-auto",
                                        isCompleted && "opacity-50 pointer-events-none"
                                    )}>
                                        <button
                                            type="button"
                                            onClick={() => updateStatus(student.id, 'present')}
                                            className={cn(
                                                "flex flex-col items-center justify-center h-14 md:h-16 w-16 md:w-20 rounded-xl transition-all gap-1",
                                                currentStatus === 'present' 
                                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold" 
                                                    : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                            )}
                                        >
                                            <Check size={18} />
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Present</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateStatus(student.id, 'late')}
                                            className={cn(
                                                "flex flex-col items-center justify-center h-14 md:h-16 w-16 md:w-20 rounded-xl transition-all gap-1",
                                                currentStatus === 'late' 
                                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 font-bold" 
                                                    : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                            )}
                                        >
                                            <Clock size={18} />
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Late</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateStatus(student.id, 'absent')}
                                            className={cn(
                                                "flex flex-col items-center justify-center h-14 md:h-16 w-16 md:w-20 rounded-xl transition-all gap-1",
                                                currentStatus === 'absent' 
                                                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 font-bold" 
                                                    : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                            )}
                                        >
                                            <X size={18} />
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">No Show</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 2. Topic Taught & Class Log Form */}
                <div className="space-y-6 pt-4 border-t border-border/40">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <BookOpen size={16} />
                            <span>Topic Taught in Class *</span>
                        </Label>
                        <Input
                            placeholder="e.g. Chapter 4: Quadratic Equations, Reading Comprehension, Spoken English"
                            value={topicTaught}
                            onChange={(e) => setTopicTaught(e.target.value)}
                            disabled={isCompleted}
                            className="h-14 rounded-2xl bg-muted/20 border-border/40 focus:ring-2 focus:ring-indigo-600 font-medium text-sm md:text-base px-6"
                            required
                        />
                        <p className="text-[11px] text-muted-foreground italic ml-1">
                            Mandatory field for payroll approval. Specify the exact chapter or syllabus topic covered.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">
                                Homework / Self-Study Assigned
                            </Label>
                            <Input
                                placeholder="e.g. Solve Exercises 4.1 to 4.3, Write 5 sentences"
                                value={homeworkGiven}
                                onChange={(e) => setHomeworkGiven(e.target.value)}
                                disabled={isCompleted}
                                className="h-12 rounded-xl bg-muted/20 border-border/40 px-4 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">
                                Student Performance Rating
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['Good', 'Average', 'Needs Improvement'] as const).map((perf) => (
                                    <button
                                        key={perf}
                                        type="button"
                                        disabled={isCompleted}
                                        onClick={() => setPerformance(perf)}
                                        className={cn(
                                            "h-12 rounded-xl font-bold text-xs border transition-all px-2 text-center",
                                            performance === perf
                                                ? perf === 'Good' 
                                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                                    : perf === 'Average'
                                                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                                                        : 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                                                : 'border-border/40 hover:bg-muted/20 text-muted-foreground'
                                        )}
                                    >
                                        {perf}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">
                            Notes for Parent / Progress Feedback (Optional)
                        </Label>
                        <Textarea
                            placeholder="Share progress updates or constructive notes for the parent..."
                            value={parentNote}
                            onChange={(e) => setParentNote(e.target.value)}
                            disabled={isCompleted}
                            className="min-h-[100px] rounded-2xl bg-muted/20 border-border/40 p-4 text-sm"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
