export type HRCandidateStatus =
    | "new"
    | "screening"
    | "interview_scheduled"
    | "selected"
    | "rejected"
    | "onboarded";

export interface HRCandidate {
    id: string;
    name: string;
    phone: string;
    subject: string;
    salary_discussed: string;
    status: HRCandidateStatus;
    feedback: string;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
}

export interface HRCandidatePayload {
    name: string;
    phone: string;
    subject: string;
    salary_discussed?: string;
    status?: HRCandidateStatus;
    feedback?: string;
}

export const HR_CANDIDATE_STATUSES: {
    value: HRCandidateStatus;
    label: string;
    color: string;
    badgeClass: string;
}[] = [
    {
        value: "new",
        label: "New Lead",
        color: "blue",
        badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
        value: "screening",
        label: "Screening",
        color: "amber",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
        value: "interview_scheduled",
        label: "Interview Scheduled",
        color: "purple",
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
        value: "selected",
        label: "Selected",
        color: "emerald",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
        value: "rejected",
        label: "Rejected",
        color: "rose",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
    {
        value: "onboarded",
        label: "Onboarded",
        color: "teal",
        badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    },
];

export const VALID_HR_PIPELINE_ROLES = ["hr", "admin", "super_admin"] as const;

export function isHRPipelineAuthorized(role: string | null | undefined): boolean {
    if (!role) return false;
    return (VALID_HR_PIPELINE_ROLES as readonly string[]).includes(role);
}

export function validateCandidatePayload(payload: Partial<HRCandidatePayload>): {
    valid: boolean;
    error?: string;
    sanitized?: HRCandidatePayload;
} {
    const name = payload.name?.trim();
    if (!name || name.length < 2) {
        return { valid: false, error: "Candidate name must be at least 2 characters long." };
    }

    const phone = payload.phone?.trim();
    if (!phone || phone.length < 5) {
        return { valid: false, error: "A valid mobile number is required." };
    }

    const subject = payload.subject?.trim();
    if (!subject) {
        return { valid: false, error: "Subject is required." };
    }

    const validStatuses = HR_CANDIDATE_STATUSES.map((s) => s.value);
    const status = payload.status && validStatuses.includes(payload.status) ? payload.status : "new";

    const salary_discussed = payload.salary_discussed?.trim() || "";
    const feedback = payload.feedback?.trim() || "";

    return {
        valid: true,
        sanitized: {
            name,
            phone,
            subject,
            salary_discussed,
            status,
            feedback,
        },
    };
}

export function filterCandidates(
    candidates: HRCandidate[],
    filters: { status?: string; search?: string }
): HRCandidate[] {
    let result = candidates;

    if (filters.status && filters.status !== "all") {
        result = result.filter((c) => c.status === filters.status);
    }

    if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        result = result.filter(
            (c) =>
                c.name.toLowerCase().includes(query) ||
                c.phone.toLowerCase().includes(query) ||
                c.subject.toLowerCase().includes(query) ||
                (c.feedback && c.feedback.toLowerCase().includes(query)) ||
                (c.salary_discussed && c.salary_discussed.toLowerCase().includes(query))
        );
    }

    return result;
}

export function getWhatsAppUrl(phone: string, candidateName?: string): string {
    const digits = (phone || "").replace(/\D/g, "");
    if (!digits) return "#";
    // If standard 10-digit number without country code, default to India (+91)
    const cleanNumber = digits.length === 10 ? `91${digits}` : digits;
    const greeting = candidateName
        ? `Hello ${candidateName}, this is Ed Horizon HR regarding your candidate profile.`
        : `Hello, this is Ed Horizon HR regarding your candidate profile.`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(greeting)}`;
}

