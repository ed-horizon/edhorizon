import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeads, getSalesAgents } from "@/app/(dashboard)/sales/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const performanceData = agents
        .filter((agent: any) => agent.role === 'sales' || agent.role === 'sales_head')
        .map((agent: any) => {
            const agentLeads = leads.filter((l: any) => l.assigned_to?.id === agent.id || l.assigned_to === agent.id);
            const convertedLeads = agentLeads.filter((l: any) => l.status === 'converted');
            const conversionRate = agentLeads.length > 0 ? Math.round((convertedLeads.length / agentLeads.length) * 100) : 0;
            return {
                id: agent.id,
                name: agent.full_name || agent.email.split('@')[0],
                email: agent.email,
                role: agent.role,
                assigned: agentLeads.length,
                won: convertedLeads.length,
                conversion: conversionRate
            };
        });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-indigo-950 dark:text-indigo-200 uppercase">Sales Performance Summary</h1>
                    <p className="text-xs text-muted-foreground">Tally of leads and conversions for sales agent payroll tracking.</p>
                </div>
            </div>

            <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                <CardHeader className="border-b border-border/10 pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Users className="text-indigo-600" size={18} />
                        <span>Sales Agent Metrics</span>
                    </CardTitle>
                    <CardDescription className="text-xs">Real-time conversion metrics gathered from CRM database.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                    <th className="p-4 pl-6">Sales Agent</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4 text-center">Total Assigned Leads</th>
                                    <th className="p-4 text-center">Converted Leads</th>
                                    <th className="p-4 text-center">Conversion Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {performanceData.map((agent: any) => (
                                    <tr key={agent.id} className="hover:bg-muted/10 transition-colors text-xs">
                                        <td className="p-4 pl-6 font-semibold">
                                            <p className="font-bold text-indigo-950 dark:text-indigo-200">{agent.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{agent.email}</p>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase rounded-full px-2 py-0.5 border-none",
                                                agent.role === 'sales_head' 
                                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400' 
                                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-950/30 dark:text-slate-400'
                                            )}>
                                                {agent.role.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-center font-bold text-foreground">
                                            {agent.assigned}
                                        </td>
                                        <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                            {agent.won}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3 justify-center">
                                                <div className="w-24 bg-muted/40 rounded-full h-2 overflow-hidden border border-border/10">
                                                    <div 
                                                        className="bg-indigo-600 h-full rounded-full" 
                                                        style={{ width: `${agent.conversion}%` }} 
                                                    />
                                                </div>
                                                <span className="font-black text-indigo-600 dark:text-indigo-400 w-10 text-right">{agent.conversion}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {performanceData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-muted-foreground italic">No sales agents found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
