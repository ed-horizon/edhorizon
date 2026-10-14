'use client'

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3, X,
    Video, Clock, User, BookOpen, AlertCircle, FileText, CheckCircle2, 
    Award, Upload, Palmtree, Trash2, Search, ShieldAlert, Sparkles, XCircle
} from "lucide-react"
import { formatTime12Hour, ensureAbsoluteUrl, formatClassTitle } from "@/lib/utils"
import { format } from "date-fns"
import { 
    getClassLogsForMonth, 
    modifyClassLog, 
    getDeletedClasses, 
    type DeletedClassRecord,
    getRejectedClasses,
    type RejectedClassRecord
} from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { AssignHomeworkDialog, UploadMaterialDialog } from "@/components/features/teacher/StudentActionDialogs"
import { ManageHolidaysDialog } from "@/components/features/holidays/ManageHolidaysDialog"
import { DeleteClassDialog } from "@/components/features/class-logs/DeleteClassDialog"
import { getAcademyHolidays, type AcademyHoliday } from "@/app/(dashboard)/holidays/actions"

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
    const [holidays, setHolidays] = useState<AcademyHoliday[]>([])
    const [deletedClasses, setDeletedClasses] = useState<DeletedClassRecord[]>([])
    const [rejectedClasses, setRejectedClasses] = useState<RejectedClassRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const canModify = ["hr", "super_admin", "admin", "operations"].includes(currentUserProfile.role)
    const [activeViewTab, setActiveViewTab] = useState<'calendar' | 'rejected' | 'deleted'>('calendar')

    // Admin filters
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all")
    const [selectedStudentId, setSelectedStudentId] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [showLateJoiningsOnly, setShowLateJoiningsOnly] = useState(false)

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
    const [formRejectionReason, setFormRejectionReason] = useState("")

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const promises: Promise<any>[] = [
                getClassLogsForMonth(year, month),
                getAcademyHolidays(year, month)
            ]
            if (canModify) {
                promises.push(getDeletedClasses(year, month))
                promises.push(getRejectedClasses(year, month))
            }

            const [data, holidayData, deletedData, rejectedData] = await Promise.all(promises)
            setClasses(data || [])
            setHolidays(holidayData || [])
            if (canModify) {
                if (deletedData) {
                    setDeletedClasses(deletedData || [])
                }
                if (rejectedData) {
                    setRejectedClasses(rejectedData || [])
                }
            }
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

    // Filter classes based on active controls
    const filteredClasses = classes.filter(c => {
        if (selectedTeacherId !== "all" && c.teacher_id !== selectedTeacherId) return false
        if (selectedStudentId !== "all" && c.student_id !== selectedStudentId) return false
        if (showLateJoiningsOnly && !c.tutor_joined_late) return false

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            const matchTitle = c.title?.toLowerCase().includes(query)
            const matchTeacher = c.teacher?.full_name?.toLowerCase().includes(query)
            const matchStudent = c.student?.full_name?.toLowerCase().includes(query)
            const matchTopic = c.topic_taught?.toLowerCase().includes(query)
            if (!matchTitle && !matchTeacher && !matchStudent && !matchTopic) return false
        }

        return true
    })

    // Filter deleted classes based on search and filters (Staff Only)
    const filteredDeletedClasses = useMemo(() => {
        return deletedClasses.filter(d => {
            if (selectedTeacherId !== "all" && d.teacher_id !== selectedTeacherId) return false
            if (selectedStudentId !== "all" && d.student_id !== selectedStudentId) return false
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase()
                const matchTitle = d.title?.toLowerCase().includes(query)
                const matchTeacher = d.teacher_name?.toLowerCase().includes(query)
                const matchStudent = d.student_name?.toLowerCase().includes(query)
                const matchReason = d.deletion_reason?.toLowerCase().includes(query)
                const matchDeletedBy = d.deleted_by_name?.toLowerCase().includes(query)
                if (!matchTitle && !matchTeacher && !matchStudent && !matchReason && !matchDeletedBy) return false
            }
            return true
        })
    }, [deletedClasses, selectedTeacherId, selectedStudentId, searchQuery])

    // Filter rejected classes based on search and filters (Staff Only)
    const filteredRejectedClasses = useMemo(() => {
        return rejectedClasses.filter(r => {
            if (selectedTeacherId !== "all" && r.teacher_id !== selectedTeacherId) return false
            if (selectedStudentId !== "all" && r.student_id !== selectedStudentId) return false
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase()
                const matchTitle = r.title?.toLowerCase().includes(query)
                const matchTeacher = r.teacher?.full_name?.toLowerCase().includes(query) || r.teacher?.email?.toLowerCase().includes(query)
                const matchStudent = r.student?.full_name?.toLowerCase().includes(query) || r.student?.email?.toLowerCase().includes(query)
                const matchTopic = r.topic_taught?.toLowerCase().includes(query)
                const matchReason = r.rejection_reason?.toLowerCase().includes(query)
                const matchVerifiedBy = r.verified_by_profile?.full_name?.toLowerCase().includes(query) || r.verified_by_profile?.email?.toLowerCase().includes(query)
                if (!matchTitle && !matchTeacher && !matchStudent && !matchTopic && !matchReason && !matchVerifiedBy) return false
            }
            return true
        })
    }, [rejectedClasses, selectedTeacherId, selectedStudentId, searchQuery])

    // Generate Calendar Days for Month
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sun
    
    // Group classes by day (1 to daysInMonth) using local date of scheduled_at
    const classesByDay: { [key: number]: any[] } = {}
    filteredClasses.forEach(c => {
        const d = new Date(c.scheduled_at)
        // Check if class belongs to this month and year in local time
        if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
            const dayNum = d.getDate()
            if (!classesByDay[dayNum]) classesByDay[dayNum] = []
            classesByDay[dayNum].push(c)
        }
    })

    // Map holidays by day string "YYYY-MM-DD"
    const holidaysByDateStr = useMemo(() => {
        const map = new Map<string, AcademyHoliday>()
        holidays.forEach(h => {
            map.set(h.holiday_date, h)
        })
        return map
    }, [holidays])

    // Selected Date Classes
    const getClassesForDate = (date: Date | null) => {
        if (!date) return []
        const day = date.getDate()
        return classesByDay[day] || []
    }

    const handleOpenEdit = (cls: any) => {
        setEditingClass(cls)
        setFormStatus(cls.status)
        
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
        setFormRejectionReason(cls.rejection_reason || "")
        
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
                formParentNote,
                formStatus === 'rejected' ? formRejectionReason : undefined
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
                            ? "Complete administrative dashboard to review, audit, and modify teacher class sessions, student attendances, and academy holidays."
                            : "Interactive schedule log calendar showing taken, cancelled, and upcoming sessions."}
                    </p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Academy Holidays Trigger */}
                    <ManageHolidaysDialog 
                        currentUserRole={currentUserProfile.role}
                        onHolidayChanged={fetchLogs}
                    />

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
            </div>

            {/* TAB NAVIGATION: Strictly for Staff (Admin, Super Admin, HR, Operations) */}
            {canModify && (
                <div className="flex items-center gap-2 border-b border-border/20 pb-3 flex-wrap">
                    <Button
                        type="button"
                        variant={activeViewTab === 'calendar' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveViewTab('calendar')}
                        className="rounded-xl text-xs font-bold gap-2"
                    >
                        <CalendarIcon size={14} />
                        <span>Class Logs Calendar</span>
                    </Button>
                    <Button
                        type="button"
                        variant={activeViewTab === 'rejected' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveViewTab('rejected')}
                        className={`rounded-xl text-xs font-bold gap-2 ${
                            activeViewTab === 'rejected' 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' 
                                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                        }`}
                    >
                        <XCircle size={14} />
                        <span>Rejected Classes</span>
                        {filteredRejectedClasses.length > 0 && (
                            <Badge className={`text-[10px] font-mono px-1.5 py-0 h-4 rounded-full border-none ${
                                activeViewTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                            }`}>
                                {filteredRejectedClasses.length}
                            </Badge>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant={activeViewTab === 'deleted' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveViewTab('deleted')}
                        className={`rounded-xl text-xs font-bold gap-2 ${
                            activeViewTab === 'deleted' 
                                ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black shadow-sm' 
                                : 'text-muted-foreground hover:bg-muted/30'
                        }`}
                    >
                        <Trash2 size={14} />
                        <span>Deleted Classes</span>
                        {filteredDeletedClasses.length > 0 && (
                            <Badge className="bg-muted text-muted-foreground text-[10px] font-mono px-1.5 py-0 h-4 rounded-full border-none">
                                {filteredDeletedClasses.length}
                            </Badge>
                        )}
                    </Button>
                </div>
            )}

            {/* Filters Row */}
            <div className="bg-muted/10 p-4 md:p-6 rounded-[2rem] border border-border/30 space-y-4">
                {canModify && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                    <div className="relative flex-1 text-left space-y-1">
                        <Label htmlFor="search-logs" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Search Logs</Label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <Input
                                id="search-logs"
                                placeholder={
                                    activeViewTab === 'deleted' 
                                        ? "Search deleted classes, reasons, staff..." 
                                        : activeViewTab === 'rejected'
                                        ? "Search rejected classes, reasons, staff..."
                                        : "Search classes, topics, tutors, students..."
                                }
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 pl-9 rounded-2xl bg-card border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                            />
                        </div>
                    </div>

                    {activeViewTab === 'calendar' && (
                        <div className="flex items-center gap-2 self-end sm:self-auto pt-4 sm:pt-0">
                            <Button 
                                variant={showLateJoiningsOnly ? "default" : "outline"} 
                                size="sm" 
                                onClick={() => setShowLateJoiningsOnly(!showLateJoiningsOnly)}
                                className="rounded-2xl text-[10px] font-black uppercase tracking-wider h-11 px-4 gap-1.5"
                            >
                                <AlertCircle size={14} className={showLateJoiningsOnly ? "text-white" : "text-rose-500"} />
                                <span>Late Joinings Only</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* TAB VIEW 1: REGULAR INTERACTIVE CALENDAR */}
            {activeViewTab === 'calendar' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left/Center: Calendar Grid (8 Cols) */}
                    <Card className="lg:col-span-8 rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card text-left">
                        <CardHeader className="bg-muted/15 px-6 py-5 border-b border-border/20 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <CalendarIcon className="text-indigo-600" size={20} />
                                    <span>{monthNames[month - 1]} {year} Overview</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Click any date on the grid to inspect classes, student attendances, and log notes.
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-border/40">
                                {filteredClasses.length} Scheduled Sessions
                            </Badge>
                        </CardHeader>

                        <CardContent className="p-6">
                            {/* Days of week header */}
                            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                    <div key={day} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-2">
                                {/* Padding for the first week */}
                                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                                    <div key={`empty-${i}`} className="min-h-[90px] rounded-2xl bg-muted/5 border border-dashed border-border/10 p-2 opacity-30" />
                                ))}

                                {/* Day Cells */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1
                                    const cellDate = new Date(year, month - 1, day)
                                    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                    const holiday = holidaysByDateStr.get(dateKey)
                                    const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === (month - 1)
                                    const isToday = now.getDate() === day && now.getMonth() === (month - 1) && now.getFullYear() === year
                                    const dayClasses = classesByDay[day] || []
                                    const completedCount = dayClasses.filter(c => 
                                        c.status === 'completed' && 
                                        c.verification_status !== 'rejected' && 
                                        c.student_attendance?.[0]?.status !== 'absent'
                                    ).length
                                    const scheduledCount = dayClasses.filter(c => c.status === 'scheduled' || c.status === 'ongoing').length
                                    const cancelledCount = dayClasses.filter(c => c.status === 'cancelled').length
                                    const rejectedCount = dayClasses.filter(c => c.status === 'rejected' || c.verification_status === 'rejected').length
                                    const hasLate = dayClasses.some(c => c.tutor_joined_late)

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDate(cellDate)}
                                            className={`min-h-[105px] rounded-2xl p-2.5 flex flex-col justify-between text-left transition-all border relative overflow-hidden group ${
                                                holiday 
                                                    ? 'bg-amber-500/10 border-amber-500/35 hover:border-amber-500 hover:bg-amber-500/15'
                                                    : isSelected 
                                                    ? 'bg-indigo-600/10 border-indigo-600 ring-2 ring-indigo-600/20 shadow-md' 
                                                    : 'bg-muted/10 border-border/20 hover:border-border/60 hover:bg-muted/20'
                                            }`}
                                        >
                                            {/* Top Row: Date Number and Indicators */}
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-xs font-black rounded-lg px-1.5 py-0.5 ${
                                                    isToday 
                                                        ? 'bg-indigo-600 text-white' 
                                                        : isSelected 
                                                        ? 'text-indigo-600 font-extrabold' 
                                                        : holiday
                                                        ? 'text-amber-700 dark:text-amber-400 font-extrabold'
                                                        : 'text-foreground'
                                                }`}>
                                                    {day}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {holiday && (
                                                        <span title={`Academy Holiday: ${holiday.title}`} className="text-amber-600 dark:text-amber-400">
                                                            <Palmtree size={13} />
                                                        </span>
                                                    )}
                                                    {hasLate && (
                                                        <span title="Tutor Joined Late Recorded" className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Holiday Banner Tag inside Cell */}
                                            {holiday && (
                                                <div className="w-full my-1">
                                                    <span className="block truncate text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md text-left">
                                                        🌴 {holiday.title}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Session Stats Pills */}
                                            <div className="space-y-1 w-full pt-1">
                                                {completedCount > 0 && (
                                                    <div className="flex items-center justify-between text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                                        <span>Completed</span>
                                                        <span>{completedCount}</span>
                                                    </div>
                                                )}
                                                {scheduledCount > 0 && (
                                                    <div className="flex items-center justify-between text-[9px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                                                        <span>Scheduled</span>
                                                        <span>{scheduledCount}</span>
                                                    </div>
                                                )}
                                                {cancelledCount > 0 && (
                                                    <div className="flex items-center justify-between text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                                                        <span>Cancelled</span>
                                                        <span>{cancelledCount}</span>
                                                    </div>
                                                )}
                                                {rejectedCount > 0 && (
                                                    <div className="flex items-center justify-between text-[9px] font-bold text-rose-800 dark:text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded-md border border-rose-500/30">
                                                        <span>Rejected</span>
                                                        <span>{rejectedCount}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Selected Date Details & Actions (4 Cols) */}
                    <div className="lg:col-span-4 space-y-4 text-left">
                        {(() => {
                            const selectedDateStr = selectedDate 
                                ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                                : null;
                            const selectedHoliday = selectedDateStr ? holidaysByDateStr.get(selectedDateStr) : null;

                            return (
                        <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card flex flex-col max-h-[700px]">
                            <CardHeader className="bg-muted/15 px-6 py-5 border-b border-border/20">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <CalendarIcon className="text-indigo-600" size={18} />
                                        <CardTitle className="text-base font-bold">
                                            {selectedDate ? selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' }) : "Select a Date"}
                                        </CardTitle>
                                    </div>

                                    {/* Quick Mark as Holiday Button (Staff only) */}
                                    {selectedDate && canModify && !selectedHoliday && (
                                        <ManageHolidaysDialog
                                            currentUserRole={currentUserProfile.role}
                                            initialDate={selectedDateStr!}
                                            onHolidayChanged={fetchLogs}
                                            triggerButton={
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 px-2 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/15 rounded-lg gap-1"
                                                >
                                                    <Palmtree size={12} />
                                                    <span>Mark Holiday</span>
                                                </Button>
                                            }
                                        />
                                    )}
                                </div>
                                <CardDescription className="text-xs">Classes scheduled for this day</CardDescription>
                            </CardHeader>
                            
                            <CardContent className="p-6 flex-1 overflow-y-auto space-y-4">
                                {/* Academy Holiday Banner */}
                                {selectedHoliday && (
                                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in">
                                        <div className="flex items-start gap-2.5">
                                            <Palmtree className="text-amber-600 mt-0.5 shrink-0" size={18} />
                                            <div>
                                                <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300">
                                                    🎉 Academy Holiday: {selectedHoliday.title}
                                                </h4>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                                                    {selectedHoliday.description || "Academy closed in observance of this holiday. All scheduled tutor sessions suspended."}
                                                </p>
                                            </div>
                                        </div>
                                        {canModify && (
                                            <ManageHolidaysDialog
                                                currentUserRole={currentUserProfile.role}
                                                onHolidayChanged={fetchLogs}
                                                triggerButton={
                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] font-bold text-amber-700 hover:bg-amber-500/20 rounded-md shrink-0">
                                                        Manage
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </div>
                                )}

                                {!selectedDate ? (
                                    <p className="text-xs text-muted-foreground italic text-center py-12">Click a date on the calendar to view its session records.</p>
                                ) : getClassesForDate(selectedDate).length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic text-center py-12">
                                        {selectedHoliday 
                                            ? `No active classes. All sessions on this day are suspended for ${selectedHoliday.title}.`
                                            : "No classes scheduled on this day."}
                                    </p>
                                ) : (
                                    getClassesForDate(selectedDate).map(c => {
                                        const att = c.student_attendance?.[0]
                                        const elapsed = new Date().getTime() - new Date(c.scheduled_at).getTime();
                                        const isNotMarked = (c.status === 'scheduled' || c.status === 'ongoing') && elapsed > 24 * 60 * 60 * 1000;
                                        return (
                                            <div 
                                                key={c.id} 
                                                className={`p-4 border rounded-2xl text-xs space-y-3 relative overflow-hidden group transition-all ${
                                                    c.tutor_joined_late 
                                                        ? "bg-rose-50/30 border-rose-500/30 dark:bg-rose-950/10 dark:border-rose-950/30" 
                                                        : "bg-muted/20 border-border/20"
                                                }`}
                                            >
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
                                                        <div className="flex items-center gap-2 mt-1.5 text-muted-foreground text-[10px] flex-wrap">
                                                            <Clock size={12} className="text-indigo-500" />
                                                            <span>{format(new Date(c.scheduled_at), 'hh:mm a')}</span>
                                                            {c.tutor_joined_late && (
                                                                <Badge className="bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full">
                                                                    Tutor Joined Late
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge className={`text-[8px] font-black uppercase border-none rounded-full px-2 py-0.5 ${
                                                        c.status === 'completed' && c.verification_status !== 'rejected' ? 'bg-emerald-100 text-emerald-800' :
                                                        c.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                                                        c.status === 'rejected' || c.verification_status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 font-bold' :
                                                        !isNotMarked && (c.status === 'scheduled' || c.status === 'ongoing') ? 'bg-indigo-100 text-indigo-800' :
                                                        isNotMarked ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' : ''
                                                    }`}>
                                                        {c.status === 'rejected' || c.verification_status === 'rejected' ? 'Rejected' : isNotMarked ? "Attendance Not Marked" : c.status}
                                                    </Badge>
                                                </div>

                                                {/* Cancellation Reason if present */}
                                                {c.cancellation_reason && (
                                                    <div className="pt-0.5">
                                                        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md inline-block">
                                                            {c.cancellation_reason}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Rejection Reason if present */}
                                                {(c.rejection_reason || c.status === 'rejected' || c.verification_status === 'rejected') && (
                                                    <div className="pt-0.5">
                                                        <div className="flex items-start gap-2 p-2.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-500/25 rounded-xl text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed text-left">
                                                            <AlertCircle size={15} className="shrink-0 text-rose-600 mt-0.5" />
                                                            <div className="space-y-0.5">
                                                                <span className="font-bold uppercase tracking-wider text-[8px] block text-rose-600 dark:text-rose-400">
                                                                    HR Verification Rejection Reason:
                                                                </span>
                                                                <p className="italic font-medium">
                                                                    &ldquo;{c.rejection_reason || 'Class attendance verification was rejected.'}&rdquo;
                                                                </p>
                                                                {c.rejected_at && (
                                                                    <span className="text-[9px] text-muted-foreground block font-mono">
                                                                        Rejected on {format(new Date(c.rejected_at), 'MMM dd, yyyy • hh:mm a')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1.5 border-t border-border/10 pt-2.5">
                                                    <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                                                        <User size={12} className="text-indigo-500" />
                                                        <span className="font-bold text-foreground">Tutor:</span>
                                                        <span>
                                                            {c.teacher?.full_name || 'N/A'}
                                                            {c.tutor_joined_at && (
                                                                <span className="text-[9px] text-muted-foreground/60 italic ml-1">
                                                                    (In: {format(new Date(c.tutor_joined_at), 'hh:mm a')})
                                                                </span>
                                                            )}
                                                        </span>
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
                                                        <span className={`font-bold uppercase tracking-wider text-[9px] ${
                                                            att?.status === 'present' ? 'text-emerald-600' :
                                                            att?.status === 'absent' ? 'text-rose-600' :
                                                            att?.status === 'late' ? 'text-amber-600' :
                                                            !att?.status ? 'text-muted-foreground italic normal-case' : ''
                                                        }`}>
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
                                                                <p className="text-[10px] text-foreground italic mt-0.5">&ldquo;{c.topic_taught}&rdquo;</p>
                                                            </div>
                                                        )}
                                                        {c.homework_given && (
                                                            <div>
                                                                <span className="block text-[8px] font-black uppercase text-muted-foreground tracking-wider">Homework Assigned</span>
                                                                <p className="text-[10px] text-foreground italic mt-0.5">&ldquo;{c.homework_given}&rdquo;</p>
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
                                                    <div className="flex justify-end gap-2 pt-2 flex-wrap items-center">
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleOpenEdit(c)}
                                                            className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[9px] gap-1 shadow-md shadow-indigo-600/10"
                                                        >
                                                            <Edit3 size={10} />
                                                            <span>Edit Log</span>
                                                        </Button>

                                                        {/* Delete Class with Reason Dialog */}
                                                        <DeleteClassDialog
                                                            classSession={{
                                                                id: c.id,
                                                                title: c.title,
                                                                scheduled_at: c.scheduled_at,
                                                                teacher_name: c.teacher?.full_name,
                                                                student_name: c.student?.full_name,
                                                                status: c.status
                                                            }}
                                                            onDeleted={fetchLogs}
                                                        />

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
                            );
                        })()}
                    </div>

                </div>
            )}

            {/* TAB VIEW 2: DELETED CLASSES AUDIT LOG (STAFF ONLY) */}
            {canModify && activeViewTab === 'deleted' && (
                <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card text-left">
                    <CardHeader className="bg-rose-500/5 px-6 py-5 border-b border-border/20 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                                <Trash2 size={20} />
                                <span>Deleted Classes Audit Log</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Complete permanent record of all class sessions deleted for {monthNames[month - 1]} {year} with mandatory justification.
                            </CardDescription>
                        </div>
                        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold px-3 py-1 rounded-full">
                            {filteredDeletedClasses.length} Deleted Records
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-6">
                        {filteredDeletedClasses.length === 0 ? (
                            <div className="py-16 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/40 space-y-2">
                                <Trash2 size={32} className="mx-auto text-muted-foreground opacity-30" />
                                <p className="font-semibold text-sm">No deleted classes found.</p>
                                <p className="text-[11px] opacity-75">
                                    No class sessions have been deleted for {monthNames[month - 1]} {year} matching the current filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-border/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                            <th className="py-3 px-3">Class Subject</th>
                                            <th className="py-3 px-3">Scheduled Date</th>
                                            <th className="py-3 px-3">Tutor</th>
                                            <th className="py-3 px-3">Student</th>
                                            <th className="py-3 px-3">Prior Status</th>
                                            <th className="py-3 px-3">Reason for Deletion</th>
                                            <th className="py-3 px-3">Deleted By</th>
                                            <th className="py-3 px-3">Deleted At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/10">
                                        {filteredDeletedClasses.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/15 transition-colors group">
                                                <td className="py-3.5 px-3 font-bold text-foreground">
                                                    {item.title}
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(item.scheduled_at), 'MMM dd, yyyy • hh:mm a')}
                                                </td>
                                                <td className="py-3.5 px-3 font-medium text-foreground">
                                                    {item.teacher_name || 'N/A'}
                                                </td>
                                                <td className="py-3.5 px-3 font-medium text-foreground">
                                                    {item.student_name || 'N/A'}
                                                </td>
                                                <td className="py-3.5 px-3">
                                                    <Badge className={`text-[8px] font-bold uppercase rounded-full px-2 py-0.5 border-none ${
                                                        item.status_before_deletion === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                        item.status_before_deletion === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                                                        'bg-indigo-100 text-indigo-800'
                                                    }`}>
                                                        {item.status_before_deletion}
                                                    </Badge>
                                                </td>
                                                <td className="py-3.5 px-3 max-w-xs">
                                                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-[11px] font-medium leading-relaxed">
                                                        &ldquo;{item.deletion_reason}&rdquo;
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 font-medium text-muted-foreground whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <ShieldAlert size={12} className="text-amber-500" />
                                                        <span>{item.deleted_by_name || 'Staff Member'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(item.deleted_at), 'MMM dd, yyyy • hh:mm a')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB VIEW 3: REJECTED CLASSES AUDIT LOG (STAFF ONLY) */}
            {canModify && activeViewTab === 'rejected' && (
                <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card text-left">
                    <CardHeader className="bg-rose-500/5 px-6 py-5 border-b border-border/20 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                                <XCircle size={20} />
                                <span>Rejected Classes Audit Log</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Complete verification audit log of all classes rejected during HR review for {monthNames[month - 1]} {year} with mandatory rejection reasons.
                            </CardDescription>
                        </div>
                        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold px-3 py-1 rounded-full">
                            {filteredRejectedClasses.length} Rejected Records
                        </Badge>
                    </CardHeader>

                    <CardContent className="p-6">
                        {filteredRejectedClasses.length === 0 ? (
                            <div className="py-16 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/40 space-y-2">
                                <XCircle size={32} className="mx-auto text-muted-foreground opacity-30" />
                                <p className="font-semibold text-sm">No rejected classes found.</p>
                                <p className="text-[11px] opacity-75">
                                    No class sessions have been rejected during verification for {monthNames[month - 1]} {year} matching the current filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-border/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                            <th className="py-3 px-3">Class Subject</th>
                                            <th className="py-3 px-3">Scheduled Date</th>
                                            <th className="py-3 px-3">Tutor</th>
                                            <th className="py-3 px-3">Student</th>
                                            <th className="py-3 px-3">Topic / Info</th>
                                            <th className="py-3 px-3">Reason for Rejection</th>
                                            <th className="py-3 px-3">Rejected By</th>
                                            <th className="py-3 px-3">Rejected At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/10">
                                        {filteredRejectedClasses.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/15 transition-colors group">
                                                <td className="py-3.5 px-3 font-bold text-foreground">
                                                    {item.title}
                                                    {item.course?.title && (
                                                        <span className="block text-[10px] font-normal text-muted-foreground">
                                                            {item.course.title}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(item.scheduled_at), 'MMM dd, yyyy • hh:mm a')}
                                                    {item.duration_hours && (
                                                        <span className="block text-[10px] text-muted-foreground/75">
                                                            Duration: {item.duration_hours}h
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 font-medium text-foreground">
                                                    {item.teacher?.full_name || 'N/A'}
                                                </td>
                                                <td className="py-3.5 px-3 font-medium text-foreground">
                                                    {item.student?.full_name || 'N/A'}
                                                </td>
                                                <td className="py-3.5 px-3 max-w-xs">
                                                    {item.topic_taught ? (
                                                        <span className="text-[11px] text-foreground italic">
                                                            &ldquo;{item.topic_taught}&rdquo;
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground italic">No topic logged</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 max-w-sm">
                                                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-[11px] font-medium leading-relaxed">
                                                        &ldquo;{item.rejection_reason || 'Class attendance verification was rejected.'}&rdquo;
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 font-medium text-muted-foreground whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <ShieldAlert size={12} className="text-amber-500" />
                                                        <span>{item.verified_by_profile?.full_name || 'HR / Admin'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {item.rejected_at ? (
                                                        format(new Date(item.rejected_at), 'MMM dd, yyyy • hh:mm a')
                                                    ) : (
                                                        <span className="text-muted-foreground/60 italic">—</span>
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
            )}

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
                                        <p className="text-[10px] text-muted-foreground italic font-medium mt-0.5">Edit log records for &ldquo;{displayTitle}&rdquo;</p>
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
                                            <SelectItem value="rejected" className="rounded-xl">Rejected</SelectItem>
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

                            {formStatus === 'rejected' && (
                                <div className="space-y-1.5 p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/25 border border-rose-500/25 animate-in fade-in">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 ml-1 flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        <span>HR Rejection Reason (Mandatory)</span>
                                    </Label>
                                    <Textarea 
                                        value={formRejectionReason}
                                        onChange={(e) => setFormRejectionReason(e.target.value)}
                                        className="rounded-xl bg-card border-none outline-none focus-visible:ring-1 focus-visible:ring-rose-500 text-xs min-h-[60px]"
                                        placeholder="Enter the justification for rejecting this class..."
                                        required={formStatus === 'rejected'}
                                    />
                                </div>
                            )}

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
                            <div className="flex items-center justify-between pt-4 border-t border-border/10">
                                <DeleteClassDialog
                                    classSession={{
                                        id: editingClass.id,
                                        title: editingClass.title,
                                        scheduled_at: editingClass.scheduled_at,
                                        teacher_name: editingClass.teacher?.full_name,
                                        student_name: editingClass.student?.full_name,
                                        status: editingClass.status
                                    }}
                                    onDeleted={() => {
                                        setIsEditModalOpen(false)
                                        setEditingClass(null)
                                        fetchLogs()
                                    }}
                                />

                                <div className="flex items-center gap-2">
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
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    )
}
