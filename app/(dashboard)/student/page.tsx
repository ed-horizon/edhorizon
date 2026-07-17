import { getStudentDashboardData, getCurrentProfile } from "@/app/(dashboard)/attendance/actions";
import { StudentDashboardClient } from "@/components/features/student/StudentDashboardClient";
import { getStudentPayments } from "@/app/(dashboard)/payments/actions";

export default async function StudentDashboard() {
    const profile = await getCurrentProfile();
    const data = await getStudentDashboardData();
    const studentName = profile?.full_name || "Student";
    const payments = await getStudentPayments();

    return (
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto">
            <StudentDashboardClient 
                currentUserProfile={profile}
                studentName={studentName}
                todayClasses={data.todayClasses}
                upcomingClass={data.upcomingClass}
                allCalendarClasses={data.allCalendarClasses}
                homework={data.homework}
                materials={data.materials}
                details={data.details}
                attendanceHistory={data.attendanceHistory}
                completedClasses={data.completedClasses}
                rescheduleRequests={data.rescheduleRequests || []}
                leaveRequests={data.leaveRequests || []}
                initialPayments={payments}
                activeSchedule={data.activeSchedule}
                activeSchedules={data.activeSchedules || []}
            />
        </div>
    );
}
