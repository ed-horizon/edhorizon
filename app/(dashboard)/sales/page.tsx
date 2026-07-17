'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DollarSign, Users, Briefcase, TrendingUp, AlertCircle,
    MessageSquare, Calendar, Phone, CheckCircle, Clock, ToggleLeft, ToggleRight,
    UserPlus, Star, Activity, Plus, X, Loader2, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLeads, getSalesAgents, updateLead } from "./actions";
import CreateLeadDialog from "@/components/features/sales/CreateLeadDialog";
import LeadDetailDrawer from "@/components/features/sales/LeadDetailDrawer";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { onboardStudent, getAllTeachers } from "@/app/(dashboard)/attendance/actions";

type Lead = Awaited<ReturnType<typeof getLeads>>[number];
type SalesAgent = Awaited<ReturnType<typeof getSalesAgents>>[number];
type Teacher = Awaited<ReturnType<typeof getAllTeachers>>[number];

export default function SalesDashboard() {
    const [isHeadView, setIsHeadView] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [agents, setAgents] = useState<SalesAgent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [onboardLeadId, setOnboardLeadId] = useState<string | null>(null);
    const [userName, setUserName] = useState("Sales");
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [userRole, setUserRole] = useState<string>("sales");

    // CRM Master Board Filter States
    const [leadSearchText, setLeadSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterLatest2Days, setFilterLatest2Days] = useState(true);
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");

    const handleStartDateChange = (val: string) => {
        setFilterStartDate(val);
        if (val) {
            setFilterLatest2Days(false);
        }
    };

    const handleEndDateChange = (val: string) => {
        setFilterEndDate(val);
        if (val) {
            setFilterLatest2Days(false);
        }
    };

    const handleToggleLatest2Days = (checked: boolean) => {
        setFilterLatest2Days(checked);
        if (checked) {
            setFilterStartDate("");
            setFilterEndDate("");
        }
    };

    const getFilteredLeads = () => {
        return leads.filter(lead => {
            // Stage/Status filter
            if (filterStatus !== "all" && lead.status !== filterStatus) {
                return false;
            }

            if (leadSearchText.trim()) {
                const searchLower = leadSearchText.toLowerCase();
                const matchesName = lead.name?.toLowerCase().includes(searchLower);
                const matchesParent = lead.parent_name?.toLowerCase().includes(searchLower);
                const matchesEmail = lead.email?.toLowerCase().includes(searchLower);
                const matchesPhone = lead.phone?.toLowerCase().includes(searchLower);
                const matchesCourse = lead.required_course?.toLowerCase().includes(searchLower);
                if (!matchesName && !matchesParent && !matchesEmail && !matchesPhone && !matchesCourse) {
                    return false;
                }
            }

            const leadDate = new Date(lead.created_at || lead.scheduled_at || Date.now());

            if (filterLatest2Days) {
                const today = new Date();
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(today.getDate() - 1); // today + yesterday
                twoDaysAgo.setHours(0, 0, 0, 0); // start of yesterday

                if (leadDate < twoDaysAgo) {
                    return false;
                }
            }

            if (filterStartDate) {
                const start = new Date(filterStartDate + "T00:00:00");
                if (leadDate < start) return false;
            }

            if (filterEndDate) {
                const end = new Date(filterEndDate + "T23:59:59");
                if (leadDate > end) return false;
            }

            return true;
        });
    };

    // Onboarding Form States
    const [showOnboard, setShowOnboard] = useState(false);
    const [onboardName, setOnboardName] = useState("");
    const [onboardEmail, setOnboardEmail] = useState("");
    const [onboardMobile, setOnboardMobile] = useState("");
    const [onboardClass, setOnboardClass] = useState("");
    const [onboardFee, setOnboardFee] = useState("4500");
    const [onboardClassesPerMonth, setOnboardClassesPerMonth] = useState("12");
    const [onboardTeacherId, setOnboardTeacherId] = useState("");
    const [onboardStudentId, setOnboardStudentId] = useState("");
    const [onboardParentEmail, setOnboardParentEmail] = useState("");
    const [onboardSubject1Name, setOnboardSubject1Name] = useState("Maths");
    const [onboardSubject2Name, setOnboardSubject2Name] = useState("");
    const [onboardFee2, setOnboardFee2] = useState("0");
    const [onboardClassesPerMonth2, setOnboardClassesPerMonth2] = useState("0");
    const [onboardTeacherId2, setOnboardTeacherId2] = useState("");
    const [onboardSubject3Name, setOnboardSubject3Name] = useState("");
    const [onboardFee3, setOnboardFee3] = useState("0");
    const [onboardClassesPerMonth3, setOnboardClassesPerMonth3] = useState("0");
    const [onboardTeacherId3, setOnboardTeacherId3] = useState("");
    const [onboardSubject4Name, setOnboardSubject4Name] = useState("");
    const [onboardFee4, setOnboardFee4] = useState("0");
    const [onboardClassesPerMonth4, setOnboardClassesPerMonth4] = useState("0");
    const [onboardTeacherId4, setOnboardTeacherId4] = useState("");
    const [onboardSubject5Name, setOnboardSubject5Name] = useState("");
    const [onboardFee5, setOnboardFee5] = useState("0");
    const [onboardClassesPerMonth5, setOnboardClassesPerMonth5] = useState("0");
    const [onboardTeacherId5, setOnboardTeacherId5] = useState("");
    const [visibleSubjectsCount, setVisibleSubjectsCount] = useState(1);
    const [isOnboarding, setIsOnboarding] = useState(false);

    const loadData = async (headMode: boolean) => {
        setIsLoading(true);
        try {
            const [fetchedLeads, fetchedAgents, fetchedTeachers] = await Promise.all([
                getLeads(headMode),
                getSalesAgents(),
                getAllTeachers()
            ]);
            setLeads(fetchedLeads);
            setAgents(fetchedAgents);
            setTeachers(fetchedTeachers || []);
        } catch (error) {
            console.error("Failed to load CRM data:", error);
            toast.error("Error loading CRM records");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOnboardStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onboardName || !onboardEmail || !onboardMobile) {
            toast.error("Name, email and mobile number are mandatory.");
            return;
        }

        setIsOnboarding(true);
        try {
            const { formatStudentIdAndMobile } = await import("@/lib/utils");
            const serializedId = formatStudentIdAndMobile(onboardStudentId, onboardMobile);

            const res = await onboardStudent({
                fullName: onboardName,
                email: onboardEmail,
                gradeLevel: onboardClass || "N/A",
                monthlyFee: Number(onboardFee) || 4500,
                classesPerMonth: Number(onboardClassesPerMonth) || 12,
                assignedTeacherId: onboardTeacherId === "none" || !onboardTeacherId ? undefined : onboardTeacherId,
                customStudentId: serializedId,
                parentEmail: onboardParentEmail || undefined,
                subjectName1: onboardSubject1Name || "Maths",
                subjectName2: onboardSubject2Name || undefined,
                monthlyFee2: Number(onboardFee2) || 0,
                classesPerMonth2: Number(onboardClassesPerMonth2) || 0,
                assignedTeacherId2: onboardTeacherId2 === "none" || !onboardTeacherId2 ? undefined : onboardTeacherId2,
                subjectName3: onboardSubject3Name || undefined,
                monthlyFee3: Number(onboardFee3) || 0,
                classesPerMonth3: Number(onboardClassesPerMonth3) || 0,
                assignedTeacherId3: onboardTeacherId3 === "none" || !onboardTeacherId3 ? undefined : onboardTeacherId3,
                subjectName4: onboardSubject4Name || undefined,
                monthlyFee4: Number(onboardFee4) || 0,
                classesPerMonth4: Number(onboardClassesPerMonth4) || 0,
                assignedTeacherId4: onboardTeacherId4 === "none" || !onboardTeacherId4 ? undefined : onboardTeacherId4,
                subjectName5: onboardSubject5Name || undefined,
                monthlyFee5: Number(onboardFee5) || 0,
                classesPerMonth5: Number(onboardClassesPerMonth5) || 0,
                assignedTeacherId5: onboardTeacherId5 === "none" || !onboardTeacherId5 ? undefined : onboardTeacherId5,
                leadId: onboardLeadId || undefined
            });

            if (res.error) {
                toast.error(`Onboarding failed: ${res.error}`);
            } else {
                toast.success(`Student profile created for "${onboardName}"! Default password is 'password123'.`);
                
                setShowOnboard(false);
                setOnboardLeadId(null);
                setOnboardName("");
                setOnboardEmail("");
                setOnboardMobile("");
                setOnboardClass("");
                setOnboardFee("4500");
                setOnboardClassesPerMonth("12");
                setOnboardTeacherId("");
                setOnboardStudentId("");
                setOnboardParentEmail("");
                setOnboardSubject1Name("Maths");
                setOnboardSubject2Name("");
                setOnboardFee2("0");
                setOnboardClassesPerMonth2("0");
                setOnboardTeacherId2("");
                setOnboardSubject3Name("");
                setOnboardFee3("0");
                setOnboardClassesPerMonth3("0");
                setOnboardTeacherId3("");
                setOnboardSubject4Name("");
                setOnboardFee4("0");
                setOnboardClassesPerMonth4("0");
                setOnboardTeacherId4("");
                setOnboardSubject5Name("");
                setOnboardFee5("0");
                setOnboardClassesPerMonth5("0");
                setOnboardTeacherId5("");
                setVisibleSubjectsCount(1);
                await loadData(isHeadView);
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to onboard student");
        } finally {
            setIsOnboarding(false);
        }
    };

    useEffect(() => {
        loadData(isHeadView);
    }, [isHeadView]);

    useEffect(() => {
        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    if (profile.full_name) {
                        setUserName(profile.full_name);
                    } else if (user.email) {
                        setUserName(user.email.split('@')[0]);
                    }
                    if (profile.role) {
                        setUserRole(profile.role);
                        // If they are sales_head or admin, default them to head view!
                        if (profile.role === 'sales_head' || profile.role === 'admin' || profile.role === 'super_admin') {
                            setIsHeadView(true);
                        }
                    }
                }
            }
        };
        fetchProfile();
    }, []);

    const handleReassign = async (leadId: string, agentId: string) => {
        try {
            const result = await updateLead(leadId, { assigned_to: agentId || null });
            if (result.success) {
                toast.success("Lead reassigned successfully!");
                loadData(isHeadView);
            } else {
                toast.error(result.error || "Failed to reassign lead");
            }
        } catch (error) {
            toast.error("Failed to reassign lead");
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "new":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "contacted":
                return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            case "demo_scheduled":
                return "bg-purple-500/10 text-purple-500 border-purple-500/20";
            case "feedback":
                return "bg-sky-500/10 text-sky-500 border-sky-500/20";
            case "converted":
                return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
            case "not_converted":
                return "bg-rose-500/10 text-rose-500 border-rose-500/20";
            default:
                return "bg-muted text-muted-foreground border-border";
        }
    };

    // Calculate metrics
    const totalLeadsCount = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const contactedLeads = leads.filter(l => l.status === 'contacted').length;
    const demoLeads = leads.filter(l => l.status === 'demo_scheduled').length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;
    const lostLeads = leads.filter(l => l.status === 'not_converted').length;

    // Lead Sources Count
    const sourcesSummary = leads.reduce<Record<string, number>>((acc, curr) => {
        const src = curr.lead_source || 'Website';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
    }, { "Meta ad": 0, "WhatsApp": 0, "Referral": 0, "Website": 0, "Instagram": 0 });

    // Sales Representative Performance Summary
    const salesPerformanceList = agents
        .filter(agent => agent.role === 'sales' || agent.role === 'sales_head')
        .map(agent => {
            const agentLeads = leads.filter(l => l.assigned_to?.id === agent.id || l.assigned_to === agent.id);
            const wonLeads = agentLeads.filter(l => l.status === 'converted');
            const conversionRate = agentLeads.length > 0 ? Math.round((wonLeads.length / agentLeads.length) * 100) : 0;

            const callsDone = agentLeads.filter(l => l.status !== 'new').length * 2;
            const demosBooked = agentLeads.filter(l => ['demo_scheduled', 'feedback', 'converted'].includes(l.status)).length;

            return {
                id: agent.id,
                name: agent.full_name || agent.email,
                assigned: agentLeads.length,
                calls: callsDone,
                demos: demosBooked,
                won: wonLeads.length,
                conversion: conversionRate
            };
        });

    // Reminders for salesperson: include all active, pending leads (not converted, not lost) that have a follow-up scheduled.
    // Sorted by next_follow_up ascending so overdue/nearest follow-ups appear first.
    const reminders = leads
        .filter(l => l.next_follow_up && l.status !== 'converted' && l.status !== 'not_converted')
        .sort((a, b) => new Date(a.next_follow_up).getTime() - new Date(b.next_follow_up).getTime());

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">

            {/* Top Header & Role Switcher Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        {isHeadView ? `${userName}'s Sales Head Dashboard` : `${userName}'s Sales Pipeline`}
                    </h1>
                    <p className="text-xs text-muted-foreground italic font-medium leading-normal">
                        {isHeadView
                            ? "Founder/Sales Head full team pipeline overview and agent dispatch center."
                            : "Record parent follow-ups, trigger demo sessions, and secure tuition payouts."}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {["sales_head", "admin", "super_admin"].includes(userRole) && (
                        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/30">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-2">Mode Switcher:</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsHeadView(!isHeadView)}
                                className={cn("h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                                    isHeadView
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                                        : "bg-white hover:bg-muted text-foreground border border-border"
                                )}
                            >
                                {isHeadView ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                <span>{isHeadView ? "Sales Head Mode" : "Salesperson Mode"}</span>
                            </Button>
                        </div>
                    )}
                    {(isHeadView || ["sales_head", "admin", "super_admin"].includes(userRole)) && (
                        <Button
                            onClick={() => {
                                setOnboardName("");
                                setOnboardEmail("");
                                setOnboardClass("");
                                setOnboardFee("4500");
                                setOnboardClassesPerMonth("12");
                                setOnboardTeacherId("");
                                setOnboardStudentId("");
                                setShowOnboard(true);
                            }}
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-10 text-xs font-bold"
                        >
                            <Plus className="h-4 w-4" />
                            Onboard Student
                        </Button>
                    )}
                    <CreateLeadDialog onSuccess={() => loadData(isHeadView)} agents={agents} userRole={userRole} />
                    <ThemeToggle />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[50vh] animate-pulse">
                    <div className="flex flex-col items-center gap-3">
                        <Activity className="text-indigo-600 animate-spin" size={28} />
                        <span className="text-xs font-black uppercase text-indigo-600/50">Fetching CRM Stages...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* STATS BLOCK */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <Card className="p-4 rounded-xl border-border/40 bg-card text-center shadow-md">
                            <span className="block text-[9px] font-bold uppercase text-muted-foreground">Total CRM Leads</span>
                            <span className="block text-2xl font-extrabold text-foreground mt-1">{totalLeadsCount}</span>
                        </Card>
                        <Card className="p-4 rounded-xl border-border/40 bg-card text-center shadow-md border-b-2 border-b-blue-500">
                            <span className="block text-[9px] font-bold uppercase text-muted-foreground font-semibold">New Leads</span>
                            <span className="block text-2xl font-extrabold text-blue-500 mt-1">{newLeads}</span>
                        </Card>
                        <Card className="p-4 rounded-xl border-border/40 bg-card text-center shadow-md border-b-2 border-b-amber-500">
                            <span className="block text-[9px] font-bold uppercase text-muted-foreground">Contacted</span>
                            <span className="block text-2xl font-extrabold text-amber-500 mt-1">{contactedLeads}</span>
                        </Card>
                        <Card className="p-4 rounded-xl border-border/40 bg-card text-center shadow-md border-b-2 border-b-purple-500">
                            <span className="block text-[9px] font-bold uppercase text-muted-foreground">Demo Scheduled</span>
                            <span className="block text-2xl font-extrabold text-purple-500 mt-1">{demoLeads}</span>
                        </Card>
                        <Card className="p-4 rounded-xl border-border/40 bg-card text-center shadow-md border-b-2 border-b-emerald-500">
                            <span className="block text-[9px] font-bold uppercase text-muted-foreground">Admissions Closed</span>
                            <span className="block text-2xl font-extrabold text-emerald-500 mt-1">{convertedLeads}</span>
                        </Card>
                        <Card className="p-4 rounded-xl border-border/40 bg-card text-center shadow-md border-b-2 border-b-rose-500">
                            <span className="block text-[9px] font-bold uppercase text-muted-foreground">Lost Leads</span>
                            <span className="block text-2xl font-extrabold text-rose-500 mt-1">{lostLeads}</span>
                        </Card>
                    </div>

                    {isHeadView ? (
                        /* ================= SALES HEAD VIEW ================= */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Left: Lead Sources & Sales Performance (4 Cols) */}
                            <div className="lg:col-span-4 space-y-8">

                                {/* Lead Sources Chart Card */}
                                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                    <CardHeader className="border-b border-border/10 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <Users className="text-indigo-600" size={18} />
                                            <span>Lead Source Breakdown</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">Channels introducing traffic leads.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-4">
                                        {Object.entries(sourcesSummary).map(([src, count]) => (
                                            <div key={src} className="space-y-1 text-xs">
                                                <div className="flex justify-between font-semibold">
                                                    <span className="text-muted-foreground">{src}</span>
                                                    <span className="text-foreground">{count} leads</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full",
                                                            src === 'Meta ad' && "bg-indigo-600",
                                                            src === 'WhatsApp' && "bg-emerald-500",
                                                            src === 'Referral' && "bg-purple-500",
                                                            src === 'Website' && "bg-amber-500",
                                                            src === 'Instagram' && "bg-rose-500"
                                                        )}
                                                        style={{ width: `${totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 20}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Sales Representative Performance Ranking */}
                                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                    <CardHeader className="border-b border-border/10 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <Briefcase className="text-indigo-600" size={18} />
                                            <span>Sales Performance Leaderboard</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">KPI conversion checks per agent.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
                                        {salesPerformanceList.map(item => (
                                            <div key={item.id} className="p-3 bg-muted/10 rounded-xl border border-border/20 text-xs space-y-2">
                                                <div className="flex justify-between items-center font-bold">
                                                    <span className="text-foreground">{item.name}</span>
                                                    <span className="text-indigo-600">{item.conversion}% rate</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground font-semibold text-center border-t border-border/5 pt-1.5">
                                                     <div>
                                                         <span className="block text-[8px] uppercase">Assigned</span>
                                                         <span className="font-bold text-foreground block">{item.assigned}</span>
                                                     </div>
                                                     <div>
                                                         <span className="block text-[8px] uppercase">Calls</span>
                                                         <span className="font-bold text-foreground block">{item.calls}</span>
                                                     </div>
                                                     <div>
                                                         <span className="block text-[8px] uppercase">Demos</span>
                                                         <span className="font-bold text-foreground block">{item.demos}</span>
                                                     </div>
                                                     <div>
                                                         <span className="block text-[8px] uppercase">Converted</span>
                                                         <span className="font-bold text-emerald-600 block">{item.won}</span>
                                                     </div>
                                                 </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                            </div>

                            {/* Right: Master Leads Directory Table & Reassignments (8 Cols) */}
                            <div className="lg:col-span-8">
                                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                    <CardHeader className="border-b border-border/10 pb-4 space-y-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-base font-bold">CRM Master Leads Board</CardTitle>
                                                <CardDescription className="text-xs">Assign incoming leads to salespeople and monitor follow-ups.</CardDescription>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                                                {/* Stage/Status dropdown filter */}
                                                <select
                                                    value={filterStatus}
                                                    onChange={(e) => setFilterStatus(e.target.value)}
                                                    className="h-8 rounded-xl border border-border/40 bg-background px-3 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full md:w-36 font-semibold"
                                                >
                                                    <option value="all">All Stages</option>
                                                    <option value="new">New</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="demo_scheduled">Demo Scheduled</option>
                                                    <option value="feedback">Feedback</option>
                                                    <option value="converted">Converted (Won)</option>
                                                    <option value="not_converted">Not Converted (Lost)</option>
                                                </select>

                                                {/* Search bar inside header */}
                                                <div className="relative w-full md:w-60">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                                                    <Input
                                                        placeholder="Search by name, parent, email..."
                                                        value={leadSearchText}
                                                        onChange={(e) => setLeadSearchText(e.target.value)}
                                                        className="pl-9 h-8 rounded-xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-[10px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Date Filter & 2-day Toggle Row */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 text-xs">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                {/* Latest 2 Days Checkbox */}
                                                <label className="flex items-center gap-2 font-semibold text-[10px] text-indigo-600 dark:text-indigo-400 cursor-pointer select-none bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-colors px-3 py-1.5 rounded-xl">
                                                    <input
                                                        type="checkbox"
                                                        checked={filterLatest2Days}
                                                        onChange={(e) => handleToggleLatest2Days(e.target.checked)}
                                                        className="rounded border-indigo-500/20 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                                                    />
                                                    <span>Latest 2 Days (Today & Yesterday)</span>
                                                </label>

                                                {/* Date Range Inputs */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">From:</span>
                                                        <Input
                                                            type="date"
                                                            value={filterStartDate}
                                                            onChange={(e) => handleStartDateChange(e.target.value)}
                                                            className="h-7 text-[10px] rounded-lg px-2 w-32 border border-muted/30"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">To:</span>
                                                        <Input
                                                            type="date"
                                                            value={filterEndDate}
                                                            onChange={(e) => handleEndDateChange(e.target.value)}
                                                            className="h-7 text-[10px] rounded-lg px-2 w-32 border border-muted/30"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reset Button */}
                                            {(filterStartDate || filterEndDate || !filterLatest2Days || leadSearchText || filterStatus !== "all") && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setLeadSearchText("");
                                                        setFilterStatus("all");
                                                        handleToggleLatest2Days(true);
                                                    }}
                                                    className="h-7 text-[9px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 rounded-lg px-2.5"
                                                >
                                                    Clear Filters
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                        <th className="p-4 pl-6">Student & Parent</th>
                                                        <th className="p-4">Source</th>
                                                        <th className="p-4">Expected Value</th>
                                                        <th className="p-4">Status</th>
                                                        <th className="p-4">Latest Feedback / Update</th>
                                                        <th className="p-4">Assign Salesperson</th>
                                                        <th className="p-4 text-right pr-6">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/10">
                                                    {getFilteredLeads().map(lead => (
                                                        <tr key={lead.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-4 pl-6 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                                                <p className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight">{lead.name}</p>
                                                                <p className="text-[10px] text-muted-foreground">Parent: {lead.parent_name || 'N/A'} • {lead.phone || 'No phone'}</p>
                                                            </td>
                                                            <td className="p-4 font-semibold text-muted-foreground">
                                                                {lead.lead_source || "Website"}
                                                            </td>
                                                            <td className="p-4 font-bold text-foreground">
                                                                ₹{lead.value || 0}
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge className={cn("text-[9px] font-black uppercase border-none rounded-full px-2.5 py-0.5", getStatusStyles(lead.status))}>
                                                                    {lead.status.replace("_", " ")}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 max-w-[200px] truncate text-muted-foreground font-medium" title={lead.feedback || ""}>
                                                                {lead.feedback || <span className="text-muted-foreground/30 italic">No feedback updated</span>}
                                                            </td>
                                                            <td className="p-4">
                                                                <select
                                                                    value={lead.assigned_to?.id || lead.assigned_to || ""}
                                                                    onChange={(e) => handleReassign(lead.id, e.target.value)}
                                                                    className="h-8 rounded-lg border border-input bg-background px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full max-w-[130px] font-semibold"
                                                                >
                                                                    <option value="">Unassigned</option>
                                                                    {agents.filter(a => a.role === 'sales' || a.role === 'sales_head').map(a => (
                                                                        <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-4 text-right pr-6">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => setSelectedLead(lead)}
                                                                        className="h-8 text-[10px] font-bold uppercase tracking-wider px-3 rounded-lg border-indigo-500/30 text-indigo-600 hover:bg-indigo-50"
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    {lead.status === 'converted' && (
                                                                         lead.is_onboarded ? (
                                                                             <Badge className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-none rounded-full px-2.5 py-1">
                                                                                 Onboarded
                                                                             </Badge>
                                                                         ) : (
                                                                             <Button
                                                                                 size="sm"
                                                                                 onClick={() => {
                                                                                     setOnboardLeadId(lead.id);
                                                                                     setOnboardName(lead.name);
                                                                                     setOnboardEmail(lead.email || "");
                                                                                     setOnboardClass(lead.class || "");
                                                                                     setOnboardFee(lead.value ? String(lead.value) : "4500");
                                                                                     setOnboardClassesPerMonth("12");
                                                                                     setOnboardTeacherId("");
                                                                                     setOnboardStudentId("");
                                                                                     setShowOnboard(true);
                                                                                 }}
                                                                                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider px-3 rounded-lg shadow-sm"
                                                                             >
                                                                                 Onboard
                                                                             </Button>
                                                                         )
                                                                     )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {getFilteredLeads().length === 0 && (
                                                        <tr>
                                                            <td colSpan={7} className="text-center py-10 text-muted-foreground italic">No matching leads found in CRM.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                        </div>
                    ) : (
                        /* ================= SALESPERSON VIEW ================= */
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Left: Reminders & Follow-Ups (4 Cols) */}
                            <div className="lg:col-span-4 space-y-8">
                                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                    <CardHeader className="bg-rose-50/50 dark:bg-rose-950/15 border-b border-border/10 pb-4">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <Clock className="text-rose-600 animate-pulse" size={18} />
                                            <span>Active Reminders</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs">Leads scheduled for follow-up call today.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
                                        {reminders.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic text-center py-8">No scheduled reminders for today!</p>
                                        ) : (
                                            reminders.map(r => (
                                                <div key={r.id} className="p-3 border border-border/20 rounded-xl bg-muted/10 space-y-1.5 text-xs hover:border-rose-500/20 transition-all cursor-pointer" onClick={() => setSelectedLead(r)}>
                                                    <div className="flex justify-between font-bold">
                                                        <span className="text-foreground">{r.name}</span>
                                                        <span className="text-rose-500 font-bold">
                                                            {new Date(r.next_follow_up).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-[10px] truncate">Course: {r.required_course || 'Hindi'}</p>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right: Assigned Leads Directory & Call Trigger Actions (8 Cols) */}
                            <div className="lg:col-span-8">
                                <Card className="rounded-2xl border-border/40 shadow-md bg-card overflow-hidden">
                                    <CardHeader className="border-b border-border/10 pb-4">
                                        <CardTitle className="text-base font-bold">My Assigned Leads</CardTitle>
                                        <CardDescription className="text-xs">Manage phone follow-ups, select call status, and record notes.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-muted/30 border-b border-border/15 font-bold text-muted-foreground uppercase tracking-widest text-[9px]">
                                                        <th className="p-4 pl-6">Student & Parent Details</th>
                                                        <th className="p-4">Required Course</th>
                                                        <th className="p-4">Class</th>
                                                        <th className="p-4">Status</th>
                                                        <th className="p-4">Latest Feedback / Update</th>
                                                        <th className="p-4 text-right pr-6">Instant Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/10">
                                                    {leads.map(lead => (
                                                        <tr key={lead.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-4 pl-6 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                                                <p className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight">{lead.name}</p>
                                                                <p className="text-[10px] text-muted-foreground">Parent: {lead.parent_name || 'N/A'} • {lead.phone || 'No phone'}</p>
                                                            </td>
                                                            <td className="p-4 font-semibold text-muted-foreground">
                                                                {lead.required_course || "Spoken Hindi"}
                                                            </td>
                                                            <td className="p-4 font-bold text-foreground">
                                                                {lead.class || "Class 5"}
                                                            </td>
                                                            <td className="p-4">
                                                                <Badge className={cn("text-[9px] font-black uppercase border-none rounded-full px-2.5 py-0.5", getStatusStyles(lead.status))}>
                                                                    {lead.status.replace("_", " ")}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 max-w-[200px] truncate text-muted-foreground font-medium" title={lead.feedback || ""}>
                                                                {lead.feedback || <span className="text-muted-foreground/30 italic">No feedback updated</span>}
                                                            </td>
                                                            <td className="p-4 text-right pr-6">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => setSelectedLead(lead)}
                                                                        className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg border-2"
                                                                    >
                                                                        Details
                                                                    </Button>
                                                                    {lead.phone && (
                                                                        <a
                                                                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                        >
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-8 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                            >
                                                                                WhatsApp
                                                                            </Button>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {leads.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-10 text-muted-foreground italic">No leads assigned to you. Add some leads above!</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                        </div>
                    )}
                </>
            )}

            {/* Leads detail drawer */}
            <LeadDetailDrawer
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onUpdate={() => loadData(isHeadView)}
                agents={agents}
            />

            {/* ONBOARDING MODAL DIALOG */}
            {showOnboard && (
                <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <Card className="w-full max-w-[460px] rounded-2xl p-6 bg-card border-none shadow-2xl relative text-left max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-4 top-4 text-muted-foreground rounded-full z-10"
                            onClick={() => setShowOnboard(false)}
                            disabled={isOnboarding}
                        >
                            <X className="h-5 w-5" />
                        </Button>

                        <CardHeader className="px-0 pb-4 shrink-0">
                            <CardTitle className="font-serif text-xl font-bold text-foreground">Onboard New Admission</CardTitle>
                            <CardDescription className="text-xs">Create student profile and trigger portal setup.</CardDescription>
                        </CardHeader>

                        <form onSubmit={handleOnboardStudent} className="flex flex-col flex-1 min-h-0">
                            <div className="overflow-y-auto pr-1 flex-1 space-y-4 text-xs pb-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-name">Student Full Name *</Label>
                                    <Input
                                        id="student-name"
                                        required
                                        value={onboardName}
                                        onChange={(e) => setOnboardName(e.target.value)}
                                        placeholder="e.g. Rohan Sen"
                                        className="rounded-xl h-10 text-xs text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-id">Student ID (Optional)</Label>
                                    <Input
                                        id="student-id"
                                        value={onboardStudentId}
                                        onChange={(e) => setOnboardStudentId(e.target.value)}
                                        placeholder="e.g. EH-ST-1001"
                                        className="rounded-xl h-10 text-xs text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-email">User ID (Login Email) *</Label>
                                    <Input
                                        id="student-email"
                                        required
                                        type="email"
                                        value={onboardEmail}
                                        onChange={(e) => setOnboardEmail(e.target.value)}
                                        placeholder="e.g. rohan@edhorizon.com"
                                        className="rounded-xl h-10 text-xs text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="parent-email">Parent Email (Optional)</Label>
                                    <Input
                                        id="parent-email"
                                        type="email"
                                        value={onboardParentEmail}
                                        onChange={(e) => setOnboardParentEmail(e.target.value)}
                                        placeholder="parent@example.com"
                                        className="rounded-xl h-10 text-xs text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-mobile">Parent Mobile Number *</Label>
                                    <Input
                                        id="student-mobile"
                                        required
                                        value={onboardMobile}
                                        onChange={(e) => setOnboardMobile(e.target.value)}
                                        placeholder="e.g. 9876543210"
                                        className="rounded-xl h-10 text-xs text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="student-class">Grade</Label>
                                    <Input
                                        id="student-class"
                                        value={onboardClass}
                                        onChange={(e) => setOnboardClass(e.target.value)}
                                        placeholder="e.g. Class 3"
                                        className="rounded-xl h-10 text-xs text-foreground"
                                    />
                                </div>

                                <div className="space-y-4 border-t border-border/10 pt-4">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-600">Subject Packages</h4>

                                    {/* Subject 1 (Primary) */}
                                    <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 1 (Primary)</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-name">Subject Name</Label>
                                                <Input
                                                    id="sub1-name"
                                                    value={onboardSubject1Name}
                                                    onChange={(e) => setOnboardSubject1Name(e.target.value)}
                                                    placeholder="e.g. Maths"
                                                    className="rounded-xl h-10 text-xs text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-fee">Fee (₹)</Label>
                                                <Input
                                                    id="sub1-fee"
                                                    value={onboardFee}
                                                    onChange={(e) => setOnboardFee(e.target.value)}
                                                    placeholder="4500"
                                                    className="rounded-xl h-10 text-xs text-foreground"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-classes">Classes / Month</Label>
                                                <Input
                                                    id="sub1-classes"
                                                    value={onboardClassesPerMonth}
                                                    onChange={(e) => setOnboardClassesPerMonth(e.target.value)}
                                                    placeholder="12"
                                                    className="rounded-xl h-10 text-xs text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sub1-tutor">Assign Tutor</Label>
                                                <Select onValueChange={setOnboardTeacherId} value={onboardTeacherId}>
                                                    <SelectTrigger id="sub1-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs text-foreground">
                                                        <SelectValue placeholder="Assign tutor..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border border-border/40">
                                                        <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                        {teachers.map(t => (
                                                            <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                {t.full_name || t.email}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subject 2 */}
                                    {visibleSubjectsCount >= 2 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 2</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-name">Subject Name</Label>
                                                    <Input
                                                        id="sub2-name"
                                                        value={onboardSubject2Name}
                                                        onChange={(e) => setOnboardSubject2Name(e.target.value)}
                                                        placeholder="e.g. Science"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-fee">Fee (₹)</Label>
                                                    <Input
                                                        id="sub2-fee"
                                                        value={onboardFee2}
                                                        onChange={(e) => setOnboardFee2(e.target.value)}
                                                        placeholder="3500"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-classes">Classes / Month</Label>
                                                    <Input
                                                        id="sub2-classes"
                                                        value={onboardClassesPerMonth2}
                                                        onChange={(e) => setOnboardClassesPerMonth2(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub2-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId2} value={onboardTeacherId2}>
                                                        <SelectTrigger id="sub2-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs text-foreground">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subject 3 */}
                                    {visibleSubjectsCount >= 3 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 3</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-name">Subject Name</Label>
                                                    <Input
                                                        id="sub3-name"
                                                        value={onboardSubject3Name}
                                                        onChange={(e) => setOnboardSubject3Name(e.target.value)}
                                                        placeholder="e.g. English"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-fee">Fee (₹)</Label>
                                                    <Input
                                                        id="sub3-fee"
                                                        value={onboardFee3}
                                                        onChange={(e) => setOnboardFee3(e.target.value)}
                                                        placeholder="3000"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-classes">Classes / Month</Label>
                                                    <Input
                                                        id="sub3-classes"
                                                        value={onboardClassesPerMonth3}
                                                        onChange={(e) => setOnboardClassesPerMonth3(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub3-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId3} value={onboardTeacherId3}>
                                                        <SelectTrigger id="sub3-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs text-foreground">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subject 4 */}
                                    {visibleSubjectsCount >= 4 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 4</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-name">Subject Name</Label>
                                                    <Input
                                                        id="sub4-name"
                                                        value={onboardSubject4Name}
                                                        onChange={(e) => setOnboardSubject4Name(e.target.value)}
                                                        placeholder="e.g. Geography"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-fee">Fee (₹)</Label>
                                                    <Input
                                                        id="sub4-fee"
                                                        value={onboardFee4}
                                                        onChange={(e) => setOnboardFee4(e.target.value)}
                                                        placeholder="3000"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-classes">Classes / Month</Label>
                                                    <Input
                                                        id="sub4-classes"
                                                        value={onboardClassesPerMonth4}
                                                        onChange={(e) => setOnboardClassesPerMonth4(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub4-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId4} value={onboardTeacherId4}>
                                                        <SelectTrigger id="sub4-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs text-foreground">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subject 5 */}
                                    {visibleSubjectsCount >= 5 && (
                                        <div className="space-y-3 bg-muted/10 p-4 rounded-2xl border border-border/10 animate-in slide-in-from-top-2 duration-200">
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject 5</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-name">Subject Name</Label>
                                                    <Input
                                                        id="sub5-name"
                                                        value={onboardSubject5Name}
                                                        onChange={(e) => setOnboardSubject5Name(e.target.value)}
                                                        placeholder="e.g. History"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-fee">Fee (₹)</Label>
                                                    <Input
                                                        id="sub5-fee"
                                                        value={onboardFee5}
                                                        onChange={(e) => setOnboardFee5(e.target.value)}
                                                        placeholder="3000"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-classes">Classes / Month</Label>
                                                    <Input
                                                        id="sub5-classes"
                                                        value={onboardClassesPerMonth5}
                                                        onChange={(e) => setOnboardClassesPerMonth5(e.target.value)}
                                                        placeholder="8"
                                                        className="rounded-xl h-10 text-xs text-foreground"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="sub5-tutor">Assign Tutor</Label>
                                                    <Select onValueChange={setOnboardTeacherId5} value={onboardTeacherId5}>
                                                        <SelectTrigger id="sub5-tutor" className="h-10 rounded-xl border border-muted/50 bg-background text-xs text-foreground">
                                                            <SelectValue placeholder="Assign tutor..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-border/40">
                                                            <SelectItem value="none" className="rounded-lg">None</SelectItem>
                                                            {teachers.map(t => (
                                                                <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                                    {t.full_name || t.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Subject Package Button */}
                                    {visibleSubjectsCount < 5 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full rounded-xl border-dashed border-indigo-500/40 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 text-[11px] font-bold gap-1 mt-2 py-4 h-auto"
                                            onClick={() => setVisibleSubjectsCount(prev => Math.min(5, prev + 1))}
                                        >
                                            + Add Another Subject Package ({visibleSubjectsCount}/5)
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border/10 shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl font-bold uppercase tracking-wider h-11 text-xs"
                                    onClick={() => setShowOnboard(false)}
                                    disabled={isOnboarding}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isOnboarding}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider h-11 text-xs px-6 flex items-center gap-2"
                                >
                                    {isOnboarding ? (
                                        <>
                                            <Loader2 className="animate-spin h-4 w-4" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <span>Create Student</span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

        </div>
    );
}
