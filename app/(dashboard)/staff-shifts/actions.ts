'use server'

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Get the current active shift (where clock_out is null) for the logged in staff member.
 */
export async function getCurrentShiftStatus() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { active: false, shift: null };

        const { data, error } = await supabase
            .from('staff_shifts')
            .select('*')
            .eq('profile_id', user.id)
            .is('clock_out', null)
            .order('clock_in', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Error fetching current shift status:", error);
            return { active: false, shift: null };
        }

        return {
            active: !!data,
            shift: data
        };
    } catch (err) {
        console.error("Exception in getCurrentShiftStatus:", err);
        return { active: false, shift: null };
    }
}

/**
 * Toggle the shift status (Clock In if clocked out, Clock Out if clocked in).
 */
export async function toggleShift() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Not authenticated" };

        // Verify the profile role is a staff role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role;
        if (!role || !['operations', 'sales', 'hr', 'admin'].includes(role)) {
            return { error: "Only staff members (operations, sales, hr, admin) can log in/out of shifts." };
        }

        // Check if there are active shifts
        const { data: activeShifts, error: fetchError } = await supabase
            .from('staff_shifts')
            .select('*')
            .eq('profile_id', user.id)
            .is('clock_out', null);

        if (fetchError) {
            return { error: fetchError.message };
        }

        const hasActive = activeShifts && activeShifts.length > 0;

        if (hasActive) {
            // Clock Out: Close all active shifts for this user
            const { error: updateError } = await supabase
                .from('staff_shifts')
                .update({ clock_out: new Date().toISOString() })
                .eq('profile_id', user.id)
                .is('clock_out', null);

            if (updateError) {
                return { error: updateError.message };
            }
        } else {
            // Clock In: Clean up any potential dangling shifts first
            await supabase
                .from('staff_shifts')
                .update({ clock_out: new Date().toISOString() })
                .eq('profile_id', user.id)
                .is('clock_out', null);

            // Insert new shift
            const { error: insertError } = await supabase
                .from('staff_shifts')
                .insert({
                    profile_id: user.id,
                    clock_in: new Date().toISOString()
                });

            if (insertError) {
                return { error: insertError.message };
            }
        }

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (err: any) {
        console.error("Exception in toggleShift server action:", err);
        return { error: err.message || "An unexpected error occurred." };
    }
}

/**
 * Retrieves shifts analytics and logs of staff members for Super Admin tracking dashboard.
 * @param selectedMonth YYYY-MM format month string
 */
export async function getSuperAdminShiftReport(selectedMonth: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Not authenticated" };

        // Check super_admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'super_admin') {
            return { error: "Unauthorized. Super admin access only." };
        }

        const adminClient = createAdminClient();

        // 1. Fetch all profiles with staff roles (operations, sales, hr, admin)
        const { data: staffProfiles, error: profilesError } = await adminClient
            .from('profiles')
            .select('id, email, full_name, role')
            .in('role', ['operations', 'sales', 'hr', 'admin'])
            .order('full_name', { ascending: true });

        if (profilesError) {
            return { error: profilesError.message };
        }

        // 2. Fetch shifts for the selected month or currently active
        const startOfMonth = `${selectedMonth}-01T00:00:00.000Z`;
        const [year, month] = selectedMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const endOfMonth = `${selectedMonth}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`;

        const { data: shifts, error: shiftsError } = await adminClient
            .from('staff_shifts')
            .select('*')
            .or(`clock_out.is.null,and(clock_in.gte.${startOfMonth},clock_in.lte.${endOfMonth})`)
            .order('clock_in', { ascending: false });

        if (shiftsError) {
            return { error: shiftsError.message };
        }

        // Get local/current date parameters in YYYY-MM-DD
        const todayStr = new Date().toISOString().split('T')[0];

        // 3. Compute stats per staff member
        const staffStats = staffProfiles.map(staff => {
            const staffShifts = shifts?.filter(s => s.profile_id === staff.id) || [];
            
            // Current active shift
            const activeShift = staffShifts.find(s => s.clock_out === null);

            // Compute cumulative monthly active minutes
            let totalMonthlyMinutes = 0;
            staffShifts.forEach(s => {
                const start = new Date(s.clock_in).getTime();
                const end = s.clock_out ? new Date(s.clock_out).getTime() : new Date().getTime();
                const diffMin = Math.max(0, (end - start) / (1000 * 60));
                totalMonthlyMinutes += diffMin;
            });

            // Compute today's active minutes
            let totalTodayMinutes = 0;
            staffShifts.forEach(s => {
                const start = new Date(s.clock_in);
                const isToday = start.toISOString().split('T')[0] === todayStr;
                if (isToday) {
                    const startTime = start.getTime();
                    const endTime = s.clock_out ? new Date(s.clock_out).getTime() : new Date().getTime();
                    const diffMin = Math.max(0, (endTime - startTime) / (1000 * 60));
                    totalTodayMinutes += diffMin;
                }
            });

            return {
                profile: staff,
                isActive: !!activeShift,
                currentShift: activeShift || null,
                totalTodayHours: Number((totalTodayMinutes / 60).toFixed(2)),
                totalMonthlyHours: Number((totalMonthlyMinutes / 60).toFixed(2)),
                shifts: staffShifts.map(s => ({
                    ...s,
                    durationMinutes: Math.round(
                        ((s.clock_out ? new Date(s.clock_out).getTime() : new Date().getTime()) - new Date(s.clock_in).getTime()) / (1000 * 60)
                    )
                }))
            };
        });

        return {
            success: true,
            staffStats,
            allShifts: shifts || []
        };
    } catch (err: any) {
        console.error("Exception in getSuperAdminShiftReport:", err);
        return { error: err.message || "An unexpected error occurred." };
    }
}
