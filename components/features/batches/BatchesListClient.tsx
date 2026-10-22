'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Layers, 
    Plus, 
    Search, 
    Users, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    DollarSign, 
    Video, 
    ExternalLink, 
    ArrowRight,
    GraduationCap,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BatchSummary, createBatch } from "@/app/(dashboard)/batches/actions";
import { calculateBatchSchedule } from "@/lib/batch-schedule";
import { cn } from "@/lib/utils";

interface BatchesListClientProps {
    initialBatches: BatchSummary[];
    tutors: Array<{ id: string; full_name: string; email: string }>;
    userRole: string;
}

export default function BatchesListClient({ initialBatches, tutors, userRole }: BatchesListClientProps) {
    const router = useRouter();
    const [batches, setBatches] = useState<BatchSummary[]>(initialBatches);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const canCreate = ['super_admin', 'admin', 'operations'].includes(userRole);

    // Form state
    const todayIso = new Date().toISOString().split('T')[0];
    const defaultEnd = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 29);
        return d.toISOString().split('T')[0];
    })();

    const [formData, setFormData] = useState({
        name: "",
        course_name: "",
        teacher_id: "none",
        capacity: 20,
        start_date: todayIso,
        end_date: defaultEnd,
        course_duration_days: 10,
        schedule_description: "",
        recurring_days: [] as string[],
        session_time: "18:00",
        session_duration_minutes: 60,
        auto_generate_sessions: true,
        meeting_link: "",
        default_course_fee: 0,
        agreed_tutor_payout: 0,
        notes: ""
    });

    const updateSchedule = (newStart: string, newClassesCount: number, newDays: string[], newTime: string, newDurationMins: number) => {
        let newEnd = "";
        if (newStart && newClassesCount > 0) {
            const { endDateStr } = calculateBatchSchedule(newStart, newDays, newClassesCount);
            newEnd = endDateStr;
        }
        const desc = newDays.length > 0 
            ? `${newDays.join(', ')} at ${newTime || '18:00'} (${newDurationMins || 60}m)`
            : formData.schedule_description;
        setFormData(prev => ({
            ...prev,
            start_date: newStart,
            course_duration_days: newClassesCount,
            recurring_days: newDays,
            session_time: newTime,
            session_duration_minutes: newDurationMins,
            end_date: newEnd,
            schedule_description: desc
        }));
    };

    const filteredBatches = batches.filter(batch => {
        const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
        const term = search.toLowerCase();
        const matchesSearch = !search || 
            batch.name.toLowerCase().includes(term) ||
            batch.course_name.toLowerCase().includes(term) ||
            (batch.teacher?.full_name || '').toLowerCase().includes(term);
        return matchesStatus && matchesSearch;
    });

    // Aggregated stats
    const totalBatches = batches.length;
    const totalStudents = batches.reduce((sum, b) => sum + b.enrolled_count, 0);
    const totalRevenue = batches.reduce((sum, b) => sum + b.total_collected_fees, 0);
    const totalConductedSessions = batches.reduce((sum, b) => sum + b.completed_sessions, 0);

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        try {
            const res = await createBatch({
                name: formData.name,
                course_name: formData.course_name,
                teacher_id: formData.teacher_id === "none" ? null : formData.teacher_id,
                capacity: Number(formData.capacity) || 20,
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                course_duration_days: Number(formData.course_duration_days) || 30,
                schedule_description: formData.schedule_description?.trim() || null,
                recurring_days: formData.recurring_days,
                session_time: formData.session_time,
                session_duration_minutes: Number(formData.session_duration_minutes) || 60,
                auto_generate_sessions: formData.auto_generate_sessions,
                meeting_link: formData.meeting_link || null,
                default_course_fee: Number(formData.default_course_fee) || 0,
                agreed_tutor_payout: Number(formData.agreed_tutor_payout) || 0,
                notes: formData.notes || null,
            });

            if (!res.success) {
                setFormError(res.error || "Failed to create batch");
                setIsSubmitting(false);
                return;
            }

            setIsCreateOpen(false);
            setFormData({
                name: "",
                course_name: "",
                teacher_id: "none",
                capacity: 20,
                start_date: new Date().toISOString().split('T')[0],
                end_date: "",
                course_duration_days: 30,
                schedule_description: "",
                recurring_days: [],
                session_time: "18:00",
                session_duration_minutes: 60,
                auto_generate_sessions: true,
                meeting_link: "",
                default_course_fee: 0,
                agreed_tutor_payout: 0,
                notes: ""
            });
            router.refresh();
        } catch (err: any) {
            setFormError(err.message || "An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'upcoming':
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Upcoming</Badge>;
            case 'ongoing':
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Ongoing</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Completed</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Batch Classes</h1>
                            <p className="text-sm text-muted-foreground">Manage cohort classes, enrollment rosters, session schedules, and course fee collection.</p>
                        </div>
                    </div>
                </div>

                {canCreate && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button id="create-batch-button" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20">
                                <Plus className="h-4 w-4" />
                                Create New Batch
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                            <form onSubmit={handleCreateBatch}>
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Create New Batch</DialogTitle>
                                    <DialogDescription>
                                        Configure cohort class parameters, assigned tutor, schedule, and student capacity.
                                    </DialogDescription>
                                </DialogHeader>

                                {formError && (
                                    <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="batch-name">Batch Name *</Label>
                                            <Input
                                                id="batch-name"
                                                placeholder="e.g. Spoken English - Cohort 1"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="course-name">Course Name *</Label>
                                            <Input
                                                id="course-name"
                                                placeholder="e.g. English Mastery Level 1"
                                                value={formData.course_name}
                                                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="teacher-id">Assigned Tutor</Label>
                                            <Select
                                                value={formData.teacher_id}
                                                onValueChange={(val) => setFormData({ ...formData, teacher_id: val })}
                                            >
                                                <SelectTrigger id="teacher-id">
                                                    <SelectValue placeholder="Select tutor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Tutor Assigned</SelectItem>
                                                    {tutors.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>
                                                            {t.full_name} ({t.email})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="capacity">Student Capacity *</Label>
                                            <Input
                                                id="capacity"
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={formData.capacity}
                                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 20 })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="start-date">Start Date *</Label>
                                            <Input
                                                id="start-date"
                                                type="date"
                                                value={formData.start_date}
                                                onChange={(e) => {
                                                    const newStart = e.target.value;
                                                    updateSchedule(newStart, formData.course_duration_days, formData.recurring_days, formData.session_time, formData.session_duration_minutes);
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="course-duration-days">Total Number of Classes / Sessions *</Label>
                                            <Input
                                                id="course-duration-days"
                                                type="number"
                                                min="1"
                                                max="365"
                                                placeholder="e.g. 10, 20, 30 classes"
                                                value={formData.course_duration_days || ""}
                                                onChange={(e) => {
                                                    const count = parseInt(e.target.value, 10) || 0;
                                                    updateSchedule(formData.start_date, count, formData.recurring_days, formData.session_time, formData.session_duration_minutes);
                                                }}
                                                required
                                            />
                                            {formData.end_date && (
                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                    Calculated Schedule: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{formData.course_duration_days} classes</span> from <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{formData.start_date}</span> to <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{formData.end_date}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Structured Days & Time Picker */}
                                    <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/50">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                                Class Days & Time Schedule
                                            </Label>
                                            <span className="text-[11px] text-muted-foreground">Select session days & time</span>
                                        </div>

                                        {/* Day Pills */}
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-medium text-foreground">Select Calendar Days:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                                    const isSelected = formData.recurring_days.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => {
                                                                const newDays = isSelected
                                                                    ? formData.recurring_days.filter(d => d !== day)
                                                                    : [...formData.recurring_days, day];
                                                                updateSchedule(formData.start_date, formData.course_duration_days, newDays, formData.session_time, formData.session_duration_minutes);
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer",
                                                                isSelected
                                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                                    : "bg-background text-muted-foreground border-border/70 hover:border-border hover:text-foreground"
                                                            )}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Time and Duration */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <div className="space-y-1">
                                                <Label htmlFor="session-time" className="text-xs flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-indigo-500" />
                                                    Session Time
                                                </Label>
                                                <Input
                                                    id="session-time"
                                                    type="time"
                                                    value={formData.session_time}
                                                    onChange={(e) => {
                                                        const newTime = e.target.value;
                                                        updateSchedule(formData.start_date, formData.course_duration_days, formData.recurring_days, newTime, formData.session_duration_minutes);
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="session-duration" className="text-xs">Duration</Label>
                                                <Select 
                                                    value={String(formData.session_duration_minutes)} 
                                                    onValueChange={(val) => {
                                                        const mins = parseInt(val, 10) || 60;
                                                        updateSchedule(formData.start_date, formData.course_duration_days, formData.recurring_days, formData.session_time, mins);
                                                    }}
                                                >
                                                    <SelectTrigger id="session-duration">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="30">30 minutes</SelectItem>
                                                        <SelectItem value="45">45 minutes</SelectItem>
                                                        <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                                                        <SelectItem value="75">75 minutes</SelectItem>
                                                        <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                                                        <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Auto-generate Sessions Checkbox */}
                                        {formData.recurring_days.length > 0 && (
                                            <div className="pt-2 border-t border-border/30 flex items-start gap-2.5">
                                                <input
                                                    id="auto-generate-sessions"
                                                    type="checkbox"
                                                    checked={formData.auto_generate_sessions}
                                                    onChange={(e) => setFormData({ ...formData, auto_generate_sessions: e.target.checked })}
                                                    className="mt-0.5 h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                                <label htmlFor="auto-generate-sessions" className="text-xs text-foreground cursor-pointer select-none">
                                                    <span className="font-semibold block">Auto-schedule sessions on these calendar days</span>
                                                    <span className="text-[11px] text-muted-foreground block">
                                                        Generates all {formData.course_duration_days || 10} session slots across your selected calendar days without any date locking.
                                                    </span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="schedule-description">Class Schedule Description (Optional)</Label>
                                        <Input
                                            id="schedule-description"
                                            placeholder="e.g. Mon, Wed, Fri at 6:00 PM (Auto-filled from days above)"
                                            value={formData.schedule_description}
                                            onChange={(e) => setFormData({ ...formData, schedule_description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="meeting-link">Live Meeting Link</Label>
                                        <Input
                                            id="meeting-link"
                                            placeholder="https://meet.google.com/xyz-abc"
                                            value={formData.meeting_link}
                                            onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="default-fee">Default Course Fee per Student (₹)</Label>
                                            <Input
                                                id="default-fee"
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder="e.g. 999"
                                                value={formData.default_course_fee === 0 ? "" : formData.default_course_fee}
                                                onChange={(e) => setFormData({ ...formData, default_course_fee: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="agreed-payout">Agreed Tutor Course Stipend (₹)</Label>
                                            <Input
                                                id="agreed-payout"
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder="e.g. 15000"
                                                value={formData.agreed_tutor_payout === 0 ? "" : formData.agreed_tutor_payout}
                                                onChange={(e) => setFormData({ ...formData, agreed_tutor_payout: parseFloat(e.target.value) || 0 })}
                                            />
                                            <span className="text-[11px] text-muted-foreground">Fixed payout for the full course. Admin manages via HR Payroll.</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="notes">Internal Notes</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Cohort syllabus goals, prerequisites, or special terms..."
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button id="submit-create-batch" type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        {isSubmitting ? "Creating..." : "Create Batch"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Batches</CardTitle>
                        <Layers className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBatches}</div>
                        <p className="text-xs text-muted-foreground mt-1">Cohort learning groups</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cohort Students</CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStudents}</div>
                        <p className="text-xs text-muted-foreground mt-1">Enrolled across all batches</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fees Collected</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Course enrollment revenue</p>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conducted Sessions</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalConductedSessions}</div>
                        <p className="text-xs text-muted-foreground mt-1">Completed batch classes</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search-batches"
                        placeholder="Search by batch name, course, or tutor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-background/50"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] bg-background/50">
                            <SelectValue placeholder="Status Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Batches Grid */}
            {filteredBatches.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="text-lg font-bold">No Batches Found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {search || statusFilter !== "all" 
                            ? "Try adjusting your search criteria or status filter." 
                            : "Create your first batch to start offering cohort classes."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBatches.map(batch => {
                        const capacityPct = Math.min(100, Math.round((batch.enrolled_count / batch.capacity) * 100));

                        return (
                            <Card 
                                key={batch.id} 
                                className="group relative overflow-hidden border border-border/60 hover:border-indigo-500/40 transition-all duration-300 hover:shadow-lg bg-card/80 backdrop-blur-sm flex flex-col justify-between"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <Badge variant="outline" className="font-mono text-xs bg-muted/50 truncate max-w-[180px]">
                                            {batch.course_name}
                                        </Badge>
                                        {getStatusBadge(batch.status)}
                                    </div>
                                    <CardTitle className="text-lg font-bold mt-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {batch.name}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{batch.schedule_description}</span>
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4 pb-4">
                                    {/* Capacity Progress */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5" /> Enrolled Students
                                            </span>
                                            <span className="font-semibold">{batch.enrolled_count} / {batch.capacity}</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                                            <div 
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    capacityPct >= 100 ? "bg-rose-500" : capacityPct >= 75 ? "bg-amber-500" : "bg-indigo-500"
                                                )}
                                                style={{ width: `${capacityPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Tutor Card */}
                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 truncate">
                                            <div className="h-7 w-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
                                                {batch.teacher?.full_name?.charAt(0) || "T"}
                                            </div>
                                            <div className="truncate">
                                                <div className="font-medium text-foreground truncate">{batch.teacher?.full_name || "Unassigned Tutor"}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{batch.teacher?.email || "No email"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Batch Metrics Pills */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 rounded-lg bg-background/50 border border-border/40">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Sessions</span>
                                            <span className="font-semibold text-foreground">
                                                {batch.completed_sessions} / {batch.total_sessions} completed
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-background/50 border border-border/40">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Revenue</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                ₹{batch.total_collected_fees.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>

                                <div className="px-6 pb-6 pt-1 border-t border-border/30 mt-auto">
                                    <Link href={`/batches/${batch.id}`}>
                                        <Button variant="outline" className="w-full justify-between group/btn hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300">
                                            <span className="font-medium text-xs">Manage Cohort & Roster</span>
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
