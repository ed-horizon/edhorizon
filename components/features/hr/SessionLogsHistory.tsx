'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Calendar, User, Clock, Star, MessageSquare, Edit3, Sparkles, Check, X } from "lucide-react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { adminEditAttendance } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { cn, formatClassTitle } from "@/lib/utils"

interface CompletedClass {
    id: string
    title: string
    scheduled_at: string
    duration_hours: number
    topic_taught?: string
    homework_given?: string
    student_performance?: string
    parent_note?: string
    course: { title: string }
    teacher: { full_name: string; email: string }
    student: { id: string; full_name: string; email: string } | null
    student_attendance?: { status: 'present' | 'absent' | 'late'; student_id: string }[]
}

interface SessionLogsHistoryProps {
    completedClasses: CompletedClass[]
}

interface EditAttendanceDialogProps {
    classId: string
    studentId: string
    studentName: string
    currentStatus: 'present' | 'absent' | 'late'
}

function EditAttendanceDialog({ classId, studentId, studentName, currentStatus }: EditAttendanceDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [status, setStatus] = useState<'present' | 'absent' | 'late'>(currentStatus)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSave = async () => {
        setIsSubmitting(true)
        try {
            const res = await adminEditAttendance(classId, studentId, status)
            if (res.success) {
                toast.success("Attendance updated successfully!")
                setIsOpen(false)
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to update attendance")
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-indigo-600 transition-colors ml-1 border border-transparent hover:border-muted-foreground/15">
                    <Edit3 size={12} />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <DialogHeader className="mb-6 relative z-10 text-left">
                    <DialogTitle className="text-xl font-serif font-bold italic text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                        <Sparkles size={18} className="text-indigo-500" />
                        <span>Edit Attendance</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground italic mt-1.5">
                        Override student attendance logs for {studentName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 relative z-10 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setStatus('present')}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all font-bold text-xs",
                                status === 'present'
                                    ? "border-emerald-500 bg-emerald-50/30 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                                    : "border-muted/30 hover:border-muted text-muted-foreground"
                            )}
                        >
                            <Check size={14} />
                            <span>Present</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('absent')}
                            className={cn(
                                "flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all font-bold text-xs",
                                status === 'absent'
                                    ? "border-rose-500 bg-rose-50/30 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
                                    : "border-muted/30 hover:border-muted text-muted-foreground"
                            )}
                        >
                            <X size={14} />
                            <span>Student No Show</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            className="h-10 px-4 rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/20"
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

interface ViewLogDetailsDialogProps {
    classItem: CompletedClass
}

function ViewLogDetailsDialog({ classItem }: ViewLogDetailsDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const status = classItem.student_attendance?.[0]?.status || 'present'

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 rounded-xl text-[10px] font-black uppercase tracking-wider px-3.5 border-indigo-600/35 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400/30 dark:hover:bg-indigo-950/20"
                >
                    Details
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl text-left">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <DialogHeader className="mb-6 relative z-10">
                    <DialogTitle className="text-xl font-serif font-bold italic text-indigo-950 dark:text-indigo-50 flex items-center gap-2">
                        <Sparkles size={18} className="text-indigo-500" />
                        <span>Class Session Details</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground italic mt-1.5">
                        Detailed log of completed instruction and attendance state.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 relative z-10 max-h-[60vh] overflow-y-auto pr-2">
                    {/* Metadata Section */}
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/10">
                        <div>
                            <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Course</span>
                            <span className="font-bold text-sm text-foreground">{classItem.course?.title}</span>
                        </div>
                        <div>
                            <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Attendance Status</span>
                            <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 mt-1 block w-fit",
                                status === 'present'
                                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20"
                                    : status === 'absent'
                                    ? "bg-rose-500/10 text-rose-600 dark:bg-rose-950/20"
                                    : "bg-amber-500/10 text-amber-600 dark:bg-amber-950/20"
                            )}>
                                {status === 'absent' ? 'Student No Show' : status}
                            </Badge>
                        </div>
                        <div className="col-span-2 border-t border-border/10 pt-3 flex justify-between">
                            <div>
                                <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Scheduled Date</span>
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                    <Calendar size={12} className="text-indigo-500" />
                                    {format(new Date(classItem.scheduled_at), 'PPP')}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Time & Duration</span>
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                                    <Clock size={12} className="text-indigo-500" />
                                    {format(new Date(classItem.scheduled_at), 'hh:mm a')} ({classItem.duration_hours}h)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Personnel Section */}
                    <div className="space-y-3.5">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border/10 pb-1.5">Personnel</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted/10 rounded-xl border border-border/10">
                                <span className="block text-[8px] uppercase font-black text-muted-foreground/60 tracking-wider flex items-center gap-1"><User size={10}/> Tutor</span>
                                <p className="font-bold text-xs text-foreground mt-0.5">{classItem.teacher.full_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{classItem.teacher.email}</p>
                            </div>
                            <div className="p-3 bg-muted/10 rounded-xl border border-border/10">
                                <span className="block text-[8px] uppercase font-black text-muted-foreground/60 tracking-wider flex items-center gap-1"><User size={10}/> Student</span>
                                {classItem.student ? (
                                    <>
                                        <p className="font-bold text-xs text-foreground mt-0.5">{classItem.student.full_name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{classItem.student.email}</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic mt-0.5">Unassigned</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Instruction Log Notes */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border/10 pb-1.5">Instruction Logs</h4>
                        
                        <div className="space-y-3">
                            <div>
                                <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Topic Taught</span>
                                <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl border border-indigo-500/10 text-xs font-semibold text-foreground mt-1 min-h-[40px]">
                                    {classItem.topic_taught || <span className="text-muted-foreground/40 italic font-normal">No topic logged</span>}
                                </div>
                            </div>

                            <div>
                                <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Homework Assignment</span>
                                <div className="p-3 bg-muted/20 rounded-xl border border-border/10 text-xs text-foreground mt-1 min-h-[40px] italic">
                                    {classItem.homework_given || <span className="text-muted-foreground/40 italic">No homework assigned</span>}
                                </div>
                            </div>

                            {classItem.parent_note && (
                                <div>
                                    <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Parent Notes</span>
                                    <div className="p-3 bg-muted/20 rounded-xl border border-border/10 text-xs text-foreground mt-1 min-h-[40px]">
                                        {classItem.parent_note}
                                    </div>
                                </div>
                            )}

                            <div>
                                <span className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">Performance Rating</span>
                                <div className="mt-1">
                                    <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5",
                                        classItem.student_performance === 'Good'
                                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20"
                                            : classItem.student_performance === 'Average'
                                            ? "bg-amber-500/10 text-amber-600 dark:bg-amber-950/20"
                                            : "bg-rose-500/10 text-rose-600 dark:bg-rose-950/20"
                                    )}>
                                        {classItem.student_performance || 'Good'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function SessionLogsHistory({ completedClasses }: SessionLogsHistoryProps) {
    const [selectedTeacherEmail, setSelectedTeacherEmail] = useState<string>("")
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    // Get unique list of teachers for dropdown filter
    const uniqueTeachers = Array.from(new Set(completedClasses.map(c => c.teacher.email)))
        .map(email => completedClasses.find(c => c.teacher.email === email)?.teacher)
        .filter((t): t is NonNullable<typeof t> => !!t);

    const handleSearchChange = (val: string) => {
        setSearchQuery(val)
        setCurrentPage(1)
    }

    const handleTeacherChange = (val: string) => {
        setSelectedTeacherEmail(val)
        setCurrentPage(1)
    }

    const handleStartDateChange = (val: string) => {
        setStartDate(val)
        setCurrentPage(1)
    }

    const handleEndDateChange = (val: string) => {
        setEndDate(val)
        setCurrentPage(1)
    }

    // Filter based on query, teacher selection, and date range
    const filteredClasses = completedClasses.filter(c => {
        const query = searchQuery.toLowerCase().trim()
        const teacherName = c.teacher.full_name?.toLowerCase() || ""
        const studentName = c.student?.full_name?.toLowerCase() || ""
        const topic = c.topic_taught?.toLowerCase() || ""
        const courseTitle = c.course?.title?.toLowerCase() || ""
        const classTitle = c.title?.toLowerCase() || ""

        const matchesQuery = !query || 
            teacherName.includes(query) || 
            studentName.includes(query) || 
            topic.includes(query) || 
            courseTitle.includes(query) ||
            classTitle.includes(query)

        const matchesTeacher = !selectedTeacherEmail || c.teacher.email === selectedTeacherEmail

        let matchesDate = true
        if (startDate || endDate) {
            const classTime = new Date(c.scheduled_at).getTime()
            if (startDate) {
                const start = new Date(startDate + "T00:00:00").getTime()
                if (classTime < start) matchesDate = false
            }
            if (endDate) {
                const end = new Date(endDate + "T23:59:59").getTime()
                if (classTime > end) matchesDate = false
            }
        }

        return matchesQuery && matchesTeacher && matchesDate
    })

    // Paginate results
    const totalPages = Math.ceil(filteredClasses.length / itemsPerPage)
    const adjustedPage = Math.min(currentPage, totalPages || 1)
    const startIndex = (adjustedPage - 1) * itemsPerPage
    const paginatedClasses = filteredClasses.slice(startIndex, startIndex + itemsPerPage)

    return (
        <Card className="rounded-[3rem] bg-card border-none shadow-2xl p-8">
            <CardHeader className="p-0 pb-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-2xl font-serif font-bold italic text-indigo-950 dark:text-indigo-50">Session Logs History</CardTitle>
                        <CardDescription className="italic">Review completed class instruction logs with advanced filtering and minimal scroll pagination.</CardDescription>
                    </div>
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-muted/10 border border-border/10">
                    {/* Text search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search student, topic..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9 h-10 rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-xs"
                        />
                    </div>

                    {/* Teacher select */}
                    <div>
                        <select
                            value={selectedTeacherEmail}
                            onChange={(e) => handleTeacherChange(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-xs bg-background text-foreground"
                        >
                            <option value="">All Tutors</option>
                            {uniqueTeachers.map(t => (
                                <option key={t.email} value={t.email}>{t.full_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date */}
                    <div className="relative">
                        <Calendar size={12} className="absolute left-3.5 top-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            className="pl-9 h-10 rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-xs text-foreground"
                            placeholder="Start Date"
                        />
                    </div>

                    {/* End Date */}
                    <div className="relative">
                        <Calendar size={12} className="absolute left-3.5 top-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => handleEndDateChange(e.target.value)}
                            className="pl-9 h-10 rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-xs text-foreground"
                            placeholder="End Date"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {filteredClasses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground italic bg-muted/10 rounded-2xl">
                        No completed class logs match your filters.
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="overflow-x-auto rounded-2xl border border-border/30">
                            <Table>
                                <TableHeader className="bg-indigo-50/20 dark:bg-indigo-950/10">
                                    <TableRow className="border-b border-border/30">
                                        <TableHead className="font-black uppercase tracking-widest text-[9px] h-11">Class / Subject</TableHead>
                                        <TableHead className="font-black uppercase tracking-widest text-[9px] h-11">Tutor</TableHead>
                                        <TableHead className="font-black uppercase tracking-widest text-[9px] h-11">Student</TableHead>
                                        <TableHead className="font-black uppercase tracking-widest text-[9px] h-11">Date / Time</TableHead>
                                        <TableHead className="font-black uppercase tracking-widest text-[9px] h-11 text-center">Attendance</TableHead>
                                        <TableHead className="font-black uppercase tracking-widest text-[9px] h-11 text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedClasses.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/5 border-b border-border/20 group">
                                            <TableCell className="py-4 font-bold text-indigo-900 dark:text-indigo-200">
                                                {item.course?.title}
                                                {(() => {
                                                    const { title: displayTitle, isCompensation } = formatClassTitle(item.title);
                                                    return (
                                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                            <span className="block text-[10px] text-muted-foreground font-normal italic">{displayTitle}</span>
                                                            {isCompensation && (
                                                                <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                    Comp
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground text-xs">{item.teacher.full_name || 'Teacher'}</span>
                                                    <span className="text-[9px] text-muted-foreground italic">{item.teacher.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                {item.student ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-foreground text-xs">{item.student.full_name}</span>
                                                        <span className="text-[9px] text-muted-foreground italic">{item.student.email}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/60 italic text-xs">Unassigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col text-[10px] text-muted-foreground font-semibold">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={10} className="text-indigo-500" />
                                                        {format(new Date(item.scheduled_at), 'MMM dd, yyyy')}
                                                    </span>
                                                    <span className="flex items-center gap-1 mt-0.5 font-normal">
                                                        <Clock size={10} className="text-indigo-500" />
                                                        {format(new Date(item.scheduled_at), 'hh:mm a')} ({item.duration_hours}h)
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Badge className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5",
                                                        (item.student_attendance?.[0]?.status === 'present')
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20"
                                                            : (item.student_attendance?.[0]?.status === 'absent')
                                                            ? "bg-rose-500/10 text-rose-600 dark:bg-rose-950/20"
                                                            : "bg-amber-500/10 text-amber-600 dark:bg-amber-950/20"
                                                    )}>
                                                        {item.student_attendance?.[0]?.status === 'absent' ? 'Student No Show' : (item.student_attendance?.[0]?.status || 'present')}
                                                    </Badge>
                                                    {item.student && (
                                                        <EditAttendanceDialog 
                                                            classId={item.id}
                                                            studentId={item.student.id}
                                                            studentName={item.student.full_name}
                                                            currentStatus={item.student_attendance?.[0]?.status || 'present'}
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 text-center">
                                                <ViewLogDetailsDialog classItem={item} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 mt-2">
                                <p className="text-xs text-muted-foreground italic">
                                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClasses.length)} of {filteredClasses.length} completed logs
                                </p>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={adjustedPage === 1}
                                        className="h-9 rounded-xl px-4 text-xs font-bold border-border/50 text-foreground"
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-xs font-bold text-muted-foreground">
                                        Page {adjustedPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={adjustedPage === totalPages}
                                        className="h-9 rounded-xl px-4 text-xs font-bold border-border/50 text-foreground"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
