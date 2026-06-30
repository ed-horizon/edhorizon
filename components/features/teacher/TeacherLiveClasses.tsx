'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, Calendar, Clock, ExternalLink, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { ensureAbsoluteUrl, formatClassTitle } from "@/lib/utils"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import { logTutorJoinClass } from "@/app/(dashboard)/attendance/actions"

interface LiveClass {
    id: string;
    title: string;
    meeting_link: string;
    scheduled_at: string;
    status: string;
    module?: { title: string } | null;
    course?: { title: string } | null;
    student?: { full_name: string } | null;
    tutor_joined_late?: boolean;
    tutor_joined_at?: string | null;
}

interface TeacherLiveClassesProps {
    classes: LiveClass[];
}

export function TeacherLiveClasses({ classes }: TeacherLiveClassesProps) {
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [loggingInClassId, setLoggingInClassId] = useState<string | null>(null)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleLogInClass = async (classId: string, meetingLink: string) => {
        setLoggingInClassId(classId)
        try {
            const res = await logTutorJoinClass(classId)
            if (res.success) {
                toast.success("Successfully logged in to class!")
                window.open(ensureAbsoluteUrl(meetingLink), '_blank')
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to log in to class.")
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "An unexpected error occurred.")
        } finally {
            setLoggingInClassId(null)
        }
    }

    // Group by student
    const studentGroups = classes.reduce((acc, c) => {
        const sName = c.student?.full_name || 'Unassigned'
        if (!acc[sName]) acc[sName] = []
        acc[sName].push(c)
        return acc
    }, {} as Record<string, LiveClass[]>)

    const studentNames = Object.keys(studentGroups)

    return (
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl overflow-hidden bg-white dark:bg-[#111]">
            <CardHeader className="bg-indigo-600/5 px-8 pt-8 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold italic tracking-tight">Today&apos;s Live Classes</CardTitle>
                        <CardDescription>Launch your virtual classroom sessions.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                {studentNames.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted">
                        <Video size={48} className="mb-4 opacity-20" />
                        <p className="font-semibold italic">No live classes scheduled for today.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {studentNames.map(sName => {
                            const studentClasses = studentGroups[sName]
                            const isExpanded = expandedStudent === sName
                            
                            return (
                                <div key={sName} className="border-2 border-muted/30 rounded-[2rem] overflow-hidden bg-muted/5 transition-all">
                                    <button 
                                        onClick={() => setExpandedStudent(isExpanded ? null : sName)}
                                        className="w-full flex items-center justify-between p-6 bg-card hover:bg-indigo-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
                                                {sName.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-lg font-bold text-foreground">{sName}</h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{studentClasses.length} Scheduled Sessions</p>
                                            </div>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </button>
 
                                    {isExpanded && (
                                        <div className="p-6 pt-2 grid gap-4 bg-muted/5 border-t-2 border-muted/20">
                                            {studentClasses.map((c) => (
                                                <div key={c.id} className="group p-5 rounded-[1.5rem] bg-white dark:bg-[#0a0a0a] border border-border/40 hover:border-indigo-600/30 transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                                <Video size={20} />
                                                            </div>
                                                            <div>
                                                                {(() => {
                                                                    const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                                    return (
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <h3 className="text-lg font-serif font-bold italic tracking-tight">{displayTitle}</h3>
                                                                            {isCompensation && (
                                                                                <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                                    Comp
                                                                                </Badge>
                                                                            )}
                                                                            {c.tutor_joined_late && (
                                                                                <Badge className="bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                                    LATE
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic mt-1">
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar size={12} className="text-indigo-500" />
                                                                        <span>{format(new Date(c.scheduled_at), 'MMM dd, yyyy')}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Clock size={12} className="text-indigo-500" />
                                                                        <span>{format(new Date(c.scheduled_at), 'hh:mm a')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {(() => {
                                                            const scheduledTime = new Date(c.scheduled_at).getTime();
                                                            const elapsedMinutes = (currentTime.getTime() - scheduledTime) / (1000 * 60);

                                                            if (c.status === 'completed') {
                                                                return (
                                                                    <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                                                                        <CheckCircle2 size={16} />
                                                                        <span className="font-black uppercase tracking-widest text-[10px]">Session Logged</span>
                                                                    </div>
                                                                );
                                                            }

                                                            // Check for > 24 hours lock
                                                            if (elapsedMinutes > 24 * 60) {
                                                                return (
                                                                    <div className="flex items-center gap-2 px-6 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
                                                                        <AlertCircle size={16} />
                                                                        <span className="font-black uppercase tracking-widest text-[10px]">Attendance Not Marked</span>
                                                                    </div>
                                                                );
                                                            }

                                                            // Check if teacher has not checked in yet
                                                            if (!c.tutor_joined_at) {
                                                                return (
                                                                    <Button 
                                                                        onClick={() => handleLogInClass(c.id, c.meeting_link)}
                                                                        disabled={loggingInClassId === c.id}
                                                                        className="rounded-xl h-10 px-6 gap-2 font-black uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20"
                                                                    >
                                                                        {loggingInClassId === c.id ? "Logging In..." : "Log In Class"}
                                                                        <ExternalLink size={14} />
                                                                    </Button>
                                                                );
                                                            }

                                                            // Ongoing session
                                                            const isLocked = elapsedMinutes < 20;
                                                            const minutesLeft = Math.ceil(20 - elapsedMinutes);

                                                            return (
                                                                <>
                                                                    {isLocked ? (
                                                                        <Button 
                                                                            disabled 
                                                                            variant="outline" 
                                                                            className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 border-2 border-muted text-muted-foreground bg-muted/10 opacity-70"
                                                                        >
                                                                            Attendance (Locked: {minutesLeft}m)
                                                                        </Button>
                                                                    ) : (
                                                                        <Link href={`/teacher/attendance/${c.id}`}>
                                                                            <Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 border-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50/50">Attendance</Button>
                                                                        </Link>
                                                                    )}
                                                                    <a href={ensureAbsoluteUrl(c.meeting_link)} target="_blank" rel="noopener noreferrer">
                                                                        <Button className="rounded-xl h-10 px-6 gap-2 font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">
                                                                            <span>Join Class</span>
                                                                            <ExternalLink size={14} />
                                                                        </Button>
                                                                    </a>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

