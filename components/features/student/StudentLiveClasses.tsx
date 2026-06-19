
'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, Calendar, Clock, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { ensureAbsoluteUrl, formatClassTitle } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"


interface LiveClass {
    id: string;
    title: string;
    meeting_link: string;
    scheduled_at: string;
    status: string;
    module?: { title: string } | null;
    course?: { title: string } | null;
    teacher?: { full_name: string } | null;
}

interface StudentLiveClassesProps {
    classes: LiveClass[];
}

export function StudentLiveClasses({ classes }: StudentLiveClassesProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-serif font-bold italic tracking-tight">Today's Schedule</h2>
                <div className="h-px flex-1 bg-muted/40 mx-6 md:block hidden" />
            </div>

            {classes.length === 0 ? (
                <div className="p-12 text-center bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-muted flex flex-col items-center">
                    <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                        <Calendar size={28} className="text-muted-foreground opacity-40" />
                    </div>
                    <p className="text-xl font-bold italic text-muted-foreground">Relax! No live classes today.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {classes.map((c) => (
                        <div key={c.id} className="relative group overflow-hidden bg-white dark:bg-[#111] rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all border border-border/40">
                            <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-600/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:scale-150 transition-transform duration-700" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="space-y-4">
                                    {(() => {
                                        const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                        return (
                                            <>
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                                        Live Class
                                                    </div>
                                                    {isCompensation && (
                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                                                            Compensation Class
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-serif font-bold italic tracking-tight leading-none mb-1">{displayTitle}</h3>
                                                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground italic opacity-60">
                                                        Tutor: {c.teacher?.full_name || 'Assigned Tutor'} {c.course?.title ? `• ${c.course.title}` : ''}
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    <div className="flex items-center gap-8 pt-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Time</span>
                                            <span className="font-bold text-lg">{format(new Date(c.scheduled_at), 'hh:mm a')}</span>
                                        </div>
                                        <div className="h-8 w-px bg-muted/40" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Status</span>
                                            <span className="font-bold text-lg text-emerald-500 capitalize">{c.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <a href={ensureAbsoluteUrl(c.meeting_link)} target="_blank" rel="noopener noreferrer">
                                    <Button className="h-20 w-full md:w-auto px-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 flex flex-col gap-1 items-center justify-center leading-none">
                                        <div className="flex items-center gap-2">
                                            <span>Join Now</span>
                                            <Video size={18} />
                                        </div>
                                        <span className="text-[10px] opacity-60 font-medium lowercase">click to launch meeting</span>
                                    </Button>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
