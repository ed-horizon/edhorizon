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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, Phone, BookOpen } from "lucide-react";
import { updateHRCandidateFeedback } from "@/app/(dashboard)/hr/pipeline/actions";
import { HRCandidate, getWhatsAppUrl } from "@/lib/hr-candidates";
import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { toast } from "sonner";

interface CandidateFeedbackModalProps {
    candidate: HRCandidate | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (candidateId: string, updatedFeedback: string) => void;
}

export function CandidateFeedbackModal({
    candidate,
    open,
    onOpenChange,
    onSuccess,
}: CandidateFeedbackModalProps) {
    const [feedback, setFeedback] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && candidate) {
            setFeedback(candidate.feedback || "");
        }
    }, [open, candidate]);

    if (!candidate) return null;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const res = await updateHRCandidateFeedback(candidate.id, feedback);
            if (res.success) {
                toast.success("Feedback updated successfully!");
                onOpenChange(false);
                if (onSuccess) onSuccess(candidate.id, feedback);
            } else {
                toast.error(res.error || "Failed to update feedback");
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
                        <MessageSquare className="text-indigo-600" size={20} />
                        Feedback & Interview Notes
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Notes for <span className="font-semibold text-foreground">{candidate.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/40 p-3 rounded-xl flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <a
                            href={`tel:${candidate.phone}`}
                            className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                            title="Click to call"
                        >
                            <Phone size={13} className="text-indigo-500" />
                            <span>{candidate.phone}</span>
                        </a>
                        <a
                            href={getWhatsAppUrl(candidate.phone, candidate.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all ml-1 shadow-xs"
                            title={`Chat with ${candidate.name} on WhatsApp`}
                        >
                            <WhatsAppIcon className="h-3 w-3" />
                        </a>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <BookOpen size={13} className="text-indigo-500" />
                        {candidate.subject}
                    </div>
                </div>

                <div className="space-y-2 pt-1">
                    <Label htmlFor="candidate-feedback" className="text-xs font-semibold text-foreground">
                        Interview Remarks & Feedback
                    </Label>
                    <Textarea
                        id="candidate-feedback"
                        rows={6}
                        placeholder="Add interview assessment, strengths, demo feedback, availability details, or reasons for status..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        disabled={isLoading}
                        className="rounded-xl resize-none text-sm leading-relaxed"
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
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium px-5"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Feedback"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

