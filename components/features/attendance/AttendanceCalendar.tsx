
'use client'

import { useState, useEffect } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addDays, 
    eachDayOfInterval 
} from "date-fns"
import { 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    AlertCircle,
    Calendar as CalendarIcon,
    Edit3,
    UserCheck,
    History
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateTeacherAttendance } from "@/app/(dashboard)/attendance/actions"

interface AttendanceRecord {
    id: string
    date: string
    status: 'present' | 'absent' | 'on_leave'
    verification_status: 'pending' | 'verified' | 'rejected'
}

interface AttendanceCalendarProps {
    records: AttendanceRecord[]
    teacherId: string
    teacherName?: string
    canEdit?: boolean // True for HR/Admin
}

export function AttendanceCalendar({ records: initialRecords, teacherId, teacherName, canEdit = false }: AttendanceCalendarProps) {
    const [records, setRecords] = useState(initialRecords)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        setRecords(initialRecords)
    }, [initialRecords])

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const getDayRecord = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        return records.find(r => r.date === dateStr)
    }

    const handleUpdateStatus = async (day: Date, status: 'present' | 'absent' | 'on_leave') => {
        if (!canEdit) return
        setIsUpdating(true)
        const dateStr = format(day, 'yyyy-MM-dd')
        try {
            await updateTeacherAttendance(teacherId, dateStr, status, 'verified')
            toast.success(`Attendance updated for ${format(day, 'PP')}`)
            
            // Optimistic update
            const newRecords = [...records.filter(r => r.date !== dateStr), {
                id: Math.random().toString(), // Temp ID
                date: dateStr,
                status,
                verification_status: 'verified' as const
            }]
            setRecords(newRecords)
            setSelectedDay(null)
        } catch (error) {
            toast.error("Failed to update attendance")
        } finally {
            setIsUpdating(false)
        }
    }

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-8">
            <div>
                <DialogTitle className="text-2xl font-serif font-bold italic text-foreground tracking-tight">
                    {teacherName ? `${teacherName}'s History` : "Attendance History"}
                </DialogTitle>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-1">
                    {canEdit ? "Click a date to override records" : "Personal performance log"}
                </p>
            </div>
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-2xl border border-border/40">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-xl">
                    <ChevronLeft size={16} />
                </Button>
                <span className="px-4 text-[10px] font-black uppercase tracking-widest text-foreground min-w-[120px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-xl">
                    <ChevronRight size={16} />
                </Button>
            </div>
        </div>
    )

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        return (
            <div className="grid grid-cols-7 mb-4">
                {days.map(day => (
                    <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                        {day}
                    </div>
                ))}
            </div>
        )
    }

    const renderCells = () => {
        return (
            <div className="grid grid-cols-7 gap-3">
                {calendarDays.map((day, i) => {
                    const record = getDayRecord(day)
                    const isToday = isSameDay(day, new Date())
                    const isNotCurrentMonth = !isSameMonth(day, monthStart)
                    
                    let dayStyles = "h-16 md:h-20 rounded-3xl flex flex-col items-center justify-center relative transition-all group border-2 border-transparent cursor-pointer"
                    let textStyles = "text-sm font-black relative z-10"

                    if (isNotCurrentMonth) {
                        textStyles += " text-muted-foreground/10"
                        dayStyles += " opacity-20 pointer-events-none"
                    } else {
                        textStyles += " text-foreground"
                    }

                    if (record) {
                        if (record.status === 'present') {
                            if (record.verification_status === 'verified') {
                                dayStyles += " bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20"
                            } else {
                                dayStyles += " bg-amber-500/10 border-amber-500/20 text-amber-700 hover:bg-amber-500/20"
                            }
                        } else {
                            dayStyles += " bg-rose-500/10 border-rose-500/20 text-rose-700 hover:bg-rose-500/20"
                        }
                    } else if (isToday) {
                        dayStyles += " bg-indigo-500/5 border-indigo-500/40 hover:bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                    } else {
                        dayStyles += " bg-muted/30 hover:bg-muted/50"
                    }

                    return (
                        <div 
                            key={i} 
                            className={dayStyles}
                            onClick={() => canEdit && setSelectedDay(day)}
                        >
                            <span className={textStyles}>{format(day, 'd')}</span>
                            {record && (
                                <div className="absolute top-2 right-2">
                                    {record.verification_status === 'verified' ? (
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                    ) : (
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    )}
                                </div>
                            )}
                            {canEdit && !isNotCurrentMonth && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/20 backdrop-blur-[2px] rounded-3xl">
                                    <Edit3 size={14} className="text-indigo-600" />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderAdminEditor = () => {
        if (!selectedDay) return null
        const record = getDayRecord(selectedDay)

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <Card className="max-w-md w-full rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-bold">Update Attendance</CardTitle>
                        <p className="text-sm text-muted-foreground">{format(selectedDay, 'PPPP')}</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <Button 
                                onClick={() => handleUpdateStatus(selectedDay, 'present')}
                                disabled={isUpdating}
                                className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-bold uppercase tracking-widest text-xs gap-3"
                            >
                                <CheckCircle2 size={18} />
                                Mark as Present & Verified
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={() => handleUpdateStatus(selectedDay, 'absent')}
                                disabled={isUpdating}
                                className="h-14 rounded-2xl border-2 border-rose-500/20 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold uppercase tracking-widest text-xs gap-3"
                            >
                                <XCircle size={18} />
                                Mark as Absent
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={() => handleUpdateStatus(selectedDay, 'on_leave')}
                                disabled={isUpdating}
                                className="h-14 rounded-2xl border-2 border-indigo-500/20 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold uppercase tracking-widest text-xs gap-3"
                            >
                                <AlertCircle size={18} />
                                Mark as On Leave
                            </Button>
                            <Button 
                                variant="ghost" 
                                onClick={() => setSelectedDay(null)}
                                className="h-12 rounded-2xl font-bold uppercase tracking-widest text-[10px] text-muted-foreground"
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-xl px-4 h-10 border-2 border-indigo-500/20 text-indigo-700 hover:bg-indigo-50 font-bold uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-105"
                    >
                        <History size={14} />
                        View History & Calendar
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl rounded-[3rem] p-0 border-none bg-background shadow-2xl overflow-hidden">
                    <div className="p-8 md:p-12">
                        {renderHeader()}
                        {renderDays()}
                        {renderCells()}
                        
                        <div className="mt-10 flex flex-wrap items-center gap-8 border-t border-border/40 pt-8">
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Present</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Review</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Absent/Leave</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {renderAdminEditor()}
        </>
    )
}
