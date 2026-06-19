'use server'

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function updatePayrollDeduction(itemId: string, deductions: number, reason: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
        .from('payroll_items')
        .update({
            deductions: Number(deductions) || 0,
            deductions_amount: Number(deductions) || 0,
            deduction_reason: reason || null
        })
        .eq('id', itemId)

    if (error) {
        console.error("updatePayrollDeduction Error:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/(dashboard)/hr/payroll', 'layout')
    return { success: true }
}

export async function updatePayrollItemDraft(itemId: string, deductions: number, reason: string, bonus: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
        .from('payroll_items')
        .update({
            deductions: Number(deductions) || 0,
            deductions_amount: Number(deductions) || 0,
            deduction_reason: reason || null,
            bonus_amount: Number(bonus) || 0
        })
        .eq('id', itemId)

    if (error) {
        console.error("updatePayrollItemDraft Error:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/(dashboard)/hr/payroll', 'layout')
    return { success: true }
}

export async function approvePayrollItem(itemId: string, deductions: number, reason: string, bonus: number, isApproved: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
        .from('payroll_items')
        .update({
            deductions: Number(deductions) || 0,
            deductions_amount: Number(deductions) || 0,
            deduction_reason: reason || null,
            bonus_amount: Number(bonus) || 0,
            payout_status: isApproved ? 'processing' : 'pending'
        })
        .eq('id', itemId)

    if (error) {
        console.error("approvePayrollItem Error:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/(dashboard)/hr/payroll', 'layout')
    return { success: true }
}
