import assert from "node:assert/strict";
import test from "node:test";

import { getCronAuthFailure } from "../lib/cron-auth.ts";

test("cron authentication fails closed when the secret is missing", () => {
    assert.deepEqual(getCronAuthFailure("Bearer guessed", undefined), {
        status: 503,
        error: "Cron is not configured.",
    });
});

test("cron authentication rejects missing and incorrect bearer tokens", () => {
    assert.deepEqual(getCronAuthFailure(null, "expected"), {
        status: 401,
        error: "Unauthorized",
    });
    assert.deepEqual(getCronAuthFailure("Bearer incorrect", "expected"), {
        status: 401,
        error: "Unauthorized",
    });
});

test("cron authentication accepts only the configured bearer token", () => {
    assert.equal(getCronAuthFailure("Bearer expected", "expected"), null);
});
