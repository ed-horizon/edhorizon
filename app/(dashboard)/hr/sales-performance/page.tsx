import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeads, getSalesAgents } from "@/app/(dashboard)/sales/actions";
import SalesPerformanceClient from "@/components/features/hr/SalesPerformanceClient";

export default async function HRSalesPerformancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Security check: Only HR and Super Admin can view this
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || !["super_admin", "hr"].includes(profile.role)) {
        redirect("/");
    }

    const [agents, leads] = await Promise.all([
        getSalesAgents(),
        getLeads(true) // Get all leads for admin audit
    ]);

    return (
        <SalesPerformanceClient 
            agents={agents || []} 
            leads={leads || []} 
        />
    );
}
