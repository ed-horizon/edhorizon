'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Users, DollarSign, TrendingUp, Briefcase, 
    CheckCircle2, Clock, Calendar, ArrowLeft, 
    Activity, FileText, ChevronRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMonthlyReportData } from "../actions";
import { toast } from "sonner";
import Link from "next/link";

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

export default function MonthlyReportPage() {
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
    const [reportData, setReportData] = useState<any>(null);
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'completed' | 'pending' | 'leads'>('completed');

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const loadMonthlyData = async (year: number, month: number) => {
        setIsLoading(true);
        try {
            const res = await getMonthlyReportData(year, month);
            if (res.success) {
                setReportData(res);
            } else {
                toast.error("Failed to load monthly report details.");
            }
        } catch (err) {
            console.error("Error loading monthly report:", err);
            toast.error("An unexpected error occurred while fetching report data.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadHistorySummaries = async () => {
        setIsHistoryLoading(true);
        try {
            const now = new Date();
            const promises = [];
            // Retrieve data for the past 6 months to display in comparison chart
            for (let i = 5; i >= 0; i--) {
                const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                promises.push(
                    getMonthlyReportData(targetDate.getFullYear(), targetDate.getMonth() + 1).then(res => ({
                        year: targetDate.getFullYear(),
                        month: targetDate.getMonth() + 1,
                        monthName: MONTHS[targetDate.getMonth()].label.substring(0, 3),
                        revenue: res.revenueCollected || 0,
                        expenses: res.totalExpenses || 0,
                        profit: res.netProfit || 0,
                        admissions: res.admissionsCount || 0
                    }))
                );
            }
            const results = await Promise.all(promises);
            setHistoryList(results);
        } catch (err) {
            console.error("Error loading monthly historical index:", err);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    useEffect(() => {
        loadMonthlyData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        loadHistorySummaries();
    }, []);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'new':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400';
            case 'contacted':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400';
            case 'demo_scheduled':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400';
            case 'closed_won':
            case 'converted':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400';
            case 'closed_lost':
                return 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400';
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400';
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/super-admin">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                                <ArrowLeft size={16} />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-serif font-black tracking-tight text-foreground flex items-center gap-2">
                            <span>Monthly Report Center</span>
                        </h1>
                    </div>
                    <p className="text-xs text-muted-foreground italic font-medium leading-normal pl-10">
                        Select a month to audit corporate conversions, tuition fees, salaries, and operational profit.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                </div>
            </div>

            {/* Selectors Bar */}
            <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Report Month:</span>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="h-9 rounded-xl border border-border/40 bg-background px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36"
                    >
                        {MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Report Year:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="h-9 rounded-xl border border-border/40 bg-background px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[40vh] animate-pulse">
                    <div className="flex flex-col items-center gap-3">
                        <Activity className="text-indigo-600 animate-spin" size={28} />
                        <span className="text-xs font-black uppercase text-indigo-600/50">Compiling Report Data...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Month KPI Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                        
                        {/* 1. Revenue Collected */}
                        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-md border-b-4 border-b-emerald-500">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Collected</span>
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                    <DollarSign size={14} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(reportData.revenueCollected)}</div>
                                <p className="text-[9px] text-muted-foreground font-semibold mt-1">Paid student receipts</p>
                            </CardContent>
                        </Card>

                        {/* 2. Pending Payments */}
                        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-md border-b-4 border-b-rose-500">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Payments</span>
                                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
                                    <Clock size={14} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatCurrency(reportData.pendingPayments)}</div>
                                <p className="text-[9px] text-muted-foreground font-semibold mt-1">Outstanding collections</p>
                            </CardContent>
                        </Card>

                        {/* 3. Expenses */}
                        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-md border-b-4 border-b-amber-500">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Expenses</span>
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
                                    <Briefcase size={14} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(reportData.totalExpenses)}</div>
                                <p className="text-[9px] text-muted-foreground font-semibold mt-1">Salaries: {formatCurrency(reportData.totalSalaries)}</p>
                            </CardContent>
                        </Card>

                        {/* 4. Net Profit */}
                        <Card className={cn(
                            "rounded-2xl border-border/40 bg-card overflow-hidden shadow-md border-b-4",
                            reportData.netProfit >= 0 ? "border-b-indigo-500" : "border-b-rose-500"
                        )}>
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Operating Profit</span>
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                    <TrendingUp size={14} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className={cn(
                                    "text-xl font-extrabold",
                                    reportData.netProfit >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                                )}>
                                    {formatCurrency(reportData.netProfit)}
                                </div>
                                <p className="text-[9px] text-muted-foreground font-semibold mt-1">Overhead: {formatCurrency(reportData.totalOverhead)}</p>
                            </CardContent>
                        </Card>

                        {/* 5. New Admissions */}
                        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-md border-b-4 border-b-blue-500">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Admissions</span>
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <CheckCircle2 size={14} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-extrabold text-foreground">+{reportData.admissionsCount}</div>
                                <p className="text-[9px] text-muted-foreground font-semibold mt-1">Students enrolled</p>
                            </CardContent>
                        </Card>

                        {/* 6. Leads Added */}
                        <Card className="rounded-2xl border-border/40 bg-card overflow-hidden shadow-md border-b-4 border-b-purple-500">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Leads</span>
                                <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
                                    <Users size={14} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-extrabold text-foreground">+{reportData.leadsCount}</div>
                                <p className="text-[9px] text-muted-foreground font-semibold mt-1">Leads from pipeline</p>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Report detail tables & sidebar comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Left side: detailed logs */}
                        <div className="lg:col-span-8 space-y-6">
                            <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="border-b border-border/10 pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-base font-bold">Monthly Operational Logs</CardTitle>
                                            <CardDescription className="text-xs">Browse complete detailed transaction and pipeline entries recorded for this month.</CardDescription>
                                        </div>
                                        
                                        <div className="flex items-center bg-muted/30 p-1 rounded-xl">
                                            <Button 
                                                variant={activeTab === 'completed' ? 'secondary' : 'ghost'} 
                                                size="sm"
                                                onClick={() => setActiveTab('completed')}
                                                className="h-8 text-[10px] font-bold uppercase tracking-wider px-3 rounded-lg"
                                            >
                                                Completed ({reportData.payments.length})
                                            </Button>
                                            <Button 
                                                variant={activeTab === 'pending' ? 'secondary' : 'ghost'} 
                                                size="sm"
                                                onClick={() => setActiveTab('pending')}
                                                className="h-8 text-[10px] font-bold uppercase tracking-wider px-3 rounded-lg"
                                            >
                                                Pending ({reportData.pendingPaymentsList.length})
                                            </Button>
                                            <Button 
                                                variant={activeTab === 'leads' ? 'secondary' : 'ghost'} 
                                                size="sm"
                                                onClick={() => setActiveTab('leads')}
                                                className="h-8 text-[10px] font-bold uppercase tracking-wider px-3 rounded-lg"
                                            >
                                                Leads ({reportData.leads.length})
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                        
                                        {/* Payments Table */}
                                        {activeTab === 'completed' && (
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                        <th className="p-4 pl-6">Receipt / Ref</th>
                                                        <th className="p-4">Student</th>
                                                        <th className="p-4">Paid Date</th>
                                                        <th className="p-4">Method</th>
                                                        <th className="p-4 text-right pr-6">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/10">
                                                    {reportData.payments.map((p: any) => (
                                                        <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-4 pl-6 font-bold text-indigo-600 dark:text-indigo-400">
                                                                {p.receipt_number || "AUTO-GEN"}
                                                            </td>
                                                            <td className="p-4">
                                                                <p className="font-semibold text-foreground">{p.student?.full_name || "N/A"}</p>
                                                                <p className="text-[10px] text-muted-foreground">{p.student?.email || "No email"}</p>
                                                            </td>
                                                            <td className="p-4 text-muted-foreground font-medium">
                                                                {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge variant="secondary" className="text-[9px] font-black uppercase rounded-full px-2 py-0.5 border-none">
                                                                    {p.payment_method.replace('_', ' ')}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 text-right pr-6 font-bold text-emerald-600 dark:text-emerald-400">
                                                                {formatCurrency(p.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {reportData.payments.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-12 text-muted-foreground italic">No completed payment receipts found for this month.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* Pending Payments Table */}
                                        {activeTab === 'pending' && (
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                        <th className="p-4 pl-6">Student</th>
                                                        <th className="p-4">Created Date</th>
                                                        <th className="p-4">Status</th>
                                                        <th className="p-4 text-right pr-6">Estimated Fee</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/10">
                                                    {reportData.pendingPaymentsList.map((p: any) => (
                                                        <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-4 pl-6">
                                                                <p className="font-semibold text-foreground">{p.student?.full_name || "N/A"}</p>
                                                                <p className="text-[10px] text-muted-foreground">{p.student?.email || "No email"}</p>
                                                            </td>
                                                            <td className="p-4 text-muted-foreground font-medium">
                                                                {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge className="text-[9px] font-black uppercase rounded-full px-2 py-0.5 border-none bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400">
                                                                    Pending Offline Confirm
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 text-right pr-6 font-bold text-foreground">
                                                                {formatCurrency(p.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {reportData.pendingPaymentsList.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-12 text-muted-foreground italic">No outstanding pending payments found for this month.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* Leads Table */}
                                        {activeTab === 'leads' && (
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                        <th className="p-4 pl-6">Lead Name</th>
                                                        <th className="p-4">Class</th>
                                                        <th className="p-4">Registered Date</th>
                                                        <th className="p-4">Status</th>
                                                        <th className="p-4 text-right pr-6">Expected Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/10">
                                                    {reportData.leads.map((l: any) => (
                                                        <tr key={l.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-4 pl-6">
                                                                <p className="font-semibold text-foreground uppercase tracking-tight">{l.name}</p>
                                                                <p className="text-[10px] text-muted-foreground">{l.phone || "No phone"}</p>
                                                            </td>
                                                            <td className="p-4 text-foreground font-semibold">
                                                                {l.class || "N/A"}
                                                            </td>
                                                            <td className="p-4 text-muted-foreground font-medium">
                                                                {new Date(l.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge className={cn("text-[9px] font-black uppercase rounded-full px-2 py-0.5 border-none", getStatusStyles(l.status))}>
                                                                    {l.status.replace('_', ' ')}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 text-right pr-6 font-bold text-foreground">
                                                                {formatCurrency(l.value)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {reportData.leads.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-12 text-muted-foreground italic">No leads registered in this month.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        )}

                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right side: comparison list */}
                        <div className="lg:col-span-4">
                            <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                <CardHeader className="border-b border-border/10 pb-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <TrendingUp className="text-indigo-600" size={18} />
                                        <span>Historical Monthly Index</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">Compare performance stats dynamically across the past 6 months.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {isHistoryLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border/10">
                                            {historyList.map((hist, idx) => (
                                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{hist.monthName} {hist.year}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs font-extrabold text-foreground">{formatCurrency(hist.revenue)}</span>
                                                            <span className="text-[9px] text-muted-foreground">• {hist.admissions} new students</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[8px] font-bold text-muted-foreground block uppercase">Net Profit</span>
                                                        <span className={cn(
                                                            "text-xs font-black block mt-0.5",
                                                            hist.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                                        )}>
                                                            {hist.profit >= 0 ? "+" : ""}{formatCurrency(hist.profit)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
