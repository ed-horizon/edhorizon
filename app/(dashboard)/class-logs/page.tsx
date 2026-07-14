import { getCurrentProfile, getAllTeachers, getAllStudentsAdmin } from "@/app/(dashboard)/attendance/actions";
import { ClassLogsCalendarClient } from "@/components/features/class-logs/ClassLogsCalendarClient";
import { redirect } from "next/navigation";

export default async function ClassLogsPage() {
    const profile = await getCurrentProfile();
    if (!profile) {
        redirect("/login");
    }

    if (profile.role === "sales") {
        redirect("/");
    }

    // Only HR and Super Admin (or operations/admin) get dropdown filters. Let's fetch filters if applicable.
    const isStaffOrAdmin = ["hr", "super_admin", "operations", "admin", "sales_head"].includes(profile.role);
    let teachers: any[] = [];
    let students: any[] = [];

    if (isStaffOrAdmin) {
        const [fetchedTeachers, fetchedStudents] = await Promise.all([
            getAllTeachers(),
            getAllStudentsAdmin()
        ]);
        teachers = fetchedTeachers || [];
        students = fetchedStudents || [];
    }

    return (
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto text-left">
            <ClassLogsCalendarClient 
                currentUserProfile={profile}
                allTeachers={teachers}
                allStudents={students}
            />
        </div>
    );
}
