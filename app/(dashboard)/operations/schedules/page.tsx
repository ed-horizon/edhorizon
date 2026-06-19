'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CalendarRange } from "lucide-react";
import Link from "next/link";
import { getStudentsWithClasses, getAllTeachers } from "@/app/(dashboard)/attendance/actions";
import { StudentClassMonitor } from "@/components/features/operations/StudentClassMonitor";
import { toast } from "sonner";

export default function SchedulesPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedStudents, fetchedTeachers] = await Promise.all([
                getStudentsWithClasses(),
                getAllTeachers()
            ]);
            setStudents(fetchedStudents || []);
            setTeachers(fetchedTeachers || []);
        } catch (error) {
            console.error("Failed to load schedules monitor data:", error);
            toast.error("Failed to load class schedules");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-left">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/operations">
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-full shadow-sm hover:scale-105 transition-transform">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
                            <CalendarRange size={12} />
                            <span>Operations Schedules Desk</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
                            Schedules Monitor
                        </h1>
                        <p className="text-xs text-muted-foreground italic font-medium">
                            Global overview of student-centric class schedules, tutor alignments, and compensation classes.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="text-indigo-600 animate-spin mr-2" size={24} />
                    <span className="text-xs font-black uppercase text-indigo-600/50">Fetching student active timetables...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    <StudentClassMonitor students={students} teachers={teachers} />
                </div>
            )}
        </div>
    );
}
