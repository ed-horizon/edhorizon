'use client'

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Clock, Calendar, User, ShieldAlert, Sparkles, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { formatClassTitle } from "@/lib/utils"

interface PendingClassInfo {
    id: string;
    title: string;
    scheduled_at: string;
    duration_hours: number;
    course?: { title: string };
    teacher: { full_name: string; email: string };
    student: { full_name: string; email: string } | null;
    topic_taught?: string;
    homework_given?: string;
}

interface RejectClassDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classItem: PendingClassInfo | null;
    onConfirm: (classId: string, reason: string) => Promise<void>;
    isSubmitting?: boolean;
}

const PRESET_REASONS = [
    "Student absent / no show",
    "Duration did not meet class requirements",
    "Incomplete topic log / missing details",
    "Duplicate session entry",
    "Class not conducted / technical failure"
]

export function RejectClassDialog({
    open,
    onOpenChange,
    classItem,
    onConfirm,
    isSubmitting = false
}: RejectClassDialogProps) {
    const [reason, setReason] = useState("")

    if (!classItem) return null

    const handleSelectPreset = (preset: string) => {
        setReason(preset)
    }

    const handleClose = () => {
        if (isSubmitting) return
        setReason("")
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanReason = reason.trim()
        if (cleanReason.length < 3) return
        await onConfirm(classItem.id, cleanReason)
        setReason("")
        onOpenChange(false)
    }

    const { title: displayTitle, isCompensation } = formatClassTitle(classItem.title)
    const isReasonValid = reason.trim().length >= 3

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-0 overflow-hidden border border-border/40 shadow-2xl bg-card text-foreground">
                <DialogHeader className="p-6 pb-4 bg-rose-50/40 dark:bg-rose-950/20 border-b border-border/20 text-left">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                        <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
                            <ShieldAlert size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">HR Attendance Verification</span>
                    </div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                        Reject Class Session
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Rejecting will exclude this session from staff payroll calculations and record an audited reason visible to the tutor.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
                    {/* Class Context Card */}
                    <div className="bg-muted/20 border border-border/30 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{displayTitle}</span>
                            {isCompensation && (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full">
                                    Comp
                                </Badge>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <User size={13} className="text-indigo-500 shrink-0" />
                                <span className="truncate">
                                    <strong className="text-foreground">Tutor:</strong> {classItem.teacher.full_name || classItem.teacher.email}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <User size={13} className="text-indigo-500 shrink-0" />
                                <span className="truncate">
                                    <strong className="text-foreground">Student:</strong> {classItem.student?.full_name || 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar size={13} className="text-indigo-500 shrink-0" />
                                <span>{format(new Date(classItem.scheduled_at), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock size={13} className="text-indigo-500 shrink-0" />
                                <span>{format(new Date(classItem.scheduled_at), 'hh:mm a')} ({classItem.duration_hours}h)</span>
                            </div>
                        </div>

                        {classItem.topic_taught && (
                            <div className="pt-2 border-t border-border/20 text-[11px]">
                                <span className="font-bold text-muted-foreground block text-[9px] uppercase tracking-wider">Logged Topic</span>
                                <span className="italic text-foreground">&ldquo;{classItem.topic_taught}&rdquo;</span>
                            </div>
                        )}
                    </div>

                    {/* Warning Callout */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                        <AlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <span className="leading-relaxed text-[11px]">
                            <strong>Payroll Impact:</strong> This session will <strong>NOT</strong> convert into tutor payroll. It will be moved to the <strong>Rejected Classes</strong> audit tab and marked rejected on the tutor&apos;s monthly logs.
                        </span>
                    </div>

                    {/* Quick Preset Chips */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Sparkles size={12} className="text-indigo-500" />
                            <span>Quick Preset Reasons (Click to Fill)</span>
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_REASONS.map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset)}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all border text-left ${
                                        reason === preset
                                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                            : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/30 hover:border-border/60'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Manual Reason Textarea */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="rejection-reason" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Reason for Rejection <span className="text-rose-500">*</span>
                            </Label>
                            <span className="text-[10px] font-mono text-muted-foreground">
                                {reason.trim().length} chars (min 3)
                            </span>
                        </div>
                        <Textarea
                            id="rejection-reason"
                            placeholder="Type a custom reason or select a preset above... e.g., Student was absent and tutor rescheduled, session was less than 30 mins, duplicate entry."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            required
                            disabled={isSubmitting}
                            className="rounded-2xl border-border/40 bg-muted/20 focus:bg-background text-xs resize-none"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            This explanation will be permanently recorded and displayed to the tutor.
                        </p>
                    </div>

                    <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-border/20">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isReasonValid || isSubmitting}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-rose-600/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Rejecting...</span>
                                </>
                            ) : (
                                <span>Confirm Rejection</span>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
