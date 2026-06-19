"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getSettingsProfileDetails() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        throw new Error("Unauthorized");
    }

    const adminClient = createAdminClient();
    
    // Fetch profile
    const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
    if (profileError || !profile) {
        throw new Error("Profile not found");
    }

    let details: any = null;

    if (profile.role === 'student' || profile.role === 'parent') {
        const { data: studentDetails, error: studentError } = await adminClient
            .from('student_details')
            .select(`
                *,
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(full_name)
            `)
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle to prevent throw if it doesn't exist yet

        if (!studentError && studentDetails) {
            const processedDetails = Array.isArray(studentDetails) ? studentDetails[0] : studentDetails;
            
            // Format assigned teacher name
            let teacherName = "Not Assigned";
            if (processedDetails.assigned_teacher) {
                teacherName = Array.isArray(processedDetails.assigned_teacher)
                    ? processedDetails.assigned_teacher[0]?.full_name || "Not Assigned"
                    : processedDetails.assigned_teacher.full_name || "Not Assigned";
            }

            details = {
                ...processedDetails,
                assigned_teacher_name: teacherName
            };
        }
    } else {
        // Staff roles
        const { data: staffDetails, error: staffError } = await adminClient
            .from('staff_details')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (!staffError && staffDetails) {
            details = Array.isArray(staffDetails) ? staffDetails[0] : staffDetails;
        }
    }

    return {
        profile,
        details,
        email: user.email
    };
}
