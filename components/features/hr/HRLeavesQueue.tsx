'use client'

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { updateLeaveStatus } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface LeaveRequest {
    id: string;
    studentName: string;
    applicantRole: string;
    tutorName: string;
    reason: string;
    days: string;
    status: string;
    date: string;
}

interface HRLeavesQueueProps {
    initialLeaves: LeaveRequest[];
}

export function HRLeavesQueue({ initialLeaves }: HRLeavesQueueProps) {
    const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const handleStatusUpdate = async (leaveId: string, status: 'approved' | 'rejected') => {
        setUpdatingId(leaveId)
        try {
            const result = await updateLeaveStatus(leaveId, status)
            if (result.success) {
                toast.success(`Leave request ${status} successfully!`)
                setLeaves(prev =>
                    prev.map(l => l.id === leaveId ? { ...l, status } : l)
                )
            } else {
                toast.error(result.error || "Failed to update leave request")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred")
        } finally {
            setUpdatingId(null)
        }
    }

    return (
        <div className="space-y-3">
            {leaves.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No leave requests found.</p>
            ) : (
                leaves.map(leave => (
                    <div key={leave.id} className="p-4 bg-muted/20 border border-border/20 rounded-xl text-xs space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="font-bold text-foreground">
                                    {leave.studentName}
                                </p>
                                <p className="text-muted-foreground text-[10px]">{leave.reason} ({leave.days})</p>
                                <p className="text-[9px] text-muted-foreground/60 font-semibold">{leave.tutorName} • {leave.date}</p>
                            </div>
                            <Badge className={cn("text-[9px] font-bold border-none rounded-full px-2 py-0.5 uppercase tracking-wider",
                                leave.status === 'approved' && 'bg-emerald-100 text-emerald-800',
                                leave.status === 'rejected' && 'bg-rose-100 text-rose-800',
                                leave.status === 'pending' && 'bg-amber-100 text-amber-800'
                            )}>
                                {leave.status}
                            </Badge>
                        </div>
                        {leave.status === 'pending' && (
                            <div className="flex gap-2 justify-end pt-1 border-t border-border/5">
                                <Button 
                                    size="sm"
                                    variant="ghost"
                                    disabled={updatingId === leave.id}
                                    onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                                    className="h-8 rounded-lg text-[10px] font-bold uppercase hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                >
                                    Reject
                                </Button>
                                <Button 
                                    size="sm"
                                    disabled={updatingId === leave.id}
                                    onClick={() => handleStatusUpdate(leave.id, 'approved')}
                                    className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase px-4 shadow-sm"
                                >
                                    {updatingId === leave.id ? "Processing..." : "Approve"}
                                </Button>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    )
}
