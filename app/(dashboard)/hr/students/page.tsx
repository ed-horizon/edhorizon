
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import StudentDirectoryClient from "@/components/features/hr/StudentDirectoryClient";

export default async function StudentDirectory() {
    const supabase = await createClient();

    // Fetch students with profile and student_details info
    const { data: students, error } = await supabase
        .from('profiles')
        .select(`
            *,
            student_details!student_details_id_fkey (
                *,
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey (
                    full_name,
                    staff_details (status)
                )
            )
        `)
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("Error fetching students in StudentDirectory:", error);
    }

    // Helper to ensure student_details is an object if returned as an array
    const processedStudents = (students as any)?.map((s: any) => ({
        ...s,
        student_details: Array.isArray(s.student_details) ? s.student_details[0] : s.student_details
    })) || [];

    // Fetch teachers/tutors list for assignment selection
    const { data: teachers } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            email,
            staff_details (status)
        `)
        .eq('role', 'teacher')
        .order('full_name', { ascending: true });

    // Fetch current user role
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id || '')
        .single();
    const currentUserRole = profile?.role || 'student';

    // Filter out locked tutors and students of locked tutors for non-super-admins
    let filteredStudents = processedStudents;
    let filteredTeachers = teachers || [];

    if (currentUserRole !== 'super_admin') {
        filteredStudents = processedStudents.filter((s: any) => {
            const assignedTeacher = s.student_details?.assigned_teacher;
            const teacherDetails = Array.isArray(assignedTeacher?.staff_details)
                ? assignedTeacher?.staff_details[0]
                : assignedTeacher?.staff_details;
            return teacherDetails?.status !== 'locked';
        });

        filteredTeachers = (teachers || []).filter((t: any) => {
            const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
            return details?.status !== 'locked';
        });
    }

    const cleanTeachers = filteredTeachers.map((t: any) => ({
        id: t.id,
        full_name: t.full_name,
        email: t.email
    }));

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Student Directory</h1>
                    <p className="text-muted-foreground mt-1">Full registry of academy students and their enrollment status.</p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            <StudentDirectoryClient 
                initialStudents={filteredStudents} 
                teachers={cleanTeachers}
                currentUserRole={currentUserRole}
            />
        </div>
    );
}
