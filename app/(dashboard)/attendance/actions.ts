'use server'

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth, isAfter } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    deleteR2Object,
    getSignedDownloadUrl,
    getSignedUploadUrl,
    headR2Object,
} from "@/lib/r2";

const MAX_R2_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_R2_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
]);

type R2UploadPurpose = "teacher_material" | "homework_submission" | "student_material";

interface R2UploadRequest {
    fileName: string;
    mimeType: string;
    fileSize: number;
    purpose: R2UploadPurpose;
    studentId?: string;
    homeworkId?: string;
}

interface AuthorizedUploadContext {
    studentId: string | null;
    teacherId: string | null;
    homeworkId: string | null;
    keyPrefix: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unexpected R2 error";
}

type TeacherRelation = {
    staff_details?: { status?: string };
};

type StaffDetails = { status?: string | null; hourly_rate?: number | string | null };
type ProfileWithStaffDetails = {
    id: string;
    full_name?: string | null;
    email?: string | null;
    staff_details?: StaffDetails | null;
};
type StudentDetails = {
    status?: string | null;
    custom_student_id?: string | null;
    grade_level?: string | null;
    monthly_fee?: number | string | null;
    preferred_meeting_link?: string | null;
    preferred_time?: string | null;
    classes_per_month?: number | string | null;
    assigned_teacher_id?: string | null;
    assigned_teacher?: TeacherRelation | TeacherRelation[] | null;
    assigned_teacher_2?: TeacherRelation | TeacherRelation[] | null;
    assigned_teacher_3?: TeacherRelation | TeacherRelation[] | null;
    assigned_teacher_4?: TeacherRelation | TeacherRelation[] | null;
    assigned_teacher_5?: TeacherRelation | TeacherRelation[] | null;
};
type StudentProfile = ProfileWithStaffDetails & {
    student_details?: StudentDetails | null;
};
type ClassWithTeacher = {
    student_id?: string | null;
    teacher?: TeacherRelation | null;
    duration_hours?: number | string | null;
    scheduled_at?: string | null;
};
type RequestWithProfiles = {
    student?: StudentProfile | null;
    teacher?: ProfileWithStaffDetails | null;
};

function isLockedTeacherRelation(teacher: unknown) {
    const relation = Array.isArray(teacher) ? teacher[0] : teacher;
    if (!relation || typeof relation !== "object") return false;

    const typedRelation = relation as TeacherRelation;
    const staffDetails = Array.isArray(typedRelation.staff_details)
        ? typedRelation.staff_details[0]
        : typedRelation.staff_details;
    return staffDetails?.status === "locked";
}

function hasLockedAssignedTeacher(student: unknown) {
    if (!student || typeof student !== "object") return false;
    const assignments = student as Record<string, unknown>;

    return [
        assignments.assigned_teacher,
        assignments.assigned_teacher_2,
        assignments.assigned_teacher_3,
        assignments.assigned_teacher_4,
        assignments.assigned_teacher_5,
    ].some(isLockedTeacherRelation);
}

async function containsLockedTeacher(
    adminClient: ReturnType<typeof createAdminClient>,
    teacherIds: Array<string | undefined>,
) {
    const ids = teacherIds.filter((id): id is string => Boolean(id));
    if (ids.length === 0) return false;

    const { data } = await adminClient
        .from("staff_details")
        .select("id")
        .in("id", ids)
        .eq("status", "locked")
        .limit(1);

    return Boolean(data?.length);
}

function validateUploadRequest(request: R2UploadRequest) {
    if (!request.fileName.trim()) return "File name is required.";
    if (!Number.isFinite(request.fileSize) || request.fileSize <= 0) return "File is empty.";
    if (request.fileSize > MAX_R2_FILE_SIZE) return "File size exceeds the 20MB limit.";
    if (!ALLOWED_R2_MIME_TYPES.has(request.mimeType)) return "Unsupported file type.";
    return null;
}

async function authorizeR2Upload(
    supabase: SupabaseServerClient,
    userId: string,
    request: R2UploadRequest,
): Promise<{ context?: AuthorizedUploadContext; error?: string }> {
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        return { error: "Unable to verify your account role." };
    }

    if (request.purpose === "homework_submission") {
        if (!request.homeworkId) return { error: "Homework ID is required." };

        const { data: homework, error } = await supabase
            .from("homework_assignments")
            .select("id, student_id, teacher_id")
            .eq("id", request.homeworkId)
            .maybeSingle();

        if (error || !homework || homework.student_id !== userId) {
            return { error: "You cannot upload a submission for this homework." };
        }

        return {
            context: {
                studentId: userId,
                teacherId: homework.teacher_id,
                homeworkId: homework.id,
                keyPrefix: `students/${userId}/homework/${homework.id}/submissions/`,
            },
        };
    }

    if (request.purpose === "student_material") {
        if (profile.role !== "student") {
            return { error: "Only students can upload student materials." };
        }

        const { data: details } = await supabase
            .from("student_details")
            .select("assigned_teacher_id")
            .eq("id", userId)
            .maybeSingle();

        return {
            context: {
                studentId: userId,
                teacherId: details?.assigned_teacher_id || null,
                homeworkId: null,
                keyPrefix: `students/${userId}/materials/`,
            },
        };
    }

    if (!request.studentId) return { error: "Student ID is required." };
    if (!["teacher", "admin", "super_admin"].includes(profile.role)) {
        return { error: "You cannot upload teacher materials." };
    }

    if (profile.role === "teacher") {
        const { data: details } = await supabase
            .from("student_details")
            .select("assigned_teacher_id")
            .eq("id", request.studentId)
            .maybeSingle();

        if (details?.assigned_teacher_id !== userId) {
            return { error: "This student is not assigned to you." };
        }
    }

    return {
        context: {
            studentId: request.studentId,
            teacherId: userId,
            homeworkId: null,
            keyPrefix: `teachers/${userId}/students/${request.studentId}/materials/`,
        },
    };
}

function isAuthorizedR2Key(key: string, context: AuthorizedUploadContext) {
    return key.startsWith(context.keyPrefix) && !key.includes("..");
}

async function resolveR2Url(
    supabase: SupabaseServerClient,
    url: string | null | undefined,
): Promise<string | null | undefined> {
    if (!url) return url;

    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    try {
        const { data: metadata, error } = await supabase
            .from("file_metadata")
            .select("original_filename")
            .eq("r2_key", url)
            .eq("is_deleted", false)
            .maybeSingle();

        if (error || !metadata) return null;
        return await getSignedDownloadUrl(url, metadata.original_filename);
    } catch (err) {
        console.error("resolveR2Url Error:", err);
        return null;
    }
}

export async function prepareR2UploadAction(request: R2UploadRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validationError = validateUploadRequest(request);
    if (validationError) return { success: false, error: validationError };

    const authorization = await authorizeR2Upload(supabase, user.id, request);
    if (!authorization.context) {
        return { success: false, error: authorization.error || "Forbidden" };
    }

    try {
        const cleanFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const key = `${authorization.context.keyPrefix}${crypto.randomUUID()}-${cleanFileName}`;
        const uploadUrl = await getSignedUploadUrl(key, request.mimeType);

        return {
            success: true,
            uploadUrl,
            fileKey: key,
        };
    } catch (error: unknown) {
        console.error("prepareR2UploadAction error:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function completeR2UploadAction(request: R2UploadRequest & { fileKey: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validationError = validateUploadRequest(request);
    if (validationError) return { success: false, error: validationError };

    const authorization = await authorizeR2Upload(supabase, user.id, request);
    if (!authorization.context || !isAuthorizedR2Key(request.fileKey, authorization.context)) {
        return { success: false, error: authorization.error || "Invalid upload key." };
    }

    try {
        const object = await headR2Object(request.fileKey);
        if (object.ContentLength !== request.fileSize || object.ContentType !== request.mimeType) {
            await deleteR2Object(request.fileKey);
            return { success: false, error: "Uploaded file verification failed." };
        }

        const adminClient = createAdminClient();
        const { data: metadata, error: dbError } = await supabase
            .from("file_metadata")
            .select("id")
            .eq("r2_key", request.fileKey)
            .maybeSingle();

        if (dbError) {
            await deleteR2Object(request.fileKey);
            return { success: false, error: dbError.message };
        }

        if (metadata) {
            return { success: true, fileKey: request.fileKey, metadataId: metadata.id };
        }

        const { data: inserted, error: insertError } = await adminClient
            .from("file_metadata")
            .insert({
                r2_key: request.fileKey,
                original_filename: request.fileName,
                mime_type: request.mimeType,
                size_bytes: request.fileSize,
                uploaded_by: user.id,
                student_id: authorization.context.studentId,
                teacher_id: authorization.context.teacherId,
                homework_id: authorization.context.homeworkId,
                purpose: request.purpose,
                expiry_at: request.purpose === "homework_submission"
                    ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
                    : request.purpose === "teacher_material"
                    ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
                    : null
            })
            .select()
            .single();

        if (insertError) {
            await deleteR2Object(request.fileKey);
            console.error("file_metadata insertion error:", insertError);
            return { success: false, error: insertError.message };
        }

        return {
            success: true,
            fileKey: request.fileKey,
            metadataId: inserted.id,
        };
    } catch (error: unknown) {
        console.error("completeR2UploadAction error:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function deleteR2UploadAction(
    request: Pick<R2UploadRequest, "purpose" | "studentId" | "homeworkId"> & { fileKey: string },
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const authorization = await authorizeR2Upload(supabase, user.id, {
        ...request,
        fileName: "cleanup",
        mimeType: "application/pdf",
        fileSize: 1,
    });

    if (!authorization.context || !isAuthorizedR2Key(request.fileKey, authorization.context)) {
        return { success: false, error: authorization.error || "Invalid upload key." };
    }

    try {
        await deleteR2Object(request.fileKey);
        const adminClient = createAdminClient();
        await adminClient.from("file_metadata").delete().eq("r2_key", request.fileKey);
        return { success: true };
    } catch (error: unknown) {
        console.error("deleteR2UploadAction error:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// --- Live Classes ---

export async function getLiveClasses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    let query = supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name,
                staff_details(status)
            ),
            module:modules(title),
            course:courses(title)
        `);

    // If teacher, only show their sessions. If student, only show their sessions.
    if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
    } else if (profile?.role === 'student') {
        query = query.eq('student_id', user.id);
    }

    const { data, error } = await query.order('scheduled_at', { ascending: true });
    if (error) throw error;

    // Fetch students separately for these classes to avoid PostgREST relationship issues
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select(`
                id, 
                full_name,
                student_details!student_details_id_fkey (status)
            `)
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        
        const filtered = data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        })).filter(c => {
            // Hide inactive students from all dashboards/places
            const studentDetails = Array.isArray(c.student?.student_details)
                ? c.student?.student_details[0]
                : c.student?.student_details;
            if (studentDetails?.status === 'inactive') return false;

            // Hide locked teachers for non-super-admins, EXCEPT when the locked teacher is the logged in user themselves viewing their own classes
            const currentUserRole = profile?.role || 'student';
            if (currentUserRole !== 'super_admin' && c.teacher_id !== user.id) {
                const teacherDetails = Array.isArray(c.teacher?.staff_details)
                    ? c.teacher?.staff_details[0]
                    : c.teacher?.staff_details;
                if (teacherDetails?.status === 'locked') return false;
            }

            return true;
        });

        return filtered;
    }

    return data;
}

export async function getAssignedStudents() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: studentsData, error } = await supabase
        .from('student_details')
        .select('*')
        .or(`assigned_teacher_id.eq.${user.id},assigned_teacher_id_2.eq.${user.id},assigned_teacher_id_3.eq.${user.id},assigned_teacher_id_4.eq.${user.id},assigned_teacher_id_5.eq.${user.id}`)
        .neq('status', 'inactive');

    if (error) throw error;
    if (!studentsData || studentsData.length === 0) return [];

    // Fetch profiles separately to avoid PostgREST relationship issues
    const studentIds = studentsData.map(d => d.id);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds);

    if (profileError) throw profileError;

    const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) || []);

    // Fetch active class schedules to dynamically populate preferred schedule if null
    const { data: activeSchedules, error: scheduleError } = await supabase
        .from('class_schedules')
        .select('student_id, time_of_day, meeting_link, day_timings')
        .in('student_id', studentIds)
        .eq('status', 'active');

    if (scheduleError) {
        console.error("Error fetching active schedules for assigned students:", scheduleError);
    }

    const scheduleMap = Object.fromEntries(
        activeSchedules?.map(s => [s.student_id, s]) || []
    );

    return studentsData.map((d: {
        id: string;
        custom_student_id?: string | null;
        preferred_time?: string | null;
        preferred_meeting_link?: string | null;
    }) => {
        const profile = profileMap[d.id];
        const activeSch = scheduleMap[d.id];
        
        // Use active schedule fallback if preferred_time/meeting_link are null
        const preferredTime = d.preferred_time || (activeSch?.time_of_day ? activeSch.time_of_day.substring(0, 5) : null);
        const preferredMeetingLink = d.preferred_meeting_link || activeSch?.meeting_link || null;

        return {
            id: d.id,
            full_name: profile?.full_name || 'Unknown Student',
            email: profile?.email || '',
            custom_student_id: d.custom_student_id,
            preferred_meeting_link: preferredMeetingLink,
            preferred_time: preferredTime,
            day_timings: activeSch?.day_timings || null
        };
    });
}

export async function createLiveClass(payload: {
    title: string;
    meeting_link: string;
    scheduled_at: string;
    module_id?: string;
    course_id?: string;
    student_id: string;
    duration_hours?: number;
    teacher_id?: string;
    parent_note?: string;
    preferred_time?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("Scheduling failed: User not authenticated");
        return { error: "User not authenticated" };
    }

    try {
        // Check user's role to determine if they can override teacher_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdminOrOps = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
        const teacherId = (isAdminOrOps && payload.teacher_id) ? payload.teacher_id : user.id;

        // Also update the student's preferred link/time if provided
        if (payload.meeting_link) {
            let timeVal = payload.preferred_time;
            if (!timeVal && payload.scheduled_at) {
                try {
                    const dateObj = new Date(payload.scheduled_at);
                    // Convert UTC date to Indian Standard Time (UTC + 5.5 hours) to get the local preferred time
                    const istDate = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
                    timeVal = istDate.toISOString().split('T')[1].substring(0, 5);
                } catch (e) {
                    console.error("Failed to parse preferred_time from scheduled_at:", e);
                }
            }
            const { error: studentUpdateError } = await supabase
                .from('student_details')
                .update({ 
                    preferred_meeting_link: payload.meeting_link,
                    preferred_time: timeVal || null
                })
                .eq('id', payload.student_id);
            
            if (studentUpdateError) {
                console.error("Error updating student preferences:", studentUpdateError);
                // We'll continue even if this fails, as the class creation is more important
            }
        }

        const insertPayload: {
            title: string;
            meeting_link: string;
            scheduled_at: string;
            module_id: string | null;
            course_id: string | null;
            student_id: string;
            duration_hours: number;
            teacher_id: string;
            parent_note?: string;
        } = {
            title: payload.title,
            meeting_link: payload.meeting_link,
            scheduled_at: payload.scheduled_at,
            module_id: payload.module_id || null,
            course_id: payload.course_id || null,
            student_id: payload.student_id,
            duration_hours: payload.duration_hours || 1.0,
            teacher_id: teacherId
        };

        if (payload.parent_note) {
            insertPayload.parent_note = payload.parent_note;
        }

        const { error: insertError } = await supabase
            .from('live_classes')
            .insert(insertPayload);

        if (insertError) {
            console.error("Error inserting live class:", insertError);
            return { error: insertError.message };
        }

        revalidatePath('/(dashboard)', 'layout');
        return { success: true };
    } catch (error: unknown) {
        console.error("Unexpected error in createLiveClass:", error);
        return { error: getErrorMessage(error) };
    }
}

export async function cancelLiveClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const allowedRoles = ['admin', 'super_admin', 'operations', 'teacher'];
        if (!allowedRoles.includes(profile?.role || '')) {
            return { success: false, error: "Unauthorized to cancel class sessions" };
        }

        const { error } = await supabase
            .from('live_classes')
            .update({
                status: 'cancelled'
            })
            .eq('id', classId);

        if (error) {
            console.error("Error cancelling live class:", error);
            return { success: false, error: error.message };
        }

        revalidatePath('/(dashboard)', 'layout');
        return { success: true };
    } catch (error: unknown) {
        console.error("Unexpected error in cancelLiveClass:", error);
        return { success: false, error: getErrorMessage(error) };
    }
}


export async function getAllTeachers() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            email,
            staff_details (
                status
            )
        `)
        .eq('role', 'teacher')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getAllTeachers error:", error);
        return [];
    }

    const filtered = (data || []).filter(t => {
        if (currentUserRole === 'super_admin') return true;
        const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return details?.status !== 'locked';
    });

    return filtered.map(t => ({
        id: t.id,
        full_name: t.full_name,
        email: t.email
    }));
}

export async function getAllStudentsAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            email,
            student_details!student_details_id_fkey (
                status,
                custom_student_id,
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey (
                    staff_details (status)
                )
            )
        `)
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (error) {
        console.error("getAllStudentsAdmin error:", error);
        return [];
    }

    const filtered = (data || []).filter(s => {
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        if (details?.status === 'inactive') return false;
        if (currentUserRole === 'super_admin') return true;
        return !isLockedTeacherRelation(details?.assigned_teacher);
    });

    return filtered.map(s => {
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        return {
            id: s.id,
            full_name: s.full_name,
            email: s.email,
            custom_student_id: details?.custom_student_id || null
        };
    });
}

export async function getCurrentProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (error) {
        console.error("getCurrentProfile error:", error);
        return null;
    }
    return profile;
}

export async function completeLiveClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch caller's profile role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Check if scheduled more than 24 hours ago
    const { data: classObj } = await supabase
        .from('live_classes')
        .select('scheduled_at')
        .eq('id', classId)
        .single();

    if (profile?.role === 'teacher' && classObj?.scheduled_at) {
        const elapsed = new Date().getTime() - new Date(classObj.scheduled_at).getTime();
        if (elapsed > 24 * 60 * 60 * 1000) {
            return { 
                success: false, 
                error: "This session is locked because it was scheduled more than 24 hours ago. Tutors are only permitted to mark attendance within 24 hours of the session. Please contact HR or Operations to log this session." 
            };
        }
    }

    // Just mark class as completed and pending verification
    const { error: updateError } = await supabase
        .from('live_classes')
        .update({ 
            status: 'completed',
            verification_status: 'pending'
        })
        .eq('id', classId);

    if (updateError) {
        console.error("completeLiveClass error:", updateError);
        return { success: false, error: updateError.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

// --- Student Attendance ---

export async function markStudentAttendance(classId: string, studentId: string, status: 'present' | 'absent' | 'late') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch caller's profile role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Check if scheduled more than 24 hours ago
    const { data: classObj } = await supabase
        .from('live_classes')
        .select('scheduled_at')
        .eq('id', classId)
        .single();

    if (profile?.role === 'teacher' && classObj?.scheduled_at) {
        const elapsed = new Date().getTime() - new Date(classObj.scheduled_at).getTime();
        if (elapsed > 24 * 60 * 60 * 1000) {
            throw new Error("This session is locked because it was scheduled more than 24 hours ago. Tutors are only permitted to mark attendance within 24 hours of the session.");
        }
    }

    const { error } = await supabase
        .from('student_attendance')
        .upsert({
            class_id: classId,
            student_id: studentId,
            status,
            marked_by: user.id
        }, {
            onConflict: 'class_id,student_id'
        });

    if (error) throw error;
    return { success: true };
}

export async function getStudentAttendance(studentId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetId = studentId || user?.id;
    if (!targetId) return [];

    const { data, error } = await supabase
        .from('student_attendance')
        .select(`
            *,
            class:live_classes(*)
        `)
        .eq('student_id', targetId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

// --- Teacher Attendance ---

export async function finalizeClassSession(
    classId: string, 
    studentAttendances: {studentId: string, status: 'present'|'absent'|'late'}[],
    topicTaught: string,
    homeworkGiven: string,
    studentPerformance: string,
    parentNote: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Tutors cannot edit attendance logs once submitted
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const { data: classObj } = await supabase
        .from('live_classes')
        .select('status, scheduled_at, tutor_joined_at, student_joined_at')
        .eq('id', classId)
        .single();

    if (profile?.role === 'teacher') {
        if (classObj?.status === 'completed') {
            return { 
                success: false, 
                error: "Tutors cannot edit attendance logs once submitted. Please contact HR or Operations to request changes." 
            };
        }
        if (classObj?.scheduled_at) {
            const scheduledTime = new Date(classObj.scheduled_at).getTime();
            const elapsed = new Date().getTime() - scheduledTime;
            if (elapsed > 24 * 60 * 60 * 1000) {
                return {
                    success: false,
                    error: "This session is locked because it was scheduled more than 24 hours ago. Tutors are only permitted to mark attendance within 24 hours of the session. Please contact HR or Operations to log this session."
                };
            }
        }
    }

    // Save all student attendances
    for (const att of studentAttendances) {
        const { error } = await supabase
            .from('student_attendance')
            .upsert({
                class_id: classId,
                student_id: att.studentId,
                status: att.status,
                marked_by: user.id
            }, { onConflict: 'class_id,student_id' });
            
        if (error) {
            console.error("finalizeClassSession Error:", error);
            return { success: false, error: error.message };
        }
    }

    // Update live_classes with status, verification_status and post-class logs
    const { error: updateError } = await supabase
        .from('live_classes')
        .update({ 
            status: 'completed',
            verification_status: 'pending',
            topic_taught: topicTaught,
            homework_given: homeworkGiven,
            student_performance: studentPerformance,
            parent_note: parentNote,
            // Join timestamps are populated only by an actual check-in.
            tutor_joined_at: classObj?.tutor_joined_at || null,
            student_joined_at: classObj?.student_joined_at || null
        })
        .eq('id', classId);

    if (updateError) {
        console.error("finalizeClassSession Live Class Update Error:", updateError);
        return { success: false, error: updateError.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

// --- Teacher Action Loggers ---

export async function assignHomework(studentId: string, title: string, description: string, dueDate: string, worksheetUrl?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const authorization = await authorizeR2Upload(supabase, user.id, {
        fileName: "authorization.pdf",
        mimeType: "application/pdf",
        fileSize: 1,
        purpose: "teacher_material",
        studentId,
    });
    if (!authorization.context) {
        return { success: false, error: authorization.error || "Forbidden" };
    }

    if (worksheetUrl && !worksheetUrl.startsWith("http")) {
        const { data: metadata } = await supabase
            .from("file_metadata")
            .select("r2_key")
            .eq("r2_key", worksheetUrl)
            .eq("uploaded_by", user.id)
            .eq("student_id", studentId)
            .eq("purpose", "teacher_material")
            .maybeSingle();

        if (!metadata) return { success: false, error: "Worksheet upload could not be verified." };
    }

    const { data: homework, error } = await supabase
        .from('homework_assignments')
        .insert({
            student_id: studentId,
            teacher_id: user.id,
            title,
            description,
            due_date: dueDate || null,
            status: 'assigned',
            worksheet_url: worksheetUrl || null
        })
        .select("id")
        .single();

    if (error) {
        console.error("assignHomework Error:", error);
        return { success: false, error: error.message };
    }

    if (worksheetUrl && !worksheetUrl.startsWith("http")) {
        const adminClient = createAdminClient();
        await adminClient
            .from("file_metadata")
            .update({ homework_id: homework.id })
            .eq("r2_key", worksheetUrl);
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true, homeworkId: homework.id };
}

export async function uploadMaterial(studentId: string, title: string, fileUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const authorization = await authorizeR2Upload(supabase, user.id, {
        fileName: "authorization.pdf",
        mimeType: "application/pdf",
        fileSize: 1,
        purpose: "teacher_material",
        studentId,
    });
    if (!authorization.context) {
        return { success: false, error: authorization.error || "Forbidden" };
    }

    if (!fileUrl.startsWith("http")) {
        const { data: metadata } = await supabase
            .from("file_metadata")
            .select("r2_key")
            .eq("r2_key", fileUrl)
            .eq("uploaded_by", user.id)
            .eq("student_id", studentId)
            .eq("purpose", "teacher_material")
            .maybeSingle();

        if (!metadata) return { success: false, error: "Material upload could not be verified." };
    }

    const { error } = await supabase
        .from('student_materials')
        .insert({
            student_id: studentId,
            teacher_id: user.id,
            title,
            file_url: fileUrl
        });

    if (error) {
        console.error("uploadMaterial Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function requestReschedule(classId: string | null, studentId: string, requestedDate: string, requestedTime: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Resolve teacher_id:
    let teacherId = null;
    if (classId) {
        const { data: classData } = await supabase
            .from('live_classes')
            .select('teacher_id')
            .eq('id', classId)
            .single();
        teacherId = classData?.teacher_id;
    }
    
    if (!teacherId) {
        const { data: studentDetails } = await supabase
            .from('student_details')
            .select('assigned_teacher_id')
            .eq('id', studentId)
            .single();
        teacherId = studentDetails?.assigned_teacher_id;
    }

    if (!teacherId) {
        return { success: false, error: "Could not find teacher for this student or class." };
    }

    const { error } = await supabase
        .from('reschedule_requests')
        .insert({
            class_id: classId || null,
            student_id: studentId,
            teacher_id: teacherId,
            requested_date: requestedDate,
            requested_time: requestedTime,
            reason,
            status: 'pending'
        });

    if (error) {
        console.error("requestReschedule Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function applyForLeave(startDate: string, endDate: string, reason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Find assigned teacher
    const { data: studentDetails } = await supabase
        .from('student_details')
        .select('assigned_teacher_id')
        .eq('id', user.id)
        .maybeSingle();

    const teacherId = studentDetails?.assigned_teacher_id || null;

    const { error } = await supabase
        .from('student_leaves')
        .insert({
            student_id: user.id,
            teacher_id: teacherId,
            start_date: startDate,
            end_date: endDate,
            reason,
            status: 'pending'
        });

    if (error) {
        console.error("applyForLeave Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getTeacherRequestsData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { rescheduleRequests: [], leaveRequests: [] };

    const { data: rescheduleRequests, error: resError } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            student:profiles!student_id(
                full_name, 
                email,
                student_details!student_details_id_fkey(status)
            )
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

    if (resError) console.error("Error fetching teacher reschedule requests:", resError);

    const { data: leaveRequests, error: leaveError } = await supabase
        .from('student_leaves')
        .select(`
            *,
            student:profiles!student_id(
                full_name, 
                email,
                student_details!student_details_id_fkey(status)
            )
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

    if (leaveError) console.error("Error fetching teacher leave requests:", leaveError);

    const filteredRescheduleRequests = (rescheduleRequests || []).filter(r => {
        const studentDetails = Array.isArray(r.student?.student_details) ? r.student?.student_details[0] : r.student?.student_details;
        return studentDetails?.status !== 'inactive';
    });

    const filteredLeaveRequests = (leaveRequests || []).filter(l => {
        const studentDetails = Array.isArray(l.student?.student_details) ? l.student?.student_details[0] : l.student?.student_details;
        return studentDetails?.status !== 'inactive';
    });

    return {
        rescheduleRequests: filteredRescheduleRequests,
        leaveRequests: filteredLeaveRequests
    };
}

export async function getAllRequestsData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { rescheduleRequests: [], leaveRequests: [] };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data: rescheduleRequests, error: resError } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            student:profiles!student_id(
                full_name, 
                email,
                student_details!student_details_id_fkey(status)
            ),
            teacher:profiles!teacher_id(
                full_name,
                staff_details (status)
            )
        `)
        .order('created_at', { ascending: false });

    if (resError) console.error("Error fetching all reschedule requests:", resError);

    const { data: leaveRequests, error: leaveError } = await supabase
        .from('student_leaves')
        .select(`
            *,
            student:profiles!student_id(
                full_name, 
                email, 
                role,
                student_details!student_details_id_fkey(status)
            ),
            teacher:profiles!teacher_id(
                full_name,
                staff_details (status)
            )
        `)
        .order('created_at', { ascending: false });

    if (leaveError) console.error("Error fetching all leave requests:", leaveError);

    const filteredRescheduleRequests = (rescheduleRequests || []).filter(r => {
        const studentDetails = Array.isArray(r.student?.student_details) ? r.student?.student_details[0] : r.student?.student_details;
        if (studentDetails?.status === 'inactive') return false;

        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(r.teacher?.staff_details) ? r.teacher?.staff_details[0] : r.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    const filteredLeaveRequests = (leaveRequests || []).filter(l => {
        const studentDetails = Array.isArray(l.student?.student_details) ? l.student?.student_details[0] : l.student?.student_details;
        if (studentDetails?.status === 'inactive') return false;

        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(l.teacher?.staff_details) ? l.teacher?.staff_details[0] : l.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    return {
        rescheduleRequests: filteredRescheduleRequests,
        leaveRequests: filteredLeaveRequests
    };
}

export async function updateRescheduleStatus(requestId: string, status: 'approved' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // 1. Fetch reschedule request details before updating
    const { data: request, error: fetchError } = await supabase
        .from('reschedule_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

    if (fetchError) {
        console.error("updateRescheduleStatus fetch error:", fetchError);
        return { success: false, error: fetchError.message };
    }

    if (!request) {
        return { success: false, error: "Reschedule request not found" };
    }

    // 2. Update status of the reschedule request
    const { error: updateError } = await supabase
        .from('reschedule_requests')
        .update({ status: status })
        .eq('id', requestId);

    if (updateError) {
        console.error("updateRescheduleStatus Error:", updateError);
        return { success: false, error: updateError.message };
    }

    // 3. If approved and there is an associated class, update scheduled_at in live_classes
    if (status === 'approved' && request.class_id) {
        try {
            const timePart = request.requested_time.substring(0, 5); // "HH:MM"
            // Construct the local ISO date-time string in Indian Standard Time (+05:30)
            // and parse it into a Date object so that toISOString() yields the correct UTC timestamp.
            const localDateTime = new Date(`${request.requested_date}T${timePart}:00+05:30`);
            
            const { error: classUpdateError } = await supabase
                .from('live_classes')
                .update({
                    scheduled_at: localDateTime.toISOString()
                })
                .eq('id', request.class_id);

            if (classUpdateError) {
                console.error("updateRescheduleStatus live_classes update error:", classUpdateError);
                return { success: false, error: classUpdateError.message };
            }
        } catch (error: unknown) {
            console.error("Error parsing date/time in updateRescheduleStatus:", error);
            return { success: false, error: "Invalid date or time format in request." };
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
        .from('student_leaves')
        .update({ status: status })
        .eq('id', leaveId);

    if (error) {
        console.error("updateLeaveStatus Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getStudentHistory(studentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { classes: [], homework: [], materials: [], reschedule: [] };

    // 1. Fetch completed live classes with logs
    const { data: classes, error: classError } = await supabase
        .from('live_classes')
        .select(`
            *,
            course:courses(title),
            student_attendance(status)
        `)
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

    if (classError) console.error("Error fetching student class history:", classError);

    // 2. Fetch homework assignments
    const { data: homework, error: hwError } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (hwError) console.error("Error fetching student homework:", hwError);

    // Resolve R2 URLs for homework submissions and worksheets
    const resolvedHomework = homework ? await Promise.all(homework.map(async hw => {
        let worksheetUrl = hw.worksheet_url;
        if (!worksheetUrl && hw.description) {
            const match = hw.description.match(/Attachment File:\s*(https?:\/\/[^\s\)\"\'\>]+)/i);
            if (match) {
                worksheetUrl = match[1];
            }
        }
        return {
            ...hw,
            submission_url: await resolveR2Url(supabase, hw.submission_url),
            worksheet_url: await resolveR2Url(supabase, worksheetUrl)
        };
    })) : [];

    // 3. Fetch uploaded materials
    const { data: materials, error: matError } = await supabase
        .from('student_materials')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (matError) console.error("Error fetching student materials:", matError);

    // Resolve R2 URLs for uploaded materials
    const resolvedMaterials = materials ? await Promise.all(materials.map(async mat => ({
        ...mat,
        file_url: await resolveR2Url(supabase, mat.file_url)
    }))) : [];

    // 4. Fetch reschedule requests
    const { data: reschedule, error: resError } = await supabase
        .from('reschedule_requests')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (resError) console.error("Error fetching student reschedule requests:", resError);

    return {
        classes: classes || [],
        homework: resolvedHomework,
        materials: resolvedMaterials,
        reschedule: reschedule || []
    };
}

export async function updateStudentAttendanceHR(classId: string, studentId: string, status: 'present' | 'absent' | 'late') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
        .from('student_attendance')
        .update({ status: status })
        .eq('class_id', classId)
        .eq('student_id', studentId);

    if (error) {
        console.error("updateStudentAttendanceHR Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function verifyClassAttendance(classId: string, verificationStatus: 'verified' | 'rejected') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update the live_classes record bypassing RLS
    const { data: classData, error } = await supabaseAdmin
        .from('live_classes')
        .update({
            verification_status: verificationStatus,
            verified_by: user.id
        })
        .eq('id', classId)
        .select(`
            *,
            teacher:profiles!teacher_id(
                id,
                staff_details(hourly_rate)
            )
        `)
        .single();

    if (error) {
        console.error("verifyClassAttendance admin update error:", error)
        throw error;
    }

    // 2. Automate Payroll Calculation if Verified
    if (verificationStatus === 'verified' && classData) {
        const teacherProfile = classData.teacher as unknown as { staff_details?: { hourly_rate?: number | string | null } | Array<{ hourly_rate?: number | string | null }> } | null;
        const staffDetails = Array.isArray(teacherProfile?.staff_details) ? teacherProfile.staff_details[0] : teacherProfile?.staff_details;
        const hourlyRate = Number(staffDetails?.hourly_rate) || 0;
        const duration = Number(classData.duration_hours) || 1.0;

        if (hourlyRate > 0) {
            const sessionPay = duration * Number(hourlyRate);

            // Find or create active payroll run for the scheduled month
            const scheduledDate = new Date(classData.scheduled_at);
            const classMonth = scheduledDate.getMonth() + 1; // 1-12
            const classYear = scheduledDate.getFullYear();

            let { data: payrollRun } = await supabaseAdmin
                .from('payroll_runs')
                .select('id')
                .eq('month', classMonth)
                .eq('year', classYear)
                .single();

            if (!payrollRun) {
                const { data: newRun } = await supabaseAdmin
                    .from('payroll_runs')
                    .insert({ month: classMonth, year: classYear })
                    .select()
                    .single();
                payrollRun = newRun;
            }

            if (payrollRun) {
                const { data: existingItem } = await supabaseAdmin
                    .from('payroll_items')
                    .select('*')
                    .eq('payroll_run_id', payrollRun.id)
                    .eq('staff_id', classData.teacher_id)
                    .single();

                if (existingItem) {
                    await supabaseAdmin
                        .from('payroll_items')
                        .update({ amount: Number(existingItem.amount) + sessionPay })
                        .eq('id', existingItem.id);
                } else {
                    await supabaseAdmin
                        .from('payroll_items')
                        .insert({
                            payroll_run_id: payrollRun.id,
                            staff_id: classData.teacher_id,
                            amount: sessionPay
                        });
                }
            }
        }
    }

    revalidatePath('/(dashboard)/hr', 'page');
    revalidatePath('/(dashboard)/admin', 'page');
    return { success: true };
}

export async function getPendingClassVerifications() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name, 
                email,
                staff_details (status)
            ),
            course:courses(title)
        `)
        .eq('status', 'completed')
        .eq('verification_status', 'pending')
        .order('scheduled_at', { ascending: false });

    if (error) throw error;

    const filtered = (data || []).filter(c => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    // Fetch students manually
    const studentIds = filtered.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select(`
                id, 
                full_name, 
                email,
                student_details!student_details_id_fkey(status)
            `)
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return filtered.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        })).filter(c => {
            const studentDetails = Array.isArray(c.student?.student_details)
                ? c.student?.student_details[0]
                : c.student?.student_details;
            return studentDetails?.status !== 'inactive';
        });
    }

    return filtered;
}

export async function getTeacherCompletedClasses(teacherId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const targetId = teacherId || user?.id;
    if (!targetId) return [];

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            *,
            course:courses(title),
            student_attendance(status, student_id)
        `)
        .eq('teacher_id', targetId)
        .order('scheduled_at', { ascending: false })
        .limit(90);

    if (error) throw error;
    
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        }));
    }

    return data;
}

export async function getAllCompletedClassLogs() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name, 
                email,
                staff_details (status)
            ),
            course:courses(title),
            student_attendance(status, student_id)
        `)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

    if (error) {
        console.error("Error fetching all completed class logs:", error);
        return [];
    }

    const filtered = (data || []).filter(c => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    // Fetch students manually
    const studentIds = filtered.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select(`
                id, 
                full_name, 
                email,
                student_details!student_details_id_fkey(status)
            `)
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return filtered.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        })).filter(c => {
            const studentDetails = Array.isArray(c.student?.student_details)
                ? c.student?.student_details[0]
                : c.student?.student_details;
            return studentDetails?.status !== 'inactive';
        });
    }

    return filtered;
}

export async function updateTeacherAttendance(
    teacherId: string, 
    dateStr: string, 
    status: 'present' | 'absent' | 'on_leave', 
    verificationStatus: 'pending' | 'verified' | 'rejected' = 'pending'
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check if user is HR/Admin to verify
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const verifiedBy = (profile?.role === 'hr' || profile?.role === 'admin' || profile?.role === 'super_admin') ? user.id : null;

    const { error } = await supabase
        .from('teacher_attendance')
        .upsert({
            teacher_id: teacherId,
            date: dateStr,
            status,
            verified_by: verifiedBy,
            verification_status: verificationStatus
        }, {
            onConflict: 'teacher_id,date'
        });

    if (error) {
        console.error("updateTeacherAttendance Error:", error);
        throw error;
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function markTeacherAttendance(status: 'present' | 'absent' | 'on_leave') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dateStr = new Date().toISOString().split('T')[0];

    const { error } = await supabase
        .from('teacher_attendance')
        .upsert({
            teacher_id: user.id,
            date: dateStr,
            status,
            verification_status: 'pending'
        }, {
            onConflict: 'teacher_id,date'
        });

    if (error) {
        console.error("markTeacherAttendance Error:", error);
        throw error;
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getAttendanceToday() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dateStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

    if (error) {
        console.error("getAttendanceToday Error:", error);
        return null;
    }

    return data;
}

export async function getAttendanceHistory(teacherId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetId = teacherId || user?.id;
    if (!targetId) return [];

    const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', targetId)
        .order('date', { ascending: false });

    if (error) {
        console.error("getAttendanceHistory Error:", error);
        return [];
    }

    return data.map((r: { id: string; date: string; status: string; verification_status: string }) => ({
        id: r.id,
        date: r.date,
        status: r.status as 'present' | 'absent' | 'on_leave',
        verification_status: r.verification_status as 'pending' | 'verified' | 'rejected'
    }));
}

export async function getStudentDashboardData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { todayClasses: [], upcomingClass: null, allCalendarClasses: [], homework: [], materials: [], details: null, attendanceHistory: [], completedClasses: [] };

    // 1. Fetch live classes
    const { data: classesData, error: classesError } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('scheduled_at', { ascending: true });

    if (classesError) throw classesError;

    // 2. Fetch active homework
    const { data: homeworkData } = await supabase
        .from('homework_assignments')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('due_date', { ascending: true });

    // Resolve R2 URLs for homework submissions and worksheets
    const resolvedHomeworkData = homeworkData ? await Promise.all(homeworkData.map(async hw => {
        let worksheetUrl = hw.worksheet_url;
        if (!worksheetUrl && hw.description) {
            const match = hw.description.match(/Attachment File:\s*(https?:\/\/[^\s\)\"\'\>]+)/i);
            if (match) {
                worksheetUrl = match[1];
            }
        }
        return {
            ...hw,
            submission_url: await resolveR2Url(supabase, hw.submission_url),
            worksheet_url: await resolveR2Url(supabase, worksheetUrl)
        };
    })) : [];

    // 3. Fetch shared materials
    const { data: materialsData } = await supabase
        .from('student_materials')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // Resolve R2 URLs for uploaded materials
    const resolvedMaterialsData = materialsData ? await Promise.all(materialsData.map(async mat => ({
        ...mat,
        file_url: await resolveR2Url(supabase, mat.file_url)
    }))) : [];

    // 4. Fetch student details (fees & billing info)
    const { data: detailsData } = await supabase
        .from('student_details')
        .select(`
            *,
            assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(full_name),
            assigned_teacher_2:profiles!student_details_assigned_teacher_id_2_fkey(full_name),
            assigned_teacher_3:profiles!student_details_assigned_teacher_id_3_fkey(full_name),
            assigned_teacher_4:profiles!student_details_assigned_teacher_id_4_fkey(full_name),
            assigned_teacher_5:profiles!student_details_assigned_teacher_id_5_fkey(full_name)
        `)
        .eq('id', user.id)
        .maybeSingle();

    // 5. Fetch attendance logs
    const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select(`
            *,
            class:live_classes(title, scheduled_at)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // 6. Fetch reschedule requests
    const { data: rescheduleRequests } = await supabase
        .from('reschedule_requests')
        .select(`
            *,
            class:live_classes(title, scheduled_at),
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // 7. Fetch leave requests
    const { data: leaveRequests } = await supabase
        .from('student_leaves')
        .select(`
            *,
            teacher:profiles!teacher_id(full_name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

    // Fetch active class schedule(s) for the student
    const { data: schedulesData } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    const activeSchedule = schedulesData && schedulesData.length > 0 ? schedulesData[0] : null;

    // Process classes: today's classes, next upcoming class, other classes
    const todayStr = new Date().toDateString();
    const now = new Date();

    const todayClasses = (classesData || []).filter(c => new Date(c.scheduled_at).toDateString() === todayStr);
    
    // Future classes scheduled after today (or after right now)
    const futureClasses = (classesData || []).filter(c => {
        const date = new Date(c.scheduled_at);
        return date.toDateString() !== todayStr && isAfter(date, now);
    });

    const upcomingClass = futureClasses.length > 0 ? futureClasses[0] : null;
    const completedClasses = (classesData || []).filter(c => c.status === 'completed');

    return {
        todayClasses,
        upcomingClass,
        allCalendarClasses: classesData || [],
        homework: resolvedHomeworkData,
        materials: resolvedMaterialsData,
        details: detailsData || null,
        attendanceHistory: attendanceData || [],
        completedClasses,
        rescheduleRequests: rescheduleRequests || [],
        leaveRequests: leaveRequests || [],
        activeSchedule,
        activeSchedules: schedulesData || []
    };
}

export async function submitHomework(homeworkId: string, submissionUrl: string, submissionNotes?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!submissionUrl) return { success: false, error: "A homework file is required." };

    const { data: homework, error: homeworkError } = await supabase
        .from("homework_assignments")
        .select("id, student_id")
        .eq("id", homeworkId)
        .maybeSingle();

    if (homeworkError || !homework || homework.student_id !== user.id) {
        return { success: false, error: "You cannot submit this homework." };
    }

    const { data: metadata } = await supabase
        .from("file_metadata")
        .select("r2_key")
        .eq("r2_key", submissionUrl)
        .eq("uploaded_by", user.id)
        .eq("homework_id", homeworkId)
        .eq("purpose", "homework_submission")
        .maybeSingle();

    if (!metadata) return { success: false, error: "Homework upload could not be verified." };

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('homework_assignments')
        .update({
            status: 'submitted',
            submission_url: submissionUrl,
            submission_notes: submissionNotes || null
        })
        .eq('id', homeworkId)
        .eq("student_id", user.id);

    if (error) {
        console.error("submitHomework Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getTeacherMissingAttendanceClasses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const nowStr = now.toISOString();

    const { data, error } = await supabase
        .from('live_classes')
        .select(`
            id,
            title,
            scheduled_at,
            student_id
        `)
        .eq('teacher_id', user.id)
        .eq('status', 'scheduled')
        .lt('scheduled_at', nowStr)
        .gte('scheduled_at', oneDayAgo)
        .order('scheduled_at', { ascending: false });

    if (error) {
        console.error("getTeacherMissingAttendanceClasses error:", error);
        return [];
    }

    // Fetch student profile names
    const studentIds = data.map(c => c.student_id).filter(Boolean);
    if (studentIds.length > 0) {
        const { data: students } = await supabase
            .from('profiles')
            .select(`
                id, 
                full_name,
                student_details!student_details_id_fkey (status)
            `)
            .in('id', studentIds);
        
        const studentMap = Object.fromEntries(students?.map(s => [s.id, s]) || []);
        return data.map(c => ({
            ...c,
            student: studentMap[c.student_id] || null
        })).filter(c => {
            const studentDetails = Array.isArray(c.student?.student_details)
                ? c.student?.student_details[0]
                : c.student?.student_details;
            return studentDetails?.status !== 'inactive';
        });
    }

    return data;
}

export async function adminEditAttendance(classId: string, studentId: string, status: 'present' | 'absent' | 'late') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Check caller's role - must be admin, super_admin, hr, or operations
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
    if (!isAuthorized) {
        return { success: false, error: "Unauthorized: Only HR and Operations can edit finalized attendance." };
    }

    // Upsert the attendance status
    const { error: attError } = await supabase
        .from('student_attendance')
        .upsert({
            class_id: classId,
            student_id: studentId,
            status: status,
            marked_by: user.id
        }, {
            onConflict: 'class_id,student_id'
        });

    if (attError) {
        console.error("adminEditAttendance error:", attError);
        return { success: false, error: attError.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getStudentsWithClasses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    const currentUserRole = profile?.role || 'student';

    // Fetch students with their profiles and details
    const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            student_details!student_details_id_fkey (
                grade_level,
                monthly_fee,
                status,
                assigned_teacher_id,
                preferred_meeting_link,
                preferred_time,
                classes_per_month,
                custom_student_id,
                subject_name_1,
                subject_name_2,
                classes_per_month_2,
                subject_name_3,
                classes_per_month_3,
                subject_name_4,
                classes_per_month_4,
                subject_name_5,
                classes_per_month_5,
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey (
                    staff_details (status)
                ),
                assigned_teacher_2:profiles!student_details_assigned_teacher_id_2_fkey (
                    staff_details (status)
                ),
                assigned_teacher_3:profiles!student_details_assigned_teacher_id_3_fkey (
                    staff_details (status)
                ),
                assigned_teacher_4:profiles!student_details_assigned_teacher_id_4_fkey (
                    staff_details (status)
                ),
                assigned_teacher_5:profiles!student_details_assigned_teacher_id_5_fkey (
                    staff_details (status)
                )
            )
        `)
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    if (studentsError) {
        console.error("getStudentsWithClasses error:", studentsError);
        return [];
    }

    const filteredStudents = (students || []).filter(s => {
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        
        // Hide inactive students from all dashboards/places
        if (details?.status === 'inactive') return false;

        if (currentUserRole === 'super_admin') return true;

        // Hide students of locked tutors
        const checkTeacherLocked = (teacher: unknown) => isLockedTeacherRelation(teacher);
        const isAnyTeacherLocked = 
            checkTeacherLocked(details?.assigned_teacher) ||
            checkTeacherLocked(details?.assigned_teacher_2) ||
            checkTeacherLocked(details?.assigned_teacher_3) ||
            checkTeacherLocked(details?.assigned_teacher_4) ||
            checkTeacherLocked(details?.assigned_teacher_5);
        
        return !isAnyTeacherLocked;
    });

    // Fetch all live classes
    const { data: classes, error: classesError } = await supabase
        .from('live_classes')
        .select(`
            *,
            teacher:profiles!teacher_id(
                full_name,
                staff_details (status)
            )
        `)
        .order('scheduled_at', { ascending: true });

    if (classesError) {
        console.error("getStudentsWithClasses classes error:", classesError);
        return [];
    }

    const filteredClasses = (classes || []).filter(c => {
        if (currentUserRole === 'super_admin') return true;
        const teacherDetails = Array.isArray(c.teacher?.staff_details) ? c.teacher?.staff_details[0] : c.teacher?.staff_details;
        return teacherDetails?.status !== 'locked';
    });

    // Fetch all teachers for mapping/reference
    const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher');

    const teacherMap = Object.fromEntries(teachers?.map(t => [t.id, t.full_name]) || []);

    // Fetch all active class schedules
    const { data: schedulesData } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    // Group schedules by student_id
    const schedulesByStudent: Record<string, NonNullable<typeof schedulesData>> = {};
    (schedulesData || []).forEach(sch => {
        if (sch.student_id) {
            if (!schedulesByStudent[sch.student_id]) {
                schedulesByStudent[sch.student_id] = [];
            }
            schedulesByStudent[sch.student_id].push(sch);
        }
    });

    // Group classes by student_id
    const classesByStudent: Record<string, NonNullable<typeof classes>> = {};
    filteredClasses.forEach(c => {
        if (c.student_id) {
            if (!classesByStudent[c.student_id]) {
                classesByStudent[c.student_id] = [];
            }
            classesByStudent[c.student_id].push(c);
        }
    });

    return filteredStudents.map(s => {
        const details = Array.isArray(s.student_details) ? s.student_details[0] : s.student_details;
        const studentSchedules = schedulesByStudent[s.id] || [];
        const activeSchedule = studentSchedules.length > 0 ? studentSchedules[0] : null;

        return {
            id: s.id,
            full_name: s.full_name,
            email: s.email,
            grade_level: details?.grade_level || 'N/A',
            monthly_fee: details?.monthly_fee || 0,
            status: details?.status || 'active',
            assigned_teacher_id: details?.assigned_teacher_id || null,
            assigned_teacher_name: details?.assigned_teacher_id ? (teacherMap[details.assigned_teacher_id] || 'Unknown Tutor') : 'None Assigned',
            preferred_meeting_link: details?.preferred_meeting_link || '',
            preferred_time: details?.preferred_time || '',
            classes_per_month: details?.classes_per_month || 12,
            custom_student_id: details?.custom_student_id || null,
            classes: classesByStudent[s.id] || [],
            active_schedule: activeSchedule,
            active_schedules: studentSchedules,
            details: details || null
        };
    });
}

export async function assignTutorToStudent(studentId: string, teacherId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
    if (!isAuthorized) {
        return { success: false, error: "Unauthorized" };
    }

    if (profile?.role !== 'super_admin') {
        if (teacherId) {
            const { data: teacherDetails } = await adminClient
                .from('staff_details')
                .select('status')
                .eq('id', teacherId)
                .maybeSingle();

            if (teacherDetails?.status === 'locked') {
                return { success: false, error: "Unauthorized: Cannot assign a locked tutor." };
            }
        }

        const { data: currentStudent } = await adminClient
            .from('student_details')
            .select(`
                assigned_teacher:profiles!student_details_assigned_teacher_id_fkey(
                    staff_details(status)
                ),
                assigned_teacher_2:profiles!student_details_assigned_teacher_id_2_fkey(
                    staff_details(status)
                ),
                assigned_teacher_3:profiles!student_details_assigned_teacher_id_3_fkey(
                    staff_details(status)
                ),
                assigned_teacher_4:profiles!student_details_assigned_teacher_id_4_fkey(
                    staff_details(status)
                ),
                assigned_teacher_5:profiles!student_details_assigned_teacher_id_5_fkey(
                    staff_details(status)
                )
            `)
            .eq('id', studentId)
            .maybeSingle();

        if (hasLockedAssignedTeacher(currentStudent)) {
            return { success: false, error: "Unauthorized: Only Super Admin can change assignments of private students." };
        }
    }

    const { error } = await supabase
        .from('student_details')
        .upsert({
            id: studentId,
            assigned_teacher_id: teacherId || null
        }, {
            onConflict: 'id'
        });

    if (error) {
        console.error("assignTutorToStudent error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}


export async function onboardStudent(payload: {
    fullName: string;
    email: string;
    gradeLevel: string;
    monthlyFee: number;
    classesPerMonth?: number;
    assignedTeacherId?: string;
    customStudentId?: string;
    parentEmail?: string;
    subjectName1?: string;
    subjectName2?: string;
    monthlyFee2?: number;
    classesPerMonth2?: number;
    assignedTeacherId2?: string;
    subjectName3?: string;
    monthlyFee3?: number;
    classesPerMonth3?: number;
    assignedTeacherId3?: string;
    subjectName4?: string;
    monthlyFee4?: number;
    classesPerMonth4?: number;
    assignedTeacherId4?: string;
    subjectName5?: string;
    monthlyFee5?: number;
    classesPerMonth5?: number;
    assignedTeacherId5?: string;
    leadId?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const adminClient = createAdminClient();

    // Security: Check caller's role
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations', 'sales', 'sales_head'].includes(profile?.role || '');
    if (!isAuthorized) {
        return { error: "Unauthorized" };
    }

    const canOnboardAnyLead = ['admin', 'super_admin', 'sales_head'].includes(profile?.role || '');
    if (payload.leadId) {
        const { data: lead, error: leadError } = await adminClient
            .from('leads')
            .select('id, assigned_to')
            .eq('id', payload.leadId)
            .maybeSingle();

        if (leadError || !lead) {
            return { error: "Lead not found" };
        }

        if (!canOnboardAnyLead && (profile?.role !== 'sales' || lead.assigned_to !== user.id)) {
            return { error: "Unauthorized: You can only onboard leads assigned to you." };
        }
    }

    if (
        profile?.role !== "super_admin" &&
        await containsLockedTeacher(adminClient, [
            payload.assignedTeacherId,
            payload.assignedTeacherId2,
            payload.assignedTeacherId3,
            payload.assignedTeacherId4,
            payload.assignedTeacherId5,
        ])
    ) {
        return { error: "Unauthorized: Only Super Admin can assign locked tutors." };
    }

    // 1. Create the user in Auth with password 'password123'
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: payload.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
            full_name: payload.fullName,
            role: 'student'
        }
    });

    if (authError) {
        console.error("Auth creation failed during onboarding:", authError);
        return { error: authError.message };
    }

    const newStudentId = authUser.user.id;

    // 2. Ensure the profile row exists (use adminClient to bypass RLS)
    const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
            id: newStudentId,
            email: payload.email,
            full_name: payload.fullName,
            role: 'student'
        });

    if (profileError) {
        console.error("Profile update failed during onboarding:", profileError);
        return { error: profileError.message };
    }

    // 3. Create/Upsert the entry in student_details (use adminClient to bypass RLS)
    const { error: detailsError } = await adminClient
        .from('student_details')
        .upsert({
            id: newStudentId,
            grade_level: payload.gradeLevel,
            monthly_fee: payload.monthlyFee,
            assigned_teacher_id: payload.assignedTeacherId || null,
            status: 'active',
            classes_per_month: payload.classesPerMonth || 12,
            custom_student_id: payload.customStudentId || null,
            parent_email: payload.parentEmail || null,
            subject_name_1: payload.subjectName1 || 'Maths',
            subject_name_2: payload.subjectName2 || null,
            monthly_fee_2: payload.monthlyFee2 || 0,
            classes_per_month_2: payload.classesPerMonth2 || 0,
            assigned_teacher_id_2: payload.assignedTeacherId2 || null,
            subject_name_3: payload.subjectName3 || null,
            monthly_fee_3: payload.monthlyFee3 || 0,
            classes_per_month_3: payload.classesPerMonth3 || 0,
            assigned_teacher_id_3: payload.assignedTeacherId3 || null,
            subject_name_4: payload.subjectName4 || null,
            monthly_fee_4: payload.monthlyFee4 || 0,
            classes_per_month_4: payload.classesPerMonth4 || 0,
            assigned_teacher_id_4: payload.assignedTeacherId4 || null,
            subject_name_5: payload.subjectName5 || null,
            monthly_fee_5: payload.monthlyFee5 || 0,
            classes_per_month_5: payload.classesPerMonth5 || 0,
            assigned_teacher_id_5: payload.assignedTeacherId5 || null
        });

    if (detailsError) {
        console.error("Student details creation failed during onboarding:", detailsError);
        return { error: detailsError.message };
    }

    // If onboarding a converted lead, mark the lead as onboarded
    if (payload.leadId) {
        let leadUpdate = adminClient
            .from('leads')
            .update({ 
                is_onboarded: true,
                status: 'converted' 
            })
            .eq('id', payload.leadId);

        if (!canOnboardAnyLead) {
            leadUpdate = leadUpdate.eq('assigned_to', user.id);
        }

        const { error: leadUpdateError } = await leadUpdate;

        if (leadUpdateError) {
            console.error("Failed to update lead onboarding status:", leadUpdateError);
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true, studentId: newStudentId };
}

export async function logTutorJoinClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Set tutor_joined_at to NOW() and change class status to 'ongoing' if it was 'scheduled'
    const { data: classData, error: fetchError } = await supabase
        .from('live_classes')
        .select('status, tutor_joined_at, scheduled_at')
        .eq('id', classId)
        .single();

    if (fetchError) {
        console.error("logTutorJoinClass fetch error:", fetchError);
        return { success: false, error: fetchError.message };
    }

    const updates: { tutor_joined_at?: string; tutor_joined_late?: boolean; status?: 'ongoing' } = {};
    if (!classData.tutor_joined_at) {
        const now = new Date();
        updates.tutor_joined_at = now.toISOString();

        if (classData.scheduled_at) {
            const scheduledTime = new Date(classData.scheduled_at);
            const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);
            if (diffMinutes > 5) {
                updates.tutor_joined_late = true;
            }
        }
    }
    if (classData.status === 'scheduled') {
        updates.status = 'ongoing';
    }

    if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
            .from('live_classes')
            .update(updates)
            .eq('id', classId);

        if (updateError) {
            console.error("logTutorJoinClass update error:", updateError);
            return { success: false, error: updateError.message };
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function logStudentJoinClass(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: classData, error: fetchError } = await supabase
        .from('live_classes')
        .select('student_joined_at')
        .eq('id', classId)
        .single();

    if (fetchError) {
        console.error("logStudentJoinClass fetch error:", fetchError);
        return { success: false, error: fetchError.message };
    }

    if (!classData.student_joined_at) {
        const { error: updateError } = await supabase
            .from('live_classes')
            .update({ student_joined_at: new Date().toISOString() })
            .eq('id', classId);

        if (updateError) {
            console.error("logStudentJoinClass update error:", updateError);
            return { success: false, error: updateError.message };
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function submitCompletedWorksheet(title: string, fileUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: metadata } = await supabase
        .from("file_metadata")
        .select("r2_key")
        .eq("r2_key", fileUrl)
        .eq("uploaded_by", user.id)
        .eq("student_id", user.id)
        .eq("purpose", "student_material")
        .maybeSingle();

    if (!metadata) return { success: false, error: "Worksheet upload could not be verified." };

    // Fetch student's assigned teacher ID to satisfy RLS for teacher downloads
    const { data: studentDetails } = await supabase
        .from('student_details')
        .select('assigned_teacher_id')
        .eq('id', user.id)
        .maybeSingle();

    const teacherId = studentDetails?.assigned_teacher_id || null;

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('student_materials')
        .insert({
            student_id: user.id,
            teacher_id: teacherId,
            title: `[Submitted Worksheet] ${title}`,
            file_url: fileUrl
        });

    if (error) {
        console.error("submitCompletedWorksheet error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function uploadStudentStudyMaterial(title: string, fileUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (profile?.role !== "student") {
        return { success: false, error: "Only students can upload study materials." };
    }

    const { data: metadata } = await supabase
        .from("file_metadata")
        .select("r2_key")
        .eq("r2_key", fileUrl)
        .eq("uploaded_by", user.id)
        .eq("student_id", user.id)
        .eq("purpose", "student_material")
        .maybeSingle();

    if (!metadata) return { success: false, error: "Study material upload could not be verified." };

    // Find the student's assigned teacher
    const { data: studentDetails } = await supabase
        .from('student_details')
        .select('assigned_teacher_id')
        .eq('id', user.id)
        .maybeSingle();

    const teacherId = studentDetails?.assigned_teacher_id || null;

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('student_materials')
        .insert({
            student_id: user.id,
            teacher_id: teacherId,
            title: `[Study Material] ${title}`,
            file_url: fileUrl
        });

    if (error) {
        console.error("uploadStudentStudyMaterial Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function getClassLogsForMonth(year: number, month: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile) return [];

    // Construct start and end bounds of the month in UTC
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const isStaffOrAdmin = ["hr", "super_admin", "operations", "admin", "sales_head"].includes(profile.role);
    let query;

    if (isStaffOrAdmin) {
        const adminClient = createAdminClient();
        query = adminClient
            .from('live_classes')
            .select(`
                *,
                teacher:profiles!teacher_id(id, full_name, email),
                student:profiles!student_id(id, full_name, email),
                student_attendance(status, marked_by)
            `);
    } else {
        query = supabase
            .from('live_classes')
            .select(`
                *,
                teacher:profiles!teacher_id(id, full_name, email),
                student:profiles!student_id(id, full_name, email),
                student_attendance(status, marked_by)
            `);

        if (profile.role === 'teacher') {
            query = query.eq('teacher_id', user.id);
        } else if (profile.role === 'student' || profile.role === 'parent') {
            query = query.eq('student_id', user.id);
        }
    }

    query = query
        .gte('scheduled_at', startDate.toISOString())
        .lt('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });

    const { data: classes, error } = await query;
    if (error) {
        console.error("Error fetching class logs for month:", error);
        return [];
    }

    return classes;
}

export async function modifyClassLog(
    classId: string,
    status: string,
    scheduledAt: string,
    studentAttendanceStatus: string | null,
    topicTaught: string,
    homeworkGiven: string,
    studentPerformance: string,
    parentNote: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['hr', 'super_admin'].includes(profile.role)) {
        return { success: false, error: "Access denied. Only HR and Super Admin can modify class logs." };
    }

    // 1. Update live class status, scheduled_at and post-class logging details
    const { error: updateClassError } = await supabase
        .from('live_classes')
        .update({
            status: status,
            scheduled_at: scheduledAt,
            topic_taught: topicTaught || null,
            homework_given: homeworkGiven || null,
            student_performance: studentPerformance || null,
            parent_note: parentNote || null
        })
        .eq('id', classId);

    if (updateClassError) {
        console.error("modifyClassLog live_classes update error:", updateClassError);
        return { success: false, error: updateClassError.message };
    }

    // 2. Handle student attendance updates
    const { data: classObj } = await supabase
        .from('live_classes')
        .select('student_id')
        .eq('id', classId)
        .single();

    if (classObj?.student_id) {
        if (studentAttendanceStatus && studentAttendanceStatus !== '') {
            // Upsert attendance record
            const { error: upsertError } = await supabase
                .from('student_attendance')
                .upsert({
                    class_id: classId,
                    student_id: classObj.student_id,
                    status: studentAttendanceStatus as 'present' | 'absent' | 'late' | 'excused',
                    marked_by: user.id
                }, { onConflict: 'class_id,student_id' });

            if (upsertError) {
                console.error("modifyClassLog student_attendance upsert error:", upsertError);
                return { success: false, error: upsertError.message };
            }
        } else {
            // Delete attendance record if empty/null
            const { error: deleteError } = await supabase
                .from('student_attendance')
                .delete()
                .eq('class_id', classId)
                .eq('student_id', classObj.student_id);

            if (deleteError) {
                console.error("modifyClassLog student_attendance delete error:", deleteError);
                return { success: false, error: deleteError.message };
            }
        }
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}

export async function deleteClassLogOrSession(classId: string, action: 'revert' | 'delete') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized: Please log in." };

    // Get user role to authorize deletion
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAuthorized = ['admin', 'super_admin', 'hr', 'operations'].includes(profile?.role || '');
    if (!isAuthorized) {
        return { success: false, error: "Unauthorized: Only admins, HR, and Operations can perform this action." };
    }

    if (action === 'revert') {
        // Revert class to scheduled and clear completion fields
        const { error: updateError } = await supabase
            .from('live_classes')
            .update({
                status: 'scheduled',
                topic_taught: null,
                homework_given: null,
                student_performance: null,
                parent_note: null,
                tutor_joined_at: null,
                student_joined_at: null,
                tutor_joined_late: null,
                parent_verified: null,
                parent_dispute_reason: null
            })
            .eq('id', classId);

        if (updateError) {
            console.error("deleteClassLogOrSession revert update error:", updateError);
            return { success: false, error: updateError.message };
        }

        // Delete all matching student attendance records so it's removed from student portal/counts
        const { error: deleteAttendanceError } = await supabase
            .from('student_attendance')
            .delete()
            .eq('class_id', classId);

        if (deleteAttendanceError) {
            console.error("deleteClassLogOrSession revert delete attendance error:", deleteAttendanceError);
            return { success: false, error: deleteAttendanceError.message };
        }

    } else if (action === 'delete') {
        // Completely delete the class session
        const { error: deleteError } = await supabase
            .from('live_classes')
            .delete()
            .eq('id', classId);

        if (deleteError) {
            console.error("deleteClassLogOrSession delete class error:", deleteError);
            return { success: false, error: deleteError.message };
        }
    } else {
        return { success: false, error: "Invalid action specified." };
    }

    revalidatePath('/(dashboard)', 'layout');
    return { success: true };
}
