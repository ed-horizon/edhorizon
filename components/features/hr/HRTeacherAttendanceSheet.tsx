'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import { toast } from "sonner"
import { updateStudentAttendanceHR } from "@/app/(dashboard)/attendance/actions"
import { Badge } from "@/components/ui/badge"
import { formatClassTitle } from "@/lib/utils"

interface ClassLog {
    id: string;
    title: string;
    scheduled_at: string;
    duration_hours: number;
    status: string;
    verification_status: string;
    course: { title: string };
    student: { id: string; full_name: string } | null;
    student_attendance: { status: string; student_id: string }[];
}

interface HRTeacherAttendanceSheetProps {
    classes: ClassLog[];
}

export function HRTeacherAttendanceSheet({ classes: initialClasses }: HRTeacherAttendanceSheetProps) {
    const [classes, setClasses] = useState(initialClasses)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState<string | null>(null)
    const [editStatus, setEditStatus] = useState<'present' | 'absent' | 'late'>('present')

    const getAttendanceLabel = (c: ClassLog) => {
        if (!c.student) return null;
        const record = c.student_attendance.find(a => a.student_id === c.student?.id);
        const status = record?.status || 'unmarked';
        
        const colors: Record<string, string> = {
            present: 'bg-emerald-100 text-emerald-700',
            absent: 'bg-rose-100 text-rose-700',
            late: 'bg-amber-100 text-amber-700',
            unmarked: 'bg-slate-100 text-slate-700'
        }
        
        return (
            <Badge className={`rounded-xl px-3 py-1 uppercase text-[10px] font-black tracking-widest border-none ${colors[status]}`}>
                {status}
            </Badge>
        )
    }

    const startEditing = (c: ClassLog) => {
        const record = c.student_attendance.find(a => a.student_id === c.student?.id);
        setEditStatus((record?.status as any) || 'present')
        setEditingId(c.id)
    }

    const cancelEdit = () => {
        setEditingId(null)
    }

    const handleSave = async (c: ClassLog) => {
        if (!c.student) return;
        setSubmitting(c.id)
        
        try {
            const result = await updateStudentAttendanceHR(c.id, c.student.id, editStatus)
            if (result && !result.success) {
                toast.error(result.error || "Failed to update attendance")
                return
            }

            toast.success("Student attendance updated via administrative override.")
            
            setClasses(classes.map(item => {
                if (item.id === c.id) {
                    // Update frontend state
                    const otherAtts = item.student_attendance.filter(a => a.student_id !== c.student?.id)
                    return {
                        ...item,
                        student_attendance: [...otherAtts, { student_id: c.student!.id, status: editStatus }]
                    }
                }
                return item
            }))
        } catch (err: any) {
            toast.error(err.message || "An error occurred")
        } finally {
            setSubmitting(null)
            setEditingId(null)
        }
    }

    return (
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl overflow-hidden bg-white dark:bg-[#111]">
            <CardHeader className="bg-indigo-600/5 px-8 pt-8 pb-6 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-serif font-bold italic tracking-tight">Tutor Attendance History</CardTitle>
                        <CardDescription>Historical log of classes, student presence, and payroll verification states.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10">
                        <AlertCircle size={48} className="mb-4 opacity-20" />
                        <p className="font-semibold italic">No completed classes logged for this tutor.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] uppercase font-black tracking-widest bg-muted/30 text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-3xl">Class & Topic</th>
                                    <th className="px-6 py-4">Schedule</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Student Attendance</th>
                                    <th className="px-6 py-4">Payroll Status</th>
                                    <th className="px-6 py-4 text-right rounded-tr-3xl">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {classes.map((c) => (
                                    <tr key={c.id} className="hover:bg-muted/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-foreground">{c.course?.title || 'Unknown Course'}</p>
                                            {(() => {
                                                const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                return (
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">{displayTitle}</span>
                                                        {isCompensation && (
                                                            <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                Comp
                                                            </Badge>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                                                <span className="flex items-center gap-1"><Calendar size={12} className="text-indigo-400" /> {format(new Date(c.scheduled_at), 'MMM dd, yyyy')}</span>
                                                <span className="flex items-center gap-1"><Clock size={12} className="text-indigo-400" /> {c.duration_hours} h</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {c.student ? (
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-indigo-600" />
                                                    <span className="font-medium">{c.student.full_name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground italic text-xs">No Student</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {editingId === c.id ? (
                                                <select 
                                                    className="px-3 py-1.5 rounded-xl border-2 border-indigo-200 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                                                    value={editStatus}
                                                    onChange={(e) => setEditStatus(e.target.value as any)}
                                                    disabled={submitting === c.id}
                                                >
                                                    <option value="present">Present</option>
                                                    <option value="absent">Absent</option>
                                                    <option value="late">Late</option>
                                                </select>
                                            ) : (
                                                getAttendanceLabel(c)
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {c.verification_status === 'verified' ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none font-black uppercase tracking-widest text-[10px] flex items-center gap-1 w-fit">
                                                    <CheckCircle2 size={12} /> Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-amber-200 text-amber-600 font-black uppercase tracking-widest text-[10px] flex items-center gap-1 w-fit">
                                                    <Clock size={12} /> {c.verification_status}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            {c.student && (
                                                editingId === c.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="text-[10px] uppercase font-black tracking-widest h-8"
                                                            onClick={cancelEdit}
                                                            disabled={submitting === c.id}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase font-black tracking-widest rounded-xl h-8"
                                                            onClick={() => handleSave(c)}
                                                            disabled={submitting === c.id}
                                                        >
                                                            {submitting === c.id ? <RefreshCw className="mr-2 h-3 w-3 animate-spin"/> : 'Save'}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-[10px] uppercase font-black tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 rounded-xl"
                                                        onClick={() => startEditing(c)}
                                                    >
                                                        Edit Stats
                                                    </Button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
