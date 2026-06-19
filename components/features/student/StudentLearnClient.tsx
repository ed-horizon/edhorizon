'use client'

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
    BookOpen, Trophy, PlayCircle, Download, ChevronDown, 
    ChevronUp, CheckCircle2, Lock, ArrowRight, Sparkles, Award
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Defined courses as specified in the PRD blueprint
const BLUEPRINT_COURSES = [
    {
        id: "spoken-hindi",
        title: "Spoken Hindi Course",
        level: "Beginner (Level 1)",
        progress: 75,
        syllabus: [
            { week: "Week 1", topic: "Basic greetings & introductions", status: "completed", worksheet: "Hindi_Greetings_WS.pdf" },
            { week: "Week 2", topic: "Simple sentences & vocabulary", status: "completed", worksheet: "Hindi_SimpleSentences_WS.pdf" },
            { week: "Week 3", topic: "Daily conversations & expressions", status: "completed", worksheet: "Hindi_DailyConversation_WS.pdf" },
            { week: "Week 4", topic: "Verbs, tenses & practice dialogues", status: "active", worksheet: "Hindi_Verbs_WS.pdf" }
        ]
    },
    {
        id: "school-hindi",
        title: "School Hindi Course",
        level: "Academic (Level 2)",
        progress: 33,
        syllabus: [
            { week: "Week 1", topic: "Grammar: Vowels, consonants, pronouns", status: "completed", worksheet: "SchoolHindi_Grammar_WS.pdf" },
            { week: "Week 2", topic: "Prose: Reading & comprehension", status: "active", worksheet: "SchoolHindi_Prose_WS.pdf" },
            { week: "Week 3", topic: "Poetry: Verse recitation & meaning", status: "locked", worksheet: "SchoolHindi_Poetry_WS.pdf" }
        ]
    },
    {
        id: "spoken-english",
        title: "Spoken English Course",
        level: "Conversation (Level 1)",
        progress: 0,
        syllabus: [
            { week: "Week 1", topic: "Phonics, sounds & building blocks", status: "locked", worksheet: "English_Phonics_WS.pdf" },
            { week: "Week 2", topic: "Simple sentence framing & daily talk", status: "locked", worksheet: "English_Greetings_WS.pdf" }
        ]
    },
    {
        id: "ai-for-kids",
        title: "AI for Kids",
        level: "Tech Skill (Level 3)",
        progress: 0,
        syllabus: [
            { week: "Week 1", topic: "What is AI? Basic definitions", status: "locked", worksheet: "AI_Introduction_WS.pdf" },
            { week: "Week 2", topic: "Prompt engineering & AI applications", status: "locked", worksheet: "AI_Prompts_WS.pdf" }
        ]
    },
    {
        id: "math-science",
        title: "Math / Science Classes",
        level: "Logic & Logic (Level 1)",
        progress: 100,
        syllabus: [
            { week: "Week 1", topic: "Practical Physics: Forces & Newton", status: "completed", worksheet: "Physics_Forces_WS.pdf" },
            { week: "Week 2", topic: "Arithmetic: Fractions & Ratios", status: "completed", worksheet: "Math_Arithmetic_WS.pdf" }
        ]
    }
];

export function StudentLearnClient({ courses }: { courses: any[] }) {
    const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({
        "spoken-hindi": true
    });

    const toggleCourse = (id: string) => {
        setExpandedCourses(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleDownload = (filename: string) => {
        toast.success(`Downloading worksheet: "${filename}"`);
    };

    const handleClaimCertificate = (courseTitle: string) => {
        toast.success(`Certificate for "${courseTitle}" generated! Downloaded receipt details.`);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 text-left animate-in fade-in duration-75">
            
            {/* Header Banner */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Course & LMS Portal</h1>
                <p className="text-xs text-muted-foreground mt-1 italic font-medium leading-normal">
                    Follow your level schedules, practice worksheets, and secure certificates upon course completion.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Course Curriculum Accordion (8 Cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {BLUEPRINT_COURSES.map((course) => {
                        const isExpanded = expandedCourses[course.id];
                        const isFinished = course.progress === 100;
                        
                        return (
                            <Card 
                                key={course.id} 
                                className={cn(
                                    "rounded-[2rem] border-2 bg-card overflow-hidden shadow-md transition-all",
                                    isExpanded ? "border-indigo-500/35" : "border-border/30"
                                )}
                            >
                                {/* Course Header (Toggle Button) */}
                                <button 
                                    onClick={() => toggleCourse(course.id)}
                                    className="w-full p-6 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/5 transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-bold text-indigo-950 dark:text-indigo-100">{course.title}</h2>
                                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-none rounded-full text-[9px] font-bold">
                                                {course.level}
                                            </Badge>
                                            {isFinished && (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-none rounded-full text-[9px] font-bold">
                                                    Completed
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                                            <span>{course.syllabus.length} weeks</span>
                                            <span>•</span>
                                            <span>{course.progress}% Syllabus Completed</span>
                                        </div>
                                        <Progress value={course.progress} className="h-1.5 bg-muted/40 w-full" />
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground">
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>

                                {/* Course Weekly Syllabus (Expanded Content) */}
                                {isExpanded && (
                                    <div className="px-6 pb-6 border-t border-border/10 pt-4 bg-muted/5 space-y-3">
                                        {course.syllabus.map((week, idx) => (
                                            <div 
                                                key={idx} 
                                                className={cn(
                                                    "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs",
                                                    week.status === 'completed' 
                                                        ? 'bg-emerald-50/15 border-emerald-500/10' 
                                                        : week.status === 'active'
                                                        ? 'bg-indigo-50/15 border-indigo-500/20'
                                                        : 'bg-muted/10 border-transparent opacity-60'
                                                )}
                                            >
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                                                        {week.week}
                                                    </span>
                                                    <p className="font-bold text-foreground text-sm">{week.topic}</p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {week.status !== 'locked' ? (
                                                        <Button 
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDownload(week.worksheet)}
                                                            className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2 gap-1 bg-white hover:bg-muted"
                                                        >
                                                            <Download size={10} />
                                                            <span>Download Worksheet</span>
                                                        </Button>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                                                            <Lock size={10} /> Locked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Completed course certificate trigger */}
                                        {isFinished && (
                                            <div className="pt-4 flex justify-end">
                                                <Button 
                                                    onClick={() => handleClaimCertificate(course.title)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 px-6 shadow-md shadow-emerald-600/10"
                                                >
                                                    <Award size={15} />
                                                    <span>Claim Level Certificate</span>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )
                    })}
                </div>

                {/* Right Side: Leaderboard & Active Streaks (4 Cols) */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Streaks Widget */}
                    <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
                        <Trophy size={72} className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform" />
                        <div className="relative z-10 space-y-4">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-indigo-200 tracking-wider">Engagement Tracker</span>
                                <h3 className="text-xl font-bold mt-1">Study Streak</h3>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-3xl font-extrabold italic">7 Days Active</span>
                                </div>
                                <Progress value={70} className="h-1.5 bg-white/20" />
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Panel */}
                    <Card className="rounded-[2rem] border-border/40 shadow-md bg-card p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-border/10 pb-4">
                            <h4 className="font-bold text-base flex items-center gap-2">
                                <Trophy size={16} className="text-amber-500" />
                                <span>EdHorizon Leaderboard</span>
                            </h4>
                        </div>
                        <div className="space-y-4">
                            {[
                                { rank: 1, name: "Aarav Sharma", score: "1,240 XP", active: true },
                                { rank: 2, name: "Priya Patel", score: "1,120 XP", active: true },
                                { rank: 3, name: "Rohan Kumar", score: "980 XP", active: false }
                            ].map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-8 w-8 rounded-xl flex items-center justify-center font-bold",
                                            item.rank === 1 ? "bg-amber-100 text-amber-800" : item.rank === 2 ? "bg-slate-100 text-slate-700" : "bg-orange-100 text-orange-800"
                                        )}>
                                            {item.rank}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{item.name}</p>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">{item.score}</p>
                                        </div>
                                    </div>
                                    {item.active && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                </div>
                            ))}
                        </div>
                    </Card>

                </div>

            </div>

        </div>
    )
}
