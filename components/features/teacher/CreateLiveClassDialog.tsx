'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Video, Calendar, Plus, Clock, BookOpen, Users, Sparkles, UserCheck } from "lucide-react"
import { createLiveClass, getAssignedStudents, getAllTeachers, getAllStudentsAdmin, getCurrentProfile } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CreateLiveClassDialog({
    preselectedStudentId,
    preselectedTeacherId,
    triggerButton
}: {
    preselectedStudentId?: string;
    preselectedTeacherId?: string;
    triggerButton?: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    
    // User Profile & Roles
    const [profile, setProfile] = useState<any>(null)
    const [isAdminOrOps, setIsAdminOrOps] = useState(false)

    // Lists
    const [teachers, setTeachers] = useState<any[]>([])
    const [students, setStudents] = useState<any[]>([])
    
    // Form selections
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>(preselectedTeacherId || "")
    const [selectedStudentId, setSelectedStudentId] = useState<string>(preselectedStudentId || "")
    const [subject, setSubject] = useState("")
    const [meetingLink, setMeetingLink] = useState("")
    const [scheduledDate, setScheduledDate] = useState("")
    const [scheduledTime, setScheduledTime] = useState("")
    const [durationHours, setDurationHours] = useState("1.0")
    const [notes, setNotes] = useState("")
    const [isCompensation, setIsCompensation] = useState(true)

    const router = useRouter()

    useEffect(() => {
        if (isOpen) {
            loadInitialData()
        }
    }, [isOpen])

    const loadInitialData = async () => {
        setIsLoading(true)
        try {
            const currentProf = await getCurrentProfile()
            setProfile(currentProf)
            
            const role = currentProf?.role || 'student'
            const adminRoles = ['admin', 'super_admin', 'hr', 'operations']
            const isStaff = adminRoles.includes(role)
            setIsAdminOrOps(isStaff)

            let teachersData: any[] = []
            let studentsData: any[] = []

            if (isStaff) {
                const [tData, sData] = await Promise.all([
                    getAllTeachers(),
                    getAllStudentsAdmin()
                ])
                teachersData = tData
                studentsData = sData
                setTeachers(teachersData)
                setStudents(studentsData)
            } else {
                studentsData = await getAssignedStudents()
                setStudents(studentsData)
                if (currentProf?.id) {
                    setSelectedTeacherId(currentProf.id)
                }
            }

            // Pre-selections
            if (preselectedStudentId) {
                setSelectedStudentId(preselectedStudentId)
                const student = studentsData.find(s => s.id === preselectedStudentId)
                if (student) {
                    if (student.preferred_meeting_link) setMeetingLink(student.preferred_meeting_link)
                    if (student.preferred_time) setScheduledTime(student.preferred_time)
                }
            }

            if (preselectedTeacherId) {
                setSelectedTeacherId(preselectedTeacherId)
            }
        } catch (error) {
            toast.error("Failed to load setup data")
        } finally {
            setIsLoading(false)
        }
    }

    const handleStudentChange = (studentId: string) => {
        setSelectedStudentId(studentId)
        const student = students.find(s => s.id === studentId)
        if (student) {
            if (student.preferred_meeting_link) setMeetingLink(student.preferred_meeting_link)
            if (student.preferred_time) setScheduledTime(student.preferred_time)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        
        if (!selectedStudentId || !subject.trim() || !scheduledDate || !scheduledTime) {
            toast.error("Please fill in all required fields.")
            return
        }

        if (isAdminOrOps && !selectedTeacherId) {
            toast.error("Please select a tutor.")
            return
        }

        setIsLoading(true)

        const localDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const payload = {
            title: isCompensation ? `${subject.trim()} [Compensation]` : subject.trim(),
            meeting_link: meetingLink,
            scheduled_at: localDateTime.toISOString(),
            student_id: selectedStudentId,
            duration_hours: Number(durationHours) || 1.0,
            teacher_id: selectedTeacherId || undefined,
            parent_note: notes.trim() || undefined,
            preferred_time: scheduledTime
        }

        try {
            const result = await createLiveClass(payload)
            if (result.error) {
                toast.error(`Scheduling failed: ${result.error}`)
            } else {
                toast.success("1:1 Session scheduled successfully!")
                setIsOpen(false)
                
                // Reset form states
                setSelectedStudentId("")
                setSubject("")
                setMeetingLink("")
                setScheduledDate("")
                setScheduledTime("")
                setDurationHours("1.0")
                setNotes("")
                setIsCompensation(true)
                if (isAdminOrOps) setSelectedTeacherId("")

                router.refresh()
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {triggerButton || (
                    <Button 
                        className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
                    >
                        <Plus size={14} />
                        <span>Compensation Class</span>
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] p-10 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <DialogHeader className="mb-6 relative z-10 text-left">
                    <DialogTitle className="text-3xl font-serif font-bold italic tracking-tight text-foreground flex items-center gap-3">
                        <Sparkles className="text-indigo-500" size={24} />
                        Compensation Class Session
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground italic text-sm mt-1">
                        Schedule a compensation class session for this student.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10 text-left overflow-y-auto max-h-[70vh] pr-2">
                    {/* Tutor Select - ONLY for Admin/Ops */}
                    {isAdminOrOps && (
                        <div className="space-y-2">
                            <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                <UserCheck size={12} className="text-indigo-500" /> Select Tutor *
                            </Label>
                            <Select onValueChange={setSelectedTeacherId} value={selectedTeacherId}>
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

                    {/* Student Select */}
                    <div className="space-y-2">
                        <Label className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                            <Users size={12} className="text-indigo-500" /> Select Student *
                        </Label>
                        <Select onValueChange={handleStudentChange} value={selectedStudentId}>
                            <SelectTrigger className="h-12 rounded-2xl border-2 border-muted/30 bg-background text-sm font-bold">
                                <SelectValue placeholder="Choose a student..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-2 border-border/40">
                                {students.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground italic">No students available.</div>
                                ) : (
                                    students.map((s) => (
                                        <SelectItem key={s.id} value={s.id} className="rounded-xl mt-1">{s.full_name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subject Input */}
                    <div className="space-y-2">
                        <Label htmlFor="subject" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                            <BookOpen size={12} className="text-indigo-500" /> Subject *
                        </Label>
                        <Input 
                            id="subject"
                            placeholder="e.g. Mathematics, English, Physics" 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required 
                            className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-sm font-bold" 
                        />
                    </div>

                    {/* Meeting Link */}
                    <div className="space-y-2">
                        <Label htmlFor="meeting_link" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                            <Video size={12} className="text-indigo-500" /> Meeting Link
                        </Label>
                        <Input 
                            id="meeting_link" 
                            name="meeting_link" 
                            placeholder="https://zoom.us/j/..." 
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            required 
                            className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-sm" 
                        />
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                <Calendar size={12} className="text-indigo-500" /> Date *
                            </Label>
                            <Input 
                                id="date" 
                                type="date" 
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                required 
                                className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-xs" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                                <Clock size={12} className="text-indigo-500" /> Time *
                            </Label>
                            <Input 
                                id="time" 
                                type="time" 
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                required 
                                className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-xs" 
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="duration" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                            <Clock size={12} className="text-indigo-500" /> Duration (Hours)
                        </Label>
                        <Input 
                            id="duration" 
                            type="number" 
                            step="0.5" 
                            value={durationHours}
                            onChange={(e) => setDurationHours(e.target.value)}
                            min="0.5" 
                            required 
                            className="h-12 rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all font-bold" 
                        />
                    </div>

                    {/* Feedback / Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="font-bold text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 text-foreground">
                            <Sparkles size={12} className="text-indigo-500" /> Feedback / Class Notes
                        </Label>
                        <Textarea 
                            id="notes" 
                            placeholder="Optional default notes or topics for the student..." 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="rounded-2xl border-2 border-muted/30 focus:border-indigo-600/30 transition-all text-sm" 
                        />
                    </div>

                    {/* Compensation Checkbox */}
                    <div className="flex items-center space-x-2.5 py-2">
                        <input 
                            type="checkbox" 
                            id="is_compensation" 
                            checked={isCompensation}
                            onChange={(e) => setIsCompensation(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                        />
                        <Label htmlFor="is_compensation" className="font-bold text-[10px] uppercase tracking-widest opacity-60 text-foreground cursor-pointer">
                            Mark as Compensation Class
                        </Label>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-14 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 text-sm mt-4 transition-all hover:scale-[1.02]"
                    >
                        {isLoading ? "Scheduling..." : "Create 1:1 Session"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
