"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Edit3, Phone, BookOpen, DollarSign, FileText } from "lucide-react";
import { updateHRCandidateDetails } from "@/app/(dashboard)/hr/pipeline/actions";
import { HRCandidate, HR_CANDIDATE_STATUSES, HRCandidateStatus } from "@/lib/hr-candidates";
import { toast } from "sonner";

interface EditCandidateDialogProps {
    candidate: HRCandidate | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditCandidateDialog({
    candidate,
    open,
    onOpenChange,
    onSuccess,
}: EditCandidateDialogProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [subject, setSubject] = useState("");
    const [salaryDiscussed, setSalaryDiscussed] = useState("");
    const [status, setStatus] = useState<HRCandidateStatus>("new");
    const [feedback, setFeedback] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && candidate) {
            setName(candidate.name || "");
            setPhone(candidate.phone || "");
            setSubject(candidate.subject || "");
            setSalaryDiscussed(candidate.salary_discussed || "");
            setStatus(candidate.status || "new");
            setFeedback(candidate.feedback || "");
        }
    }, [open, candidate]);

    if (!candidate) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await updateHRCandidateDetails(candidate.id, {
                name,
                phone,
                subject,
                salary_discussed: salaryDiscussed,
                status,
                feedback,
            });

            if (res.success) {
                toast.success("Candidate details updated successfully!");
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error || "Failed to update candidate");
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <Edit3 className="text-indigo-600" size={20} />
                        Edit Candidate Profile
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Update details and notes for this candidate.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-name" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            Candidate Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-10 rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Phone size={13} className="text-indigo-500" />
                                Mobile Number <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="edit-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-subject" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <BookOpen size={13} className="text-indigo-500" />
                                Subject <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="edit-subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-10 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-salary" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <DollarSign size={13} className="text-emerald-500" />
                                Salary Discussed
                            </Label>
                            <Input
                                id="edit-salary"
                                value={salaryDiscussed}
                                onChange={(e) => setSalaryDiscussed(e.target.value)}
                                placeholder="e.g. ₹25,000/mo or ₹300/hr"
                                disabled={isLoading}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-status" className="text-xs font-semibold text-foreground">
                                Status
                            </Label>
                            <Select
                                value={status}
                                onValueChange={(val) => setStatus(val as HRCandidateStatus)}
                                disabled={isLoading}
                            >
                                <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {HR_CANDIDATE_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-feedback" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <FileText size={13} className="text-amber-500" />
                            Feedback / Interview Notes
                        </Label>
                        <Textarea
                            id="edit-feedback"
                            rows={3}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            disabled={isLoading}
                            className="rounded-xl resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-border">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium px-5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

