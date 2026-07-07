'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    CalendarDays, Clock, Users, ArrowLeft, Search, Grid, ListFilter, HelpCircle, Sparkles
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatTime12Hour } from "@/lib/utils";

interface Teacher {
    id: string;
    full_name: string | null;
    email: string | null;
}

interface TutorSchedule {
    id: string;
    teacher_id: string;
    student_id: string | null;
    title: string | null;
    pattern_days: number[];
    time_of_day: string | null;
    day_timings: Record<string, string> | null;
    duration_hours: number | string | null;
    status: string;
    student?: { full_name: string | null } | null;
}

const DAYS = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
];

const TIME_SLOTS = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

export default function TutorsSchedulePage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [schedules, setSchedules] = useState<TutorSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
    const [selectedDayValue, setSelectedDayValue] = useState<number>(1); // default Monday
    const [viewMode, setViewMode] = useState<"individual" | "comparison">("individual");

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const supabase = createClient();
            try {
                // Fetch all teachers
                const { data: fetchedTeachers, error: teacherErr } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .eq('role', 'teacher')
                    .order('full_name');

                if (teacherErr) throw teacherErr;

                // Fetch active schedules
                const { data: fetchedSchedules, error: schedErr } = await supabase
                    .from('class_schedules')
                    .select(`
                        id,
                        teacher_id,
                        student_id,
                        title,
                        pattern_days,
                        time_of_day,
                        day_timings,
                        duration_hours,
                        status,
                        student:profiles!student_id(full_name)
                    `)
                    .eq('status', 'active');

                if (schedErr) throw schedErr;

                setTeachers(fetchedTeachers || []);
                setSchedules((fetchedSchedules || []) as TutorSchedule[]);

                if (fetchedTeachers && fetchedTeachers.length > 0) {
                    setSelectedTeacherId(fetchedTeachers[0].id);
                }
            } catch (err) {
                console.error("Failed to load schedules", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter teachers based on search query
    const filteredTeachers = teachers.filter(t =>
        (t.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Overlap checking function
    const getSlotBooking = (teacherId: string, dayValue: number, slotTimeStr: string) => {
        const slotHour = parseFloat(slotTimeStr.split(":")[0]) + parseFloat(slotTimeStr.split(":")[1]) / 60;

        return schedules.find(s => {
            if (s.teacher_id !== teacherId) return false;
            if (!s.pattern_days.includes(dayValue)) return false;

            const scheduleTime = s.day_timings?.[dayValue] || s.day_timings?.[String(dayValue)] || s.time_of_day;
            if (!scheduleTime) return false;

            const [h, m] = scheduleTime.split(":");
            const startHour = parseFloat(h) + parseFloat(m) / 60;
            const duration = parseFloat(s.duration_hours) || 1.0;
            const endHour = startHour + duration;

            // Check if slot falls inside startHour and endHour
            return slotHour >= startHour && slotHour < endHour;
        });
    };

    const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-left">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-full shadow-sm hover:scale-105 transition-transform">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
                            <Sparkles size={12} />
                            <span>Tutor Availability Board</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
                            Tutor Schedules
                        </h1>
                        <p className="text-xs text-muted-foreground italic font-medium">
                            Real-time weekly calendar & daily comparison matrix of tutor availability across the academy.
                        </p>
                    </div>
                </div>

                {/* View Toggler */}
                <div className="flex items-center gap-3 bg-muted/40 p-1 rounded-xl border border-border/30 w-fit">
                    <Button
                        variant={viewMode === "individual" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("individual")}
                        className="rounded-lg text-xs font-bold gap-1.5 h-8 px-4"
                    >
                        <Grid size={14} />
                        Weekly (By Tutor)
                    </Button>
                    <Button
                        variant={viewMode === "comparison" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("comparison")}
                        className="rounded-lg text-xs font-bold gap-1.5 h-8 px-4"
                    >
                        <ListFilter size={14} />
                        Daily Comparison
                    </Button>
                    <ThemeToggle />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 text-indigo-600 animate-pulse">
                    <Clock className="animate-spin mb-4" size={40} />
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600/60">Loading timetables...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                    {/* Left Column: Tutors Directory Search */}
                    <div className="xl:col-span-1 space-y-6">
                        <Card className="rounded-[2rem] border-border/30 shadow-xl overflow-hidden bg-card">
                            <CardHeader className="bg-muted/15 border-b border-border/10 p-5">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Users size={16} className="text-indigo-600" />
                                    <span>Tutors Directory</span>
                                </CardTitle>
                                <CardDescription className="text-[10px]">Select a tutor to analyze schedules.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                    <Input
                                        placeholder="Search tutor name/email..."
                                        className="pl-9 text-xs rounded-xl h-9 border-border/40 focus-visible:ring-indigo-600"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
                                    {filteredTeachers.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic text-center py-6">No matching tutors found.</p>
                                    ) : (
                                        filteredTeachers.map(t => {
                                            const totalClasses = schedules.filter(s => s.teacher_id === t.id).length;
                                            const isSelected = selectedTeacherId === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        setSelectedTeacherId(t.id);
                                                        if (viewMode === "comparison") setViewMode("individual");
                                                    }}
                                                    className={typeClassSelect(isSelected)}
                                                >
                                                    <div className="text-left">
                                                        <p className="font-bold text-xs truncate max-w-[180px]">{t.full_name || 'Anonymous'}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{t.email}</p>
                                                    </div>
                                                    <Badge variant={totalClasses > 0 ? "secondary" : "outline"} className="text-[9px] rounded-lg">
                                                        {totalClasses} Classes
                                                    </Badge>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Booking Helper Info Card */}
                        <Card className="rounded-[2rem] border-indigo-100 dark:border-indigo-950/20 bg-indigo-50/30 dark:bg-indigo-950/5 p-5">
                            <h4 className="font-bold text-xs flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200">
                                <HelpCircle size={14} className="text-indigo-600" />
                                Scheduling Demo Rules
                            </h4>
                            <ul className="text-[10px] text-indigo-900/80 dark:text-indigo-400 mt-2.5 space-y-2 list-disc pl-4">
                                <li><strong>Green slots</strong> indicate the tutor is fully available.</li>
                                <li><strong>Rose slots</strong> show existing recurring classes (unavailable).</li>
                                <li>Always confirm the slot aligns with the student&apos;s timezone.</li>
                                <li>Slots display in Indian Standard Time (IST).</li>
                            </ul>
                        </Card>
                    </div>

                    {/* Right Column: Weekly Schedule or Comparison Matrix */}
                    <div className="xl:col-span-3">
                        {viewMode === "individual" && selectedTeacher && (
                            <Card className="rounded-[2rem] border-border/30 shadow-xl overflow-hidden bg-card">
                                <CardHeader className="bg-muted/15 border-b border-border/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <CalendarDays className="text-indigo-600" size={18} />
                                            <span>Weekly Availability Grid</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Weekly slots for <strong className="text-foreground font-semibold">{selectedTeacher.full_name || 'Tutor'}</strong> ({selectedTeacher.email})
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-200/50 rounded-lg">Available</Badge>
                                        <Badge variant="outline" className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-700 border-rose-200/50 rounded-lg">Busy / Booked</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-border/40">
                                                    <th className="py-3 pr-4 font-black uppercase text-[9px] tracking-wider text-muted-foreground w-[100px]">Slot Time</th>
                                                    {DAYS.map(day => (
                                                        <th key={day.value} className="py-3 px-2 font-black uppercase text-[9px] tracking-wider text-muted-foreground text-center min-w-[120px]">{day.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/20">
                                                {TIME_SLOTS.map(slotTime => {
                                                    const formattedSlot = formatTime12Hour(slotTime);
                                                    return (
                                                        <tr key={slotTime} className="hover:bg-muted/10">
                                                            <td className="py-3 pr-4 font-bold text-muted-foreground flex items-center gap-1">
                                                                <Clock size={10} className="text-muted-foreground/60" />
                                                                {formattedSlot}
                                                            </td>
                                                            {DAYS.map(day => {
                                                                const booking = getSlotBooking(selectedTeacher.id, day.value, slotTime);
                                                                return (
                                                                    <td key={day.value} className="p-1 text-center">
                                                                        {booking ? (
                                                                            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/20 text-rose-800 dark:text-rose-300 p-2 rounded-xl text-[10px] font-semibold flex flex-col justify-center items-center shadow-sm select-none">
                                                                                <span className="truncate max-w-[110px] font-bold">{booking.title || 'Class'}</span>
                                                                                <span className="text-[8px] opacity-80 mt-0.5 truncate max-w-[110px]">Student: {booking.student?.full_name || 'N/A'}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/30 text-emerald-800 dark:text-emerald-400 p-2 rounded-xl text-[9px] font-medium flex justify-center items-center select-none opacity-60">
                                                                                Available
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {viewMode === "comparison" && (
                            <Card className="rounded-[2rem] border-border/30 shadow-xl overflow-hidden bg-card">
                                <CardHeader className="bg-muted/15 border-b border-border/10 p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                                <ListFilter className="text-indigo-600" size={18} />
                                                <span>Multi-Tutor Comparison Matrix</span>
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Compare schedule slots for all tutors on a selected day.
                                            </CardDescription>
                                        </div>
                                        {/* Day Selectors */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {DAYS.map(day => (
                                                <Button
                                                    key={day.value}
                                                    variant={selectedDayValue === day.value ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedDayValue(day.value)}
                                                    className="h-8 text-[10px] font-bold rounded-lg px-3"
                                                >
                                                    {day.label.substring(0,3)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-border/40">
                                                    <th className="py-3 pr-4 font-black uppercase text-[9px] tracking-wider text-muted-foreground w-[180px]">Tutor Name</th>
                                                    {TIME_SLOTS.map(slotTime => (
                                                        <th key={slotTime} className="py-3 px-1 font-black uppercase text-[9px] tracking-wider text-muted-foreground text-center min-w-[70px]">{formatTime12Hour(slotTime)}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/20">
                                                {filteredTeachers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={TIME_SLOTS.length + 1} className="py-12 text-center text-muted-foreground italic">No tutors to display.</td>
                                                    </tr>
                                                ) : (
                                                    filteredTeachers.map(t => (
                                                        <tr key={t.id} className="hover:bg-muted/10">
                                                            <td className="py-4 pr-4 font-bold">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs text-foreground font-bold">{t.full_name || 'Anonymous'}</span>
                                                                    <span className="text-[9px] text-muted-foreground truncate max-w-[160px] font-medium">{t.email}</span>
                                                                </div>
                                                            </td>
                                                            {TIME_SLOTS.map(slotTime => {
                                                                const booking = getSlotBooking(t.id, selectedDayValue, slotTime);
                                                                return (
                                                                    <td key={slotTime} className="p-1">
                                                                        {booking ? (
                                                                            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/10 text-rose-800 dark:text-rose-400 p-1.5 rounded-lg text-[8px] font-bold text-center flex flex-col justify-center select-none leading-tight min-h-[40px] max-w-[85px] mx-auto shadow-sm">
                                                                                <span className="truncate">{booking.title || 'Busy'}</span>
                                                                                <span className="opacity-70 mt-0.5 truncate text-[7px]">S: {booking.student?.full_name || 'N/A'}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100/10 text-emerald-700 dark:text-emerald-500/80 p-1.5 rounded-lg text-[8px] font-medium text-center flex items-center justify-center min-h-[40px] select-none opacity-40">
                                                                                Free
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Styling helper for tutor button
function typeClassSelect(isSelected: boolean) {
    return `w-full p-3 rounded-2xl text-left transition-all duration-200 border flex items-center justify-between gap-3 ${
        isSelected
            ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-md scale-[1.01]"
            : "bg-background hover:bg-muted/30 text-foreground border-border/40 hover:border-border"
    }`;
}
