'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, X, Star, AlertCircle, Sparkles } from "lucide-react"
import { finalizeClassSession } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"

interface PostClassLogModalProps {
    classId: string
    studentId: string
    studentName: string
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function PostClassLogModal({ classId, studentId, studentName, onSuccess, trigger }: PostClassLogModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [attendance, setAttendance] = useState<'present' | 'absent'>('present')
    const [topicTaught, setTopicTaught] = useState("")
    const [homeworkGiven, setHomeworkGiven] = useState("")
    const [performance, setPerformance] = useState<'Good' | 'Average' | 'Needs Improvement'>('Good')
    const [parentNote, setParentNote] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (attendance === 'present' && !topicTaught.trim()) {
            toast.error("Please enter the topic taught for attended classes.")
            return
        }

        setIsSubmitting(true)
        try {
            const studentAttendances = [{ studentId, status: attendance === 'present' ? 'present' as const : 'absent' as const }]
            const result = await finalizeClassSession(
                classId,
                studentAttendances,
                attendance === 'present' ? topicTaught : "Student No Show",
                attendance === 'present' ? homeworkGiven : "N/A",
                attendance === 'present' ? performance : "Needs Improvement",
                parentNote
            )

            if (result.success) {
                toast.success("Class session report submitted successfully!")
                setIsOpen(false)
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error || "Failed to submit class report")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to submit class report")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/10 hover:scale-105 transition-all">
                        Log Class
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <DialogHeader className="mb-6 relative z-10">
                    <DialogTitle className="text-2xl font-serif font-bold italic text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                        <Sparkles size={20} className="text-indigo-500 animate-pulse" />
                        <span>Log Session: {studentName}</span>
                    </DialogTitle>
                    <DialogDescription className="italic text-muted-foreground">
                        Submit student performance and syllabus details for payroll validation.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    {/* Attendance Radio Button Grid */}
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Student Attendance</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setAttendance('present')}
                                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                                    attendance === 'present'
                                        ? 'border-emerald-500 bg-emerald-50/30 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                        : 'border-muted/30 hover:border-muted'
                                }`}
                            >
                                <Check size={18} className={attendance === 'present' ? 'opacity-100' : 'opacity-40'} />
                                <span>Present</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setAttendance('absent')}
                                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                                    attendance === 'absent'
                                        ? 'border-rose-500 bg-rose-50/30 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                        : 'border-muted/30 hover:border-muted'
                                }`}
                            >
                                <X size={18} className={attendance === 'absent' ? 'opacity-100' : 'opacity-40'} />
                                <span>Student No Show</span>
                            </button>
                        </div>
                    </div>

                    {attendance === 'present' && (
                        <>
                            {/* Topic Taught Input */}
                            <div className="space-y-2">
                                <Label htmlFor="topic" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Topic Taught *</Label>
                                <Input
                                    id="topic"
                                    placeholder="e.g. Hindi Vowels, Linear Equations, Photosynthesis"
                                    value={topicTaught}
                                    onChange={(e) => setTopicTaught(e.target.value)}
                                    className="h-12 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                                    required
                                />
                            </div>

                            {/* Homework Given Input */}
                            <div className="space-y-2">
                                <Label htmlFor="homework" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Homework Assigned</Label>
                                <Input
                                    id="homework"
                                    placeholder="Describe homework (e.g. Solve worksheet 3, read pg 12-15)"
                                    value={homeworkGiven}
                                    onChange={(e) => setHomeworkGiven(e.target.value)}
                                    className="h-12 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                                />
                            </div>

                            {/* Performance Rating */}
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Student Performance</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['Good', 'Average', 'Needs Improvement'] as const).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setPerformance(level)}
                                            className={`p-3 text-xs rounded-xl font-black uppercase tracking-wider border-2 transition-all ${
                                                performance === level
                                                    ? level === 'Good'
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                        : level === 'Average'
                                                        ? 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                                        : 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                    : 'border-muted/30 hover:border-muted text-muted-foreground'
                                            }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Parent Remarks */}
                    <div className="space-y-2">
                        <Label htmlFor="parentNote" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Parent Remark / Note</Label>
                        <Textarea
                            id="parentNote"
                            placeholder="Add any feedback, observations or requests for the parents..."
                            value={parentNote}
                            onChange={(e) => setParentNote(e.target.value)}
                            rows={3}
                            className="rounded-2xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            className="h-12 px-6 rounded-xl font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 flex items-center gap-2"
                        >
                            {isSubmitting ? "Submitting..." : "Submit Session Log"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
