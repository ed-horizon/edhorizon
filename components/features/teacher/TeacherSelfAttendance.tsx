
'use client'

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, UserCheck, Calendar } from "lucide-react"
import { markTeacherAttendance } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { format } from "date-fns"

export function TeacherSelfAttendance() {
    const [isMarked, setIsMarked] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const today = format(new Date(), 'EEEE, MMM dd')

    useEffect(() => {
        const checkAttendance = async () => {
            try {
                const { getAttendanceToday } = await import("@/app/(dashboard)/attendance/actions")
                const record = await getAttendanceToday()
                if (record) {
                    setIsMarked(true)
                }
            } catch (error) {
                console.error("Failed to check attendance:", error)
            } finally {
                setIsLoading(false)
            }
        }
        checkAttendance()
    }, [])

    const handleMarkAttendance = async () => {
        setIsLoading(true)
        try {
            await markTeacherAttendance('present')
            setIsMarked(true)
            toast.success("Daily attendance marked!")
        } catch (error) {
            toast.error("Failed to mark attendance")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="rounded-3xl border-border/40 shadow-lg overflow-hidden bg-white dark:bg-[#111]">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Today's Presence</p>
                            <h3 className="text-lg font-bold">{today}</h3>
                        </div>
                    </div>

                    {isMarked ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 px-6 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl border-2 border-emerald-500/20">
                                <CheckCircle2 size={18} />
                                <span className="font-black uppercase tracking-widest text-xs">Present</span>
                            </div>
                            {/* We fetch context below in the component if needed, but for now we'll pass it from parent if possible. 
                                However, TeacherSelfAttendance is used in many places. 
                                Let's add a button that opens the calendar. */}
                             <AttendanceCalendar teacherId="current" records={[]} /> 
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Button 
                                onClick={handleMarkAttendance}
                                disabled={isLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
                            >
                                <UserCheck size={18} />
                                <span>{isLoading ? (isMarked ? "Marked" : "Checking...") : "Mark Presence"}</span>
                            </Button>
                            <AttendanceCalendar teacherId="current" records={[]} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// Sub-component to handle fetching history for the modal since TeacherSelfAttendance is client-side
import { AttendanceCalendar as CalendarModal } from "@/components/features/attendance/AttendanceCalendar"
import { getAttendanceHistory } from "@/app/(dashboard)/attendance/actions"

function AttendanceCalendar({ teacherId, records: initialRecords }: { teacherId: string, records: any[] }) {
    const [records, setRecords] = useState(initialRecords)
    const [loading, setLoading] = useState(initialRecords.length === 0)

    const loadHistory = async () => {
        if (records.length > 0) return
        setLoading(true)
        try {
            const history = await getAttendanceHistory(teacherId === 'current' ? undefined : teacherId)
            setRecords(history as any)
        } catch (error) {
            console.error("Failed to load history")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div onClick={loadHistory}>
            <CalendarModal records={records} teacherId={teacherId} />
        </div>
    )
}
