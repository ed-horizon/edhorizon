'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, Clock, Send, CheckCircle2 } from "lucide-react"
import { finalizeClassSession } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn, formatClassTitle } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Users } from "lucide-react"

interface ClassData {
    id: string;
    title: string;
    scheduled_at: string;
    status: string;
    verification_status: string;
    duration_hours: number;
    student: {
        id: string;
        full_name: string;
    } | null;
    course?: { title: string };
    module?: { title: string };
}

export function TeacherAttendanceSpreadsheet({ classes }: { classes: ClassData[] }) {
    const [localClasses, setLocalClasses] = useState<ClassData[]>(classes)
    const [submitting, setSubmitting] = useState<string | null>(null)
    const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

    // Group localClasses by student
    const studentGroups = localClasses.reduce((acc, c) => {
        const sName = c.student?.full_name || 'Unassigned'
        if (!acc[sName]) acc[sName] = []
        acc[sName].push(c)
        return acc
    }, {} as Record<string, ClassData[]>)

    const studentNames = Object.keys(studentGroups)

    useEffect(() => {
        setLocalClasses(classes)
    }, [classes])

    const handleAttendanceChange = (classId: string, status: 'present' | 'absent' | 'late') => {
        setAttendanceMap(prev => ({ ...prev, [classId]: status }))
    }

    const handleSubmit = async (classItem: ClassData) => {
        if (!classItem.student) {
            toast.error("No student assigned to this class")
            return
        }
        
        const status = attendanceMap[classItem.id] || 'present'
        setSubmitting(classItem.id)
        
        try {
            const result: any = await finalizeClassSession(
                classItem.id, 
                [{
                    studentId: classItem.student.id,
                    status: status
                }],
                "Class Session",
                "N/A",
                "Good",
                ""
            )
            
            if (result && !result.success) {
                toast.error(result.error || "Failed to submit attendance")
                setSubmitting(null)
                return
            }

            toast.success("Class attendance submitted for payroll verification!")
            
            // Optimistic update
            setLocalClasses(prev => prev.map(c => 
                c.id === classItem.id ? { ...c, status: 'completed', verification_status: 'pending' } : c
            ))
        } catch (error) {
            toast.error("Failed to submit attendance")
        } finally {
            setSubmitting(null)
        }
    }

    return (
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl overflow-hidden bg-white dark:bg-[#111]">
            <CardHeader className="p-8 border-b border-border/40 bg-indigo-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-serif font-bold italic tracking-tight">Class Attendance & Timesheet</CardTitle>
                        <CardDescription className="italic">Mark student attendance below to submit your classes for payroll processing.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
                {studentNames.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted italic">
                        No classes scheduled or completed yet.
                    </div>
                ) : (
                    studentNames.map(sName => {
                        const studentClasses = studentGroups[sName]
                        const isExpanded = expandedStudent === sName
                        const pendingCount = studentClasses.filter(c => c.status === 'completed' && c.verification_status !== 'verified').length
                        
                        return (
                            <div key={sName} className="border-2 border-muted/30 rounded-[2rem] overflow-hidden bg-muted/5 transition-all">
                                <button 
                                    onClick={() => setExpandedStudent(isExpanded ? null : sName)}
                                    className="w-full flex items-center justify-between p-6 bg-card hover:bg-indigo-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
                                            {sName.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-bold text-foreground">{sName}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{studentClasses.length} Total Sessions</p>
                                                {pendingCount > 0 && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                        {pendingCount} Pending Verification
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="bg-white dark:bg-[#0a0a0a] border-t-2 border-muted/20 overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/10 border-b border-border/40">
                                                <tr>
                                                    <th className="px-6 py-4">Date & Time</th>
                                                    <th className="px-6 py-4">Class Title</th>
                                                    <th className="px-6 py-4 text-center">Student Attendance</th>
                                                    <th className="px-6 py-4 text-right">Payroll Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/40">
                                                {studentClasses.map((cls) => {
                                                    const isCompleted = cls.status === 'completed'
                                                    const isVerified = cls.verification_status === 'verified'
                                                    const isPending = cls.verification_status === 'pending'
                                                    const currentSelection = attendanceMap[cls.id] || 'present'
                                                    const isSubmitting = submitting === cls.id

                                                    return (
                                                        <tr key={cls.id} className="hover:bg-muted/5 transition-colors group">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="font-bold">{format(new Date(cls.scheduled_at), 'MMM dd, yyyy')}</div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1 italic mt-1">
                                                                    <Clock size={12} />
                                                                    <span>{format(new Date(cls.scheduled_at), 'hh:mm a')}</span>
                                                                    <span>({cls.duration_hours}h)</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {(() => {
                                                                    const { title: displayTitle, isCompensation } = formatClassTitle(cls.title);
                                                                    return (
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <div className="font-bold text-indigo-600 dark:text-indigo-400">{displayTitle}</div>
                                                                            {isCompensation && (
                                                                                <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                                    Comp
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                                                                    {cls.course?.title || "Recurring Class"}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                {!isCompleted ? (
                                                                    <div className="flex items-center justify-center gap-1 p-1 bg-muted/20 rounded-xl border border-border/40 inline-flex">
                                                                        <button
                                                                            onClick={() => handleAttendanceChange(cls.id, 'present')}
                                                                            className={cn(
                                                                                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                                                                                currentSelection === 'present' ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                                                            )}
                                                                            title="Present"
                                                                        >
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleAttendanceChange(cls.id, 'late')}
                                                                            className={cn(
                                                                                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                                                                                currentSelection === 'late' ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                                                            )}
                                                                            title="Late"
                                                                        >
                                                                            <Clock size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleAttendanceChange(cls.id, 'absent')}
                                                                            className={cn(
                                                                                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                                                                                currentSelection === 'absent' ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "text-muted-foreground hover:bg-white dark:hover:bg-white/5"
                                                                            )}
                                                                            title="Absent"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Submitted</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {!isCompleted ? (
                                                                    <Button 
                                                                        size="sm"
                                                                        onClick={() => handleSubmit(cls)}
                                                                        disabled={isSubmitting || !cls.student}
                                                                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] h-8 px-4 gap-2"
                                                                    >
                                                                        {isSubmitting ? (
                                                                            <span className="animate-pulse">Saving...</span>
                                                                        ) : (
                                                                            <>
                                                                                <Send size={12} />
                                                                                Submit
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                ) : (
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {isVerified ? (
                                                                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                                                                                <CheckCircle2 size={14} />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Paid</span>
                                                                            </div>
                                                                        ) : isPending ? (
                                                                            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                                                                                <Clock size={14} />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Pending Verification</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Rejected</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}
