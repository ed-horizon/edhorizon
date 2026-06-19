
import { getStudents } from "@/app/(dashboard)/content/actions";
import { AttendanceSheet } from "@/components/features/teacher/AttendanceSheet";
import { createClient } from "@/lib/supabase/server";

export default async function AttendancePage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch class details
    const { data: classData, error: classError } = await supabase
        .from('live_classes')
        .select('*')
        .eq('id', id)
        .single();

    if (classError || !classData) {
        return <div className="p-12 text-center text-muted-foreground italic">Class session not found.</div>;
    }

    // 2. Fetch student details separately
    const { data: student } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', classData.student_id)
        .single();

    // 3. Fetch initial student attendance status
    const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('student_id, status')
        .eq('class_id', id)
        .eq('student_id', classData.student_id)
        .single();

    const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
    if (attendanceData) {
        initialAttendance[attendanceData.student_id] = attendanceData.status;
    }

    return (
        <div className="p-8 md:p-12 space-y-12">
            <div>
                <h1 className="text-4xl font-serif font-bold italic tracking-tight text-indigo-900 dark:text-indigo-100">
                    Session: {classData.title}
                </h1>
                <p className="text-muted-foreground italic text-lg">Mark attendance for your 1:1 session with {student?.full_name}.</p>
            </div>

            <AttendanceSheet 
                classId={id} 
                students={student ? [student] : []} 
                initialAttendance={initialAttendance}
                isCompleted={classData?.status === 'completed'}
            />
        </div>
    );
}
