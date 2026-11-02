'use client';

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
    CalendarDays, Clock, Check, X, ArrowLeft, Sparkles, RefreshCw,
    SlidersHorizontal, ShieldCheck, CheckCircle2, AlertCircle, Bookmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
    TUTOR_AVAILABILITY_DAYS,
    TUTOR_AVAILABILITY_TIME_SLOTS,
    AvailabilityStatus,
    buildSlotKey,
    generateAvailabilityPreset
} from "@/lib/tutor-availability";
import { formatTime12Hour } from "@/lib/utils";
import {
    updateSlotAvailability,
    bulkUpdateAvailability,
    BookedSlotDetail
} from "@/app/(dashboard)/teacher/availability-actions";

interface MyAvailabilityClientProps {
    teacherName: string;
    initialAvailability: Array<{
        day_of_week: number;
        time_slot: string;
        status: AvailabilityStatus;
    }>;
    initialBookings: BookedSlotDetail[];
}

export function MyAvailabilityClient({
    teacherName,
    initialAvailability,
    initialBookings
}: MyAvailabilityClientProps) {
    // Map of day_slot -> 'available' | 'unavailable'
    const [availabilityMap, setAvailabilityMap] = useState<Map<string, AvailabilityStatus>>(() => {
        const map = new Map<string, AvailabilityStatus>();
        (initialAvailability || []).forEach(row => {
            map.set(buildSlotKey(row.day_of_week, row.time_slot), row.status);
        });
        return map;
    });

    const [isPending, startTransition] = useTransition();
    const [activePreset, setActivePreset] = useState<string | null>(null);

    // Build map of booked class slots from class_schedules
    const bookedSlotsMap = useMemo(() => {
        const map = new Map<string, BookedSlotDetail>();

        for (const booking of initialBookings) {
            const patternDays = booking.pattern_days || [];
            const duration = booking.duration_hours || 1.0;

            for (const day of patternDays) {
                const scheduleTime = booking.day_timings?.[day] ||
                    booking.day_timings?.[String(day)] ||
                    booking.time_of_day;

                if (!scheduleTime) continue;

                const [h, m] = scheduleTime.split(":");
                const startHour = parseFloat(h) + (parseFloat(m) || 0) / 60;
                const endHour = startHour + duration;

                for (const slotStr of TUTOR_AVAILABILITY_TIME_SLOTS) {
                    const [sH, sM] = slotStr.split(":");
                    const slotHour = parseFloat(sH) + (parseFloat(sM) || 0) / 60;

                    if (slotHour >= startHour && slotHour < endHour) {
                        map.set(buildSlotKey(day, slotStr), booking);
                    }
                }
            }
        }
        return map;
    }, [initialBookings]);

    // Calculate Summary Stats
    const stats = useMemo(() => {
        let availableCount = 0;
        let unavailableCount = 0;
        let bookedCount = 0;

        for (const day of TUTOR_AVAILABILITY_DAYS) {
            for (const slot of TUTOR_AVAILABILITY_TIME_SLOTS) {
                const key = buildSlotKey(day.value, slot);
                if (bookedSlotsMap.has(key)) {
                    bookedCount++;
                } else {
                    const status = availabilityMap.get(key) || 'available';
                    if (status === 'available') {
                        availableCount++;
                    } else {
                        unavailableCount++;
                    }
                }
            }
        }

        return { availableCount, unavailableCount, bookedCount };
    }, [availabilityMap, bookedSlotsMap]);

    // Handle single slot toggle
    const handleToggleSlot = async (dayOfWeek: number, timeSlot: string) => {
        const key = buildSlotKey(dayOfWeek, timeSlot);

        // Cannot toggle a booked class slot
        if (bookedSlotsMap.has(key)) {
            toast.info("This slot is already booked with a student class and cannot be modified.");
            return;
        }

        const currentStatus = availabilityMap.get(key) || 'available';
        const nextStatus: AvailabilityStatus = currentStatus === 'available' ? 'unavailable' : 'available';

        // Optimistic UI update
        setAvailabilityMap(prev => {
            const next = new Map(prev);
            next.set(key, nextStatus);
            return next;
        });

        startTransition(async () => {
            const res = await updateSlotAvailability(dayOfWeek, timeSlot, nextStatus);
            if (res.success) {
                toast.success(
                    nextStatus === 'available'
                        ? `Marked as Available (${formatTime12Hour(timeSlot)})`
                        : `Marked as Unavailable (${formatTime12Hour(timeSlot)})`,
                    { duration: 1500 }
                );
            } else {
                // Revert optimistic update
                setAvailabilityMap(prev => {
                    const next = new Map(prev);
                    next.set(key, currentStatus);
                    return next;
                });
                toast.error(res.error || "Failed to update availability");
            }
        });
    };

    // Apply bulk preset
    const handleApplyPreset = (preset: 'all_available' | 'all_unavailable' | 'weekdays_workhours' | 'evenings' | 'early_mornings', label: string) => {
        setActivePreset(preset);

        const bookedKeys = new Set(bookedSlotsMap.keys());
        const generatedSlots = generateAvailabilityPreset(preset, bookedKeys);

        // Optimistic update
        setAvailabilityMap(prev => {
            const next = new Map(prev);
            for (const slot of generatedSlots) {
                next.set(buildSlotKey(slot.day_of_week, slot.time_slot), slot.status);
            }
            return next;
        });

        startTransition(async () => {
            const res = await bulkUpdateAvailability(generatedSlots);
            if (res.success) {
                toast.success(`Preset applied: ${label}`);
            } else {
                toast.error(res.error || "Failed to apply preset");
            }
            setActivePreset(null);
        });
    };

    // Mark an entire day Available / Unavailable
    const handleSetDayStatus = (dayValue: number, status: AvailabilityStatus) => {
        const slotsToUpdate: Array<{ day_of_week: number; time_slot: string; status: AvailabilityStatus }> = [];

        for (const slot of TUTOR_AVAILABILITY_TIME_SLOTS) {
            const key = buildSlotKey(dayValue, slot);
            if (!bookedSlotsMap.has(key)) {
                slotsToUpdate.push({ day_of_week: dayValue, time_slot: slot, status });
            }
        }

        if (slotsToUpdate.length === 0) {
            toast.info("No unbooked slots to update for this day.");
            return;
        }

        setAvailabilityMap(prev => {
            const next = new Map(prev);
            for (const s of slotsToUpdate) {
                next.set(buildSlotKey(s.day_of_week, s.time_slot), status);
            }
            return next;
        });

        startTransition(async () => {
            const res = await bulkUpdateAvailability(slotsToUpdate);
            if (res.success) {
                const dayObj = TUTOR_AVAILABILITY_DAYS.find(d => d.value === dayValue);
                toast.success(`Updated all unbooked slots on ${dayObj?.label} to ${status}`);
            } else {
                toast.error(res.error || "Failed to update day slots");
            }
        });
    };

    return (
        <div className="space-y-8 max-w-[1700px] mx-auto animate-in fade-in duration-500 text-left">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/teacher">
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-full shadow-sm hover:scale-105 transition-transform">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
                            <Sparkles size={12} />
                            <span>Tutor Portal • Weekly Timetable (5:00 AM – 10:00 PM)</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mt-1">
                            My Availability
                        </h1>
                        <p className="text-xs text-muted-foreground font-medium">
                            Welcome, <strong className="text-foreground">{teacherName}</strong>. Declare your available and unavailable hours so the scheduling team can align demo classes and regular batches.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Available Slots
                        </span>
                        <div className="text-3xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                            {stats.availableCount}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Open for student assignments</span>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                        🟢
                    </div>
                </Card>

                <Card className="rounded-2xl border-border/40 bg-card shadow-sm p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <X size={14} /> Unavailable Slots
                        </span>
                        <div className="text-3xl font-black text-foreground mt-1">
                            {stats.unavailableCount}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Marked off / busy</span>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center font-bold">
                        ⚪
                    </div>
                </Card>

                <Card className="rounded-2xl border-rose-500/20 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm p-4 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                            <Bookmark size={14} /> Booked Classes
                        </span>
                        <div className="text-3xl font-black text-rose-800 dark:text-rose-300 mt-1">
                            {stats.bookedCount}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Active confirmed student classes</span>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                        🔴
                    </div>
                </Card>
            </div>

            {/* Quick Presets Toolbar */}
            <Card className="rounded-2xl border-border/40 bg-card shadow-sm p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-indigo-600" />
                        <span className="text-xs font-bold text-foreground">Quick Availability Presets:</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">(Applies across all unbooked slots)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApplyPreset('all_available', 'All Slots Available')}
                            className="h-8 text-xs font-semibold rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        >
                            <Check size={13} className="mr-1" /> Mark All Available
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApplyPreset('all_unavailable', 'All Slots Unavailable')}
                            className="h-8 text-xs font-semibold rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground border-border/50"
                        >
                            <X size={13} className="mr-1" /> Mark All Unavailable
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApplyPreset('weekdays_workhours', 'Weekdays (9 AM – 6 PM)')}
                            className="h-8 text-xs font-semibold rounded-xl"
                        >
                            Weekdays (9 AM – 6 PM)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApplyPreset('evenings', 'Evenings (4 PM – 10 PM)')}
                            className="h-8 text-xs font-semibold rounded-xl"
                        >
                            Evenings (4 PM – 10 PM)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleApplyPreset('early_mornings', 'Early Mornings (5 AM – 9 AM)')}
                            className="h-8 text-xs font-semibold rounded-xl"
                        >
                            Mornings (5 AM – 9 AM)
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Timetable Grid Card */}
            <Card className="rounded-[2rem] border-border/30 shadow-xl overflow-hidden bg-card">
                <CardHeader className="bg-muted/15 border-b border-border/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CalendarDays className="text-indigo-600" size={18} />
                            <span>Weekly Availability Matrix (5:00 AM – 10:00 PM)</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Click any unbooked slot to toggle between <strong className="text-emerald-600">Available</strong> and <strong className="text-foreground">Unavailable</strong>.
                        </CardDescription>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 font-bold">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Available
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground border border-border/40 font-bold">
                            <span className="h-2 w-2 rounded-full bg-slate-400"></span> Unavailable
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/50 font-bold">
                            <span className="h-2 w-2 rounded-full bg-rose-500"></span> Booked Class (Red)
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/40">
                                    <th className="py-3 pr-3 font-black uppercase text-[10px] tracking-wider text-muted-foreground w-[95px] sticky left-0 bg-card z-10">
                                        Time (IST)
                                    </th>
                                    {TUTOR_AVAILABILITY_DAYS.map(day => (
                                        <th key={day.value} className="py-3 px-2 font-black uppercase text-[10px] tracking-wider text-muted-foreground text-center min-w-[130px]">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-extrabold text-foreground">{day.label}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDayStatus(day.value, 'available')}
                                                        className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold transition-colors"
                                                        title={`Mark all unbooked slots on ${day.label} as Available`}
                                                    >
                                                        + All
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDayStatus(day.value, 'unavailable')}
                                                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-bold transition-colors"
                                                        title={`Mark all unbooked slots on ${day.label} as Unavailable`}
                                                    >
                                                        - All
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {TUTOR_AVAILABILITY_TIME_SLOTS.map(slotTime => {
                                    const formattedSlot = formatTime12Hour(slotTime);
                                    return (
                                        <tr key={slotTime} className="hover:bg-muted/10 transition-colors">
                                            <td className="py-3 pr-3 font-bold text-muted-foreground flex items-center gap-1.5 sticky left-0 bg-card z-10">
                                                <Clock size={11} className="text-muted-foreground/60" />
                                                <span className="text-[11px] font-mono">{formattedSlot}</span>
                                            </td>
                                            {TUTOR_AVAILABILITY_DAYS.map(day => {
                                                const key = buildSlotKey(day.value, slotTime);
                                                const booking = bookedSlotsMap.get(key);

                                                if (booking) {
                                                    // EXACT MATCH WITH MASTER SCHEDULE: Red/Rose with Subject & Student
                                                    return (
                                                        <td key={day.value} className="p-1 text-center">
                                                            <div
                                                                className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 p-2 rounded-xl text-[10px] font-semibold flex flex-col justify-center items-center shadow-sm select-none min-h-[46px]"
                                                                title={`Booked Class: ${booking.title} | Student: ${booking.student_name}`}
                                                            >
                                                                <span className="truncate max-w-[120px] font-bold text-[10px]">
                                                                    {booking.title || 'Class'}
                                                                </span>
                                                                <span className="text-[8.5px] opacity-80 mt-0.5 truncate max-w-[120px]">
                                                                    Student: {booking.student_name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    );
                                                }

                                                const isAvailable = (availabilityMap.get(key) || 'available') === 'available';

                                                return (
                                                    <td key={day.value} className="p-1 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleSlot(day.value, slotTime)}
                                                            className={`w-full p-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all duration-150 min-h-[46px] select-none ${
                                                                isAvailable
                                                                    ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 hover:scale-[1.02] shadow-sm"
                                                                    : "bg-muted/40 border border-border/40 text-muted-foreground hover:bg-muted/70 hover:scale-[1.02]"
                                                            }`}
                                                            title={`Click to switch to ${isAvailable ? 'Unavailable' : 'Available'}`}
                                                        >
                                                            {isAvailable ? (
                                                                <>
                                                                    <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                                    <span>Available</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <X size={12} className="text-muted-foreground/70" />
                                                                    <span>Unavailable</span>
                                                                </>
                                                            )}
                                                        </button>
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
        </div>
    );
}
