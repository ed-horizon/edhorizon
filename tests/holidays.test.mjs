import assert from 'node:assert/strict';
import test from 'node:test';

import { getIstDayUtcBounds } from '../lib/holidays.ts';

test('getIstDayUtcBounds correctly calculates UTC window for IST holiday dates', () => {
    // August 15 (Independence Day)
    const bounds = getIstDayUtcBounds('2026-08-15');

    // 00:00:00 IST on Aug 15 = 18:30:00 UTC on Aug 14
    assert.equal(bounds.startUtcIso, '2026-08-14T18:30:00.000Z');

    // 23:59:59.999 IST on Aug 15 = 18:29:59.999 UTC on Aug 15
    assert.equal(bounds.endUtcIso, '2026-08-15T18:29:59.999Z');
});

test('getIstDayUtcBounds includes all IST daytime classes and excludes adjacent days', () => {
    const { startUtcIso, endUtcIso } = getIstDayUtcBounds('2026-08-15');
    const startMs = new Date(startUtcIso).getTime();
    const endMs = new Date(endUtcIso).getTime();

    // Aug 15 at 10:00 AM IST = 04:30 UTC
    const aug15Morning = new Date('2026-08-15T04:30:00.000Z').getTime();
    assert.ok(aug15Morning >= startMs && aug15Morning <= endMs, 'Morning class on Aug 15 IST must be included');

    // Aug 15 at 9:00 PM IST = 15:30 UTC
    const aug15Night = new Date('2026-08-15T15:30:00.000Z').getTime();
    assert.ok(aug15Night >= startMs && aug15Night <= endMs, 'Evening class on Aug 15 IST must be included');

    // Aug 14 at 11:30 PM IST = 18:00 UTC on Aug 14 (30 mins before holiday starts)
    const aug14Late = new Date('2026-08-14T18:00:00.000Z').getTime();
    assert.ok(aug14Late < startMs, 'Late class on Aug 14 IST must NOT be included in Aug 15 holiday');

    // Aug 16 at 06:00 AM IST = 00:30 UTC on Aug 16 (6 hours after holiday ends)
    const aug16Early = new Date('2026-08-16T00:30:00.000Z').getTime();
    assert.ok(aug16Early > endMs, 'Early class on Aug 16 IST must NOT be included in Aug 15 holiday');
});
