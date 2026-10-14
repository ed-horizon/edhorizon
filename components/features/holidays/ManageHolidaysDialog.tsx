'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
    CalendarDays, Plus, Trash2, AlertCircle, CheckCircle2, 
    RefreshCw, Palmtree, ShieldAlert, Sparkles 
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { 
    getAcademyHolidays, 
    getHolidayClassImpactPreview, 
    declareAcademyHoliday, 
    deleteAcademyHoliday,
    type AcademyHoliday,
    type HolidayImpactPreview 
} from "@/app/(dashboard)/holidays/actions"

interface ManageHolidaysDialogProps {
    currentUserRole?: string;
    onHolidayChanged?: () => void;
    triggerButton?: React.ReactNode;
    initialDate?: string; // Pre-fill with clicked calendar date "YYYY-MM-DD"
}

export function ManageHolidaysDialog({
    currentUserRole,
    onHolidayChanged,
    triggerButton,
    initialDate
}: ManageHolidaysDialogProps) {
    const isManager = ['super_admin', 'admin', 'operations', 'hr'].includes(currentUserRole || '');

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'declare' | 'list'>('declare');
    const [holidays, setHolidays] = useState<AcademyHoliday[]>([]);
    const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [holidayDate, setHolidayDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Impact preview state
    const [impactPreview, setImpactPreview] = useState<HolidayImpactPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // Delete Modal State
    const [deletingHoliday, setDeletingHoliday] = useState<AcademyHoliday | null>(null);
    const [restoreClassesOnDelete, setRestoreClassesOnDelete] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch existing holidays
    const fetchHolidays = async () => {
        setIsLoadingHolidays(true);
        try {
            const data = await getAcademyHolidays();
            setHolidays(data || []);
        } catch (err) {
            console.error("Failed to load holidays:", err);
        } finally {
            setIsLoadingHolidays(false);
        }
    };

    // Load impact preview whenever holidayDate changes
    useEffect(() => {
        if (!isOpen || !holidayDate) return;

        let isCancelled = false;
        const checkPreview = async () => {
            setIsLoadingPreview(true);
            try {
                const preview = await getHolidayClassImpactPreview(holidayDate);
                if (!isCancelled) {
                    setImpactPreview(preview);
                }
            } catch (err) {
                console.error("Failed to preview holiday impact:", err);
            } finally {
                if (!isCancelled) setIsLoadingPreview(false);
            }
        };

        checkPreview();
        return () => {
            isCancelled = true;
        };
    }, [holidayDate, isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchHolidays();
            if (initialDate) {
                setHolidayDate(initialDate);
            }
        }
    }, [isOpen, initialDate]);

    const handleDeclareHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Please enter a holiday title");
            return;
        }
        if (!holidayDate) {
            toast.error("Please select a date");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await declareAcademyHoliday({
                title: title.trim(),
                holiday_date: holidayDate,
                description: description.trim() || undefined
            });

            if (res.success) {
                const count = res.cancelledCount || 0;
                toast.success(
                    `Holiday declared! ${count} scheduled class session${count === 1 ? '' : 's'} cancelled automatically.`
                );
                setTitle("");
                setDescription("");
                await fetchHolidays();
                setActiveTab('list');
                if (onHolidayChanged) onHolidayChanged();
            } else {
                toast.error(res.error || "Failed to declare holiday");
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteHoliday = async () => {
        if (!deletingHoliday) return;

        setIsDeleting(true);
        try {
            const res = await deleteAcademyHoliday(deletingHoliday.id, restoreClassesOnDelete);
            if (res.success) {
                const restored = res.restoredCount || 0;
                toast.success(
                    restoreClassesOnDelete && restored > 0
                        ? `Holiday removed. Restored ${restored} classes back to scheduled.`
                        : `Holiday removed successfully.`
                );
                setDeletingHoliday(null);
                await fetchHolidays();
                if (onHolidayChanged) onHolidayChanged();
            } else {
                toast.error(res.error || "Failed to delete holiday");
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {triggerButton ? (
                    triggerButton
                ) : (
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-bold uppercase tracking-wider text-xs gap-2"
                    >
                        <Palmtree size={14} className="text-amber-600 dark:text-amber-400" />
                        <span>Academy Holidays</span>
                        {holidays.length > 0 && (
                            <Badge className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0 h-4 rounded-full border-none">
                                {holidays.length}
                            </Badge>
                        )}
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 md:p-8 bg-card border-border/40 text-left">
                <DialogHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                            <Palmtree size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight">
                                Academy Holidays & Class Cancellations
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Declare holidays to automatically cancel all scheduled sessions across all teachers for that day.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-border/20 pt-2 pb-3">
                    <Button
                        type="button"
                        variant={activeTab === 'declare' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('declare')}
                        className="rounded-xl text-xs font-bold gap-1.5"
                    >
                        <Plus size={14} />
                        Declare Holiday
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => {
                            setActiveTab('list');
                            fetchHolidays();
                        }}
                        className="rounded-xl text-xs font-bold gap-1.5"
                    >
                        <CalendarDays size={14} />
                        Annual Holidays List ({holidays.length})
                    </Button>
                </div>

                {/* TAB 1: DECLARE HOLIDAY */}
                {activeTab === 'declare' && (
                    <form onSubmit={handleDeclareHoliday} className="space-y-5 pt-2">
                        {!isManager && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs flex items-center gap-2">
                                <AlertCircle size={16} />
                                <span>You have read-only access. Only Admin, HR, and Operations can declare holidays.</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="holiday-date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Holiday Date *
                                </Label>
                                <Input
                                    id="holiday-date"
                                    type="date"
                                    value={holidayDate}
                                    onChange={(e) => setHolidayDate(e.target.value)}
                                    disabled={!isManager || isSubmitting}
                                    className="rounded-xl bg-muted/20 border-border/40 text-xs font-mono font-bold"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="holiday-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Holiday Name *
                                </Label>
                                <Input
                                    id="holiday-title"
                                    placeholder="e.g. Independence Day, Diwali Break"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={!isManager || isSubmitting}
                                    className="rounded-xl bg-muted/20 border-border/40 text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="holiday-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Notes / Description (Optional)
                            </Label>
                            <Textarea
                                id="holiday-desc"
                                placeholder="e.g. Academy closed in observance of national holiday. All tutor sessions suspended."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={!isManager || isSubmitting}
                                className="rounded-xl bg-muted/20 border-border/40 text-xs min-h-[70px]"
                            />
                        </div>

                        {/* LIVE IMPACT PREVIEW */}
                        <div className="p-4 rounded-2xl border bg-muted/15 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Sparkles size={12} className="text-amber-500" />
                                    Automated Cancellation Preview
                                </span>
                                {isLoadingPreview && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <RefreshCw size={10} className="animate-spin" /> Checking classes...
                                    </span>
                                )}
                            </div>

                            {impactPreview && !isLoadingPreview && (
                                <div className="space-y-2">
                                    {impactPreview.classesCount > 0 ? (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs">
                                            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                                <span>
                                                    {impactPreview.classesCount} class session{impactPreview.classesCount === 1 ? '' : 's'} across {impactPreview.teachersCount} teacher{impactPreview.teachersCount === 1 ? '' : 's'} will be automatically cancelled.
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground pl-6">
                                                Tutors and students will see the holiday cancellation notice, and payroll will safely exclude them.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1 text-xs">
                                            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                                <span>No scheduled classes currently exist on this date.</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground pl-6">
                                                Marking this holiday will ensure recurring schedule generation skips this date.
                                            </p>
                                        </div>
                                    )}

                                    {/* Sample classes preview if any */}
                                    {impactPreview.classes.length > 0 && (
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                                            {impactPreview.classes.slice(0, 5).map((c) => (
                                                <div key={c.id} className="p-2 bg-card rounded-lg border border-border/20 text-[11px] flex items-center justify-between gap-2">
                                                    <div>
                                                        <span className="font-bold">{c.title}</span>
                                                        <span className="text-muted-foreground text-[10px] ml-2">
                                                            (Tutor: {c.teacher_name} • Student: {c.student_name})
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        {format(new Date(c.scheduled_at), 'hh:mm a')}
                                                    </span>
                                                </div>
                                            ))}
                                            {impactPreview.classes.length > 5 && (
                                                <p className="text-[10px] text-muted-foreground text-center italic">
                                                    + {impactPreview.classes.length - 5} more sessions
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Submit button */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!isManager || isSubmitting}
                                className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-lg shadow-amber-600/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span>Applying Holiday Cancellation...</span>
                                    </>
                                ) : (
                                    <>
                                        <Palmtree size={14} />
                                        <span>
                                            Declare Holiday & Cancel {impactPreview?.classesCount || 0} Classes
                                        </span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}

                {/* TAB 2: ANNUAL HOLIDAYS LIST */}
                {activeTab === 'list' && (
                    <div className="space-y-4 pt-2">
                        {isLoadingHolidays ? (
                            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
                                <RefreshCw size={14} className="animate-spin" />
                                <span>Loading annual holidays...</span>
                            </div>
                        ) : holidays.length === 0 ? (
                            <div className="p-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/40 space-y-2">
                                <Palmtree size={28} className="mx-auto text-amber-500/50" />
                                <p className="font-semibold">No academy holidays declared yet.</p>
                                <p className="text-[11px] opacity-75">Click &quot;Declare Holiday&quot; above to mark national or academy holidays.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                                {holidays.map((h) => {
                                    const parsedDate = new Date(`${h.holiday_date}T00:00:00`);
                                    return (
                                        <div 
                                            key={h.id} 
                                            className="p-4 bg-muted/15 border border-border/30 rounded-2xl flex items-center justify-between gap-4 group hover:border-amber-500/40 transition-colors"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-foreground">{h.title}</span>
                                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9px] font-mono px-2 py-0 rounded-full">
                                                        {h.holiday_date}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    {format(parsedDate, 'EEEE, MMMM dd, yyyy')}
                                                </p>
                                                {h.description && (
                                                    <p className="text-[11px] text-muted-foreground/80 italic">
                                                        &ldquo;{h.description}&rdquo;
                                                    </p>
                                                )}
                                                {typeof h.cancelled_classes_count === 'number' && h.cancelled_classes_count > 0 && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                                        • {h.cancelled_classes_count} class{h.cancelled_classes_count === 1 ? '' : 'es'} auto-cancelled
                                                    </p>
                                                )}
                                            </div>

                                            {isManager && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setDeletingHoliday(h);
                                                        setRestoreClassesOnDelete(true);
                                                    }}
                                                    className="h-8 w-8 p-0 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                                    title="Remove Holiday"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>

            {/* DELETE CONFIRMATION MODAL */}
            {deletingHoliday && (
                <Dialog open={!!deletingHoliday} onOpenChange={(open) => !open && setDeletingHoliday(null)}>
                    <DialogContent className="max-w-md rounded-[2rem] p-6 bg-card border-border/40 text-left">
                        <DialogHeader>
                            <div className="flex items-center gap-2 text-rose-600">
                                <ShieldAlert size={20} />
                                <DialogTitle className="text-base font-bold">Remove Academy Holiday?</DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground pt-1">
                                Are you sure you want to remove <span className="font-bold text-foreground">&ldquo;{deletingHoliday.title}&rdquo;</span> on <span className="font-mono">{deletingHoliday.holiday_date}</span>?
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-3 bg-muted/20 border border-border/30 rounded-xl space-y-2 mt-2">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={restoreClassesOnDelete}
                                    onChange={(e) => setRestoreClassesOnDelete(e.target.checked)}
                                    className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-foreground block">Restore Cancelled Classes</span>
                                    <span className="text-[10px] text-muted-foreground block">
                                        Revert classes cancelled for this holiday back to scheduled status.
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletingHoliday(null)}
                                className="rounded-xl text-xs"
                                disabled={isDeleting}
                            >
                                Keep Holiday
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDeleteHoliday}
                                disabled={isDeleting}
                                className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span>Removing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={12} />
                                        <span>Confirm Removal</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}
