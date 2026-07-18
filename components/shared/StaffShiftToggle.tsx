'use client'

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Play, Square, Loader2 } from "lucide-react";
import { clockOutShift, getCurrentShiftStatus, toggleShift } from "@/app/(dashboard)/staff-shifts/actions";
import { toast } from "sonner";

export default function StaffShiftToggle({ role, isSidebar = false }: { role: string; isSidebar?: boolean }) {
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, setIsPending] = useState(false);
    const [clockInTime, setClockInTime] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState("00:00:00");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Only render for staff roles
    const isStaff = ['operations', 'sales', 'hr', 'admin'].includes(role);

    useEffect(() => {
        if (!isStaff) {
            setIsLoading(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                const res = await getCurrentShiftStatus();
                if (res.active && res.shift) {
                    setIsActive(true);
                    setClockInTime(res.shift.clock_in);
                    sessionStorage.setItem("wasClockedIn", "true");
                    if (!sessionStorage.getItem("clockInTime")) {
                        sessionStorage.setItem("clockInTime", res.shift.clock_in);
                    }
                } else {
                    setIsActive(false);
                    setClockInTime(null);
                    sessionStorage.removeItem("wasClockedIn");
                    sessionStorage.removeItem("clockInTime");
                }
            } catch (err) {
                console.error("Failed to fetch shift status:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, [isStaff]);

    // Live stopwatch update
    useEffect(() => {
        if (isActive && clockInTime) {
            const updateTimer = () => {
                const startTime = new Date(clockInTime).getTime();
                const now = new Date().getTime();
                const difference = Math.max(0, now - startTime);

                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                const pad = (num: number) => String(num).padStart(2, "0");
                setElapsedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
            };

            updateTimer(); // Initial call
            intervalRef.current = setInterval(updateTimer, 1000);
        } else {
            setElapsedTime("00:00:00");
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isActive, clockInTime]);

    // Idle Activity and Browser Close tracking
    useEffect(() => {
        if (!isActive) return;

        // 1. Idle Auto Clock-out after 20 minutes for HR and Operations only
        const isTargetRole = ['hr', 'operations'].includes(role);
        let checkInterval: NodeJS.Timeout;
        const IDLE_LIMIT = 20 * 60 * 1000; // 20 minutes

        const autoClockOut = async () => {
            try {
                const res = await clockOutShift();
                if (res.success) {
                    setIsActive(false);
                    setClockInTime(null);
                    toast.info("You have been automatically clocked out due to 20 minutes of inactivity.");
                }
            } catch (err) {
                console.error("Auto clock-out error:", err);
            }
        };

        const resetIdleTimer = () => {
            if (isTargetRole) {
                localStorage.setItem('lastActivity', Date.now().toString());
            }
        };

        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

        if (isTargetRole) {
            if (typeof window !== "undefined") {
                if (!localStorage.getItem('lastActivity')) {
                    localStorage.setItem('lastActivity', Date.now().toString());
                }
            }

            checkInterval = setInterval(() => {
                const lastActivity = Number(localStorage.getItem('lastActivity') || Date.now());
                const elapsed = Date.now() - lastActivity;
                if (elapsed >= IDLE_LIMIT) {
                    autoClockOut();
                }
            }, 10000); // Check every 10 seconds

            events.forEach(event => {
                window.addEventListener(event, resetIdleTimer);
            });
        }

        return () => {
            if (isTargetRole) {
                clearInterval(checkInterval);
                events.forEach(event => {
                    window.removeEventListener(event, resetIdleTimer);
                });
            }
        };
    }, [isActive, role]);

    const handleToggle = async () => {
        setIsPending(true);
        try {
            const res = await toggleShift();
            if (res.error) {
                toast.error(res.error);
            } else {
                const nowActive = !isActive;
                setIsActive(nowActive);
                if (nowActive) {
                    const nowStr = new Date().toISOString();
                    setClockInTime(nowStr);
                    sessionStorage.setItem("wasClockedIn", "true");
                    sessionStorage.setItem("clockInTime", nowStr);
                    toast.success("Clocked in successfully!");
                } else {
                    setClockInTime(null);
                    sessionStorage.removeItem("wasClockedIn");
                    sessionStorage.removeItem("clockInTime");
                    toast.success(`Clocked out successfully! ${elapsedTime}`);
                }
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update shift status.");
        } finally {
            setIsPending(false);
        }
    };

    if (!isStaff) return null;
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
        );
    }

    // Sidebar rendering logic: includes a compact trigger and expanded details
    if (isSidebar) {
        return (
            <div className="w-full transition-all duration-300">
                {/* Compact view: visible only when sidebar is collapsed */}
                <div className="flex group-hover:hidden items-center justify-center w-full">
                    <button
                        onClick={handleToggle}
                        disabled={isPending}
                        title={isActive ? `Active Shift: ${elapsedTime} (Click to Clock Out)` : "Clock In / Log In"}
                        className={`relative h-10 w-10 flex items-center justify-center rounded-xl transition-all border ${
                            isActive 
                                ? "bg-emerald-950/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        }`}
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Clock className={`h-5 w-5 ${isActive ? "animate-pulse" : ""}`} />
                        )}
                        {/* Compact indicator ring */}
                        {isActive && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                            </span>
                        )}
                    </button>
                </div>

                {/* Expanded view: visible only when sidebar is hovered/expanded */}
                <div className="hidden group-hover:block transition-all duration-300">
                    <div className="bg-[#1e1e1e]/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    {isActive ? (
                                        <>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </>
                                    ) : (
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                                    )}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {isActive ? "Active Shift" : "Logged Out"}
                                </span>
                            </div>
                            {isActive && (
                                <div className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                                    {elapsedTime}
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleToggle}
                            disabled={isPending}
                            size="sm"
                            className={`w-full h-8 justify-center gap-2 rounded-xl text-[10px] font-bold transition-all ${
                                isActive 
                                    ? "bg-rose-600/90 hover:bg-rose-600 text-white" 
                                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                            }`}
                        >
                            {isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isActive ? (
                                <>
                                    <Square className="h-3 w-3 shrink-0 fill-current" />
                                    <span>Clock Out</span>
                                </>
                            ) : (
                                <>
                                    <Play className="h-3 w-3 shrink-0 fill-current" />
                                    <span>Clock In</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Default block view (used in Mobile Drawer/Nav where width is fixed)
    return (
        <div className="w-full bg-[#1e1e1e]/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        {isActive ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
                        )}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {isActive ? "Shift Active" : "Logged Out"}
                    </span>
                </div>
                {isActive && (
                    <div className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{elapsedTime}</span>
                    </div>
                )}
            </div>

            <Button
                onClick={handleToggle}
                disabled={isPending}
                size="sm"
                className={`w-full h-9 justify-center gap-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    isActive 
                        ? "bg-rose-600/90 hover:bg-rose-600 text-white shadow-rose-950/20" 
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/20"
                }`}
            >
                {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isActive ? (
                    <>
                        <Square className="h-3.5 w-3.5 shrink-0 fill-current" />
                        <span className="truncate">Clock Out</span>
                    </>
                ) : (
                    <>
                        <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
                        <span className="truncate">Clock In</span>
                    </>
                )}
            </Button>
        </div>
    );
}
