'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Trash2, AlertTriangle, RefreshCw, Calendar, User, Clock } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { deleteClassLogOrSession } from "@/app/(dashboard)/attendance/actions"

interface DeleteClassDialogProps {
    classSession: {
        id: string;
        title: string;
        scheduled_at: string;
        teacher_name?: string | null;
        student_name?: string | null;
        status?: string;
    };
    triggerButton?: React.ReactNode;
    onDeleted?: () => void;
}

const COMMON_REASONS = [
    "Scheduled by mistake / duplicate",
    "Student requested cancellation",
    "Tutor unavailable / rescheduled",
    "Batch schedule generation error",
    "Curriculum / student plan changed"
]

export function DeleteClassDialog({
    classSession,
    triggerButton,
    onDeleted
}: DeleteClassDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [reason, setReason] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanReason = reason.trim()
        if (!cleanReason) {
            toast.error("Please provide a reason for deleting this class session.")
            return
        }

        setIsDeleting(true)
        try {
            const res = await deleteClassLogOrSession(classSession.id, 'delete', cleanReason)
            if (res.success) {
                toast.success(`Class session "${classSession.title}" deleted and archived in deleted classes log.`)
                setIsOpen(false)
                setReason("")
                if (onDeleted) onDeleted()
            } else {
                toast.error(res.error || "Failed to delete class session.")
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "An unexpected error occurred.")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {triggerButton ? (
                    triggerButton
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-rose-600 hover:bg-rose-500/10 border-rose-500/30 rounded-xl text-xs font-bold gap-1"
                    >
                        <Trash2 size={13} />
                        <span>Delete Class</span>
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-md rounded-[2rem] p-6 md:p-8 bg-card border-border/40 text-left">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-rose-600">
                        <div className="p-2 bg-rose-500/10 rounded-xl">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Delete Class Session</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                This will remove the class and archive the record with your reason into the Deleted Classes log.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Class Snapshot Details */}
                <div className="p-3.5 bg-muted/20 border border-border/30 rounded-2xl space-y-2 mt-2">
                    <span className="font-extrabold text-sm text-foreground block">
                        {classSession.title}
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-indigo-500" />
                            <span>{format(new Date(classSession.scheduled_at), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-indigo-500" />
                            <span>{format(new Date(classSession.scheduled_at), 'hh:mm a')}</span>
                        </div>
                        {classSession.teacher_name && (
                            <div className="flex items-center gap-1.5 col-span-2">
                                <User size={12} className="text-indigo-500" />
                                <span><strong className="text-foreground">Tutor:</strong> {classSession.teacher_name}</span>
                            </div>
                        )}
                        {classSession.student_name && (
                            <div className="flex items-center gap-1.5 col-span-2">
                                <User size={12} className="text-indigo-500" />
                                <span><strong className="text-foreground">Student:</strong> {classSession.student_name}</span>
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleDelete} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="deletion-reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Reason for Deletion <span className="text-rose-500">*</span>
                        </Label>

                        {/* Quick reason pills */}
                        <div className="flex flex-wrap gap-1.5 pb-1">
                            {COMMON_REASONS.map((r) => (
                                <Badge
                                    key={r}
                                    variant="outline"
                                    onClick={() => setReason(r)}
                                    className={`cursor-pointer text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-all ${
                                        reason === r 
                                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300' 
                                            : 'hover:bg-muted/40 text-muted-foreground'
                                    }`}
                                >
                                    {r}
                                </Badge>
                            ))}
                        </div>

                        <Textarea
                            id="deletion-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this class session is being deleted..."
                            className="rounded-2xl bg-muted/20 border-border/40 text-xs min-h-[80px]"
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl text-xs"
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isDeleting || !reason.trim()}
                            className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-lg shadow-rose-600/20"
                        >
                            {isDeleting ? (
                                <>
                                    <RefreshCw size={13} className="animate-spin" />
                                    <span>Deleting & Archiving...</span>
                                </>
                            ) : (
                                <>
                                    <Trash2 size={13} />
                                    <span>Confirm Deletion</span>
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
