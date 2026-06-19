'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, User, Calendar as CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { verifyClassAttendance } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatClassTitle } from "@/lib/utils"

interface PendingClass {
    id: string; // class_id
    title: string;
    scheduled_at: string;
    duration_hours: number;
    course: { title: string };
    teacher: { full_name: string; email: string };
    student: { full_name: string; email: string } | null;
    topic_taught?: string;
    homework_given?: string;
    student_performance?: string;
    parent_note?: string;
}

interface AttendanceVerificationListProps {
    pendingClasses: PendingClass[];
}

export function AttendanceVerificationList({ pendingClasses: initialData }: AttendanceVerificationListProps) {
    const [pending, setPending] = useState(initialData)
    const [verifying, setVerifying] = useState<string | null>(null)

    const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
        setVerifying(id)
        try {
            await verifyClassAttendance(id, status)
            setPending(prev => prev.filter(item => item.id !== id))
            toast.success(`Class ${status === 'verified' ? 'verified' : 'rejected'} for payroll!`)
        } catch (error) {
            toast.error("Action failed")
        } finally {
            setVerifying(null)
        }
    }

    return (
        <Card className="rounded-[2.5rem] border-border/40 shadow-2xl overflow-hidden bg-white dark:bg-[#111]">
            <CardHeader className="p-8 bg-indigo-50/10 border-b border-border/40">
                <CardTitle className="text-xl font-bold italic">Class Attendance Verification</CardTitle>
                <CardDescription>Review and approve completed classes for staff payroll calculation.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {pending.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic">
                        No pending class logs for verification.
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {pending.map((item) => (
                            <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-start justify-between hover:bg-muted/5 transition-colors gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-1">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold">{item.teacher.full_name || item.teacher.email}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground italic">
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon size={12} />
                                                {format(new Date(item.scheduled_at), 'MMM dd, h:mm a')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {item.duration_hours}h
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mt-1 flex items-center gap-1.5 flex-wrap">
                                            <span>{item.course?.title}</span>
                                            <span>•</span>
                                            {(() => {
                                                const { title: displayTitle, isCompensation } = formatClassTitle(item.title);
                                                return (
                                                    <>
                                                        <span>{displayTitle}</span>
                                                        {isCompensation && (
                                                            <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                Comp
                                                            </Badge>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                            {item.student ? ` • Student: ${item.student.full_name}` : ''}
                                        </div>

                                        {/* Logged details card */}
                                        <div className="mt-4 p-4 bg-muted/30 rounded-2xl border border-border/20 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                                            <div>
                                                <span className="block text-[8px] font-black uppercase tracking-wider text-muted-foreground">Topic Taught</span>
                                                <span className="font-bold text-indigo-950 dark:text-indigo-200">{item.topic_taught || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase tracking-wider text-muted-foreground">Homework Assigned</span>
                                                <span className="font-bold text-indigo-950 dark:text-indigo-200">{item.homework_given || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[8px] font-black uppercase tracking-wider text-muted-foreground">Performance Rating</span>
                                                <span className={`font-bold ${
                                                    item.student_performance === 'Good' ? 'text-emerald-600' :
                                                    item.student_performance === 'Average' ? 'text-amber-600' : 'text-rose-600'
                                                }`}>{item.student_performance || 'Good'}</span>
                                            </div>
                                            {item.parent_note && (
                                                <div className="sm:col-span-2 border-t border-border/10 pt-2 mt-1">
                                                    <span className="block text-[8px] font-black uppercase tracking-wider text-muted-foreground">Parent Remark / Note</span>
                                                    <span className="italic text-muted-foreground block mt-0.5">{item.parent_note}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-center shrink-0">
                                    <Button 
                                        onClick={() => handleVerify(item.id, 'rejected')}
                                        disabled={!!verifying}
                                        variant="ghost" 
                                        className="h-10 w-10 p-0 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <X size={18} />
                                    </Button>
                                    <Button 
                                        onClick={() => handleVerify(item.id, 'verified')}
                                        disabled={!!verifying}
                                        className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-emerald-600/20"
                                    >
                                        <Check size={14} />
                                        <span>{verifying === item.id ? 'Processing...' : 'Verify'}</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
