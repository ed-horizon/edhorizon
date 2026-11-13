"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Plus, Loader2, UserPlus, Phone, BookOpen, DollarSign, FileText } from "lucide-react";
import { createHRCandidate } from "@/app/(dashboard)/hr/pipeline/actions";
import { HR_CANDIDATE_STATUSES, HRCandidateStatus } from "@/lib/hr-candidates";
import { toast } from "sonner";

interface AddCandidateDialogProps {
    onSuccess?: () => void;
}

export function AddCandidateDialog({ onSuccess }: AddCandidateDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<HRCandidateStatus>("new");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const name = (formData.get("name") as string) || "";
        const phone = (formData.get("phone") as string) || "";
        const subject = (formData.get("subject") as string) || "";
        const salary_discussed = (formData.get("salary_discussed") as string) || "";
        const feedback = (formData.get("feedback") as string) || "";

        try {
            const res = await createHRCandidate({
                name,
                phone,
                subject,
                salary_discussed,
                status,
                feedback,
            });

            if (res.success) {
                toast.success("Candidate profile added successfully!");
                setOpen(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error || "Failed to add candidate");
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all">
                    <UserPlus size={16} />
                    <span>Add Candidate</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                        <UserPlus className="text-indigo-600" size={20} />
                        Add New Candidate
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Add candidate profile details to the recruitment pipeline.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            Candidate Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="e.g. Aakash Sharma"
                            required
                            disabled={isLoading}
                            className="h-10 rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Phone size={13} className="text-indigo-500" />
                                Mobile Number <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="phone"
                                name="phone"
                                placeholder="e.g. +91 9876543210"
                                required
                                disabled={isLoading}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="subject" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <BookOpen size={13} className="text-indigo-500" />
                                Subject <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="subject"
                                name="subject"
                                placeholder="e.g. Mathematics, Hindi"
                                required
                                disabled={isLoading}
                                className="h-10 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="salary_discussed" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <DollarSign size={13} className="text-emerald-500" />
                                Salary Discussed
                            </Label>
                            <Input
                                id="salary_discussed"
                                name="salary_discussed"
                                placeholder="e.g. ₹25,000/mo or ₹300/hr"
                                disabled={isLoading}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="status" className="text-xs font-semibold text-foreground">
                                Initial Status
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
                        <Label htmlFor="feedback" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <FileText size={13} className="text-amber-500" />
                            Feedback / Interview Notes
                        </Label>
                        <Textarea
                            id="feedback"
                            name="feedback"
                            rows={3}
                            placeholder="Initial notes on candidate background, demo feedback, availability, etc."
                            disabled={isLoading}
                            className="rounded-xl resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-border">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
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
                                "Add Candidate"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

