import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PayrollItemsManager } from "@/components/features/hr/PayrollItemsManager";

export default async function PayrollRunDetails({ params }: { params: { id: string } }) {
    const { id } = await params;
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // 1. Fetch the payroll run details
    const { data: run, error: runError } = await supabase
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

    // 3. Fetch custom tutor hourly rates from student details
    const { data: studentDetailsData } = await supabase
        .from('student_details')
        .select('id, tutor_hourly_rate');

    const studentRates = Object.fromEntries(
        (studentDetailsData || []).map((s: any) => [s.id, s.tutor_hourly_rate !== null ? Number(s.tutor_hourly_rate) : null])
    );

    // 4. Fetch all teacher profiles
    const { data: teachersData } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            email,
            staff_details (
                hourly_rate,
                status
            )
        `)
        .eq('role', 'teacher');

    const teachers = (teachersData || []).map((t: any) => {
        const details = Array.isArray(t.staff_details) ? t.staff_details[0] : t.staff_details;
        return {
            id: t.id,
            full_name: t.full_name || t.email.split('@')[0],
            email: t.email,
            hourly_rate: Number(details?.hourly_rate || 0),
            status: details?.status || 'active'
        };
    });

    // 5. Calculate accrued payouts dynamically from live_classes
    const calculatedPayouts: Record<string, number> = {};
    teachers.forEach(t => {
        calculatedPayouts[t.id] = 0;
    });

    verifiedClasses?.forEach((c: any) => {
        const att = Array.isArray(c.student_attendance) ? c.student_attendance[0] : c.student_attendance;
        if (att?.status === 'absent') {
            return; // Skip student "No Show" classes (Tutors not paid)
        }
        if (calculatedPayouts[c.teacher_id] !== undefined) {
            const teacher = teachers.find(t => t.id === c.teacher_id);
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
        (existingItems || []).map((item: any) => [item.staff_id, item])
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
            profile:profiles!staff_id (
                id,
                full_name,
                email,
                role
            )
        `)
        .eq('run_id', id);

    const safeItems = items || [];

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
