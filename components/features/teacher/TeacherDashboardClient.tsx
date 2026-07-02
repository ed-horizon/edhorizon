'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PostClassLogModal } from "./PostClassLogModal"
import { AssignHomeworkDialog, UploadMaterialDialog, RequestRescheduleDialog } from "./StudentActionDialogs"
import { CreateLiveClassDialog } from "./CreateLiveClassDialog"
import { getStudentHistory, updateRescheduleStatus, updateLeaveStatus, logTutorJoinClass, applyForLeave, cancelLiveClass } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
    Video, Calendar, Clock, ExternalLink, CheckCircle2, AlertCircle,
    Users, ChevronDown, ChevronUp, BookOpen, Upload, Download,
    FileText, Award, Star, Loader2, Sparkles, LogOut, Check, X, Plus
} from "lucide-react"
import { formatTime12Hour, ensureAbsoluteUrl, formatClassTitle } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface LiveClass {
    id: string;
    title: string;
    meeting_link: string;
    scheduled_at: string;
    status: string;
    module?: { title: string };
    course?: { title: string };
    student: { id: string; full_name: string; email: string } | null;
    tutor_joined_late?: boolean;
    tutor_joined_at?: string;
}

interface Student {
    id: string;
    full_name: string;
    email: string;
    preferred_meeting_link?: string;
    preferred_time?: string;
    day_timings?: Record<string, string> | null;
}

interface TeacherDashboardClientProps {
    teacherName: string
    initialStats: {
        students: number
        capsules: number
        hours: number
        monthlyClassCount: number
        monthlyLateJoiningCount?: number
    }
    liveClasses: LiveClass[]
    assignedStudents: Student[]
    missingAttendance: any[]
    rescheduleRequests: any[]
    leaveRequests: any[]
}

export function TeacherDashboardClient({ 
    teacherName,
    initialStats, 
    liveClasses, 
    assignedStudents, 
    missingAttendance,
    rescheduleRequests,
    leaveRequests
}: TeacherDashboardClientProps) {
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
    const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({})
    const [studentHistory, setStudentHistory] = useState<Record<string, any>>({})
    const [activeTab, setActiveTab] = useState<Record<string, 'history' | 'homework' | 'materials'>>({})
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)
    const [isCancellingId, setIsCancellingId] = useState<string | null>(null)
    const [dismissedCancelledIds, setDismissedCancelledIds] = useState<string[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())
    const [loggingInClassId, setLoggingInClassId] = useState<string | null>(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 10000) // update every 10 seconds
        return () => clearInterval(interval)
    }, [])

    const handleLogInClass = async (classId: string, meetingLink: string) => {
        setLoggingInClassId(classId)
        try {
            const res = await logTutorJoinClass(classId)
            if (res.success) {
                toast.success("Successfully logged in to class!")
                window.open(ensureAbsoluteUrl(meetingLink), '_blank')
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to log in to class.")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.")
        } finally {
            setLoggingInClassId(null)
        }
    }

    useEffect(() => {
        try {
            const saved = localStorage.getItem("tutor_dismissed_cancelled_classes")
            if (saved) {
                setDismissedCancelledIds(JSON.parse(saved))
            }
        } catch (e) {
            console.error("Failed to load dismissed cancelled class IDs from localStorage", e)
        }
    }, [])

    const handleDismissCancelledClass = (classId: string) => {
        setDismissedCancelledIds(prev => {
            if (prev.includes(classId)) return prev
            const next = [...prev, classId]
            try {
                localStorage.setItem("tutor_dismissed_cancelled_classes", JSON.stringify(next))
            } catch (e) {
                console.error("Failed to save dismissed cancelled class IDs to localStorage", e)
            }
            return next
        })
    }

    const handleCancelClass = async (classId: string) => {
        if (!confirm("Are you sure you want to cancel this class session?")) {
            return
        }
        setIsCancellingId(classId)
        try {
            const res = await cancelLiveClass(classId)
            if (res.success) {
                toast.success("Class session cancelled successfully.")
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to cancel class session.")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.")
        } finally {
            setIsCancellingId(null)
        }
    }


    const handleUpdateReschedule = async (requestId: string, status: 'approved' | 'rejected') => {
        setUpdatingRequestId(requestId)
        try {
            const res = await updateRescheduleStatus(requestId, status)
            if (res.success) {
                toast.success(`Reschedule request marked as ${status}.`)
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to update reschedule request.")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.")
        } finally {
            setUpdatingRequestId(null)
        }
    }

    const handleUpdateLeave = async (leaveId: string, status: 'approved' | 'rejected') => {
        setUpdatingRequestId(leaveId)
        try {
            const res = await updateLeaveStatus(leaveId, status)
            if (res.success) {
                toast.success(`Leave request marked as ${status}.`)
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to update leave request.")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.")
        } finally {
            setUpdatingRequestId(null)
        }
    }

    const [leaveModalOpen, setLeaveModalOpen] = useState(false)
    const [leaveStartDate, setLeaveStartDate] = useState("")
    const [leaveEndDate, setLeaveEndDate] = useState("")
    const [leaveReason, setLeaveReason] = useState("")
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!leaveStartDate || !leaveEndDate || !leaveReason) {
            toast.error("Please fill in all fields.")
            return
        }
        setIsSubmittingLeave(true)
        try {
            const res = await applyForLeave(leaveStartDate, leaveEndDate, leaveReason)
            if (res.success) {
                toast.success("Leave request submitted successfully!")
                setLeaveStartDate("")
                setLeaveEndDate("")
                setLeaveReason("")
                setLeaveModalOpen(false)
            } else {
                toast.error(res.error || "Failed to submit leave request.")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.")
        } finally {
            setIsSubmittingLeave(false)
        }
    }

    const handleRefreshHistory = async (studentId: string) => {
        setLoadingHistory(prev => ({ ...prev, [studentId]: true }))
        try {
            const data = await getStudentHistory(studentId)
            setStudentHistory(prev => ({ ...prev, [studentId]: data }))
        } catch (error) {
            toast.error("Failed to update student records")
        } finally {
            setLoadingHistory(prev => ({ ...prev, [studentId]: false }))
        }
    }

    const toggleExpandStudent = async (studentId: string) => {
        if (expandedStudentId === studentId) {
            setExpandedStudentId(null)
            return
        }
        
        setExpandedStudentId(studentId)
        
        if (!activeTab[studentId]) {
            setActiveTab(prev => ({ ...prev, [studentId]: 'history' }))
        }

        if (!studentHistory[studentId]) {
            await handleRefreshHistory(studentId)
        }
    }

    // Filter today's classes vs other classes
    const todayStr = new Date().toDateString()
    const now = new Date()
    const todayClasses = liveClasses.filter(c => new Date(c.scheduled_at).toDateString() === todayStr)
    const otherClasses = liveClasses.filter(c => {
        const classDate = new Date(c.scheduled_at);
        return classDate > now && classDate.toDateString() !== todayStr;
    })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cancelledClasses = liveClasses.filter(c => 
        c.status === 'cancelled' && 
        new Date(c.scheduled_at) >= sevenDaysAgo
    )

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* CANCELLED CLASSES ALERTS */}
            {cancelledClasses.filter(c => !dismissedCancelledIds.includes(c.id)).length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/35 rounded-[2rem] p-6 md:p-8 flex items-start gap-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl shrink-0">
                        <AlertCircle className="animate-pulse" size={24} />
                    </div>
                    <div className="space-y-3 flex-1 text-left">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Class Cancellation Alerts</span>
                            <h4 className="font-bold text-lg text-indigo-950 dark:text-amber-100 mt-1">
                                Notice: Scheduled Classes Cancelled
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-normal italic">
                                The following scheduled class session(s) have been cancelled. Please review and coordinate with your students if rescheduling is necessary.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-500/10">
                            {cancelledClasses.filter(c => !dismissedCancelledIds.includes(c.id)).map((c) => (
                                <div key={c.id} className="p-4 bg-white dark:bg-card border border-amber-500/15 rounded-2xl flex items-center justify-between gap-4">
                                    <div>
                                        {(() => {
                                            const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                            return (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight text-xs">{displayTitle}</p>
                                                    {isCompensation && (
                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                            Comp
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                                            Student: {c.student?.full_name || 'N/A'}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground/60 mt-1">
                                            Was scheduled for: {format(new Date(c.scheduled_at), 'MMM dd, hh:mm a')}
                                        </p>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => handleDismissCancelledClass(c.id)}
                                        className="h-8 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold uppercase text-[9px] tracking-wider"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MISSED ATTENDANCE ALERTS */}
            {missingAttendance && missingAttendance.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-500/35 rounded-[2rem] p-6 md:p-8 flex items-start gap-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl shrink-0">
                        <AlertCircle className="animate-bounce" size={24} />
                    </div>
                    <div className="space-y-3 flex-1 text-left">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Action Required</span>
                            <h4 className="font-bold text-lg text-indigo-950 dark:text-rose-100 mt-1">
                                Missed Attendance Logs
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-normal italic">
                                You missed logging student attendance for {missingAttendance.length} past scheduled session(s). Please log them now so parent reports and payroll calculations remain up to date.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-rose-500/10">
                            {missingAttendance.map((c) => (
                                <div key={c.id} className="p-4 bg-white dark:bg-card border border-rose-500/15 rounded-2xl flex items-center justify-between gap-4">
                                    <div>
                                        {(() => {
                                            const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                            return (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight text-xs">{displayTitle}</p>
                                                    {isCompensation && (
                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                            Comp
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                                            Student: {c.student?.full_name || 'N/A'}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground/60 mt-1">
                                            {format(new Date(c.scheduled_at), 'MMM dd, hh:mm a')}
                                        </p>
                                    </div>
                                    <PostClassLogModal
                                        classId={c.id}
                                        studentId={c.student_id}
                                        studentName={c.student?.full_name || "Student"}
                                        onSuccess={() => {
                                            window.location.reload()
                                        }}
                                        trigger={
                                            <Button size="sm" className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[9px] gap-1 shadow-md shadow-rose-600/10">
                                                Log Class
                                            </Button>
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Stats Panel */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-violet-950 p-8 text-white shadow-2xl border border-white/5">
                <div className="absolute right-0 top-0 -translate-y-12 translate-x-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute left-1/4 bottom-0 translate-y-12 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full w-fit text-xs font-black uppercase tracking-widest text-indigo-300 border border-white/10 mb-3">
                                <Sparkles size={12} className="animate-pulse" />
                                <span>{teacherName}'s Command Center</span>
                            </div>
                            <h1 className="text-4xl font-serif font-bold italic tracking-tight text-white">
                                {teacherName}'s Studio
                            </h1>
                            <p className="text-indigo-200/80 italic mt-1 text-sm">
                                Manage today's sessions, review student performance logs, and assign homework.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <CreateLiveClassDialog />
                            <Button 
                                onClick={() => setLeaveModalOpen(true)}
                                className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-violet-600/20 transition-all hover:scale-105"
                            >
                                <Clock size={14} />
                                <span>Apply for Leave</span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10">
                        <div className="text-center px-4 border-r border-white/10">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-300">Monthly Classes</span>
                            <span className="text-3xl font-bold tracking-tight">{initialStats.monthlyClassCount}</span>
                        </div>
                        <div className="text-center px-4 border-r border-white/10">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-300">My Students</span>
                            <span className="text-3xl font-bold tracking-tight">{assignedStudents.length}</span>
                        </div>
                        <div className="text-center px-4 border-r border-white/10">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-300">Total Hours</span>
                            <span className="text-3xl font-bold tracking-tight">{initialStats.hours}h</span>
                        </div>
                        <div className="text-center px-4">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-rose-300">Late Joinings</span>
                            <span className="text-3xl font-bold tracking-tight text-rose-400">{initialStats.monthlyLateJoiningCount || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Column 1: Today's Schedule (Lg: 5/12 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h2 className="text-xl font-serif font-bold italic tracking-tight text-indigo-950 dark:text-indigo-50">Today's Classes</h2>
                        </div>
                        <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1">
                            {todayClasses.length} Sessions
                        </Badge>
                    </div>

                    {todayClasses.length === 0 ? (
                        <Card className="rounded-[2rem] border-2 border-dashed border-muted bg-muted/5 p-8 text-center">
                            <Video size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground italic font-semibold">No live classes scheduled for today.</p>
                            <p className="text-xs text-muted-foreground/60 italic mt-1">Check the student profiles to schedule new sessions.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {todayClasses.map((c) => (
                                <Card key={c.id} className="rounded-3xl border-2 border-muted/30 shadow-lg bg-card hover:border-indigo-500/20 hover:shadow-xl transition-all overflow-hidden">
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                {(() => {
                                                    const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                    return (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-serif font-bold text-lg text-indigo-900 dark:text-indigo-100 leading-tight">{displayTitle}</h3>
                                                            {isCompensation && (
                                                                <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                                                                    Compensation
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                <p className="text-xs text-muted-foreground italic mt-0.5">
                                                    Student: <span className="font-bold text-foreground">{c.student?.full_name || 'Unassigned'}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {c.tutor_joined_late && (
                                                    <Badge className="bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                                                        LATE
                                                    </Badge>
                                                )}
                                                <Badge className={`font-black uppercase tracking-wider text-[9px] px-2.5 py-1 ${
                                                    c.status === 'completed' 
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                        : c.status === 'cancelled'
                                                        ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                        : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/20'
                                                }`}>
                                                    {c.status}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic bg-muted/30 p-2.5 rounded-xl w-fit">
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} className="text-indigo-500" />
                                                <span>{format(new Date(c.scheduled_at), 'hh:mm a')}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-2">
                                            {(() => {
                                                const scheduledTime = new Date(c.scheduled_at).getTime();
                                                const elapsedMinutes = (currentTime.getTime() - scheduledTime) / (1000 * 60);

                                                if (c.status === 'completed') {
                                                    return (
                                                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs font-bold w-full justify-center">
                                                            <CheckCircle2 size={16} />
                                                            <span>Session Logged</span>
                                                        </div>
                                                    );
                                                }

                                                if (c.status === 'cancelled') {
                                                    return (
                                                        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-xs font-bold w-full justify-center">
                                                            <AlertCircle size={16} />
                                                            <span>Session Cancelled</span>
                                                        </div>
                                                    );
                                                }

                                                // If more than 24 hours have passed and not marked
                                                if (elapsedMinutes > 24 * 60) {
                                                    return (
                                                        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-xs font-bold w-full justify-center">
                                                            <AlertCircle size={16} />
                                                            <span>Attendance Not Marked (Locked)</span>
                                                        </div>
                                                    );
                                                }

                                                // If teacher has not checked in yet
                                                if (!c.tutor_joined_at) {
                                                    return (
                                                        <Button 
                                                            onClick={() => handleLogInClass(c.id, c.meeting_link)}
                                                            disabled={loggingInClassId === c.id}
                                                            className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] h-10 gap-2 shadow-lg shadow-rose-600/10"
                                                        >
                                                            {loggingInClassId === c.id ? "Logging In..." : "Log In Class"}
                                                            <ExternalLink size={12} />
                                                        </Button>
                                                    );
                                                }

                                                // Teacher has checked in (ongoing class workflow)
                                                const isLocked = elapsedMinutes < 20;
                                                const minutesLeft = Math.ceil(20 - elapsedMinutes);

                                                return (
                                                    <div className="flex flex-col gap-2 w-full">
                                                        <div className="flex items-center gap-3 w-full">
                                                            <a href={ensureAbsoluteUrl(c.meeting_link)} target="_blank" rel="noopener noreferrer" className="flex-1">
                                                                <Button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] h-10 gap-2 shadow-lg shadow-indigo-600/10">
                                                                     <span>Join Class</span>
                                                                     <ExternalLink size={12} />
                                                                </Button>
                                                            </a>
                                                            
                                                            {isLocked ? (
                                                                <Button 
                                                                    disabled 
                                                                    variant="outline" 
                                                                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 border-2 border-muted text-muted-foreground bg-muted/10 opacity-70"
                                                                >
                                                                    Log Class (Locked: {minutesLeft}m)
                                                                </Button>
                                                            ) : (
                                                                <PostClassLogModal
                                                                    classId={c.id}
                                                                    studentId={c.student?.id || ""}
                                                                    studentName={c.student?.full_name || ""}
                                                                    onSuccess={() => {
                                                                        window.location.reload()
                                                                    }}
                                                                    trigger={
                                                                        <Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 border-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50/50">
                                                                            Log Class
                                                                        </Button>
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Upcoming classes (Upcoming days) */}
                    {otherClasses.length > 0 && (
                        <div className="pt-4 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground pl-2">Upcoming Classes</h3>
                            <div className="space-y-3">
                                {otherClasses.slice(0, 3).map((c) => (
                                    <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted/20 bg-card/50 text-xs">
                                        <div>
                                            {(() => {
                                                const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                return (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-indigo-950 dark:text-indigo-100">{displayTitle}</p>
                                                        {isCompensation && (
                                                            <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                Comp
                                                            </Badge>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <p className="text-[10px] text-muted-foreground italic mt-0.5">
                                                {format(new Date(c.scheduled_at), 'EEE, MMM dd')} • {format(new Date(c.scheduled_at), 'hh:mm a')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-black uppercase tracking-widest text-[8px] px-2 py-0.5 text-muted-foreground">
                                                {c.student?.full_name}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STUDENT REQUESTS (RESCHEDULE & LEAVE) */}
                    {(rescheduleRequests.length > 0 || leaveRequests.length > 0) && (
                        <div className="pt-6 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Student Adjustments Requests</h3>
                                <Badge className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-none font-black text-[9px] px-2 py-0.5">
                                    {rescheduleRequests.filter((r: any) => r.status === 'pending').length + leaveRequests.filter((l: any) => l.status === 'pending').length} Pending
                                </Badge>
                            </div>
                            <div className="space-y-4 max-h-[350px] overflow-y-auto">
                                {/* Leave Requests */}
                                {leaveRequests.filter((l: any) => l.status === 'pending').map((leave: any) => (
                                    <Card key={leave.id} className="p-4 border-2 border-violet-500/20 bg-violet-50/10 dark:bg-violet-950/5 rounded-2xl text-xs space-y-3 text-left">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest text-[8px] bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded border border-violet-500/10 inline-block mb-1.5">Leave Request</span>
                                                <p className="font-bold text-sm text-foreground">
                                                    Student: {leave.student?.full_name || 'Student'}
                                                </p>
                                                <p className="font-semibold text-muted-foreground mt-0.5">
                                                    Dates: {format(new Date(leave.start_date + 'T00:00:00'), 'MMM dd')} - {format(new Date(leave.end_date + 'T00:00:00'), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-black uppercase tracking-widest text-[8px] border-none px-2 py-0.5 rounded-full">
                                                Pending
                                            </Badge>
                                        </div>
                                        {leave.reason && (
                                            <p className="text-muted-foreground italic leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/10">"{leave.reason}"</p>
                                        )}
                                        <div className="flex items-center gap-2 pt-1.5 justify-end">
                                            <Button
                                                size="sm"
                                                disabled={updatingRequestId !== null}
                                                onClick={() => handleUpdateLeave(leave.id, 'rejected')}
                                                variant="ghost"
                                                className="h-8 border border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-[10px] font-bold uppercase tracking-wider px-3"
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={updatingRequestId !== null}
                                                onClick={() => handleUpdateLeave(leave.id, 'approved')}
                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 shadow-md shadow-emerald-600/10"
                                            >
                                                Approve
                                            </Button>
                                        </div>
                                    </Card>
                                ))}

                                {/* Reschedule Requests */}
                                {rescheduleRequests.filter((r: any) => r.status === 'pending').map((req: any) => (
                                    <Card key={req.id} className="p-4 border-2 border-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/5 rounded-2xl text-xs space-y-3 text-left">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[8px] bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/10 inline-block mb-1.5">Reschedule Proposal</span>
                                                <p className="font-bold text-sm text-foreground">
                                                    Student: {req.student?.full_name || 'Student'}
                                                </p>
                                                {req.class && (
                                                    <div className="font-semibold text-muted-foreground mt-0.5">
                                                        {(() => {
                                                            const { title: displayTitle, isCompensation } = formatClassTitle(req.class.title);
                                                            return (
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span>Class: {displayTitle}</span>
                                                                    {isCompensation && (
                                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                            Comp
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px] mt-1">
                                                    Proposed: {format(new Date(req.requested_date + 'T00:00:00'), 'MMM dd, yyyy')} @ {formatTime12Hour(req.requested_time)}
                                                </p>
                                            </div>
                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-black uppercase tracking-widest text-[8px] border-none px-2 py-0.5 rounded-full">
                                                Pending
                                            </Badge>
                                        </div>
                                        {req.reason && (
                                            <p className="text-muted-foreground italic leading-relaxed bg-background/50 p-2.5 rounded-lg border border-border/10">Reason: "{req.reason}"</p>
                                        )}
                                        <div className="flex items-center gap-2 pt-1.5 justify-end">
                                            <Button
                                                size="sm"
                                                disabled={updatingRequestId !== null}
                                                onClick={() => handleUpdateReschedule(req.id, 'rejected')}
                                                variant="ghost"
                                                className="h-8 border border-rose-500/20 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-[10px] font-bold uppercase tracking-wider px-3"
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={updatingRequestId !== null}
                                                onClick={() => handleUpdateReschedule(req.id, 'approved')}
                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 shadow-md shadow-emerald-600/10"
                                            >
                                                Approve
                                            </Button>
                                        </div>
                                    </Card>
                                ))}

                                {leaveRequests.filter((l: any) => l.status === 'pending').length === 0 &&
                                 rescheduleRequests.filter((r: any) => r.status === 'pending').length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-4">No pending leave or reschedule requests.</p>
                                 )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Column 2: Assigned Students List (Lg: 7/12 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-indigo-500" />
                            <h2 className="text-xl font-serif font-bold italic tracking-tight text-indigo-950 dark:text-indigo-50">Assigned Students</h2>
                        </div>
                        <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-none font-black uppercase tracking-widest text-[9px] px-3 py-1">
                            {assignedStudents.length} Students
                        </Badge>
                    </div>

                    {assignedStudents.length === 0 ? (
                        <Card className="rounded-[2rem] border-2 border-dashed border-muted bg-muted/5 p-8 text-center">
                            <Users size={40} className="mx-auto mb-3 text-muted-foreground opacity-30" />
                            <p className="text-sm text-muted-foreground italic font-semibold">No students assigned to you yet.</p>
                            <p className="text-xs text-muted-foreground/60 italic mt-1">Assigned students will show up automatically once HR links them.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {assignedStudents.map((student) => {
                                const isExpanded = expandedStudentId === student.id
                                const history = studentHistory[student.id] || { classes: [], homework: [], materials: [], reschedule: [] }
                                const isLoading = loadingHistory[student.id]
                                const currentTab = activeTab[student.id] || 'history'

                                return (
                                    <div key={student.id} className={`border-2 rounded-[2rem] overflow-hidden bg-card transition-all ${
                                        isExpanded ? 'border-indigo-500/40 shadow-xl shadow-indigo-500/5' : 'border-muted/30 hover:border-indigo-500/20'
                                    }`}>
                                        {/* Header Row */}
                                        <button
                                            onClick={() => toggleExpandStudent(student.id)}
                                            className="w-full flex items-center justify-between p-6 hover:bg-indigo-50/10 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 text-lg">
                                                    {student.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-foreground">{student.full_name}</h3>
                                                    <p className="text-xs text-muted-foreground italic">{student.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {(student.day_timings || student.preferred_time) && (
                                                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1 rounded-full">
                                                        <Clock size={10} />
                                                        <span>{formatDayTimingsCompact(student.day_timings, student.preferred_time)}</span>
                                                    </div>
                                                )}
                                                <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-indigo-600 transition-colors">
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </div>
                                            </div>
                                        </button>
 
                                        {/* Collapsible Content */}
                                        {isExpanded && (
                                            <div className="p-6 pt-0 border-t-2 border-muted/10 bg-muted/5 space-y-6">
                                                {/* Student Details Info */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl text-xs mt-4">
                                                    <div>
                                                        <span className="block text-[9px] font-black uppercase tracking-wider text-muted-foreground">Meeting Link</span>
                                                        {student.preferred_meeting_link ? (
                                                            <a href={ensureAbsoluteUrl(student.preferred_meeting_link)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all flex items-center gap-1 font-bold mt-0.5">
                                                                <span>Open Link</span>
                                                                <ExternalLink size={10} />
                                                            </a>
                                                        ) : (
                                                            <span className="text-muted-foreground/60 italic">No link specified</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="block text-[9px] font-black uppercase tracking-wider text-muted-foreground">Preferred Schedule</span>
                                                        <span className="font-bold text-foreground mt-0.5 block">
                                                            {formatDayTimings(student.day_timings, student.preferred_time)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Bar */}
                                                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                                                    <AssignHomeworkDialog
                                                        studentId={student.id}
                                                        studentName={student.full_name}
                                                        onSuccess={() => handleRefreshHistory(student.id)}
                                                    />
                                                    <UploadMaterialDialog
                                                        studentId={student.id}
                                                        studentName={student.full_name}
                                                        onSuccess={() => handleRefreshHistory(student.id)}
                                                    />
                                                    <RequestRescheduleDialog
                                                        studentId={student.id}
                                                        studentName={student.full_name}
                                                        onSuccess={() => handleRefreshHistory(student.id)}
                                                    />
                                                    <CreateLiveClassDialog
                                                        preselectedStudentId={student.id}
                                                        triggerButton={
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="h-10 px-4 rounded-xl border-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50/50 font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-105"
                                                            >
                                                                <Plus size={12} />
                                                                <span>Compensation Class</span>
                                                            </Button>
                                                        }
                                                    />
                                                </div>

                                                {/* Tabs Segment */}
                                                <div className="border-t border-border/40 pt-4">
                                                    <div className="flex border-b border-border/20 mb-4">
                                                        {(['history', 'homework', 'materials'] as const).map((tab) => (
                                                            <button
                                                                key={tab}
                                                                onClick={() => setActiveTab(prev => ({ ...prev, [student.id]: tab }))}
                                                                className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                                                                    currentTab === tab
                                                                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                                                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                                                }`}
                                                            >
                                                                {tab === 'history' ? 'Class Logs' : tab === 'homework' ? 'Homework Assignments' : 'Shared Worksheets'}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Tab Body */}
                                                    {isLoading ? (
                                                        <div className="flex items-center justify-center py-8 text-muted-foreground italic gap-2">
                                                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                                                            <span>Loading data...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                                            {currentTab === 'history' && (
                                                                history.classes.length === 0 ? (
                                                                    <p className="text-xs text-muted-foreground italic py-6 text-center">No past class session reports found.</p>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {history.classes.map((cls: any) => (
                                                                            <div key={cls.id} className="p-4 rounded-xl border border-border/40 bg-card hover:border-indigo-500/10 transition-colors space-y-2">
                                                                                <div className="flex items-center justify-between text-xs">
                                                                                     {(() => {
                                                                                         const { title: displayTitle, isCompensation } = formatClassTitle(cls.title);
                                                                                         return (
                                                                                             <div className="flex items-center gap-2 flex-wrap">
                                                                                                 <span className="font-bold text-indigo-900 dark:text-indigo-200">{displayTitle}</span>
                                                                                                 {isCompensation && (
                                                                                                     <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                                                         Comp
                                                                                                     </Badge>
                                                                                                 )}
                                                                                             </div>
                                                                                         );
                                                                                     })()}
                                                                                     <span className="text-[10px] text-muted-foreground">
                                                                                         {format(new Date(cls.scheduled_at), 'MMM dd, yyyy')}
                                                                                     </span>
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] border-t border-border/10 pt-2">
                                                                                    <div>
                                                                                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Topic Taught</span>
                                                                                        <span className="text-foreground font-semibold">{cls.topic_taught || 'N/A'}</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Homework Assigned</span>
                                                                                        <span className="text-foreground font-semibold">{cls.homework_given || 'N/A'}</span>
                                                                                    </div>
                                                                                    <div className="col-span-2 mt-1">
                                                                                        <div className="flex items-center gap-4">
                                                                                            <div>
                                                                                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Rating</span>
                                                                                                <Badge className={`text-[8px] font-bold mt-0.5 ${
                                                                                                    cls.student_performance === 'Good'
                                                                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-500/20'
                                                                                                        : cls.student_performance === 'Average'
                                                                                                        ? 'bg-amber-50 text-amber-600 border border-amber-500/20'
                                                                                                        : 'bg-rose-50 text-rose-600 border border-rose-500/20'
                                                                                                }`}>
                                                                                                    {cls.student_performance || 'Good'}
                                                                                                </Badge>
                                                                                            </div>
                                                                                            {cls.parent_note && (
                                                                                                <div className="flex-1">
                                                                                                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Parent Remark</span>
                                                                                                    <p className="text-muted-foreground/80 italic mt-0.5">{cls.parent_note}</p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )
                                                            )}

                                                            {currentTab === 'homework' && (
                                                                history.homework.length === 0 ? (
                                                                    <p className="text-xs text-muted-foreground italic py-6 text-center">No homework assigned yet.</p>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {history.homework.map((hw: any) => {
                                                                            const desc = hw.description || '';
                                                                            const match = desc.match(/Attachment File:\s*(https?:\/\/[^\s\)\"\'\>]+)/i);
                                                                            let cleanDesc = desc;
                                                                            let attachmentUrl = hw.worksheet_url || null;
                                                                            if (match) {
                                                                                cleanDesc = desc.replace(/Attachment File:\s*https?:\/\/[^\s\)\"\'\>]+/i, '').trim();
                                                                                if (!attachmentUrl) {
                                                                                    attachmentUrl = match[1];
                                                                                }
                                                                            }
                                                                            return (
                                                                                <div key={hw.id} className="p-3.5 rounded-xl border border-border/40 bg-card text-xs flex items-center justify-between gap-4">
                                                                                    <div className="space-y-1 max-w-[70%]">
                                                                                        <p className="font-bold text-foreground">{hw.title}</p>
                                                                                        {cleanDesc && <p className="text-muted-foreground italic text-[11px] mt-0.5">{cleanDesc}</p>}
                                                                                        {attachmentUrl && (
                                                                                            <div className="mt-1">
                                                                                                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline text-[10px]">
                                                                                                    <Download size={10} />
                                                                                                    <span>Download Assigned Worksheet</span>
                                                                                                </a>
                                                                                            </div>
                                                                                        )}
                                                                                        {hw.due_date && <p className="text-[10px] text-indigo-500 mt-1 font-semibold">Due: {format(new Date(hw.due_date), 'MMM dd, yyyy')}</p>}
                                                                                        {hw.submission_notes && (
                                                                                            <p className="text-[10px] text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/10 mt-1.5 italic">
                                                                                                <strong>Notes:</strong> &quot;{hw.submission_notes}&quot;
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {hw.submission_url && (
                                                                                            <a href={hw.submission_url} target="_blank" rel="noopener noreferrer">
                                                                                                <Button size="sm" variant="outline" className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 border border-indigo-500/20">
                                                                                                    <FileText size={10} />
                                                                                                    <span>View Homework</span>
                                                                                                </Button>
                                                                                            </a>
                                                                                        )}
                                                                                        <Badge variant="outline" className={`font-black uppercase tracking-wider text-[8px] ${
                                                                                            hw.status === 'completed'
                                                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-500/20'
                                                                                                : hw.status === 'submitted'
                                                                                                ? 'bg-indigo-50 text-indigo-600 border-indigo-500/20'
                                                                                                : 'bg-amber-50 text-amber-600 border-amber-500/20'
                                                                                        }`}>
                                                                                            {hw.status}
                                                                                        </Badge>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )
                                                            )}

                                                            {currentTab === 'materials' && (
                                                                <div className="space-y-4">
                                                                    <div className="flex justify-between items-center bg-muted/10 p-3 rounded-2xl border border-border/20">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Study Materials / Worksheets</span>
                                                                        <UploadMaterialDialog
                                                                            studentId={student.id}
                                                                            studentName={student.full_name}
                                                                            onSuccess={() => handleRefreshHistory(student.id)}
                                                                            trigger={
                                                                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-8 px-3 font-black uppercase tracking-widest text-[9px] gap-1.5 shadow-sm transition-all hover:scale-105">
                                                                                    <Upload size={12} />
                                                                                    <span>Upload Study Material</span>
                                                                                </Button>
                                                                            }
                                                                        />
                                                                    </div>
                                                                    {history.materials.length === 0 ? (
                                                                        <p className="text-xs text-muted-foreground italic py-6 text-center">No worksheets or materials shared yet.</p>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {history.materials.map((mat: any) => {
                                                                                const isSubmittedWorksheet = mat.title.startsWith('[Submitted Worksheet]');
                                                                                const isStudyMaterial = mat.title.startsWith('[Study Material]');
                                                                                
                                                                                let displayTitle = mat.title;
                                                                                if (isSubmittedWorksheet) {
                                                                                    displayTitle = mat.title.replace('[Submitted Worksheet]', '').trim();
                                                                                } else if (isStudyMaterial) {
                                                                                    displayTitle = mat.title.replace('[Study Material]', '').trim();
                                                                                }
                                                                                
                                                                                return (
                                                                                    <div key={mat.id} className="p-3.5 rounded-xl border border-border/40 bg-card text-xs flex items-center justify-between gap-4 hover:border-indigo-500/10 transition-colors">
                                                                                        <div className="space-y-1">
                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                <p className="font-bold text-foreground">{displayTitle}</p>
                                                                                                {isSubmittedWorksheet && (
                                                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-md">
                                                                                                        Student Submission
                                                                                                    </Badge>
                                                                                                )}
                                                                                                {isStudyMaterial && (
                                                                                                    <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-500/20 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-md">
                                                                                                        Student Material
                                                                                                    </Badge>
                                                                                                )}
                                                                                                {!isSubmittedWorksheet && !isStudyMaterial && (
                                                                                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-500/20 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-md">
                                                                                                        Teacher Upload
                                                                                                    </Badge>
                                                                                                )}
                                                                                            </div>
                                                                                            <p className="text-[10px] text-muted-foreground italic">Shared: {format(new Date(mat.created_at), 'MMM dd, yyyy')}</p>
                                                                                        </div>
                                                                                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                                                                                            <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1.5 border border-indigo-500/20">
                                                                                                <Upload size={10} />
                                                                                                <span>View</span>
                                                                                            </Button>
                                                                                        </a>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
            {/* APPLY FOR LEAVE DIALOG */}
            <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <DialogHeader className="mb-6 relative z-10 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Clock className="text-violet-500" size={20} />
                            <span>Apply for Leave</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Submit leave requests for single or multi-day absences.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleLeaveSubmit} className="space-y-5 relative z-10 text-left text-xs">
                        {/* Start Date & End Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="leave-start" className="font-bold uppercase tracking-wider text-muted-foreground">Start Date *</Label>
                                <input 
                                    id="leave-start"
                                    type="date"
                                    required
                                    value={leaveStartDate}
                                    onChange={(e) => setLeaveStartDate(e.target.value)}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="leave-end" className="font-bold uppercase tracking-wider text-muted-foreground">End Date *</Label>
                                <input 
                                    id="leave-end"
                                    type="date"
                                    required
                                    value={leaveEndDate}
                                    onChange={(e) => setLeaveEndDate(e.target.value)}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="leave-reason" className="font-bold uppercase tracking-wider text-muted-foreground">Reason for Leave *</Label>
                            <Textarea 
                                id="leave-reason" 
                                placeholder="Please explain the reason (e.g. sickness, vacation)" 
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                rows={3}
                                className="rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-sm" 
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setLeaveModalOpen(false); }}
                                className="h-11 px-6 rounded-lg font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingLeave}
                                className="h-11 px-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-violet-600/20 flex items-center gap-2"
                            >
                                {isSubmittingLeave ? "Submitting..." : "Submit Leave Request"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function formatDayTimings(dayTimings: any, fallbackPreferredTime?: string) {
    if (!dayTimings || typeof dayTimings !== 'object' || Object.keys(dayTimings).length === 0) {
        return fallbackPreferredTime ? `Everyday @ ${formatTime12Hour(fallbackPreferredTime)}` : 'Not scheduled';
    }

    const fullDaysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const sortedEntries = Object.entries(dayTimings)
        .map(([day, time]) => ({ dayNum: parseInt(day), time: time as string }))
        .sort((a, b) => a.dayNum - b.dayNum);

    const formattedStrings = sortedEntries.map(({ dayNum, time }) => {
        const dayName = fullDaysOfWeek[dayNum] || `Day ${dayNum}`;
        return `${dayName} @ ${formatTime12Hour(time)}`;
    });

    return formattedStrings.join(", ");
}

function formatDayTimingsCompact(dayTimings: any, fallbackPreferredTime?: string) {
    if (!dayTimings || typeof dayTimings !== 'object' || Object.keys(dayTimings).length === 0) {
        return fallbackPreferredTime ? formatTime12Hour(fallbackPreferredTime) : '';
    }

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const sortedEntries = Object.entries(dayTimings)
        .map(([day, time]) => ({ dayNum: parseInt(day), time: time as string }))
        .sort((a, b) => a.dayNum - b.dayNum);

    const timeGroups: Record<string, number[]> = {};
    sortedEntries.forEach(({ dayNum, time }) => {
        const formattedTime = formatTime12Hour(time);
        if (!timeGroups[formattedTime]) {
            timeGroups[formattedTime] = [];
        }
        timeGroups[formattedTime].push(dayNum);
    });

    const groups = Object.entries(timeGroups).map(([formattedTime, dayNums]) => {
        const daysStr = dayNums.map(num => daysOfWeek[num] || String(num)).join("/");
        return `${daysStr} @ ${formattedTime}`;
    });

    return groups.join(" | ");
}
