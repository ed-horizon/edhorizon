const fs = require('fs');
let content = fs.readFileSync('c:\\\\Users\\\\vinit\\\\OneDrive\\\\Desktop\\\\edhorizon\\\\app\\\\(dashboard)\\\\attendance\\\\actions.ts', 'utf8');

// Replace completeLiveClass
content = content.replace(/export async function completeLiveClass\([\s\S]*?return \{ success: true \};\n\}/, `export async function completeLiveClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Just mark class as completed and pending verification
    const { error: updateError } = await supabase
        .from('live_classes')
        .update({ 
            status: 'completed',
            verification_status: 'pending'
        })
        .eq('id', classId);

    if (updateError) throw updateError;

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}`);

// Replace Teacher Attendance Block
const marker = "// --- Teacher Attendance ---";
const idx = content.indexOf(marker);
if (idx !== -1) {
    content = content.substring(0, idx) + marker + "\\n\\n" + `export async function finalizeClassSession(classId: string, studentAttendances: {studentId: string, status: 'present'|'absent'|'late'}[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Save all student attendances
    for (const att of studentAttendances) {
        await supabase
            .from('student_attendance')
            .upsert({
                class_id: classId,
                student_id: att.studentId,
                status: att.status,
                marked_by: user.id
            }, { onConflict: 'class_id,student_id' });
    }

    // Complete class
    return completeLiveClass(classId);
}

export async function verifyClassAttendance(classId: string, verificationStatus: 'verified' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Update the live_classes record
    const { data: classData, error } = await supabase
        .from('live_classes')
        .update({
            verification_status: verificationStatus,
            verified_by: user.id
        })
        .eq('id', classId)
        .select(\`
            *,
            teacher:profiles!teacher_id(
                id,
                staff_details(hourly_rate)
            )
        \`)
        .single();

    if (error) throw error;

    // 2. Automate Payroll Calculation if Verified
    if (verificationStatus === 'verified' && classData) {
        const teacherProfile = classData.teacher as any;
        const hourlyRate = teacherProfile?.staff_details?.hourly_rate || 0;
        const duration = Number(classData.duration_hours) || 1.0;

        if (hourlyRate > 0) {
            const sessionPay = duration * Number(hourlyRate);

            // Find or create active payroll run for the scheduled month
            const scheduledDate = new Date(classData.scheduled_at);
            const classMonth = scheduledDate.getMonth() + 1; // 1-12
            const classYear = scheduledDate.getFullYear();

            let { data: payrollRun } = await supabase
                .from('payroll_runs')
                .select('id')
                .eq('month', classMonth)
                .eq('year', classYear)
                .single();

            if (!payrollRun) {
                const { data: newRun } = await supabase
                    .from('payroll_runs')
                    .insert({ month: classMonth, year: classYear })
                    .select()
                    .single();
                payrollRun = newRun;
            }

            if (payrollRun) {
                const { data: existingItem } = await supabase
                    .from('payroll_items')
                    .select('*')
                    .eq('payroll_run_id', payrollRun.id)
                    .eq('staff_id', classData.teacher_id)
                    .single();

                if (existingItem) {
                    await supabase
                        .from('payroll_items')
                        .update({ amount: Number(existingItem.amount) + sessionPay })
                        .eq('id', existingItem.id);
                } else {
                    await supabase
                        .from('payroll_items')
                        .insert({
                            payroll_run_id: payrollRun.id,
                            staff_id: classData.teacher_id,
                            amount: sessionPay
                        });
                }
            }
        }
    }

    revalidatePath('/(dashboard)/hr', 'page');
    revalidatePath('/(dashboard)/admin', 'page');
    return { success: true };
}

export async function getPendingClassVerifications() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('live_classes')
        .select(\`
            *,
            teacher:profiles!teacher_id(full_name, email),
            course:courses(title)
        \`)
        .eq('status', 'completed')
        .eq('verification_status', 'pending')
        .order('scheduled_at', { ascending: false });

    if (error) throw error;

    // Fetch students manually
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return data;
}

export async function getTeacherCompletedClasses(teacherId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const targetId = teacherId || user?.id;
    if (!targetId) return [];

    const { data, error } = await supabase
        .from('live_classes')
        .select(\`
            *,
            course:courses(title),
            student_attendance(status, student_id)
        \`)
        .eq('teacher_id', targetId)
        .order('scheduled_at', { ascending: false })
        .limit(90);

    if (error) throw error;
    
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return data;
}
`;
}

fs.writeFileSync('c:\\\\Users\\\\vinit\\\\OneDrive\\\\Desktop\\\\edhorizon\\\\app\\\\(dashboard)\\\\attendance\\\\actions.ts', content, 'utf8');
