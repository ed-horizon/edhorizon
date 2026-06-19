'use client'

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
    BookOpen,
    Trophy,
    PlayCircle,
    HelpCircle,
    Copy,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Lock,
    ArrowRight
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Capsule {
    id: string;
    title: string;
    type: 'video' | 'quiz' | 'flashcards';
    quiz_completions: any[];
}

interface Topic {
    id: string;
    title: string;
    progress: number;
    totalCapsules: number;
    completedCapsules: number;
    capsules: Capsule[];
}

interface Course {
    id: string;
    title: string;
    grade?: string;
    topics: Topic[];
}

export function StudentLearnClient({ courses }: { courses: Course[] }) {
    const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(() => {
        // Expand the first topic of the first course by default
        const firstTopicId = courses[0]?.topics[0]?.id;
        return firstTopicId ? { [firstTopicId]: true } : {};
    });

    const toggleTopic = (id: string) => {
        setExpandedTopics(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            <div>
                <h1 className="text-4xl font-serif font-bold tracking-tight italic">My Learning Journey</h1>
                <p className="text-muted-foreground mt-2 italic text-lg opacity-80">Track your progression and master new skills through interactive lessons.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    {courses.map((course) => (
                        <div key={course.id} className="space-y-8 animate-in fade-in duration-500">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl rotate-3">
                                    <BookOpen size={28} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-serif font-bold italic">{course.title}</h2>
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground italic mt-1">
                                        {course.grade ? `Grade ${course.grade} Curriculum` : 'Course Curriculum'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {course.topics.map((topic) => (
                                    <div
                                        key={topic.id}
                                        className={cn(
                                            "bg-card border border-border/40 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden",
                                            expandedTopics[topic.id] && "ring-2 ring-indigo-600/10 border-indigo-600/20 shadow-xl"
                                        )}
                                    >
                                        {/* Topic Header - Clickable to toggle */}
                                        <button
                                            onClick={() => toggleTopic(topic.id)}
                                            className="w-full text-left p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/5 transition-colors"
                                        >
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-2xl font-serif font-bold group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{topic.title}</h3>
                                                    {expandedTopics[topic.id] ? <ChevronUp size={20} className="text-indigo-600/50" /> : <ChevronDown size={20} className="text-muted-foreground/30" />}
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">
                                                    <span className="flex items-center gap-1.5 bg-muted/30 px-3 py-1 rounded-full text-indigo-600">{topic.completedCapsules} / {topic.totalCapsules} Units Mastered</span>
                                                    <span className="hidden md:inline h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">{Math.round(topic.progress)}% Completion</span>
                                                </div>
                                                <Progress value={topic.progress} className="h-2 bg-muted/40" />
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {topic.capsules.slice(0, 3).map((c, i) => (
                                                        <div key={c.id} className="h-8 w-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm z-[i]">
                                                            {c.type === 'quiz' ? <HelpCircle size={12} /> : c.type === 'flashcards' ? <Copy size={12} /> : <PlayCircle size={12} />}
                                                        </div>
                                                    ))}
                                                    {topic.totalCapsules > 3 && (
                                                        <div className="h-8 w-8 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground z-0">
                                                            +{topic.totalCapsules - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Topic Content - Expanded Units */}
                                        {expandedTopics[topic.id] && (
                                            <div className="px-8 pb-10 space-y-3 animate-in slide-in-from-top-4 duration-300">
                                                <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mb-6" />
                                                {topic.capsules.map((capsule, idx) => {
                                                    const isCompleted = capsule.quiz_completions?.length > 0 || capsule.type === 'video';
                                                    return (
                                                        <Link key={capsule.id} href={`/student/learn/${capsule.id}`}>
                                                            <div className={cn(
                                                                "flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:scale-[1.01] group/unit",
                                                                isCompleted
                                                                    ? "bg-secondary/20 border-secondary/40 hover:bg-secondary/30"
                                                                    : "bg-muted/10 border-transparent hover:bg-muted/20 hover:border-indigo-600/20"
                                                            )}>
                                                                <div className="flex items-center gap-5">
                                                                    <div className={cn(
                                                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                                                        isCompleted
                                                                            ? "bg-indigo-600 text-white shadow-lg rotate-3"
                                                                            : "bg-white text-muted-foreground shadow-sm border border-border/40"
                                                                    )}>
                                                                        {capsule.type === 'quiz' ? <HelpCircle size={22} /> : capsule.type === 'flashcards' ? <Copy size={22} /> : <PlayCircle size={22} />}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className={cn(
                                                                            "font-bold text-lg leading-none",
                                                                            isCompleted ? "text-indigo-900" : "text-foreground"
                                                                        )}>{capsule.title}</h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">{capsule.type} Unit</span>
                                                                            {isCompleted && (
                                                                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 italic">
                                                                                    <CheckCircle2 size={10} /> Completed
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 pr-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="rounded-full h-10 w-10 text-muted-foreground group-hover/unit:text-indigo-600 group-hover/unit:bg-indigo-50 transition-all"
                                                                    >
                                                                        <ArrowRight size={20} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                                {topic.capsules.length === 0 && (
                                                    <div className="text-center py-10 italic text-muted-foreground opacity-50">
                                                        No learning units available in this topic yet.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {courses.length === 0 && (
                        <div className="bg-card border-2 border-dashed border-border/60 rounded-[3rem] p-20 text-center space-y-4">
                            <div className="h-20 w-20 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/30 mx-auto">
                                <BookOpen size={40} />
                            </div>
                            <h3 className="text-2xl font-serif font-bold italic opacity-40">No Courses Assigned Yet</h3>
                            <p className="text-muted-foreground italic">Your learning path will appear here once your teacher adds content.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                        <Trophy size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform" />

                        <div className="relative z-10 space-y-6">
                            <div>
                                <h3 className="text-2xl font-serif font-bold italic mb-1 uppercase tracking-tight">Active Streak</h3>
                                <p className="text-sm text-indigo-100 italic opacity-80 font-medium">Keep going! You're on fire.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-4xl font-serif font-bold italic">7 Days</span>
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                            <div key={i} className="h-4 w-1 bg-white/40 rounded-full" />
                                        ))}
                                    </div>
                                </div>
                                <Progress value={70} className="h-1.5 bg-white/20" />
                            </div>

                            <Button className="w-full bg-white text-indigo-600 hover:bg-white/90 rounded-2xl h-14 font-black uppercase tracking-widest text-xs shadow-xl">
                                View Achievements
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white border border-border/40 rounded-[3rem] p-10 space-y-8 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h4 className="font-serif font-bold text-xl italic uppercase tracking-tight">Leaderboard</h4>
                            <Trophy size={20} className="text-amber-500" />
                        </div>

                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between items-center group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black italic shadow-sm",
                                            i === 1 ? "bg-amber-100 text-amber-600" : i === 2 ? "bg-slate-100 text-slate-500" : "bg-orange-100 text-orange-600"
                                        )}>
                                            {i}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight leading-none">Student Name {i}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic mt-1">{1240 - (i * 100)} XP Earned</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                            ))}
                        </div>

                        <Button variant="ghost" className="w-full rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] italic text-muted-foreground hover:bg-muted/10">
                            Show Global Ranking
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
