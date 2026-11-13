"use client";

import { useState, useTransition } from "react";
import {
    HRCandidate,
    HRCandidateStatus,
    HR_CANDIDATE_STATUSES,
    filterCandidates,
} from "@/lib/hr-candidates";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { EditCandidateDialog } from "./EditCandidateDialog";
import { CandidateFeedbackModal } from "./CandidateFeedbackModal";
import {
    updateHRCandidateStatus,
    deleteHRCandidate,
    getHRCandidates,
} from "@/app/(dashboard)/hr/pipeline/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    Phone,
    BookOpen,
    DollarSign,
    MessageSquare,
    Edit3,
    Trash2,
    Users,
    UserCheck,
    Calendar,
    CheckCircle2,
    XCircle,
    UserPlus,
    Filter,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CandidatePipelineViewProps {
    initialCandidates: HRCandidate[];
    currentUserRole: string;
}

export function CandidatePipelineView({
    initialCandidates,
    currentUserRole,
}: CandidatePipelineViewProps) {
    const [candidates, setCandidates] = useState<HRCandidate[]>(initialCandidates);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
    const [isPending, startTransition] = useTransition();

    // Modals
    const [feedbackCandidate, setFeedbackCandidate] = useState<HRCandidate | null>(null);
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

    const [editCandidate, setEditCandidate] = useState<HRCandidate | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);

    const refreshData = async () => {
        startTransition(async () => {
            const res = await getHRCandidates();
            if (res.success) {
                setCandidates(res.candidates);
            }
        });
    };

    // Fast inline status update
    const handleStatusChange = async (candidateId: string, newStatus: HRCandidateStatus) => {
        // Optimistic UI update
        const previousCandidates = [...candidates];
        setCandidates((prev) =>
            prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
        );

        try {
            const res = await updateHRCandidateStatus(candidateId, newStatus);
            if (res.success) {
                const statusMeta = HR_CANDIDATE_STATUSES.find((s) => s.value === newStatus);
                toast.success(`Candidate status moved to "${statusMeta?.label || newStatus}"`);
            } else {
                setCandidates(previousCandidates);
                toast.error(res.error || "Failed to update status");
            }
        } catch (err: any) {
            setCandidates(previousCandidates);
            toast.error(err.message || "Failed to update status");
        }
    };

    // Delete candidate
    const handleDelete = async (candidate: HRCandidate) => {
        if (!confirm(`Are you sure you want to remove candidate "${candidate.name}" from the pipeline?`)) {
            return;
        }

        const previousCandidates = [...candidates];
        setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));

        try {
            const res = await deleteHRCandidate(candidate.id);
            if (res.success) {
                toast.success(`Candidate "${candidate.name}" deleted`);
            } else {
                setCandidates(previousCandidates);
                toast.error(res.error || "Failed to delete candidate");
            }
        } catch (err: any) {
            setCandidates(previousCandidates);
            toast.error(err.message || "Failed to delete candidate");
        }
    };

    // Calculate metrics
    const totalCount = candidates.length;
    const screeningCount = candidates.filter((c) => c.status === "screening").length;
    const interviewCount = candidates.filter((c) => c.status === "interview_scheduled").length;
    const selectedCount = candidates.filter((c) => c.status === "selected").length;
    const onboardedCount = candidates.filter((c) => c.status === "onboarded").length;
    const rejectedCount = candidates.filter((c) => c.status === "rejected").length;

    // Filter candidates for display
    const filteredList = filterCandidates(candidates, {
        status: selectedStatusFilter,
        search: searchQuery,
    });

    const getStatusBadge = (status: HRCandidateStatus) => {
        const meta = HR_CANDIDATE_STATUSES.find((s) => s.value === status);
        return (
            <Badge
                variant="outline"
                className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", meta?.badgeClass)}
            >
                {meta?.label || status}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card
                    onClick={() => setSelectedStatusFilter("all")}
                    className={cn(
                        "cursor-pointer border transition-all rounded-2xl hover:shadow-md",
                        selectedStatusFilter === "all" ? "ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20" : ""
                    )}
                >
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
                            <Users size={16} className="text-indigo-600" />
                        </div>
                        <div className="text-2xl font-black text-foreground">{totalCount}</div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">All Candidates</span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedStatusFilter("screening")}
                    className={cn(
                        "cursor-pointer border transition-all rounded-2xl hover:shadow-md",
                        selectedStatusFilter === "screening" ? "ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20" : ""
                    )}
                >
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider">Screening</span>
                            <UserCheck size={16} className="text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{screeningCount}</div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Under Review</span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedStatusFilter("interview_scheduled")}
                    className={cn(
                        "cursor-pointer border transition-all rounded-2xl hover:shadow-md",
                        selectedStatusFilter === "interview_scheduled" ? "ring-2 ring-purple-500 bg-purple-50/20 dark:bg-purple-950/20" : ""
                    )}
                >
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider">Interview</span>
                            <Calendar size={16} className="text-purple-500" />
                        </div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{interviewCount}</div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Scheduled Demos</span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedStatusFilter("selected")}
                    className={cn(
                        "cursor-pointer border transition-all rounded-2xl hover:shadow-md",
                        selectedStatusFilter === "selected" ? "ring-2 ring-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20" : ""
                    )}
                >
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider">Selected</span>
                            <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{selectedCount}</div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Offer Ready</span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedStatusFilter("onboarded")}
                    className={cn(
                        "cursor-pointer border transition-all rounded-2xl hover:shadow-md",
                        selectedStatusFilter === "onboarded" ? "ring-2 ring-teal-500 bg-teal-50/20 dark:bg-teal-950/20" : ""
                    )}
                >
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider">Onboarded</span>
                            <CheckCircle2 size={16} className="text-teal-500" />
                        </div>
                        <div className="text-2xl font-black text-teal-600 dark:text-teal-400">{onboardedCount}</div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Active Staff</span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedStatusFilter("rejected")}
                    className={cn(
                        "cursor-pointer border transition-all rounded-2xl hover:shadow-md",
                        selectedStatusFilter === "rejected" ? "ring-2 ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20" : ""
                    )}
                >
                    <CardContent className="p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider">Rejected</span>
                            <XCircle size={16} className="text-rose-500" />
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{rejectedCount}</div>
                        <span className="text-[11px] text-muted-foreground mt-0.5">Not Qualified</span>
                    </CardContent>
                </Card>
            </div>

            {/* Filter, Search & Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by candidate name, phone, subject, or notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl bg-background border-border text-sm"
                        />
                    </div>

                    <div className="w-[180px] shrink-0">
                        <Select
                            value={selectedStatusFilter}
                            onValueChange={(val) => setSelectedStatusFilter(val)}
                        >
                            <SelectTrigger className="h-10 rounded-xl bg-background border-border text-xs font-medium">
                                <Filter size={13} className="mr-1.5 text-muted-foreground" />
                                <SelectValue placeholder="Filter Stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                {HR_CANDIDATE_STATUSES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={refreshData}
                        disabled={isPending}
                        title="Refresh"
                        className="h-10 w-10 shrink-0 rounded-xl"
                    >
                        <RefreshCw size={15} className={cn(isPending && "animate-spin")} />
                    </Button>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                    <AddCandidateDialog onSuccess={refreshData} />
                </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/40 border-b border-border text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                            <tr>
                                <th className="py-3 px-4">Candidate</th>
                                <th className="py-3 px-4">Mobile</th>
                                <th className="py-3 px-4">Subject</th>
                                <th className="py-3 px-4">Salary Discussed</th>
                                <th className="py-3 px-4">Status / Stage</th>
                                <th className="py-3 px-4">Feedback & Notes</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Users size={32} className="text-muted-foreground/40" />
                                            <p className="font-semibold text-foreground">No candidate profiles found</p>
                                            <p className="text-xs">
                                                {searchQuery || selectedStatusFilter !== "all"
                                                    ? "Try clearing filters to view all candidates."
                                                    : "Click 'Add Candidate' to record your first candidate lead."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredList.map((candidate) => (
                                    <tr
                                        key={candidate.id}
                                        className="hover:bg-muted/20 transition-colors group"
                                    >
                                        {/* Candidate Name & Date */}
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-foreground text-sm">
                                                {candidate.name}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Added {format(new Date(candidate.created_at), "dd MMM yyyy")}
                                            </div>
                                        </td>

                                        {/* Phone */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <a
                                                href={`tel:${candidate.phone}`}
                                                className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-indigo-600 transition-colors"
                                            >
                                                <Phone size={13} className="text-indigo-500" />
                                                <span>{candidate.phone}</span>
                                            </a>
                                        </td>

                                        {/* Subject */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <Badge variant="secondary" className="font-medium text-xs rounded-lg px-2 py-0.5 bg-muted">
                                                <BookOpen size={11} className="mr-1 text-muted-foreground" />
                                                {candidate.subject}
                                            </Badge>
                                        </td>

                                        {/* Salary Discussed */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            {candidate.salary_discussed ? (
                                                <span className="font-semibold text-xs text-foreground bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg inline-block">
                                                    {candidate.salary_discussed}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Not specified</span>
                                            )}
                                        </td>

                                        {/* Status Update Dropdown */}
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <div className="w-[170px]">
                                                <Select
                                                    value={candidate.status}
                                                    onValueChange={(val) =>
                                                        handleStatusChange(candidate.id, val as HRCandidateStatus)
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 rounded-lg text-xs font-semibold border-border bg-background">
                                                        <SelectValue>
                                                            {getStatusBadge(candidate.status)}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {HR_CANDIDATE_STATUSES.map((s) => (
                                                            <SelectItem
                                                                key={s.value}
                                                                value={s.value}
                                                                className="text-xs font-medium"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <span
                                                                        className={cn(
                                                                            "h-2 w-2 rounded-full",
                                                                            s.value === "new" && "bg-blue-500",
                                                                            s.value === "screening" && "bg-amber-500",
                                                                            s.value === "interview_scheduled" && "bg-purple-500",
                                                                            s.value === "selected" && "bg-emerald-500",
                                                                            s.value === "rejected" && "bg-rose-500",
                                                                            s.value === "onboarded" && "bg-teal-500"
                                                                        )}
                                                                    />
                                                                    {s.label}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </td>

                                        {/* Feedback / Notes Preview & Edit */}
                                        <td className="py-3.5 px-4 max-w-[260px]">
                                            <div
                                                onClick={() => {
                                                    setFeedbackCandidate(candidate);
                                                    setFeedbackModalOpen(true);
                                                }}
                                                className="cursor-pointer group/notes p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                                                title="Click to view/edit notes"
                                            >
                                                {candidate.feedback ? (
                                                    <div className="flex items-start gap-1.5">
                                                        <MessageSquare size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                                        <span className="text-xs text-foreground line-clamp-2 leading-relaxed">
                                                            {candidate.feedback}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic group-hover/notes:text-indigo-600 transition-colors">
                                                        <MessageSquare size={13} />
                                                        <span>+ Add feedback / notes</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Action buttons */}
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditCandidate(candidate);
                                                        setEditModalOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                                                    title="Edit Candidate Details"
                                                >
                                                    <Edit3 size={14} />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(candidate)}
                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                                    title="Delete Candidate"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <CandidateFeedbackModal
                candidate={feedbackCandidate}
                open={feedbackModalOpen}
                onOpenChange={setFeedbackModalOpen}
                onSuccess={(candidateId, newFeedback) => {
                    setCandidates((prev) =>
                        prev.map((c) =>
                            c.id === candidateId ? { ...c, feedback: newFeedback } : c
                        )
                    );
                }}
            />

            <EditCandidateDialog
                candidate={editCandidate}
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                onSuccess={refreshData}
            />
        </div>
    );
}

