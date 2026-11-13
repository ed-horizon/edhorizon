import test from "node:test";
import assert from "node:assert/strict";
import {
    isHRPipelineAuthorized,
    validateCandidatePayload,
    filterCandidates,
    HR_CANDIDATE_STATUSES,
} from "../lib/hr-candidates.ts";

test("HR Pipeline Authorization: strictly allows hr, admin, and super_admin", () => {
    assert.equal(isHRPipelineAuthorized("hr"), true);
    assert.equal(isHRPipelineAuthorized("admin"), true);
    assert.equal(isHRPipelineAuthorized("super_admin"), true);

    // Forbidden roles
    assert.equal(isHRPipelineAuthorized("student"), false);
    assert.equal(isHRPipelineAuthorized("teacher"), false);
    assert.equal(isHRPipelineAuthorized("sales"), false);
    assert.equal(isHRPipelineAuthorized("sales_head"), false);
    assert.equal(isHRPipelineAuthorized("operations"), false);
    assert.equal(isHRPipelineAuthorized("parent"), false);
    assert.equal(isHRPipelineAuthorized(null), false);
    assert.equal(isHRPipelineAuthorized(undefined), false);
    assert.equal(isHRPipelineAuthorized(""), false);
});

test("HR Candidate Validation: requires valid name, phone, and subject", () => {
    // Missing name
    const resNoName = validateCandidatePayload({
        name: "",
        phone: "+91 9876543210",
        subject: "Mathematics",
    });
    assert.equal(resNoName.valid, false);
    assert.match(resNoName.error, /name must be at least 2 characters/i);

    // Missing phone
    const resNoPhone = validateCandidatePayload({
        name: "Aakash Sharma",
        phone: "123",
        subject: "Mathematics",
    });
    assert.equal(resNoPhone.valid, false);
    assert.match(resNoPhone.error, /valid mobile number is required/i);

    // Missing subject
    const resNoSubject = validateCandidatePayload({
        name: "Aakash Sharma",
        phone: "+91 9876543210",
        subject: "   ",
    });
    assert.equal(resNoSubject.valid, false);
    assert.match(resNoSubject.error, /subject is required/i);

    // Valid payload
    const resValid = validateCandidatePayload({
        name: "  Pooja Verma  ",
        phone: "  9876543210  ",
        subject: "  Hindi & Sanskrit ",
        salary_discussed: "  ₹25,000/mo  ",
        status: "screening",
        feedback: "  Strong teaching experience in CBSE curriculum  ",
    });
    assert.equal(resValid.valid, true);
    assert.deepEqual(resValid.sanitized, {
        name: "Pooja Verma",
        phone: "9876543210",
        subject: "Hindi & Sanskrit",
        salary_discussed: "₹25,000/mo",
        status: "screening",
        feedback: "Strong teaching experience in CBSE curriculum",
    });
});

test("HR Candidate Validation: defaults invalid status to 'new'", () => {
    const res = validateCandidatePayload({
        name: "Rahul Nair",
        phone: "+91 9845012345",
        subject: "Physics",
        status: "non_existent_status",
    });
    assert.equal(res.valid, true);
    assert.equal(res.sanitized.status, "new");
});

test("HR Candidate Filtering: filters by status and text search", () => {
    const mockCandidates = [
        {
            id: "1",
            name: "Sunil Kumar",
            phone: "9876543210",
            subject: "Mathematics",
            salary_discussed: "₹300/hr",
            status: "screening",
            feedback: "Cleared round 1",
            created_at: "2026-11-10T10:00:00Z",
            updated_at: "2026-11-10T10:00:00Z",
        },
        {
            id: "2",
            name: "Meera Sen",
            phone: "9123456780",
            subject: "English Literature",
            salary_discussed: "₹28,000/mo",
            status: "interview_scheduled",
            feedback: "Demo scheduled for Friday",
            created_at: "2026-11-11T10:00:00Z",
            updated_at: "2026-11-11T10:00:00Z",
        },
        {
            id: "3",
            name: "David D'Souza",
            phone: "9988776655",
            subject: "Chemistry",
            salary_discussed: "₹35,000/mo",
            status: "selected",
            feedback: "Selected by Head of Academics",
            created_at: "2026-11-12T10:00:00Z",
            updated_at: "2026-11-12T10:00:00Z",
        },
    ];

    // Filter by status
    const screeningOnly = filterCandidates(mockCandidates, { status: "screening" });
    assert.equal(screeningOnly.length, 1);
    assert.equal(screeningOnly[0].name, "Sunil Kumar");

    // Filter by search name
    const searchByName = filterCandidates(mockCandidates, { search: "meera" });
    assert.equal(searchByName.length, 1);
    assert.equal(searchByName[0].id, "2");

    // Filter by search subject
    const searchBySubject = filterCandidates(mockCandidates, { search: "chemistry" });
    assert.equal(searchBySubject.length, 1);
    assert.equal(searchBySubject[0].name, "David D'Souza");

    // Filter by phone
    const searchByPhone = filterCandidates(mockCandidates, { search: "98765" });
    assert.equal(searchByPhone.length, 1);
    assert.equal(searchByPhone[0].name, "Sunil Kumar");

    // Filter by feedback notes
    const searchByFeedback = filterCandidates(mockCandidates, { search: "Friday" });
    assert.equal(searchByFeedback.length, 1);
    assert.equal(searchByFeedback[0].name, "Meera Sen");
});

