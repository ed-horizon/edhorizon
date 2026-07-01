export type CronAuthFailure = {
    status: 401 | 503;
    error: string;
};

export function getCronAuthFailure(
    authorizationHeader: string | null,
    cronSecret: string | undefined,
): CronAuthFailure | null {
    if (!cronSecret) {
        return { status: 503, error: "Cron is not configured." };
    }

    if (authorizationHeader !== `Bearer ${cronSecret}`) {
        return { status: 401, error: "Unauthorized" };
    }

    return null;
}
