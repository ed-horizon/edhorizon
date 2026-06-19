import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import StaffDirectoryClient from "@/components/features/hr/StaffDirectoryClient";

export default async function StaffDirectory() {
    const supabase = await createClient();

    // Fetch staff with profile and staff_details info
    // Excluding: super_admin, admin, student
    const { data: staff, error } = await supabase
        .from('profiles')
        .select(`
            *,
            staff_details (*)
        `)
        .not('role', 'in', '("super_admin","admin","student","parent")')
        .order('full_name', { ascending: true });

    // For each staff member who is a teacher, fetch their student count (assigned + active schedules)
    if (staff) {
        for (const member of staff) {
            if (member.role === 'teacher') {
                const { data: assigned } = await supabase
                    .from('student_details')
                    .select('id')
                    .eq('assigned_teacher_id', member.id);

                const { data: scheduled } = await supabase
                    .from('class_schedules')
                    .select('student_id')
                    .eq('teacher_id', member.id)
                    .eq('status', 'active');

                const studentIds = new Set();
                assigned?.forEach(s => studentIds.add(s.id));
                scheduled?.forEach(s => studentIds.add(s.student_id));
                member.student_count = studentIds.size;
            }
        }
    }

    if (error) {
        console.error("Error fetching staff:", error);
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Staff Directory</h1>
                    <p className="text-muted-foreground mt-1">Full registry of academy educators and administrators.</p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            <StaffDirectoryClient initialStaff={staff || []} />
        </div>
    );
}
