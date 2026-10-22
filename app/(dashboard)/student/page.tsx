import { getStudentDashboardData, getCurrentProfile } from "@/app/(dashboard)/attendance/actions";
import { StudentDashboardClient } from "@/components/features/student/StudentDashboardClient";
import { getStudentPayments } from "@/app/(dashboard)/payments/actions";
import { getStudentAssignedCapsules } from "@/app/(dashboard)/student/learn/actions";
import { getStudentEnrolledBatches } from "@/app/(dashboard)/batches/actions";

export default async function StudentDashboard() {
    const [profile, data, payments, assignedCapsules, enrolledBatches] = await Promise.all([
        getCurrentProfile(),
        getStudentDashboardData(),
        getStudentPayments(),
        getStudentAssignedCapsules(),
        getStudentEnrolledBatches()
    ]);

    const studentName = profile?.full_name || "Student";

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
                assignedCapsules={assignedCapsules || []}
                enrolledBatches={enrolledBatches || []}
            />
        </div>
    );
}
