import assert from 'node:assert/strict';
import test from 'node:test';

import { getLocalDateKey } from '../lib/date-keys.ts';

test('uses the local calendar day instead of the UTC substring', () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = 'Asia/Kolkata';

    try {
        assert.equal(getLocalDateKey('2026-07-14T20:00:00.000Z'), '2026-07-15');
    } finally {
        process.env.TZ = previousTimezone;
    }
});

test('handles a negative timezone boundary', () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';

    try {
        assert.equal(getLocalDateKey('2026-07-15T01:00:00.000Z'), '2026-07-14');
    } finally {
        process.env.TZ = previousTimezone;
    }
});
