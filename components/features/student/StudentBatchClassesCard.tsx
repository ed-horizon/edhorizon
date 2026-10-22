'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Video, Calendar, Clock, ExternalLink, CheckCircle2 } from "lucide-react";

interface StudentBatchClassesCardProps {
    enrolledBatches: any[];
}

export default function StudentBatchClassesCard({ enrolledBatches }: StudentBatchClassesCardProps) {
    if (!enrolledBatches || enrolledBatches.length === 0) {
        return null; // Don't show card if student is not enrolled in any batch
    }

    return (
        <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20 flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-50 flex items-center gap-2">
                        <Layers className="text-indigo-600 dark:text-indigo-400" size={20} />
                        <span>My Batch Classes</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Cohort classes and group learning sessions.
                    </CardDescription>
                </div>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                    {enrolledBatches.length} {enrolledBatches.length === 1 ? 'Batch' : 'Batches'}
                </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {enrolledBatches.map(batch => {
                    const upcomingSessions = (batch.sessions || []).filter((s: any) => 
                        s.status === 'scheduled' || s.status === 'rescheduled'
                    );
                    const nextSession = upcomingSessions[0];

                    return (
                        <div 
                            key={batch.batch_id || batch.id} 
                            className="p-5 rounded-2xl bg-muted/20 border border-border/40 hover:border-indigo-500/20 transition-all space-y-4"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                                            {batch.course_name}
                                        </Badge>
                                        <Badge variant="outline" className={
                                            batch.fee_status === 'paid' 
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]"
                                        }>
                                            Fee: {batch.fee_status === 'paid' ? 'Paid' : 'Pending'}
                                        </Badge>
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mt-1.5">{batch.name}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                        <Clock size={13} />
                                        <span>{batch.schedule_description}</span>
                                        {batch.teacher?.full_name && (
                                            <>
                                                <span className="opacity-40">•</span>
                                                <span>Tutor: {batch.teacher.full_name}</span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                {batch.meeting_link && (
                                    <a href={batch.meeting_link} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 shadow-sm">
                                            <Video size={14} /> Join Classroom
                                            <ExternalLink size={12} className="opacity-70" />
                                        </Button>
                                    </a>
                                )}
                            </div>

                            {/* Next Session Highlight */}
                            {nextSession ? (
                                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                                            Next Upcoming Session:
                                        </span>
                                        <div className="font-semibold text-foreground">
                                            {nextSession.title}
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                                            <Calendar size={12} />
                                            <span>{new Date(nextSession.scheduled_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                            <Clock size={12} />
                                            <span>{new Date(nextSession.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({nextSession.duration_minutes || 60}m)</span>
                                        </div>
                                    </div>

                                    {(nextSession.meeting_link || batch.meeting_link) && (
                                        <a href={nextSession.meeting_link || batch.meeting_link} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                                                <Video size={13} /> Join Session
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    <span>All scheduled sessions for this batch have been conducted.</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
