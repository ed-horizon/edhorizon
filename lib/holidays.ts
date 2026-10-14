/**
 * Calculates exact UTC start and end bounds for a given date in India Standard Time (IST, UTC+5:30).
 * E.g., for "2026-08-15":
 *   Start IST: 2026-08-15 00:00:00 -> UTC: 2026-08-14 18:30:00.000Z
 *   End IST:   2026-08-15 23:59:59.999 -> UTC: 2026-08-15 18:29:59.999Z
 */
export function getIstDayUtcBounds(dateStr: string) {
    const parts = dateStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5 hours 30 minutes

    // Start of day in IST converted to UTC
    const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS;
    // End of day in IST converted to UTC
    const endUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS;

    return {
        startUtcIso: new Date(startUtcMs).toISOString(),
        endUtcIso: new Date(endUtcMs).toISOString()
    };
}
