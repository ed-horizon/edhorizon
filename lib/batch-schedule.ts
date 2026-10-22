/**
 * Helper to calculate batch schedule and end date from start date, recurring days, and total classes count.
 * Accurately advances day by day until all classes are scheduled, even extending into future months.
 */
export function calculateBatchSchedule(
    startDateStr: string,
    recurringDays: string[] = [],
    totalClassesCount: number = 10
): { endDateStr: string; scheduledDates: string[] } {
    if (!startDateStr || !totalClassesCount || totalClassesCount <= 0) {
        return { endDateStr: "", scheduledDates: [] };
    }

    const DAY_MAP: Record<string, number> = {
        'Sun': 0, 'Sunday': 0,
        'Mon': 1, 'Monday': 1,
        'Tue': 2, 'Tuesday': 2,
        'Wed': 3, 'Wednesday': 3,
        'Thu': 4, 'Thursday': 4,
        'Fri': 5, 'Friday': 5,
        'Sat': 6, 'Saturday': 6,
    };

    const targetDays = new Set((recurringDays || []).map(d => DAY_MAP[d]).filter(d => d !== undefined));
    const parts = startDateStr.split('-').map(Number);
    const current = new Date(parts[0], parts[1] - 1, parts[2]);

    const scheduledDates: string[] = [];

    if (targetDays.size === 0) {
        for (let i = 0; i < totalClassesCount; i++) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            scheduledDates.push(`${y}-${m}-${d}`);
            current.setDate(current.getDate() + 1);
        }
    } else {
        let loops = 0;
        while (scheduledDates.length < totalClassesCount && loops < 500) {
            if (targetDays.has(current.getDay())) {
                const y = current.getFullYear();
                const m = String(current.getMonth() + 1).padStart(2, '0');
                const d = String(current.getDate()).padStart(2, '0');
                scheduledDates.push(`${y}-${m}-${d}`);
            }
            current.setDate(current.getDate() + 1);
            loops++;
        }
    }

    const lastDate = scheduledDates[scheduledDates.length - 1] || "";
    return {
        endDateStr: lastDate,
        scheduledDates
    };
}
