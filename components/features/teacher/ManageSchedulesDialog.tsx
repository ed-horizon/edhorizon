'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Video, Calendar, Plus, Clock, Users, Sparkles, RefreshCw, X, Edit3, UserCheck, BookOpen } from "lucide-react"
import { getAssignedStudents, getAllTeachers, getAllStudentsAdmin, getCurrentProfile } from "@/app/(dashboard)/attendance/actions"
import { createClassSchedule, updateClassSchedule, cancelClassSchedule, getTeacherSchedules, getAllActiveSchedules } from "@/app/(dashboard)/scheduling/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { formatTime12Hour, parseStudentIdAndMobile } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DAYS = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' },
]

interface ManageSchedulesDialogProps {
    initialSchedule?: any;
    trigger?: React.ReactNode;
}

export function ManageSchedulesDialog({ initialSchedule, trigger }: ManageSchedulesDialogProps = {}) {
    const [isOpen, setIsOpen] = useState(false)
    const isSubmittingRef = useRef(false)
    const [isLoading, setIsLoading] = useState(false)
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
    
    // Auth & Role
    const [profile, setProfile] = useState<any>(null)
    const [isAdminOrOps, setIsAdminOrOps] = useState(false)

    // Lists
    const [teachers, setTeachers] = useState<any[]>([])
    const [assignedStudents, setAssignedStudents] = useState<any[]>([])
    const [schedules, setSchedules] = useState<any[]>([])
    
    // List Filtering (Admin/Ops only)
    const [filterTeacherId, setFilterTeacherId] = useState<string>("all")

    // Form state
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
    const [selectedStudentId, setSelectedStudentId] = useState<string>("")
    const [subject, setSubject] = useState("")
    const [meetingLink, setMeetingLink] = useState("")
    const [scheduledTime, setScheduledTime] = useState("")
    const [durationPattern, setDurationPattern] = useState(1.0)
    const [patternDays, setPatternDays] = useState<number[]>([])
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [notes, setNotes] = useState("")
    const [dayTimings, setDayTimings] = useState<Record<number, string>>({})

    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            loadInitialData()
            if (initialSchedule) {
                setEditingScheduleId(initialSchedule.id)
                setSelectedTeacherId(initialSchedule.teacher_id)
                setSelectedStudentId(initialSchedule.student_id)
                setSubject(initialSchedule.title)
                setMeetingLink(initialSchedule.meeting_link)
                setScheduledTime(initialSchedule.time_of_day.substring(0, 5))
                setDurationPattern(Number(initialSchedule.duration_hours))
                setPatternDays(initialSchedule.pattern_days)
                setStartDate(initialSchedule.start_date)
                setEndDate(initialSchedule.end_date)
                setNotes(initialSchedule.parent_note || "")
                setDayTimings(initialSchedule.day_timings || {})
                setView('edit')
            } else {
                setView('list')
            }
        } else {
            setEditingScheduleId(null)
            setSelectedStudentId("")
            setSubject("")
            setMeetingLink("")
            setScheduledTime("")
            setDurationPattern(1.0)
            setPatternDays([])
            setStartDate("")
            setEndDate("")
            setNotes("")
            setDayTimings({})
            setView('list')
        }
    }, [isOpen, initialSchedule])

    useEffect(() => {
        if (isOpen && isAdminOrOps) {
            loadSchedulesFiltered()
        }
    }, [filterTeacherId, isOpen, isAdminOrOps])

    const loadInitialData = async () => {
        setIsLoading(true)
        try {
            const currentProf = await getCurrentProfile()
            setProfile(currentProf)

            const role = currentProf?.role || 'student'
            const adminRoles = ['admin', 'super_admin', 'hr', 'operations']
            const isStaff = adminRoles.includes(role)
            setIsAdminOrOps(isStaff)

            if (isStaff) {
                const [teachersData, studentsData] = await Promise.all([
                    getAllTeachers(),
                    getAllStudentsAdmin()
                ])
                setTeachers(teachersData)
                setAssignedStudents(studentsData)
                // Filtered schedules loaded by the useEffect hook
            } else {
                const [studentsData, schedulesData] = await Promise.all([
                    getAssignedStudents(),
                    getTeacherSchedules()
                ])
                setAssignedStudents(studentsData)
                setSchedules(schedulesData)
                if (currentProf?.id) {
                    setSelectedTeacherId(currentProf.id)
                }
            }
        } catch (error) {
            toast.error("Failed to load schedule setup data")
        } finally {
            setIsLoading(false)
        }
    }

    const loadSchedulesFiltered = async () => {
        setIsLoading(true)
        try {
            if (filterTeacherId === "all") {
                const data = await getAllActiveSchedules()
                setSchedules(data)
            } else {
                const data = await getTeacherSchedules(filterTeacherId)
                setSchedules(data)
            }
        } catch (error) {
            toast.error("Failed to load schedules")
        } finally {
            setIsLoading(false)
        }
    }

    const resetForm = (closeDialog = false) => {
        setEditingScheduleId(null)
        setSelectedStudentId("")
        setSubject("")
        setMeetingLink("")
        setScheduledTime("")
        setDurationPattern(1.0)
        setPatternDays([])
        setStartDate("")
        setEndDate("")
        setNotes("")
        setDayTimings({})
        if (isAdminOrOps) setSelectedTeacherId("")
        setView('list')
        if (closeDialog || initialSchedule) {
            setIsOpen(false)
        }
    }

    const startEditing = (schedule: any) => {
        setEditingScheduleId(schedule.id)
        setSelectedTeacherId(schedule.teacher_id)
        setSelectedStudentId(schedule.student_id)
        setSubject(schedule.title)
        setMeetingLink(schedule.meeting_link)
        setScheduledTime(schedule.time_of_day.substring(0, 5))
        setDurationPattern(Number(schedule.duration_hours))
        setPatternDays(schedule.pattern_days)
        setStartDate(schedule.start_date)
        setEndDate(schedule.end_date)
        setNotes(schedule.parent_note || "")
        setDayTimings(schedule.day_timings || {})
        setView('edit')
    }

    const handleStudentChange = (studentId: string) => {
        setSelectedStudentId(studentId)
        const student = assignedStudents.find(s => s.id === studentId)
        if (student) {
            if (student.preferred_meeting_link && !meetingLink) setMeetingLink(student.preferred_meeting_link)
            if (student.preferred_time && !scheduledTime) setScheduledTime(student.preferred_time)
        }
    }

    const toggleDay = (dayValue: number) => {
        if (patternDays.includes(dayValue)) {
            setPatternDays(patternDays.filter(d => d !== dayValue))
            const newTimings = { ...dayTimings }
            delete newTimings[dayValue]
            setDayTimings(newTimings)
        } else {
            setPatternDays([...patternDays, dayValue])
            setDayTimings(prev => ({
                ...prev,
                [dayValue]: prev[dayValue] || scheduledTime || "16:00"
            }))
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        
        if (isSubmittingRef.current) return
        
        if (!selectedStudentId || !subject.trim() || patternDays.length === 0 || !startDate || !endDate || !scheduledTime) {
            toast.error("Please fill out all required schedule parameters.")
            return
        }

        if (isAdminOrOps && !selectedTeacherId) {
            toast.error("Please select a tutor.")
            return
        }

        isSubmittingRef.current = true
        setIsLoading(true)
        
        const firstDayTime = patternDays.length > 0 ? (dayTimings[patternDays[0]] || scheduledTime) : scheduledTime;
        const payload = {
            title: subject.trim(),
            meeting_link: meetingLink,
            pattern_days: patternDays,
            time_of_day: firstDayTime,
            duration_hours: durationPattern,
            start_date: startDate,
            end_date: endDate,
            student_id: selectedStudentId,
            teacher_id: selectedTeacherId || undefined,
            parent_note: notes.trim() || undefined,
            day_timings: dayTimings,
            clientOffsetMinutes: new Date().getTimezoneOffset()
        }

        try {
            if (view === 'create') {
                const result = await createClassSchedule(payload)
                if (result.error) throw new Error(result.error)
                toast.success("Recurring schedule configured successfully!")
            } else if (view === 'edit' && editingScheduleId) {
                const result = await updateClassSchedule(editingScheduleId, payload)
                if (result.error) throw new Error(result.error)
                toast.success("Recurring schedule updated. Future classes regenerated.")
            }
            
            await loadInitialData()
            if (isAdminOrOps) await loadSchedulesFiltered()
            resetForm(true)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Scheduling failure")
        } finally {
            setIsLoading(false)
            isSubmittingRef.current = false
        }
    }

    const performCancel = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this recurring schedule? All future generated classes will be deleted.")) return
        
        if (isSubmittingRef.current) return
        isSubmittingRef.current = true
        setIsLoading(true)
        try {
            const result = await cancelClassSchedule(id)
            if (result.error) throw new Error(result.error)
            toast.success("Schedule cancelled.")
            await loadInitialData()
            if (isAdminOrOps) await loadSchedulesFiltered()
            if (initialSchedule) {
                setIsOpen(false)
            }
            router.refresh()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsLoading(false)
            isSubmittingRef.current = false
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button 
                        className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                    >
                        <Plus size={14} />
                        <span>Schedule Month's Classes</span>
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="w-full max-w-2xl bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-border/40 overflow-hidden">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <DialogHeader className="mb-6 text-left">
                    <DialogTitle className="text-3xl font-serif font-bold italic tracking-tight text-foreground flex items-center gap-3">
                        <Sparkles className="text-indigo-500" size={24} />
                        Master Scheduler
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground italic text-sm mt-1">
                        {view === 'list' && "Overview of active recurring student engagements."}
                        {view === 'create' && "Define a new automated class cycle."}
                        {view === 'edit' && "Modify pattern timings and dates."}
                    </DialogDescription>
                </DialogHeader>

                <div className="text-left overflow-y-auto max-h-[70vh] pr-2 space-y-6">
                    {view === 'list' && (
                        <div className="space-y-6">
                            {/* Filter by Tutor (Admin/Ops only) */}
                            {isAdminOrOps && (
                                <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border/20">
                                    <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                        <UserCheck size={12} className="text-indigo-500" /> Filter by Tutor
                                    </Label>
                                    <Select onValueChange={setFilterTeacherId} value={filterTeacherId}>
                                        <SelectTrigger className="h-10 rounded-xl bg-background border-2 border-muted/30 text-xs font-bold">
                                            <SelectValue placeholder="All Tutors" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border border-border/40">
                                            <SelectItem value="all">All Tutors</SelectItem>
                                            {teachers.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>{t.full_name || t.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                                {schedules.length === 0 && !isLoading && (
                                    <div className="text-center py-10 bg-muted/20 rounded-3xl border border-dashed border-border/50 text-muted-foreground italic text-sm">
                                        No active recurring schedules found.
                                    </div>
                                )}
                                {schedules.map(schedule => (
                                    <div key={schedule.id} className="p-5 rounded-3xl border-2 border-border/30 bg-card hover:border-indigo-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-md">{schedule.student?.full_name || "Unknown Student"}</span>
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 uppercase tracking-widest text-[8px] font-black border-none">Active</Badge>
                                            </div>
                                            <p className="text-xs font-bold text-indigo-600/90 mb-1">{schedule.title}</p>
                                            {isAdminOrOps && schedule.teacher && (
                                                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Tutor: {schedule.teacher.full_name}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                                                <span className="flex items-center gap-1"><Clock size={12} className="text-indigo-400" /> {formatTime12Hour(schedule.time_of_day)} ({schedule.duration_hours}h)</span>
                                                <span className="text-indigo-300">•</span>
                                                <span>Until {format(parseISO(schedule.end_date), 'MMM d, yy')}</span>
                                                <span className="text-indigo-300">•</span>
                                                <span>{schedule.pattern_days.map((d: number) => DAYS.find(x => x.value === d)?.label).join(', ')}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs shrink-0">
                                            <Button size="sm" variant="outline" onClick={() => startEditing(schedule)} className="rounded-xl font-bold uppercase tracking-widest h-8 text-[10px] text-indigo-600">
                                                <Edit3 size={12} className="mr-1"/> Edit
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => performCancel(schedule.id)} className="rounded-xl font-bold uppercase tracking-widest h-8 text-[10px] text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                                                <X size={12} className="mr-1"/> Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <Button 
                                onClick={() => { resetForm(); setView('create'); }}
                                className="w-full h-14 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black uppercase tracking-widest border-2 border-indigo-200/50 border-dashed text-xs"
                            >
                                <Plus size={16} className="mr-2" />
                                Configure New Schedule
                            </Button>
                        </div>
                    )}

                    {(view === 'create' || view === 'edit') && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Tutor Selection dropdown (Admin/Ops only) */}
                            {isAdminOrOps && (
                                <div className="space-y-2">
                                    <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                        <UserCheck size={12} className="text-indigo-500" /> Target Tutor *
                                    </Label>
                                    <Select onValueChange={setSelectedTeacherId} value={selectedTeacherId} disabled={view === 'edit'}>
                                        <SelectTrigger className="h-12 rounded-2xl border-2 border-muted/30 bg-background text-sm font-bold">
                                            <SelectValue placeholder="Choose a teacher..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-2 border-border/40">
                                            {teachers.map((t) => (
                                                <SelectItem key={t.id} value={t.id} className="rounded-xl mt-1">{t.full_name || t.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Student Selection */}
                            <div className="space-y-2">
                                <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                    <Users size={12} className="text-indigo-500" /> Target Student *
                                </Label>
                                <Select onValueChange={handleStudentChange} value={selectedStudentId} disabled={view === 'edit'}>
                                    <SelectTrigger className="h-12 rounded-2xl border-2 border-muted/30 bg-background text-sm font-bold">
                                        <SelectValue placeholder="Choose a student..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-2 border-border/40">
                                        {assignedStudents.map((s) => {
                                            const { studentId } = parseStudentIdAndMobile(s.custom_student_id);
                                            const displayId = studentId ? ` [ID: ${studentId}]` : "";
                                            return (
                                                <SelectItem key={s.id} value={s.id} className="rounded-xl mt-1">
                                                    {s.full_name}{displayId}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Subject Field */}
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                    <BookOpen size={12} className="text-indigo-500" /> Subject *
                                </Label>
                                <Input 
                                    id="subject"
                                    placeholder="e.g. Mathematics, Science, English" 
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    required 
                                    className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-sm font-bold" 
                                />
                            </div>

                            {/* Weekly Pattern Selection */}
                            <div className="space-y-3 bg-muted/20 p-5 rounded-3xl border border-border/30">
                                <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                    <Calendar size={12} className="text-indigo-500" /> Recurring Pattern (Days of Week)
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS.map(day => {
                                        const isSelected = patternDays.includes(day.value)
                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className={`h-9 px-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all border-2 ${
                                                    isSelected 
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' 
                                                    : 'bg-white border-muted/30 text-muted-foreground hover:border-indigo-300'
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Start and Terminate Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dateStart" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                        <Calendar size={12} className="text-emerald-500" /> Start Date *
                                    </Label>
                                    <Input id="dateStart" type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} disabled={view === 'edit'} className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dateEnd" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                        <Calendar size={12} className="text-rose-500" /> Terminate Date *
                                    </Label>
                                    <Input id="dateEnd" type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-xs" />
                                </div>
                            </div>
                            
                            {/* Time and Duration */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="time" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                        <Clock size={12} className="text-indigo-500" /> Default Time of Day *
                                    </Label>
                                    <Input 
                                        id="time" 
                                        type="time" 
                                        value={scheduledTime}
                                        onChange={(e) => {
                                            const newTime = e.target.value;
                                            setScheduledTime(newTime);
                                            // Update daily timings if they match or are uninitialized
                                            setDayTimings(prev => {
                                                const updated = { ...prev };
                                                patternDays.forEach(d => {
                                                    if (!updated[d] || updated[d] === scheduledTime) {
                                                        updated[d] = newTime;
                                                    }
                                                });
                                                return updated;
                                            });
                                        }}
                                        required 
                                        className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                        <Clock size={12} className="text-indigo-500" /> Duration (Hrs)
                                    </Label>
                                    <Input type="number" step="0.5" min="0.5" required value={durationPattern} onChange={e => setDurationPattern(Number(e.target.value))} className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all font-bold" />
                                </div>
                            </div>

                            {/* Daily Timings Customization */}
                            {patternDays.length > 0 && (
                                <div className="space-y-3 bg-muted/20 p-5 rounded-3xl border border-border/30">
                                    <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                        <Clock size={12} className="text-indigo-500" /> Customize Time per Day
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {patternDays.map((dayValue) => {
                                            const dayLabel = DAYS.find(x => x.value === dayValue)?.label || "";
                                            const val = dayTimings[dayValue] || scheduledTime || "16:00";
                                            return (
                                                <div key={dayValue} className="flex items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/20">
                                                    <span className="font-bold text-xs">{dayLabel}:</span>
                                                    <Input
                                                        type="time"
                                                        required
                                                        value={val}
                                                        onChange={(e) => {
                                                            setDayTimings(prev => ({
                                                                ...prev,
                                                                [dayValue]: e.target.value
                                                            }));
                                                        }}
                                                        className="h-9 rounded-lg border-muted/50 text-xs w-28 bg-background"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Meeting Link */}
                            <div className="space-y-2">
                                <Label htmlFor="meeting_link" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                    <Video size={12} className="text-indigo-500" /> Default Meeting Link *
                                </Label>
                                <Input 
                                    id="meeting_link" 
                                    placeholder="https://zoom.us/j/..." 
                                    value={meetingLink}
                                    onChange={(e) => setMeetingLink(e.target.value)}
                                    required 
                                    className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-sm" 
                                />
                            </div>

                            {/* Default Feedback Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                    <Sparkles size={12} className="text-indigo-500" /> Default Class Notes / Feedback
                                </Label>
                                <Textarea 
                                    id="notes" 
                                    placeholder="Optional default notes or topics for the generated classes..." 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-sm" 
                                />
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t border-border/20">
                                <Button 
                                    type="button" 
                                    variant="ghost"
                                    onClick={() => resetForm(true)}
                                    className="h-14 rounded-[1.2rem] font-bold text-xs text-muted-foreground hover:bg-muted"
                                >
                                    {initialSchedule ? "Cancel" : "Back to List"}
                                </Button>
                                {initialSchedule && (
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => performCancel(editingScheduleId!)}
                                        className="h-14 rounded-[1.2rem] font-bold text-xs text-rose-500 hover:bg-rose-50 border-rose-200"
                                    >
                                        Cancel Schedule
                                    </Button>
                                )}
                                <Button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="flex-1 h-14 rounded-[1.2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 text-xs transition-all hover:scale-[1.02]"
                                >
                                    {isLoading ? "Saving Pipeline..." : (view === 'create' ? "Generate Schedule" : "Update Future Classes")}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
