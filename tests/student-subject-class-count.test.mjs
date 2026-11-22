import test from 'node:test';
import assert from 'node:assert/strict';
import { isSubjectMatch, getLocalDateKey } from '../lib/utils.ts';

// Helper simulating StudentDashboardClient subjectCompletions calculation
function calculateSubjectCompletions(activeSubjects, activeSchedules, activeSchedule, completedClasses) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return activeSubjects.map(sub => {
        const matchingSchedule = (activeSchedules || []).find(sch => 
            isSubjectMatch(sch.title || sch.subject || "", sub.name)
        ) || (activeSubjects.length === 1 ? activeSchedule : null);

        let startStr = null;
        let endStr = null;
        if (matchingSchedule) {
            startStr = matchingSchedule.start_date ?? null;
            endStr = matchingSchedule.end_date ?? null;
        }

        const completedClassesForSubject = completedClasses.filter(c => {
            let isMatch = false;
            if (isSubjectMatch(c.title || "", sub.name)) {
                isMatch = true;
            } else if (c.schedule_id && matchingSchedule && c.schedule_id === matchingSchedule.id) {
                const isOtherSubject = activeSubjects.some(
                    other => other.name !== sub.name && isSubjectMatch(c.title || "", other.name)
                );
                if (!isOtherSubject) {
                    isMatch = true;
                }
            } else if (activeSubjects.length === 1) {
                isMatch = true;
            }

            if (!isMatch) return false;

            const classDateStr = getLocalDateKey(c.scheduled_at);
            const currentStart = startStr;
            const currentEnd = endStr;
            if (currentStart && currentEnd) {
                return classDateStr >= currentStart && classDateStr <= currentEnd;
            }
            
            const currentMonthStr = String(currentMonth + 1).padStart(2, '0');
            const currentYearStr = String(currentYear);
            return classDateStr.startsWith(`${currentYearStr}-${currentMonthStr}`);
        });

        return {
            ...sub,
            completed: completedClassesForSubject.length
        };
    });
}

test('isSubjectMatch: empty and null inputs safely return false without matching all strings', () => {
    assert.equal(isSubjectMatch('', 'Maths'), false);
    assert.equal(isSubjectMatch('Maths', ''), false);
    assert.equal(isSubjectMatch('   ', 'Science'), false);
    assert.equal(isSubjectMatch(null, 'Science'), false);
    assert.equal(isSubjectMatch(undefined, 'Maths'), false);
});

test('isSubjectMatch: matches Math and Science variations accurately', () => {
    assert.equal(isSubjectMatch('Maths', 'Maths'), true);
    assert.equal(isSubjectMatch('Math', 'Maths'), true);
    assert.equal(isSubjectMatch('Mathematics', 'Maths'), true);
    assert.equal(isSubjectMatch('Science', 'Science'), true);
    assert.equal(isSubjectMatch('Physics Grade 8', 'Science'), true);
    assert.equal(isSubjectMatch('Chemistry', 'Science'), true);
    assert.equal(isSubjectMatch('Biology Lab', 'Science'), true);
    assert.equal(isSubjectMatch('EVS Environmental', 'Science'), true);

    // Cross-subject isolation
    assert.equal(isSubjectMatch('Maths', 'Science'), false);
    assert.equal(isSubjectMatch('Science', 'Maths'), false);
    assert.equal(isSubjectMatch('Hindi Session', 'Maths'), false);
});

test('Student Dashboard: Anahat Kaur scenario (Maths & Science, 4 classes each) counts each subject as 4, never 8', () => {
    const activeSubjects = [
        { name: 'Maths', fee: 3500, classesPerMonth: 4, tutor: 'Teacher A' },
        { name: 'Science', fee: 3500, classesPerMonth: 4, tutor: 'Teacher B' }
    ];

    // Suppose only one schedule is in activeSchedules (the Maths schedule)
    const activeSchedules = [
        { id: 'sch_maths_1', title: 'Maths - Anahat Kaur', start_date: '2026-11-01', end_date: '2026-11-30' }
    ];
    const activeSchedule = activeSchedules[0];

    const completedClasses = [
        { id: 'c1', title: 'Maths', status: 'completed', scheduled_at: '2026-11-04T10:00:00Z', schedule_id: 'sch_maths_1' },
        { id: 'c2', title: 'Maths', status: 'completed', scheduled_at: '2026-11-07T10:00:00Z', schedule_id: 'sch_maths_1' },
        { id: 'c3', title: 'Maths', status: 'completed', scheduled_at: '2026-11-11T10:00:00Z', schedule_id: 'sch_maths_1' },
        { id: 'c4', title: 'Maths', status: 'completed', scheduled_at: '2026-11-14T10:00:00Z', schedule_id: 'sch_maths_1' },
        { id: 'c5', title: 'Science', status: 'completed', scheduled_at: '2026-11-05T10:00:00Z', schedule_id: 'sch_science_1' },
        { id: 'c6', title: 'Science', status: 'completed', scheduled_at: '2026-11-08T10:00:00Z', schedule_id: 'sch_science_1' },
        { id: 'c7', title: 'Science', status: 'completed', scheduled_at: '2026-11-12T10:00:00Z', schedule_id: 'sch_science_1' },
        { id: 'c8', title: 'Science', status: 'completed', scheduled_at: '2026-11-15T10:00:00Z', schedule_id: 'sch_science_1' },
    ];

    const result = calculateSubjectCompletions(activeSubjects, activeSchedules, activeSchedule, completedClasses);

    const mathsSub = result.find(s => s.name === 'Maths');
    const scienceSub = result.find(s => s.name === 'Science');

    assert.equal(mathsSub.completed, 4, 'Maths must have exactly 4 completed classes');
    assert.equal(scienceSub.completed, 4, 'Science must have exactly 4 completed classes, NOT 8');
});

test('Student Dashboard: single-subject student counts all matching classes accurately', () => {
    const activeSubjects = [
        { name: 'Maths', fee: 4500, classesPerMonth: 12, tutor: 'Teacher A' }
    ];
    const activeSchedules = [
        { id: 'sch_maths_1', title: 'Maths Class', start_date: '2026-11-01', end_date: '2026-11-30' }
    ];
    const completedClasses = [
        { id: 'c1', title: 'Maths', status: 'completed', scheduled_at: '2026-11-04T10:00:00Z', schedule_id: 'sch_maths_1' },
        { id: 'c2', title: 'Maths Extra', status: 'completed', scheduled_at: '2026-11-07T10:00:00Z', schedule_id: 'sch_maths_1' },
        { id: 'c3', title: 'General Session', status: 'completed', scheduled_at: '2026-11-11T10:00:00Z', schedule_id: 'sch_maths_1' },
    ];

    const result = calculateSubjectCompletions(activeSubjects, activeSchedules, activeSchedules[0], completedClasses);
    assert.equal(result[0].completed, 3);
});
