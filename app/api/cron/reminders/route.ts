import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log("[CRON REMINDERS] Starting upcoming class checks...");
    const adminClient = createAdminClient();

    // 1. Calculate the check window (classes starting in 20 to 40 minutes)
    const now = new Date();
    const startTime = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 40 * 60 * 1000).toISOString();

    console.log(`[CRON REMINDERS] Checking window: ${startTime} to ${endTime}`);

    // 2. Fetch upcoming scheduled classes in this window
    const { data: upcomingClasses, error: classesError } = await adminClient
        .from('live_classes')
        .select(`
            id,
            title,
            meeting_link,
            scheduled_at,
            status,
            teacher_id,
            student_id
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_at', startTime)
        .lte('scheduled_at', endTime);

    if (classesError) {
        console.error("[CRON REMINDERS] Failed to query upcoming classes:", classesError);
        return NextResponse.json({ error: classesError.message }, { status: 500 });
    }

    if (!upcomingClasses || upcomingClasses.length === 0) {
        console.log("[CRON REMINDERS] No classes scheduled in the next 30-minute window.");
        return NextResponse.json({ success: true, message: "No upcoming classes found." });
    }

    console.log(`[CRON REMINDERS] Found ${upcomingClasses.length} upcoming classes.`);

    // 3. Collect IDs to batch query profiles & details
    const teacherIds = upcomingClasses.map(c => c.teacher_id).filter(Boolean);
    const studentIds = upcomingClasses.map(c => c.student_id).filter(Boolean);

    const [teachersRes, studentsRes, studentDetailsRes] = await Promise.all([
        adminClient.from('profiles').select('id, email, full_name').in('id', teacherIds),
        adminClient.from('profiles').select('id, full_name').in('id', studentIds),
        adminClient.from('student_details').select('id, parent_email').in('id', studentIds)
    ]);

    const teacherMap = Object.fromEntries(teachersRes.data?.map(t => [t.id, t]) || []);
    const studentMap = Object.fromEntries(studentsRes.data?.map(s => [s.id, s]) || []);
    const studentDetailsMap = Object.fromEntries(studentDetailsRes.data?.map(sd => [sd.id, sd]) || []);

    const sendResults = [];

    // 4. Process reminders for each class
    for (const cls of upcomingClasses) {
        const teacher = teacherMap[cls.teacher_id];
        const student = studentMap[cls.student_id];
        const details = studentDetailsMap[cls.student_id];

        if (!teacher) {
            console.warn(`[CRON REMINDERS] Missing teacher profile for class ${cls.id}. Skipping.`);
            continue;
        }

        // Fetch existing sent logs for this class to prevent duplicate sending
        const { data: sentLogs, error: logsError } = await adminClient
            .from('class_reminders_log')
            .select('recipient_email')
            .eq('class_id', cls.id);

        if (logsError) {
            console.error(`[CRON REMINDERS] Failed to query logs for class ${cls.id}:`, logsError);
            continue;
        }

        const alreadySentEmails = new Set(sentLogs?.map(log => log.recipient_email) || []);

        const classTime = new Date(cls.scheduled_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // A. Send to Teacher/Tutor
        if (teacher.email && !alreadySentEmails.has(teacher.email)) {
            const studentName = student?.full_name || "Student";
            const emailSubject = `Upcoming Class Reminder: ${cls.title} with ${studentName}`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h2 style="color: #4f46e5; margin-bottom: 20px; text-align: center;">Class Reminder</h2>
                    <p style="font-size: 16px; color: #1e293b; line-height: 1.5;">Hi <strong>${teacher.full_name || "Tutor"}</strong>,</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.5;">This is a friendly reminder that you have a class scheduled in 30 minutes.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: bold; width: 120px;">Subject/Class:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold;">${cls.title}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: bold;">Student Name:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${studentName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: bold;">Time:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${classTime}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
                        <a href="${cls.meeting_link}" target="_blank" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                            Join Meeting
                        </a>
                    </div>
                    
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 15px;">
                        This email was sent automatically by Ed Horizon LMS. Please do not reply directly to this email.
                    </p>
                </div>
            `;

            const sendRes = await sendEmail({ to: teacher.email, subject: emailSubject, html: emailHtml });
            if (sendRes.success) {
                await adminClient.from('class_reminders_log').insert({
                    class_id: cls.id,
                    recipient_email: teacher.email,
                    recipient_role: 'teacher',
                    subject: emailSubject,
                    body: emailHtml
                });
                sendResults.push({ classId: cls.id, recipient: teacher.email, status: "sent" });
            } else {
                console.error(`[CRON REMINDERS] Failed to send to teacher ${teacher.email}:`, sendRes.error);
                sendResults.push({ classId: cls.id, recipient: teacher.email, status: "failed", error: sendRes.error });
            }
        }

        // B. Send to Parent/Student
        const parentEmail = details?.parent_email;
        if (parentEmail && !alreadySentEmails.has(parentEmail)) {
            const tutorName = teacher.full_name || "Tutor";
            const emailSubject = `Upcoming Class Reminder: ${cls.title} with ${tutorName}`;
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    <h2 style="color: #4f46e5; margin-bottom: 20px; text-align: center;">Class Reminder</h2>
                    <p style="font-size: 16px; color: #1e293b; line-height: 1.5;">Hi <strong>Parent</strong>,</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.5;">This is a friendly reminder that your child's class is scheduled to start in 30 minutes.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: bold; width: 120px;">Subject/Class:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: bold;">${cls.title}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: bold;">Tutor Name:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${tutorName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: bold;">Time:</td>
                                <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${classTime}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
                        <a href="${cls.meeting_link}" target="_blank" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                            Join Class
                        </a>
                    </div>
                    
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 15px;">
                        This email was sent automatically by Ed Horizon LMS. Please do not reply directly to this email.
                    </p>
                </div>
            `;

            const sendRes = await sendEmail({ to: parentEmail, subject: emailSubject, html: emailHtml });
            if (sendRes.success) {
                await adminClient.from('class_reminders_log').insert({
                    class_id: cls.id,
                    recipient_email: parentEmail,
                    recipient_role: 'parent',
                    subject: emailSubject,
                    body: emailHtml
                });
                sendResults.push({ classId: cls.id, recipient: parentEmail, status: "sent" });
            } else {
                console.error(`[CRON REMINDERS] Failed to send to parent ${parentEmail}:`, sendRes.error);
                sendResults.push({ classId: cls.id, recipient: parentEmail, status: "failed", error: sendRes.error });
            }
        }
    }

    console.log(`[CRON REMINDERS] Finished processing. Sent reminders details:`, sendResults);
    return NextResponse.json({ success: true, reminders: sendResults });
}
