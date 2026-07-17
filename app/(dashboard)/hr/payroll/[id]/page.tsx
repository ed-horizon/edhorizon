import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PayrollItemsManager } from "@/components/features/hr/PayrollItemsManager";

type StaffDetails = {
    hourly_rate?: number | null;
    basic_salary?: number | null;
    pay_basis?: 'hourly' | 'fixed' | null;
    status?: string | null;
};
type TeacherProfile = {
    id: string;
    full_name?: string | null;
    email: string;
    role: string;
    staff_details?: StaffDetails | StaffDetails[] | null;
};
type VerifiedClass = {
    teacher_id: string | null;
    duration_hours?: number | null;
    student_id?: string | null;
    student_attendance?: { status?: string | null } | { status?: string | null }[] | null;
};
type PayrollItem = {
    id: string;
    staff_id?: string | null;
    basic_amount?: number | null;
    payout_status?: string | null;
    staff_name?: string | null;
    staff_email?: string | null;
    profile?: TeacherProfile | TeacherProfile[] | null;
    [key: string]: unknown;
};

export default async function PayrollRunDetails({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. Fetch the payroll run details
    const { data: run } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', id)
        .single();

    if (!run) {
        return <div className="p-12 text-center text-muted-foreground italic">Payroll Run not found.</div>;
    }

    // 2. Fetch verified live classes for this run's month/year
    const startOfMonth = new Date(run.year, run.month - 1, 1).toISOString();
    const endOfMonth = new Date(run.year, run.month, 0, 23, 59, 59, 999).toISOString();

    const { data: verifiedClasses } = await supabase
        .from('live_classes')
        .select('teacher_id, duration_hours, student_id, student_attendance(status)')
        .eq('verification_status', 'verified')
        .gte('scheduled_at', startOfMonth)
        .lte('scheduled_at', endOfMonth);

    // Fetch all late classes in this run's month/year to show warning badges
    const { data: lateClasses } = await supabase
        .from('live_classes')
        .select('teacher_id')
        .eq('tutor_joined_late', true)
        .gte('scheduled_at', startOfMonth)
        .lte('scheduled_at', endOfMonth);

    const lateJoiningsCount: Record<string, number> = {};
    (lateClasses as Array<{ teacher_id: string | null }> | null)?.forEach((lc) => {
        if (lc.teacher_id) {
            lateJoiningsCount[lc.teacher_id] = (lateJoiningsCount[lc.teacher_id] || 0) + 1;
        }
    });

    // 3. Fetch custom tutor hourly rates from student details
    const { data: studentDetailsData } = await supabase
        .from('student_details')
        .select('id, tutor_hourly_rate');

    const studentRates = Object.fromEntries(
        ((studentDetailsData || []) as Array<{ id: string; tutor_hourly_rate: number | null }>).map((s) => [s.id, s.tutor_hourly_rate !== null ? Number(s.tutor_hourly_rate) : null])
    );

    // 4. Fetch all staff profiles (except super_admin, student, parent)
    const { data: teachersData } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            role,
            staff_details (
                hourly_rate,
                basic_salary,
                pay_basis,
                status
            )
        `)
        .neq('role', 'super_admin')
        .neq('role', 'student')
        .neq('role', 'parent');

    const teachers = ((teachersData || []) as TeacherProfile[]).map((t) => {
        const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return {
            id: t.id,
            full_name: t.full_name || t.email.split('@')[0],
            email: t.email,
            role: t.role,
            pay_basis: details?.pay_basis || 'hourly',
            basic_salary: Number(details?.basic_salary || 0),
            hourly_rate: Number(details?.hourly_rate || 0),
            status: details?.status || 'active'
        };
    }).filter((t) => t.status !== 'locked');

    // 5. Calculate accrued payouts dynamically
    const calculatedPayouts: Record<string, number> = {};
    teachers.forEach(t => {
        calculatedPayouts[t.id] = t.pay_basis === 'fixed' ? t.basic_salary : 0;
    });

    (verifiedClasses as VerifiedClass[] | null)?.forEach((c) => {
        const att = Array.isArray(c.student_attendance) ? c.student_attendance[0] : c.student_attendance;
        if (att?.status === 'absent') {
            return; // Skip student "No Show" classes (Tutors not paid)
        }
        if (c.teacher_id && calculatedPayouts[c.teacher_id] !== undefined) {
            const teacher = teachers.find(t => t.id === c.teacher_id);
            if (teacher?.pay_basis === 'fixed') {
                return; // Fixed pay staff are paid basic_salary, not class hours
            }
            const baseRate = teacher?.hourly_rate || 0;
            const customStudentRate = c.student_id ? studentRates[c.student_id] : null;
            const rate = (customStudentRate !== null && customStudentRate !== undefined && !isNaN(customStudentRate) && customStudentRate > 0)
                ? customStudentRate
                : baseRate;

            const hours = Number(c.duration_hours || 1.0);
            calculatedPayouts[c.teacher_id] += hours * rate;
        }
    });

    // 6. Fetch existing payroll items from DB
    const { data: existingItems } = await supabase
        .from('payroll_items')
        .select('*')
        .eq('run_id', id);

    const existingItemsMap = Object.fromEntries(
        ((existingItems || []) as PayrollItem[]).flatMap((item) => item.staff_id ? [[item.staff_id, item]] : [])
    );

    // 7. Synchronize DB payroll items: Insert missing, update mismatched draft items
    const isRunFinalized = run.status === 'completed' || run.status === 'paid';
    if (!isRunFinalized) {
        for (const teacher of teachers) {
            const calculatedAmount = calculatedPayouts[teacher.id] || 0;
            const existing = existingItemsMap[teacher.id];

            if (!existing) {
                // Insert missing payroll item for active teachers
                await supabaseAdmin
                    .from('payroll_items')
                    .insert({
                        run_id: id,
                        staff_id: teacher.id,
                        staff_name: teacher.full_name,
                        staff_email: teacher.email,
                        basic_amount: calculatedAmount,
                        payout_status: 'pending',
                        deductions_amount: 0,
                        deductions: 0,
                        bonus_amount: 0
                    });
            } else if (Number(existing.basic_amount) !== calculatedAmount && existing.payout_status !== 'processing' && existing.payout_status !== 'paid') {
                // Update amount if mismatch is found and item isn't approved/paid yet
                await supabaseAdmin
                    .from('payroll_items')
                    .update({ basic_amount: calculatedAmount })
                    .eq('id', existing.id);
            }
        }
    }

    // 8. Re-query the finalized payroll items to display up-to-date staff slips
    const { data: items } = await supabase
        .from('payroll_items')
        .select(`
            id,
            basic_amount,
            payout_status,
            deductions_amount,
            deductions,
            deduction_reason,
            bonus_amount,
            net_amount,
            staff_name,
            staff_email,
            staff_employee_id,
            profile:profiles!staff_id (
                id,
                full_name,
                email,
                role,
                staff_details (
                    status
                )
            )
        `)
        .eq('run_id', id);

    const safeItems = ((items || []) as unknown as PayrollItem[]).map((item) => {
        const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile;
        const teacherId = profile?.id;
        const lateCount = teacherId ? (lateJoiningsCount[teacherId] || 0) : 0;
        return {
            ...item,
            profile: profile || {
                id: null,
                full_name: item.staff_name || "Former staff member",
                email: item.staff_email || null,
                role: "former_staff",
                staff_details: null
            },
            lateJoinings: lateCount
        };
    }).filter((item) => {
        const profile = item.profile as TeacherProfile;
        const staffDetails = Array.isArray(profile.staff_details)
            ? profile.staff_details[0]
            : profile.staff_details;
        return staffDetails?.status !== 'locked';
    });

    return (
        <div className="p-8 space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/hr/payroll">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full shadow-sm hover:scale-105 transition-transform">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground italic flex items-center gap-3">
                            <span className="text-emerald-600">Payroll Run Details</span>
                            <Badge className={`uppercase font-black tracking-widest text-[10px] px-3 py-1 ${run.status === 'completed' || run.status === 'paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                                {run.status}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground mt-1 italic text-lg">Financial ledger for cycle {run.month} / FY {run.year}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            {/* Interactive Manager */}
            <PayrollItemsManager initialItems={safeItems} runId={id} runStatus={run.status} />
        </div>
    );
}
