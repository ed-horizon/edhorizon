'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Layers, 
    Video, 
    Calendar, 
    Clock, 
    ExternalLink, 
    CheckCircle2, 
    ChevronDown, 
    ChevronUp, 
    BookOpen, 
    Sparkles, 
    Download,
    FileText
} from "lucide-react";
import { ensureAbsoluteUrl } from "@/lib/utils";

interface StudentBatchClassesCardProps {
    enrolledBatches: any[];
}

export default function StudentBatchClassesCard({ enrolledBatches }: StudentBatchClassesCardProps) {
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, 'sessions' | 'materials'>>({});

    if (!enrolledBatches || enrolledBatches.length === 0) {
        return null;
    }

    const toggleExpand = (batchId: string) => {
        setExpandedBatchId(prev => prev === batchId ? null : batchId);
    };

    const setTab = (batchId: string, tab: 'sessions' | 'materials') => {
        setActiveTab(prev => ({ ...prev, [batchId]: tab }));
    };

    return (
        <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20 flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-50 flex items-center gap-2">
                        <Layers className="text-indigo-600 dark:text-indigo-400" size={20} />
                        <span>My Batch Classes</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Cohort classes, all scheduled sessions, and learning materials.
                    </CardDescription>
                </div>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                    {enrolledBatches.length} {enrolledBatches.length === 1 ? 'Batch' : 'Batches'}
                </Badge>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {enrolledBatches.map(batch => {
                    const batchId = batch.batch_id || batch.id;
                    const isExpanded = expandedBatchId === batchId;
                    const currentTab = activeTab[batchId] || 'sessions';

                    const sessions = (batch.sessions || []).sort(
                        (a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                    );
                    const upcomingSessions = sessions.filter((s: any) => 
                        s.status === 'scheduled' || s.status === 'rescheduled'
                    );
                    const completedSessions = sessions.filter((s: any) => s.status === 'completed');
                    const nextSession = upcomingSessions[0];
                    const materials = batch.learning_content || [];

                    return (
                        <div 
                            key={batchId} 
                            className="p-5 rounded-2xl bg-muted/20 border border-border/40 hover:border-indigo-500/30 transition-all space-y-4"
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
                                        <Badge variant="secondary" className="text-[10px]">
                                            {completedSessions.length} / {sessions.length} Classes Completed
                                        </Badge>
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mt-1.5">{batch.name}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 flex-wrap">
                                        <Clock size={13} />
                                        <span>{batch.schedule_description || "Flexible Schedule"}</span>
                                        {batch.teacher?.full_name && (
                                            <>
                                                <span className="opacity-40">•</span>
                                                <span>Tutor: {batch.teacher.full_name}</span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    {batch.meeting_link && (
                                        <a 
                                            href={ensureAbsoluteUrl(batch.meeting_link)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 shadow-sm">
                                                <Video size={14} /> Join Classroom
                                                <ExternalLink size={12} className="opacity-70" />
                                            </Button>
                                        </a>
                                    )}
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => toggleExpand(batchId)}
                                        className="text-xs gap-1 h-9 border-border/70"
                                    >
                                        <span>{isExpanded ? "Hide Details" : "View Classes & Content"}</span>
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </Button>
                                </div>
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
                                        <a 
                                            href={ensureAbsoluteUrl(nextSession.meeting_link || batch.meeting_link)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-indigo-300 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50">
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

                            {/* EXPANDABLE SECTION: ALL CLASSES & MATERIALS */}
                            {isExpanded && (
                                <div className="pt-3 border-t border-border/40 space-y-4 animate-in fade-in-50 duration-200">
                                    {/* Tabs */}
                                    <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                                        <button
                                            type="button"
                                            onClick={() => setTab(batchId, 'sessions')}
                                            className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${
                                                currentTab === 'sessions'
                                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            All Scheduled Classes ({sessions.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTab(batchId, 'materials')}
                                            className={`text-xs font-bold pb-1 px-1 border-b-2 transition-all ${
                                                currentTab === 'materials'
                                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Study Materials & Capsules ({materials.length})
                                        </button>
                                    </div>

                                    {/* Tab 1: All Classes */}
                                    {currentTab === 'sessions' && (
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                            {sessions.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground">
                                                    No scheduled class sessions found.
                                                </div>
                                            ) : (
                                                sessions.map((s: any, idx: number) => {
                                                    const isDone = s.status === 'completed';
                                                    return (
                                                        <div 
                                                            key={s.id || idx} 
                                                            className="p-3 rounded-xl bg-background/80 border border-border/50 flex items-center justify-between gap-3 text-xs"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                                                    isDone ? 'bg-emerald-500/15 text-emerald-600' : 'bg-indigo-500/15 text-indigo-600'
                                                                }`}>
                                                                    {s.session_number || idx + 1}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-foreground">
                                                                        {s.title}
                                                                    </div>
                                                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                                                        <Calendar size={11} />
                                                                        <span>{new Date(s.scheduled_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                                        <Clock size={11} />
                                                                        <span>{new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Badge className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                                    isDone
                                                                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                                                        : 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30'
                                                                }`}>
                                                                    {s.status}
                                                                </Badge>
                                                                {!isDone && (s.meeting_link || batch.meeting_link) && (
                                                                    <a 
                                                                        href={ensureAbsoluteUrl(s.meeting_link || batch.meeting_link)} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-indigo-600">
                                                                            <Video size={12} className="mr-1" /> Join
                                                                        </Button>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {/* Tab 2: Study Materials & Capsules */}
                                    {currentTab === 'materials' && (
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                            {materials.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground">
                                                    No learning materials or capsules attached yet for this batch.
                                                </div>
                                            ) : (
                                                materials.map((m: any) => {
                                                    const isCapsule = Boolean(m.capsule_id);
                                                    const isCompleted = isCapsule && Boolean(m.is_completed || (m.attempts_count && m.attempts_count >= 2));
                                                    const attempts = isCapsule ? Number(m.attempts_count || 0) : 0;
                                                    const bestScore = isCapsule ? (m.best_score ?? m.score ?? null) : null;

                                                    return (
                                                        <div 
                                                            key={m.id} 
                                                            className="p-3 rounded-xl bg-background/80 border border-border/50 flex items-center justify-between gap-3 text-xs"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                                                                    {isCapsule ? <Sparkles size={14} /> : <FileText size={14} />}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                                                        <span>{m.title}</span>
                                                                        <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                                                                            {isCapsule ? 'Capsule' : (m.type || 'Material')}
                                                                        </Badge>
                                                                        {isCapsule && (
                                                                            isCompleted ? (
                                                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold">
                                                                                    ✓ Completed (2/2) • Best: {bestScore !== null ? `${bestScore}%` : '100%'}
                                                                                </Badge>
                                                                            ) : attempts === 1 ? (
                                                                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0 font-bold">
                                                                                    1 of 2 Done ({bestScore}%)
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge className="bg-muted text-muted-foreground border border-border text-[9px] px-1.5 py-0 font-bold">
                                                                                    Pending (0/2)
                                                                                </Badge>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                    {m.description && (
                                                                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                                                            {m.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                {isCapsule ? (
                                                                    <a 
                                                                        href={`/student/learn/${m.capsule_id}`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        {isCompleted ? (
                                                                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold">
                                                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                                                                <span>Results ({bestScore !== null ? `${bestScore}%` : '100%'})</span>
                                                                            </Button>
                                                                        ) : attempts === 1 ? (
                                                                            <Button size="sm" className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm">
                                                                                <Sparkles size={12} />
                                                                                <span>Final Attempt (2/2)</span>
                                                                            </Button>
                                                                        ) : (
                                                                            <Button size="sm" className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm">
                                                                                <Sparkles size={12} />
                                                                                <span>Play</span>
                                                                            </Button>
                                                                        )}
                                                                    </a>
                                                                ) : m.content_url ? (
                                                                m.content_url.startsWith('http://') || m.content_url.startsWith('https://') ? (
                                                                    <a 
                                                                        href={ensureAbsoluteUrl(m.content_url)} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-indigo-600">
                                                                            <ExternalLink size={12} />
                                                                            <span>Open</span>
                                                                        </Button>
                                                                    </a>
                                                                ) : (
                                                                    <a 
                                                                        href={`/api/batch-materials/${m.id}/download`} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-indigo-600">
                                                                            <Download size={12} />
                                                                            <span>Download</span>
                                                                        </Button>
                                                                    </a>
                                                                )
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
