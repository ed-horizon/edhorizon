import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/app/(dashboard)/attendance/actions";
import { getMyAvailability } from "../availability-actions";
import { MyAvailabilityClient } from "@/components/features/teacher/MyAvailabilityClient";

export const metadata = {
    title: "My Availability | EdHorizon Tutor Portal",
    description: "Manage your weekly teaching availability from 5:00 AM to 10:00 PM IST."
};

export default async function TeacherAvailabilityPage() {
    const profile = await getCurrentProfile();

    if (!profile) {
        redirect("/login");
    }

    // Role check: Only tutors and schedule managers can access
    const allowedRoles = ['teacher', 'admin', 'super_admin', 'operations', 'hr'];
    if (!allowedRoles.includes(profile.role)) {
        redirect("/");
    }

    const { availability, bookings } = await getMyAvailability();
    const teacherName = profile.full_name || profile.email?.split('@')[0] || "Tutor";

    return (
        <div className="p-6 md:p-10 max-w-[1700px] mx-auto">
            <MyAvailabilityClient
                teacherName={teacherName}
                initialAvailability={availability || []}
                initialBookings={bookings || []}
            />
        </div>
    );
}
