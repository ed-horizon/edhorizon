"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Users, TrendingUp, Calendar, CheckCircle2, 
    Clock, DollarSign, ArrowUpRight, BarChart3, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
    id: string;
    full_name?: string | null;
    email: string;
    role: string;
}

interface Lead {
    id: string;
    created_at: string;
    status: string;
    assigned_to?: any;
    monthly_fee?: number | null;
    budget?: number | null;
    value?: number | null;
}

interface SalesPerformanceClientProps {
    agents: Agent[];
    leads: Lead[];
}

const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

export default function SalesPerformanceClient({ agents, leads }: SalesPerformanceClientProps) {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-indexed
    const [viewMode, setViewMode] = useState<'monthly' | 'all-time'>('monthly');

    // Filter leads based on month/year or all-time
    const targetLeads = leads.filter(l => {
        if (viewMode === 'all-time') return true;
        if (!l.created_at) return false;
        const d = new Date(l.created_at);
        return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });

    const salesAgents = agents.filter(a => a.role === 'sales' || a.role === 'sales_head');

    // Agent metrics calculation
    const agentMetrics = salesAgents.map(agent => {
        const agentLeads = targetLeads.filter(l => {
            const assignedId = typeof l.assigned_to === 'object' ? l.assigned_to?.id : l.assigned_to;
            return assignedId === agent.id;
        });

        const converted = agentLeads.filter(l => ['converted', 'closed_won'].includes(l.status));
        const inProgress = agentLeads.filter(l => ['new', 'contacted', 'demo_scheduled', 'negotiating', 'follow_up'].includes(l.status));
        const lost = agentLeads.filter(l => ['lost', 'closed_lost'].includes(l.status));
        const conversionRate = agentLeads.length > 0 ? Math.round((converted.length / agentLeads.length) * 100) : 0;
        
        const totalValue = converted.reduce((sum, l) => {
            const val = Number(l.monthly_fee || l.value || l.budget || 0);
            return sum + val;
        }, 0);

        return {
            id: agent.id,
            name: agent.full_name || agent.email.split('@')[0],
            email: agent.email,
            role: agent.role,
            assigned: agentLeads.length,
            converted: converted.length,
            inProgress: inProgress.length,
            lost: lost.length,
            conversionRate,
            totalValue
        };
    });

    // Overall summary metrics for selected period
    const totalAssigned = agentMetrics.reduce((sum, a) => sum + a.assigned, 0);
    const totalConverted = agentMetrics.reduce((sum, a) => sum + a.converted, 0);
    const totalInProgress = agentMetrics.reduce((sum, a) => sum + a.inProgress, 0);
    const totalRevenue = agentMetrics.reduce((sum, a) => sum + a.totalValue, 0);
    const overallConversion = totalAssigned > 0 ? Math.round((totalConverted / totalAssigned) * 100) : 0;

    // Last 6 months trend calculation
    const monthlyHistory = Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - idx), 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const mLeads = leads.filter(l => {
            if (!l.created_at) return false;
            const ld = new Date(l.created_at);
            return ld.getFullYear() === y && (ld.getMonth() + 1) === m;
        });
        const mConverted = mLeads.filter(l => ['converted', 'closed_won'].includes(l.status)).length;
        const rate = mLeads.length > 0 ? Math.round((mConverted / mLeads.length) * 100) : 0;

        return {
            year: y,
            month: m,
            label: `${MONTHS[m - 1].label.substring(0, 3)} ${y}`,
            total: mLeads.length,
            converted: mConverted,
            rate
        };
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-[2.5rem] border border-border/40 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-indigo-950 dark:text-indigo-200 uppercase font-serif italic">
                        Sales Performance Dashboard
                    </h1>
                    <p className="text-xs text-muted-foreground italic mt-1">
                        Month-wise conversion metrics, revenue, and lead progress breakdown per sales agent.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View mode toggle */}
                    <div className="flex items-center p-1 bg-muted/20 rounded-2xl border border-border/30">
                        <button
                            type="button"
                            onClick={() => setViewMode('monthly')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                viewMode === 'monthly' ? "bg-indigo-600 text-white shadow-md" : "text-muted-foreground"
                            )}
                        >
                            Monthly Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('all-time')}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                viewMode === 'all-time' ? "bg-indigo-600 text-white shadow-md" : "text-muted-foreground"
                            )}
                        >
                            All-Time
                        </button>
                    </div>

                    {/* Month / Year Selectors */}
                    {viewMode === 'monthly' && (
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="h-11 rounded-2xl bg-muted/20 border-border/40 text-xs font-bold px-4 appearance-none outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                            >
                                {MONTHS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>

                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="h-11 rounded-2xl bg-muted/20 border-border/40 text-xs font-bold px-4 appearance-none outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                            >
                                {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Metric Cards for Selected Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card p-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Assigned</span>
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black">{totalAssigned}</span>
                        <p className="text-[11px] text-muted-foreground italic mt-1">
                            {viewMode === 'monthly' ? `${MONTHS[selectedMonth - 1].label} ${selectedYear}` : 'Cumulative'} leads assigned
                        </p>
                    </div>
                </Card>

                <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card p-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Converted</span>
                        <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{totalConverted}</span>
                        <p className="text-[11px] text-muted-foreground italic mt-1">
                            Successfully enrolled students
                        </p>
                    </div>
                </Card>

                <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card p-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Conversion Rate</span>
                        <div className="h-10 w-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-black text-violet-600 dark:text-violet-400">{overallConversion}%</span>
                        <p className="text-[11px] text-muted-foreground italic mt-1">
                            Period conversion efficiency
                        </p>
                    </div>
                </Card>

                <Card className="rounded-[2rem] border-border/40 shadow-sm bg-card p-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Est. Value</span>
                        <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatCurrency(totalRevenue)}</span>
                        <p className="text-[11px] text-muted-foreground italic mt-1">
                            Monthly value from conversions
                        </p>
                    </div>
                </Card>
            </div>

            {/* Agent Month-Wise Performance Table */}
            <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card overflow-hidden">
                <CardHeader className="p-8 border-b border-border/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-serif font-bold italic tracking-tight flex items-center gap-2">
                                <Users className="text-indigo-600" size={22} />
                                <span>Agent Breakdown ({viewMode === 'monthly' ? `${MONTHS[selectedMonth - 1].label} ${selectedYear}` : 'All-Time'})</span>
                            </CardTitle>
                            <CardDescription className="italic text-xs mt-1">
                                Individual performance tally for sales team members.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="w-fit text-[10px] font-black uppercase rounded-full px-4 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-none">
                            {agentMetrics.length} Active Agents
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                    <th className="p-5 pl-8">Sales Agent</th>
                                    <th className="p-5">Role</th>
                                    <th className="p-5 text-center">Assigned</th>
                                    <th className="p-5 text-center">Converted</th>
                                    <th className="p-5 text-center">In Progress</th>
                                    <th className="p-5 text-center">Conversion %</th>
                                    <th className="p-5 pr-8 text-right">Est. Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {agentMetrics.map((agent) => (
                                    <tr key={agent.id} className="hover:bg-muted/10 transition-colors text-xs">
                                        <td className="p-5 pl-8 font-semibold">
                                            <p className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">{agent.name}</p>
                                            <p className="text-[11px] text-muted-foreground font-mono">{agent.email}</p>
                                        </td>
                                        <td className="p-5">
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase rounded-full px-2.5 py-1 border-none",
                                                agent.role === 'sales_head' 
                                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400' 
                                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-950/30 dark:text-slate-400'
                                            )}>
                                                {agent.role.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="p-5 text-center font-bold text-base text-foreground">
                                            {agent.assigned}
                                        </td>
                                        <td className="p-5 text-center font-bold text-base text-emerald-600 dark:text-emerald-400">
                                            {agent.converted}
                                        </td>
                                        <td className="p-5 text-center font-bold text-base text-amber-600 dark:text-amber-400">
                                            {agent.inProgress}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3 justify-center">
                                                <div className="w-20 bg-muted/40 rounded-full h-2 overflow-hidden border border-border/10">
                                                    <div 
                                                        className="bg-indigo-600 h-full rounded-full transition-all" 
                                                        style={{ width: `${Math.min(agent.conversionRate, 100)}%` }} 
                                                    />
                                                </div>
                                                <span className="font-black text-indigo-600 dark:text-indigo-400 w-10 text-right">{agent.conversionRate}%</span>
                                            </div>
                                        </td>
                                        <td className="p-5 pr-8 text-right font-bold text-sm text-foreground">
                                            {formatCurrency(agent.totalValue)}
                                        </td>
                                    </tr>
                                ))}
                                {agentMetrics.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-muted-foreground italic">No sales agents found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Historical Month-by-Month Trend Cards */}
            <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold italic tracking-tight flex items-center gap-2">
                    <BarChart3 className="text-indigo-600" size={20} />
                    <span>Recent 6-Month Lead Performance Trend</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {monthlyHistory.map((mh, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                setSelectedYear(mh.year);
                                setSelectedMonth(mh.month);
                                setViewMode('monthly');
                            }}
                            className={cn(
                                "p-4 rounded-2xl border text-left transition-all hover:scale-105",
                                selectedMonth === mh.month && selectedYear === mh.year && viewMode === 'monthly'
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                                    : "bg-card border-border/40 hover:border-indigo-400"
                            )}
                        >
                            <p className={cn(
                                "text-[11px] font-black uppercase tracking-wider",
                                selectedMonth === mh.month && selectedYear === mh.year && viewMode === 'monthly' ? "text-indigo-100" : "text-muted-foreground"
                            )}>{mh.label}</p>
                            <p className="text-xl font-black mt-2">{mh.converted} / {mh.total}</p>
                            <p className={cn(
                                "text-[10px] font-bold mt-1",
                                selectedMonth === mh.month && selectedYear === mh.year && viewMode === 'monthly' ? "text-indigo-200" : "text-emerald-600 dark:text-emerald-400"
                            )}>{mh.rate}% Converted</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
