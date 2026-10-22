import { getTeacherStats } from "./actions";
import { getLiveClasses, getAssignedStudents, getTeacherMissingAttendanceClasses, getTeacherRequestsData, getCurrentProfile } from "@/app/(dashboard)/attendance/actions";
import { getTeacherTodayBatchSessions, getTeacherAssignedBatches } from "@/app/(dashboard)/batches/actions";
import { TeacherDashboardClient } from "@/components/features/teacher/TeacherDashboardClient";

export default async function TeacherDashboard() {
    // Fetch statistics, live classes, assigned students, missing attendance, requests, profile, and batches in parallel
    const [stats, liveClasses, assignedStudents, missingAttendance, requests, profile, todayBatchSessions, assignedBatches] = await Promise.all([
        getTeacherStats(),
        getLiveClasses(),
        getAssignedStudents(),
        getTeacherMissingAttendanceClasses(),
        getTeacherRequestsData(),
        getCurrentProfile(),
        getTeacherTodayBatchSessions(),
        getTeacherAssignedBatches()
    ]);

    const teacherName = profile?.full_name || profile?.email?.split('@')[0] || "Tutor";

    return (
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto">
            <TeacherDashboardClient 
                teacherName={teacherName}
                initialStats={stats} 
                liveClasses={liveClasses} 
                assignedStudents={assignedStudents} 
                missingAttendance={missingAttendance}
                rescheduleRequests={requests.rescheduleRequests || []}
                leaveRequests={requests.leaveRequests || []}
                todayBatchSessions={todayBatchSessions || []}
                assignedBatches={assignedBatches || []}
            />
        </div>
    );
}
