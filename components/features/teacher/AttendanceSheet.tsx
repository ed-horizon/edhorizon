
'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, Clock, Save } from "lucide-react"
import { markStudentAttendance, completeLiveClass } from "@/app/(dashboard)/attendance/actions"
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
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>(initialAttendance)
    const [isSaving, setIsSaving] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const router = useRouter()

    const updateStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
        setAttendance(prev => ({ ...prev, [studentId]: status }))
    }

    const saveAttendance = async () => {
        setIsSaving(true)
        try {
            const promises = Object.entries(attendance).map(([studentId, status]) => 
                markStudentAttendance(classId, studentId, status)
            )
            await Promise.all(promises)
            toast.success("Attendance sheet updated!")
        } catch (error) {
            toast.error("Failed to save some records")
        } finally {
            setIsSaving(false)
        }
    }

    const handleFinalizeSession = async () => {
        if (!window.confirm("Are you sure? Once finalized, the session will be submitted for payroll calculation and locked.")) return;
        
        setIsCompleting(true)
        try {
            // First save the student attendance
            await saveAttendance();
            
            // Then complete the session
            const result = await completeLiveClass(classId);
            if (result.success) {
                toast.success("Session finalized and submitted for pay!")
                router.push('/teacher')
            }
        } catch (error) {
            toast.error("Failed to finalize session")
        } finally {
            setIsCompleting(false)
        }
    }

    return (
        <Card className="rounded-[2.5rem] border-border/40 shadow-2xl overflow-hidden bg-white dark:bg-[#0a0a0a]">
            <CardHeader className="p-10 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-3xl font-serif font-bold italic tracking-tight mb-2">Session Mark-Sheet</CardTitle>
                        <CardDescription className="italic">Log student presence and finalize this 1:1 session for pay.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button 
                            variant="outline"
                            onClick={saveAttendance}
                            disabled={isSaving || isCompleted || isCompleting || Object.keys(attendance).length === 0}
                            className="h-14 px-8 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] gap-3"
                        >
                            <Save size={18} />
                            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
                        </Button>

                        <Button 
                            onClick={handleFinalizeSession}
                            disabled={isSaving || isCompleted || isCompleting || Object.keys(attendance).length === 0}
                            className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] gap-3 shadow-xl shadow-emerald-600/20"
                        >
                            <Check size={18} />
                            <span>{isCompleting ? "Submitting..." : isCompleted ? "Submitted" : "Finalize & Submit Session"}</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                    {students.map((student) => {
                        const currentStatus = attendance[student.id]
                        return (
                            <div key={student.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold">
                                        {student.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{student.full_name}</h4>
                                        <p className="text-xs text-muted-foreground italic">{student.email}</p>
                                    </div>
                                </div>

                                <div className={cn(
                                    "flex items-center gap-2 p-1.5 bg-muted/20 rounded-2xl border border-border/40 w-fit",
                                    isCompleted && "opacity-50 pointer-events-none"
                                )}>
                                    <button
                                        onClick={() => updateStatus(student.id, 'present')}
                                        className={cn(
                                            "flex flex-col items-center justify-center h-16 w-20 rounded-xl transition-all gap-1",
                                            currentStatus === 'present' 
                                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                                : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                        )}
                                    >
                                        <Check size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Present</span>
                                    </button>
                                    <button
                                        onClick={() => updateStatus(student.id, 'late')}
                                        className={cn(
                                            "flex flex-col items-center justify-center h-16 w-20 rounded-xl transition-all gap-1",
                                            currentStatus === 'late' 
                                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                                : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                        )}
                                    >
                                        <Clock size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Late</span>
                                    </button>
                                    <button
                                        onClick={() => updateStatus(student.id, 'absent')}
                                        className={cn(
                                            "flex flex-col items-center justify-center h-16 w-20 rounded-xl transition-all gap-1",
                                            currentStatus === 'absent' 
                                                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                                                : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                        )}
                                    >
                                        <X size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">No Show</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
