import { getStudents } from "@/app/(dashboard)/content/actions";
import { AttendanceSheet } from "@/components/features/teacher/AttendanceSheet";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

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

    // Guard 1: Block if class is scheduled/ongoing but teacher has not checked in (logged in)
    if (classData.status !== 'completed' && classData.status !== 'cancelled' && !classData.tutor_joined_at) {
        return (
            <div className="p-8 md:p-12 max-w-[600px] mx-auto text-center space-y-6">
                <Card className="rounded-[2.5rem] border-2 border-dashed border-rose-500/30 p-8 shadow-xl bg-card">
                    <AlertCircle className="mx-auto mb-4 text-rose-500 animate-pulse" size={48} />
                    <h2 className="text-2xl font-serif font-bold italic tracking-tight text-rose-950 dark:text-rose-100">Check-in Required</h2>
                    <p className="text-sm text-muted-foreground italic mt-2 leading-relaxed">
                        You must log in to the class from the dashboard first before you can mark student attendance.
                    </p>
                    <div className="pt-6">
                        <Link href="/teacher">
                            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] px-6 h-12 shadow-lg shadow-indigo-600/10">
                                Return to Dashboard
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    // Guard 2: Enforce 20-minute class start lockout (block attendance logging for 20 mins since start)
    const scheduledTime = new Date(classData.scheduled_at).getTime();
    const now = new Date().getTime();
    const elapsedMinutes = (now - scheduledTime) / (1000 * 60);

    if (classData.status !== 'completed' && classData.status !== 'cancelled' && elapsedMinutes < 20) {
        const unlockTime = new Date(scheduledTime + 20 * 60 * 1000);
        return (
            <div className="p-8 md:p-12 max-w-[600px] mx-auto text-center space-y-6">
                <Card className="rounded-[2.5rem] border-2 border-dashed border-indigo-500/30 p-8 shadow-xl bg-card">
                    <Clock className="mx-auto mb-4 text-indigo-500 animate-pulse" size={48} />
                    <h2 className="text-2xl font-serif font-bold italic tracking-tight text-indigo-950 dark:text-indigo-100">Session Locked</h2>
                    <p className="text-sm text-muted-foreground italic mt-2 leading-relaxed">
                        Attendance marking is locked. You can log attendance starting 20 minutes after the scheduled class start time.
                    </p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-4 uppercase tracking-widest">
                        Available at: {unlockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="pt-6">
                        <Link href="/teacher">
                            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] px-6 h-12 shadow-lg shadow-indigo-600/10">
                                Return to Dashboard
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    // Guard 3: Lock session if scheduled more than 24 hours ago
    if (classData.status !== 'completed' && classData.status !== 'cancelled' && elapsedMinutes > 24 * 60) {
        return (
            <div className="p-8 md:p-12 max-w-[600px] mx-auto text-center space-y-6">
                <Card className="rounded-[2.5rem] border-2 border-dashed border-rose-500/30 p-8 shadow-xl bg-card">
                    <AlertCircle className="mx-auto mb-4 text-rose-500" size={48} />
                    <h2 className="text-2xl font-serif font-bold italic tracking-tight text-rose-950 dark:text-rose-100">Session Locked</h2>
                    <p className="text-sm text-muted-foreground italic mt-2 leading-relaxed">
                        This session is locked because it was scheduled more than 24 hours ago. Tutors are only permitted to mark attendance within 24 hours of the session.
                    </p>
                    <p className="text-xs text-muted-foreground font-semibold mt-4">
                        Please contact HR or Operations to log this session.
                    </p>
                    <div className="pt-6">
                        <Link href="/teacher">
                            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] px-6 h-12 shadow-lg shadow-indigo-600/10">
                                Return to Dashboard
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
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
