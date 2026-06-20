'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3, X,
    Video, Clock, User, BookOpen, AlertCircle, FileText, CheckCircle2, Award, Upload
} from "lucide-react"
import { formatTime12Hour, ensureAbsoluteUrl, formatClassTitle } from "@/lib/utils"
import { getClassLogsForMonth, modifyClassLog } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { AssignHomeworkDialog, UploadMaterialDialog } from "@/components/features/teacher/StudentActionDialogs"

interface Profile {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

interface ClassLogsCalendarClientProps {
    currentUserProfile: Profile;
    allTeachers: Profile[];
    allStudents: Profile[];
}

export function ClassLogsCalendarClient({ 
    currentUserProfile, 
    allTeachers, 
    allStudents 
}: ClassLogsCalendarClientProps) {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed (Jan = 1)
    const [classes, setClasses] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Admin filters
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all")
    const [selectedStudentId, setSelectedStudentId] = useState<string>("all")

    // Selected Date Details
    const [selectedDate, setSelectedDate] = useState<Date | null>(now)
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingClass, setEditingClass] = useState<any | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Form states
    const [formStatus, setFormStatus] = useState("")
    const [formScheduledAt, setFormScheduledAt] = useState("")
    const [formAttendanceStatus, setFormAttendanceStatus] = useState<string>("")
    const [formTopicTaught, setFormTopicTaught] = useState("")
    const [formHomeworkGiven, setFormHomeworkGiven] = useState("")
    const [formStudentPerformance, setFormStudentPerformance] = useState("")
    const [formParentNote, setFormParentNote] = useState("")

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const data = await getClassLogsForMonth(year, month)
            setClasses(data || [])
        } catch (error) {
            console.error("Failed to fetch monthly class logs:", error)
            toast.error("Failed to load logs for this month")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [year, month])

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12)
            setYear(year - 1)
        } else {
            setMonth(month - 1)
        }
        setSelectedDate(null)
    }

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1)
            setYear(year + 1)
        } else {
            setMonth(month + 1)
        }
        setSelectedDate(null)
    }

    // Filter classes on client side
    const filteredClasses = classes.filter(c => {
        const matchesTeacher = selectedTeacherId === "all" || c.teacher_id === selectedTeacherId
        const matchesStudent = selectedStudentId === "all" || c.student_id === selectedStudentId
        return matchesTeacher && matchesStudent
    })

    // Calendar generation
    const getDaysForCalendar = () => {
        const startOfMonth = new Date(year, month - 1, 1)
        const days = []
        
        // Find starting Sunday of the calendar view
        const firstDayOfWeek = startOfMonth.getDay() // 0 = Sun, 1 = Mon, etc.
        const prevMonthDate = new Date(year, month - 1, 0)
        const prevMonthLastDay = prevMonthDate.getDate()
        
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 2, prevMonthLastDay - i),
                isCurrentMonth: false
            })
        }
        
        // Days of current month
        const lastDayOfMonth = new Date(year, month, 0).getDate()
        for (let i = 1; i <= lastDayOfMonth; i++) {
            days.push({
                date: new Date(year, month - 1, i),
                isCurrentMonth: true
            })
        }
        
        // Remaining days to pad the end of the grid (6 weeks = 42 cells)
        const remainingCells = 42 - days.length
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: false
            })
        }
        
        return days
    }

    const calendarDays = getDaysForCalendar()

    const getClassesForDate = (date: Date) => {
        const dateStr = date.toDateString()
        return filteredClasses.filter(c => new Date(c.scheduled_at).toDateString() === dateStr)
    }

    // Open Edit Modal
    const handleOpenEdit = (cls: any) => {
        setEditingClass(cls)
        setFormStatus(cls.status || "scheduled")
        
        // Convert ISO scheduled_at to local datetime-local format
        const dateObj = new Date(cls.scheduled_at)
        const offset = dateObj.getTimezoneOffset()
        const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000))
        setFormScheduledAt(localDate.toISOString().slice(0, 16))

        const attendance = cls.student_attendance?.[0]
        setFormAttendanceStatus(attendance?.status || "")
        setFormTopicTaught(cls.topic_taught || "")
        setFormHomeworkGiven(cls.homework_given || "")
        setFormStudentPerformance(cls.student_performance || "")
        setFormParentNote(cls.parent_note || "")
        
        setIsEditModalOpen(true)
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingClass) return
        
        setIsSaving(true)
        try {
            // Convert local input back to UTC ISO string
            const utcScheduledAt = new Date(formScheduledAt).toISOString()

            const res = await modifyClassLog(
                editingClass.id,
                formStatus,
                utcScheduledAt,
                formAttendanceStatus === "" ? null : formAttendanceStatus as any,
                formTopicTaught,
                formHomeworkGiven,
                formStudentPerformance,
                formParentNote
            )

            if (res.success) {
                toast.success("Class log updated successfully!")
                setIsEditModalOpen(false)
                setEditingClass(null)
                await fetchLogs()
            } else {
                toast.error(res.error || "Failed to update class log")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred")
        } finally {
            setIsSaving(false)
        }
    }

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    const canModify = ["hr", "super_admin"].includes(currentUserProfile.role)

    return (
        <div className="space-y-8">
            
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
                        <CalendarIcon size={12} />
                        <span>Interactive Logs Center</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
                        Monthly Class Logs
                    </h1>
                    <p className="text-xs text-muted-foreground italic font-medium">
                        {canModify 
                            ? "Complete administrative dashboard to review, audit, and modify teacher class sessions and student attendances."
                            : "Interactive schedule log calendar showing taken, cancelled, and upcoming sessions."}
                    </p>
                </div>
                
                {/* Month Picker Controls */}
                <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl border border-border/40">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-9 w-9 rounded-xl">
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm font-black uppercase tracking-wider min-w-[120px] text-center">
                        {monthNames[month - 1]} {year}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-9 w-9 rounded-xl">
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>

            {/* Admin Filters Row */}
            {canModify && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 p-4 rounded-3xl border border-border/30">
                    <div className="space-y-1 text-left">
                        <Label htmlFor="tutor-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Filter by Tutor</Label>
                        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                            <SelectTrigger id="tutor-filter" className="h-11 rounded-2xl bg-card border-none outline-none focus:ring-1 focus:ring-indigo-500 text-xs">
                                <SelectValue placeholder="All Tutors" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-border/40">
                                <SelectItem value="all" className="rounded-xl">All Tutors</SelectItem>
                                {allTeachers.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="rounded-xl">{t.full_name || t.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1 text-left">
                        <Label htmlFor="student-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Filter by Student</Label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger id="student-filter" className="h-11 rounded-2xl bg-card border-none outline-none focus:ring-1 focus:ring-indigo-500 text-xs">
                                <SelectValue placeholder="All Students" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border border-border/40">
                                <SelectItem value="all" className="rounded-xl">All Students</SelectItem>
                                {allStudents.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="rounded-xl">{s.full_name || s.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 1. Calendar Grid (7 Columns) */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="grid grid-cols-7 gap-2 text-center">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <span key={day} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-2">{day}</span>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-[50vh] bg-card border border-border/40 rounded-[2rem] animate-pulse">
                            <div className="flex flex-col items-center gap-3 text-indigo-600/60">
                                <CalendarIcon className="animate-bounce" size={32} />
                                <span className="text-xs font-black uppercase tracking-widest italic">Syncing session calendars...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((dayItem, idx) => {
                                const isSelected = selectedDate && selectedDate.toDateString() === dayItem.date.toDateString()
                                const isToday = new Date().toDateString() === dayItem.date.toDateString()
                                const dateClasses = getClassesForDate(dayItem.date)
                                
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(dayItem.date)}
                                        className={cn(
                                            "min-h-[55px] sm:min-h-[90px] p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative group overflow-hidden bg-card",
                                            dayItem.isCurrentMonth ? "border-border/40" : "opacity-35 border-transparent bg-transparent",
                                            isSelected 
                                                ? "ring-2 ring-indigo-500 border-indigo-500 scale-[1.01] shadow-lg shadow-indigo-500/5" 
                                                : "hover:border-indigo-500/40 hover:scale-[1.01]",
                                            isToday && "ring-1 ring-emerald-500/50 border-emerald-500/50 shadow-md shadow-emerald-500/5"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "text-xs font-bold font-mono",
                                                isToday && "bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                                            )}>
                                                {dayItem.date.getDate()}
                                            </span>
                                            {dateClasses.length > 0 && (
                                                <Badge className="bg-muted text-muted-foreground text-[8px] font-black px-1.5 py-0.5 border-none">
                                                    {dateClasses.length}
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        {/* Status Dots */}
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {dateClasses.slice(0, 3).map((c, i) => (
                                                <span 
                                                    key={i} 
                                                    className={cn("w-1.5 h-1.5 rounded-full block",
                                                        c.status === 'completed' && 'bg-emerald-500',
                                                        c.status === 'cancelled' && 'bg-rose-500',
                                                        (c.status === 'scheduled' || c.status === 'ongoing') && 'bg-indigo-500'
                                                    )} 
                                                />
                                            ))}
                                            {dateClasses.length > 3 && (
                                                <span className="text-[7px] font-bold opacity-60 text-muted-foreground leading-none">+ {dateClasses.length - 3}</span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* 2. Right Side: Date Detail panel */}
                <div className="lg:col-span-4 text-left">
                    <Card className="rounded-[2rem] border-border/40 shadow-xl bg-card overflow-hidden h-full flex flex-col min-h-[480px]">
                        <CardHeader className="border-b border-border/10 pb-4 shrink-0 bg-muted/20">
                            <div className="flex items-center gap-2.5">
                                <CalendarIcon className="text-indigo-600" size={18} />
                                <CardTitle className="text-base font-bold">
                                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' }) : "Select a Date"}
                                </CardTitle>
                            </div>
                            <CardDescription className="text-xs">Classes scheduled for this day</CardDescription>
                        </CardHeader>
                        
                        <CardContent className="p-6 flex-1 overflow-y-auto space-y-4">
                            {!selectedDate ? (
                                <p className="text-xs text-muted-foreground italic text-center py-12">Click a date on the calendar to view its session records.</p>
                            ) : getClassesForDate(selectedDate).length === 0 ? (
                                <p className="text-xs text-muted-foreground italic text-center py-12">No classes scheduled on this day.</p>
                            ) : (
                                getClassesForDate(selectedDate).map(c => {
                                    const att = c.student_attendance?.[0]
                                    return (
                                        <div key={c.id} className="p-4 bg-muted/20 border border-border/20 rounded-2xl text-xs space-y-3 relative overflow-hidden group">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    {(() => {
                                                        const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                        return (
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-bold text-foreground tracking-tight text-sm uppercase">{displayTitle}</h4>
                                                                {isCompensation && (
                                                                    <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                        Comp
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="flex items-center gap-2 mt-1.5 text-muted-foreground text-[10px]">
                                                        <Clock size={12} className="text-indigo-500" />
                                                        <span>{formatTime12Hour(c.scheduled_at.split('T')[1]?.substring(0, 5))}</span>
                                                    </div>
                                                </div>
                                                <Badge className={cn("text-[8px] font-black uppercase border-none rounded-full px-2 py-0.5",
                                                    c.status === 'completed' && 'bg-emerald-100 text-emerald-800',
                                                    c.status === 'cancelled' && 'bg-rose-100 text-rose-800',
                                                    (c.status === 'scheduled' || c.status === 'ongoing') && 'bg-indigo-100 text-indigo-800'
                                                )}>
                                                    {c.status}
                                                </Badge>
                                            </div>

                                            <div className="space-y-1.5 border-t border-border/10 pt-2.5">
                                                <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                                                    <User size={12} className="text-indigo-500" />
                                                    <span className="font-bold text-foreground">Tutor:</span>
                                                    <span>{c.teacher?.full_name || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                                                    <User size={12} className="text-indigo-500" />
                                                    <span className="font-bold text-foreground">Student:</span>
                                                    <span>{c.student?.full_name || 'N/A'}</span>
                                                </div>
                                                
                                                {/* Attendance status display */}
                                                <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                                                    <CheckCircle2 size={12} className="text-indigo-500" />
                                                    <span className="font-bold text-foreground">Attendance:</span>
                                                    <span className={cn("font-bold uppercase tracking-wider text-[9px]",
                                                        att?.status === 'present' && 'text-emerald-600',
                                                        att?.status === 'absent' && 'text-rose-600',
                                                        att?.status === 'late' && 'text-amber-600',
                                                        !att?.status && 'text-muted-foreground italic normal-case'
                                                    )}>
                                                        {att?.status === 'absent' ? 'Student No Show' : (att?.status || 'Not Marked')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Post-class logs display */}
                                            {c.status === 'completed' && (
                                                <div className="bg-background/40 border border-border/10 p-3 rounded-xl space-y-2 mt-1">
                                                    {c.topic_taught && (
                                                        <div>
                                                            <span className="block text-[8px] font-black uppercase text-muted-foreground tracking-wider">Topic Taught</span>
                                                            <p className="text-[10px] text-foreground italic mt-0.5">"{c.topic_taught}"</p>
                                                        </div>
                                                    )}
                                                    {c.homework_given && (
                                                        <div>
                                                            <span className="block text-[8px] font-black uppercase text-muted-foreground tracking-wider">Homework Assigned</span>
                                                            <p className="text-[10px] text-foreground italic mt-0.5">"{c.homework_given}"</p>
                                                        </div>
                                                    )}
                                                    {c.student_performance && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-wider">Performance:</span>
                                                            <Badge variant="outline" className="text-[8px] px-2 py-0.5 border-indigo-500/25 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 font-bold uppercase">{c.student_performance}</Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* HR & Admin Controls */}
                                            {canModify && (
                                                <div className="flex justify-end gap-2 pt-2 flex-wrap">
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleOpenEdit(c)}
                                                        className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[9px] gap-1 shadow-md shadow-indigo-600/10"
                                                    >
                                                        <Edit3 size={10} />
                                                        <span>Edit Log</span>
                                                    </Button>
                                                    {c.student && (
                                                        <>
                                                            <AssignHomeworkDialog 
                                                                studentId={c.student.id} 
                                                                studentName={c.student.full_name} 
                                                                onSuccess={() => {}} 
                                                                trigger={
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline" 
                                                                        className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-indigo-950/20 gap-1"
                                                                    >
                                                                        <BookOpen size={10} />
                                                                        <span>Homework</span>
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
                                                                        className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 border-amber-500/20 text-amber-600 hover:bg-amber-50 dark:hover:bg-indigo-950/20 gap-1"
                                                                    >
                                                                        <Upload size={10} />
                                                                        <span>Worksheet</span>
                                                                    </Button>
                                                                }
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* 3. Administrative Edit Modal */}
            {isEditModalOpen && editingClass && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200 text-left">
                        
                        {/* Modal Header */}
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <div>
                                <h2 className="text-xl font-serif font-bold tracking-tight">Modify Class Session Log</h2>
                                {(() => {
                                    const { title: displayTitle } = formatClassTitle(editingClass.title);
                                    return (
                                        <p className="text-[10px] text-muted-foreground italic font-medium mt-0.5">Edit log records for "{displayTitle}"</p>
                                    );
                                })()}
                            </div>
                            <button 
                                onClick={() => { setIsEditModalOpen(false); setEditingClass(null); }} 
                                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveEdit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto [scrollbar-width:thin]">
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Class Status</Label>
                                    <Select value={formStatus} onValueChange={setFormStatus}>
                                        <SelectTrigger className="h-11 rounded-2xl bg-muted/20 border-none outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border border-border/40">
                                            <SelectItem value="scheduled" className="rounded-xl">Scheduled</SelectItem>
                                            <SelectItem value="ongoing" className="rounded-xl">Ongoing</SelectItem>
                                            <SelectItem value="completed" className="rounded-xl">Completed</SelectItem>
                                            <SelectItem value="cancelled" className="rounded-xl">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Student Attendance</Label>
                                    <Select value={formAttendanceStatus} onValueChange={setFormAttendanceStatus}>
                                        <SelectTrigger className="h-11 rounded-2xl bg-muted/20 border-none outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold">
                                            <SelectValue placeholder="Not Marked" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border border-border/40">
                                            <SelectItem value="" className="rounded-xl italic">Not Marked</SelectItem>
                                            <SelectItem value="present" className="rounded-xl">Present</SelectItem>
                                            <SelectItem value="absent" className="rounded-xl">Student No Show</SelectItem>
                                            <SelectItem value="late" className="rounded-xl">Late</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Scheduled Date & Time (Local)</Label>
                                <Input 
                                    type="datetime-local" 
                                    value={formScheduledAt}
                                    onChange={(e) => setFormScheduledAt(e.target.value)}
                                    className="h-11 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Topic Taught</Label>
                                <Input 
                                    value={formTopicTaught}
                                    onChange={(e) => setFormTopicTaught(e.target.value)}
                                    className="h-11 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                    placeholder="e.g. Multi-digit Addition"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Homework Assigned</Label>
                                <Input 
                                    value={formHomeworkGiven}
                                    onChange={(e) => setFormHomeworkGiven(e.target.value)}
                                    className="h-11 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                                    placeholder="e.g. Worksheet page 4 to 6"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Student Performance Rating</Label>
                                    <Select value={formStudentPerformance} onValueChange={setFormStudentPerformance}>
                                        <SelectTrigger className="h-11 rounded-2xl bg-muted/20 border-none outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-semibold">
                                            <SelectValue placeholder="Select performance rating..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border border-border/40">
                                            <SelectItem value="Good" className="rounded-xl">Good</SelectItem>
                                            <SelectItem value="Average" className="rounded-xl">Average</SelectItem>
                                            <SelectItem value="Needs Improvement" className="rounded-xl">Needs Improvement</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Coordinator or Parent Notes</Label>
                                <Textarea 
                                    value={formParentNote}
                                    onChange={(e) => setFormParentNote(e.target.value)}
                                    className="rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs min-h-[80px]"
                                    placeholder="Add any audit comments or messages for the parents..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-border/10">
                                <Button 
                                    type="button"
                                    variant="ghost"
                                    onClick={() => { setIsEditModalOpen(false); setEditingClass(null); }}
                                    className="rounded-xl h-10 font-bold uppercase tracking-wider text-[10px]"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-6 font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-indigo-600/15"
                                >
                                    {isSaving ? "Saving Logs..." : "Save Log Changes"}
                                </Button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ")
}
