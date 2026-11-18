import { finalizeClassSession } from "@/app/(dashboard)/attendance/actions";

export interface StudentAttendanceInput {
    studentId: string;
    status: 'present' | 'absent' | 'late';
}

export interface AttendanceSubmissionResult {
    success: boolean;
    error?: string;
    isSkewError?: boolean;
}

/**
 * Robust client-side submission for class attendance.
 * Uses a static REST endpoint (/api/attendance/finalize) first to prevent Next.js
 * deployment hash skew ("Server Action was not found on the server"),
 * with transparent fallback to Server Action.
 */
export async function submitFinalizeClassSession(
    classId: string,
    studentAttendances: StudentAttendanceInput[],
    topicTaught: string,
    homeworkGiven: string,
    studentPerformance: string,
    parentNote: string
): Promise<AttendanceSubmissionResult> {
    const payload = {
        classId,
        studentAttendances,
        topicTaught,
        homeworkGiven,
        studentPerformance,
        parentNote
    };

    // 1. Primary: REST API route (immune to deployment action-hash skew)
    try {
        const res = await fetch('/api/attendance/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data?.success) {
            return { success: true };
        }

        if (data && data.error) {
            return { success: false, error: data.error };
        }

        if (!res.ok) {
            // If the route gave 4xx or 5xx without JSON error, throw to attempt fallback
            throw new Error(`HTTP ${res.status}`);
        }
    } catch (apiErr: any) {
        console.warn("[attendance-client] REST route failed, attempting Server Action fallback:", apiErr?.message);
    }

    // 2. Fallback: Standard Server Action
    try {
        const actionResult = await finalizeClassSession(
            classId,
            studentAttendances,
            topicTaught,
            homeworkGiven,
            studentPerformance,
            parentNote
        );
        return actionResult;
    } catch (actionErr: any) {
        const rawMessage = String(actionErr?.message || actionErr || "");
        console.error("[attendance-client] Server Action execution error:", rawMessage);

        const isActionNotFound =
            rawMessage.includes("was not found on the server") ||
            rawMessage.includes("failed-to-find-server-action") ||
            rawMessage.includes("Failed to find Server Action");

        if (isActionNotFound) {
            return {
                success: false,
                isSkewError: true,
                error: "Your dashboard session was opened before a recent update was deployed. Please refresh your page to submit."
            };
        }

        return {
            success: false,
            error: rawMessage || "Failed to submit attendance report."
        };
    }
}
