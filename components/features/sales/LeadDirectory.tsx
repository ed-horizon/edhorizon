"use client";

import { useState, useEffect } from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Calendar, User, MessageSquare } from "lucide-react";
import LeadDetailDrawer from "./LeadDetailDrawer";
import { useRouter } from "next/navigation";

interface LeadDirectoryProps {
    leads: any[];
    stages: any[]; // Kept for compatibility if needed, but we define custom filter list
    agents: any[];
}

const FILTER_STATUSES = [
    { value: "all", label: "All Statuses" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "demo_scheduled", label: "Demo Scheduled" },
    { value: "feedback", label: "Feedback" },
    { value: "converted", label: "Converted" },
    { value: "not_converted", label: "Not Converted" }
];

export default function LeadDirectory({ leads: initialLeads, agents }: LeadDirectoryProps) {
    const router = useRouter();
    const [selectedLead, setSelectedLead] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Sync selected lead with updated props after save action
    useEffect(() => {
        if (selectedLead) {
            const updated = initialLeads.find(l => l.id === selectedLead.id);
            if (updated) {
                setSelectedLead(updated);
            }
        }
    }, [initialLeads]);

    const handleUpdate = () => {
        router.refresh();
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

    // Filter leads based on search query and status filter
    const filteredLeads = initialLeads.filter(lead => {
        const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
        
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
            lead.name?.toLowerCase().includes(q) ||
            lead.email?.toLowerCase().includes(q) ||
            lead.phone?.toLowerCase().includes(q) ||
            lead.class?.toLowerCase().includes(q) ||
            lead.feedback?.toLowerCase().includes(q);

        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border border-border/40 shadow-sm">
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search leads by name, class, contact or update..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-xs rounded-xl border-border/40 focus-visible:ring-indigo-500"
                    />
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex h-9 w-full md:w-44 items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {FILTER_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                                {status.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-card rounded-[1.5rem] border border-border/40 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b border-border/40">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 py-4 pl-6">Student Name</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 py-4">Class</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 py-4">Expected Value</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 py-4">Status</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 py-4 max-w-[200px]">Latest Feedback / Update</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 py-4">Assigned Agent</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 py-4 pr-6">Created Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLeads.length > 0 ? (
                            filteredLeads.map((lead) => (
                                <TableRow
                                    key={lead.id}
                                    onClick={() => setSelectedLead(lead)}
                                    className="border-b border-border/20 cursor-pointer hover:bg-muted/20 transition-colors"
                                >
                                    <TableCell className="font-serif font-black text-xs text-primary pl-6 py-3.5 uppercase tracking-tight">
                                        {lead.name}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-semibold">
                                        {lead.class ? (
                                            <Badge variant="outline" className="font-bold text-[9px] uppercase px-2 py-0.5 rounded-md bg-muted/40 border-border/50 text-muted-foreground/90">
                                                {lead.class}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground/30">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs font-bold text-indigo-600">
                                        ₹{parseFloat(lead.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`font-bold text-[9px] uppercase tracking-wider px-2.5 py-0.5 border ${getStatusStyles(lead.status)}`}>
                                            {lead.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground truncate max-w-[220px] font-medium">
                                        {lead.feedback ? (
                                            <span className="flex items-center gap-1.5">
                                                <MessageSquare size={10} className="shrink-0 text-indigo-500 opacity-60" />
                                                <span className="truncate">{lead.feedback}</span>
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/25 italic">No feedback entered</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs font-semibold text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <User size={10} className="shrink-0 opacity-40" />
                                            <span className="truncate max-w-[120px]">{lead.assigned_to?.full_name || "Unassigned"}</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground pr-6">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={10} className="shrink-0 opacity-40" />
                                            <span>
                                                {new Date(lead.created_at).toLocaleDateString(undefined, {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground/40 text-xs italic">
                                    No leads found in this filter view.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Detail Drawer Slide-out */}
            <LeadDetailDrawer
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onUpdate={handleUpdate}
                agents={agents}
            />
        </div>
    );
}
