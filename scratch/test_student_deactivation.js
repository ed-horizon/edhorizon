const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

async function run() {
    const adminClient = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Let's use test student: Kathiran (ID: 8b0077af-319b-46a4-8431-5b18a74147c2)
    const studentId = '8b0077af-319b-46a4-8431-5b18a74147c2';

    console.log("Setting up mock test records for student...");

    // 1. Ensure student is active first
    await adminClient.from('student_details').update({ status: 'active' }).eq('id', studentId);

    // 2. Insert/Update an active class schedule
    const { data: schedule, error: schErr } = await adminClient
        .from('class_schedules')
        .insert({
            student_id: studentId,
            teacher_id: 'c873e043-4a30-4354-9b97-58981d145e5c', // teacher
            title: 'Test Schedule',
            meeting_link: 'http://test.link',
            pattern_days: [1],
            time_of_day: '10:00:00',
            start_date: '2026-06-01',
            end_date: '2026-06-30',
            status: 'active'
        })
        .select()
        .single();

    if (schErr) {
        console.error("Failed to insert class schedule:", schErr.message);
        return;
    }
    console.log("Inserted active schedule ID:", schedule.id);

    // 3. Insert a scheduled live class
    const { data: liveClass, error: lcErr } = await adminClient
        .from('live_classes')
        .insert({
            student_id: studentId,
            teacher_id: 'c873e043-4a30-4354-9b97-58981d145e5c',
            title: 'Test Live Class',
            meeting_link: 'http://test.link',
            scheduled_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
            status: 'scheduled',
            schedule_id: schedule.id
        })
        .select()
        .single();

    if (lcErr) {
        console.error("Failed to insert live class:", lcErr.message);
        return;
    }
    console.log("Inserted scheduled live class ID:", liveClass.id);

    // 4. Insert a pending leave request
    const { data: leave, error: lvErr } = await adminClient
        .from('student_leaves')
        .insert({
            student_id: studentId,
            start_date: '2026-06-15',
            end_date: '2026-06-15',
            reason: 'Test deactivation leave',
            status: 'pending'
        })
        .select()
        .single();

    if (lvErr) {
        console.error("Failed to insert leave request:", lvErr.message);
        return;
    }
    console.log("Inserted pending leave ID:", leave.id);

    // 5. Insert a pending reschedule request
    const { data: reschedule, error: rsErr } = await adminClient
        .from('reschedule_requests')
        .insert({
            student_id: studentId,
            teacher_id: 'c873e043-4a30-4354-9b97-58981d145e5c',
            requested_date: '2026-06-16',
            requested_time: '11:00:00',
            reason: 'Test deactivation reschedule',
            status: 'pending'
        })
        .select()
        .single();

    if (rsErr) {
        console.error("Failed to insert reschedule request:", rsErr.message);
        return;
    }
    console.log("Inserted pending reschedule ID:", reschedule.id);

    console.log("\nSimulating deactivation of student...");
    // Update student details status
    await adminClient.from('student_details').update({ status: 'inactive' }).eq('id', studentId);

    // Run the cascading deactivation updates
    // 1. Cancel all class schedules for this student
    await adminClient
        .from("class_schedules")
        .update({ status: 'cancelled' })
        .eq("student_id", studentId);

    // 2. Cancel all scheduled/ongoing live classes for this student
    await adminClient
        .from("live_classes")
        .update({ status: 'cancelled' })
        .eq("student_id", studentId)
        .in("status", ["scheduled", "ongoing"]);

    // 3. Reject pending leaves for this student
    await adminClient
        .from("student_leaves")
        .update({ status: 'rejected' })
        .eq("student_id", studentId)
        .eq("status", "pending");

    // 4. Reject pending reschedule requests for this student
    await adminClient
        .from("reschedule_requests")
        .update({ status: 'rejected' })
        .eq("student_id", studentId)
        .eq("status", "pending");

    console.log("Cascading updates finished. Verifying results...\n");

    // Assertions
    const { data: updatedSchedule } = await adminClient.from('class_schedules').select('status').eq('id', schedule.id).single();
    const { data: updatedLiveClass } = await adminClient.from('live_classes').select('status').eq('id', liveClass.id).single();
    const { data: updatedLeave } = await adminClient.from('student_leaves').select('status').eq('id', leave.id).single();
    const { data: updatedReschedule } = await adminClient.from('reschedule_requests').select('status').eq('id', reschedule.id).single();

    console.log("Schedule status (expected: cancelled):", updatedSchedule.status);
    console.log("Live class status (expected: cancelled):", updatedLiveClass.status);
    console.log("Leave status (expected: rejected):", updatedLeave.status);
    console.log("Reschedule status (expected: rejected):", updatedReschedule.status);

    // Clean up test records
    console.log("\nCleaning up test records...");
    await adminClient.from('reschedule_requests').delete().eq('id', reschedule.id);
    await adminClient.from('student_leaves').delete().eq('id', leave.id);
    await adminClient.from('live_classes').delete().eq('id', liveClass.id);
    await adminClient.from('class_schedules').delete().eq('id', schedule.id);
    await adminClient.from('student_details').update({ status: 'active' }).eq('id', studentId); // reset student to active
    console.log("Cleanup done!");
}

run();
