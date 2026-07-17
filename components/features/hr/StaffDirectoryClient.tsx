
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, MoreHorizontal, Mail, Calendar, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getRoleDisplayName } from "@/lib/utils";

interface StaffMember {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    staff_details?: {
        status: string;
        joining_date: string;
        hourly_rate?: number;
        basic_salary?: number;
        pay_basis?: 'hourly' | 'fixed';
        employee_id?: string | null;
        mobile_number?: string | null;
        job_title?: string | null;
    } | null;
    student_count?: number;
}

import { createStaffMember, updateStaffMember, updateStaffStatus } from "@/app/(dashboard)/hr/staff/actions";
import { toast } from "sonner";

export default function StaffDirectoryClient({ 
    initialStaff,
    currentUserRole = "hr"
}: { 
    initialStaff: StaffMember[];
    currentUserRole?: string;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState<string>("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        role: "teacher",
        job_title: "Tutor",
        employee_id: "EMP",
        mobile_number: ""
    });

    // Pay Basis and Salary states
    const [payBasis, setPayBasis] = useState<"hourly" | "fixed">("hourly");
    const [basicSalary, setBasicSalary] = useState<string>("");
    const [hourlyRate, setHourlyRate] = useState<string>("");

    // Editing states
    const [editPayBasis, setEditPayBasis] = useState<"hourly" | "fixed">("hourly");
    const [editBasicSalary, setEditBasicSalary] = useState<string>("");
    const [editHourlyRate, setEditHourlyRate] = useState<string>("");

    const openEditStaff = (staff: StaffMember) => {
        const details = staff.staff_details;
        setEditPayBasis(details?.pay_basis || 'hourly');
        setEditBasicSalary(details?.basic_salary ? String(details.basic_salary) : "");
        setEditHourlyRate(details?.hourly_rate ? String(details.hourly_rate) : "");
        setEditingStaff(staff);
    };

    const filteredStaff = initialStaff.filter(person => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = (
            (person.full_name?.toLowerCase().includes(searchLower)) ||
            (person.email?.toLowerCase().includes(searchLower)) ||
            (person.staff_details?.job_title?.toLowerCase().includes(searchLower))
        );
        const matchesRole = selectedRole === "all" || person.role === selectedRole;
        return matchesSearch && matchesRole;
    });

    const roles = Array.from(new Set(initialStaff.map(s => s.role)));

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.mobile_number.trim()) {
            toast.error("Mobile number is mandatory");
            return;
        }
        setIsSubmitting(true);
        const result = await createStaffMember({
            ...formData,
            pay_basis: payBasis,
            basic_salary: payBasis === "fixed" ? parseFloat(basicSalary || "0") : 0,
            hourly_rate: payBasis === "hourly" ? parseFloat(hourlyRate || "0") : 0
        });
        setIsSubmitting(false);
        if (result.success) {
            setIsAddModalOpen(false);
            setFormData({ full_name: "", email: "", role: "teacher", job_title: "Tutor", employee_id: "EMP", mobile_number: "" });
            setPayBasis("hourly");
            setBasicSalary("");
            setHourlyRate("");
            toast.success("Staff member invited successfully");
        } else {
            toast.error(result.error);
        }
    };

    const handleUpdateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStaff) return;
        if (!editingStaff.staff_details?.mobile_number?.trim()) {
            toast.error("Mobile number is mandatory");
            return;
        }
        setIsSubmitting(true);
        const result = await updateStaffMember(editingStaff.id, {
            full_name: editingStaff.full_name || "",
            email: editingStaff.email,
            role: editingStaff.role,
            job_title: editingStaff.staff_details?.job_title || "",
            pay_basis: editPayBasis,
            basic_salary: editPayBasis === "fixed" ? parseFloat(editBasicSalary || "0") : 0,
            hourly_rate: editPayBasis === "hourly" ? parseFloat(editHourlyRate || "0") : 0,
            employee_id: editingStaff.staff_details?.employee_id || "",
            mobile_number: editingStaff.staff_details?.mobile_number || ""
        });
        setIsSubmitting(false);
        if (result.success) {
            setEditingStaff(null);
            toast.success("Staff profile updated");
        } else {
            toast.error(result.error);
        }
    };

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const result = await updateStaffStatus(id, newStatus);
        if (result.success) {
            toast.success(`Staff status updated to ${newStatus}`);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="space-y-10">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-[2rem] shadow-sm border border-border/40">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 bg-muted/20 border-none rounded-full h-12 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto relative">
                    <div className="relative">
                        <Button
                            variant="outline"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={cn(
                                "rounded-full gap-2 text-xs font-bold uppercase tracking-widest h-12 px-6 transition-all",
                                selectedRole !== "all" && "border-indigo-500 text-indigo-600 bg-indigo-50"
                            )}
                        >
                            <Filter className="h-4 w-4" />
                            {selectedRole === "all" ? "Filters" : getRoleDisplayName(selectedRole)}
                        </Button>

                        {isFilterOpen && (
                            <div className="absolute top-14 right-0 z-50 w-48 bg-card border border-border/40 rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in duration-200">
                                <button
                                    onClick={() => { setSelectedRole("all"); setIsFilterOpen(false); }}
                                    className={cn("w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30", selectedRole === "all" && "text-indigo-600 bg-indigo-50")}
                                >
                                    All Roles
                                </button>
                                {roles.map(role => (
                                    <button
                                        key={role}
                                        onClick={() => { setSelectedRole(role); setIsFilterOpen(false); }}
                                        className={cn("w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30", selectedRole === role && "text-indigo-600 bg-indigo-50")}
                                    >
                                        {getRoleDisplayName(role)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-12 px-8 font-bold text-xs uppercase tracking-widest ml-auto md:ml-0"
                    >
                        Add New Staff
                    </Button>
                </div>
            </div>

            {/* Add Staff Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Add Staff Member</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddStaff} className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                <Input
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                <Input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-sm font-medium"
                                >
                                    <option value="teacher">Tutor</option>
                                    <option value="operations">Operations</option>
                                    <option value="hr">HR</option>
                                    <option value="sales">Sales</option>
                                    <option value="sales_head">Sales Head</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground">Controls dashboard and data access.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Job Title / Custom Role</label>
                                <Input
                                    required
                                    value={formData.job_title}
                                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    placeholder="e.g. Receptionist"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</label>
                                <Input
                                    required
                                    type="tel"
                                    value={formData.mobile_number}
                                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    placeholder="e.g. +91 9876543210"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Employee ID</label>
                                <Input
                                    value={formData.employee_id}
                                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    placeholder="EMP001"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pay Basis</label>
                                <select
                                    value={payBasis}
                                    onChange={(e) => setPayBasis(e.target.value as "hourly" | "fixed")}
                                    className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-sm font-medium"
                                >
                                    <option value="hourly">Hourly Pay</option>
                                    <option value="fixed">Fixed Pay</option>
                                </select>
                            </div>
                            {payBasis === "fixed" ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Basic Salary (₹)</label>
                                    <Input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={basicSalary}
                                        onChange={(e) => setBasicSalary(e.target.value)}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        placeholder="e.g. 25000"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hourly Rate (₹)</label>
                                    <Input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={hourlyRate}
                                        onChange={(e) => setHourlyRate(e.target.value)}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        placeholder="e.g. 200"
                                    />
                                </div>
                            )}
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    {isSubmitting ? "Creating..." : "Create Member"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Staff Table */}
            <div className="bg-card rounded-[2.5rem] shadow-xl overflow-hidden border border-border/30">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b-border/30">
                            <TableHead className="py-6 pl-8 font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic">Name & Role</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Contact</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Status</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Hourly Pay</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Tutor Group</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-center">Joined Date</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground italic text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStaff.map((person, index) => {
                            const isLastItem = index >= filteredStaff.length - 2;
                            return (
                                <TableRow key={person.id} className="hover:bg-muted/20 transition-colors border-b-border/20">
                                    <TableCell className="py-5 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold">
                                                {person.full_name?.charAt(0) || person.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">{person.full_name || 'No Name Set'}</p>
                                                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-tighter">
                                                    {person.staff_details?.job_title || getRoleDisplayName(person.role, person.full_name)}
                                                    {person.staff_details?.employee_id && (
                                                        <span className="text-muted-foreground ml-2 normal-case font-mono">({person.staff_details.employee_id})</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                <Mail size={12} className="text-indigo-500" />
                                                {person.email}
                                            </div>
                                            {person.staff_details?.mobile_number && (() => {
                                                const cleanMobile = person.staff_details.mobile_number.replace(/\D/g, "");
                                                const formattedMobile = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
                                                return (
                                                    <div className="flex flex-col items-center gap-1 mt-1.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider bg-indigo-50 text-indigo-600">Cell</span>
                                                            <span>{person.staff_details.mobile_number}</span>
                                                        </div>
                                                        <a
                                                            href={`https://wa.me/${formattedMobile}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all hover:scale-105"
                                                        >
                                                            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008 0c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-.002 0-.003 0-.005 0-2.002-.001-3.972-.513-5.717-1.488L0 24zm6.59-4.846c1.6.95 2.534 1.483 3.96 1.486 5.315 0 9.64-4.321 9.643-9.637.002-2.576-1.002-5.001-2.827-6.829-1.824-1.826-4.249-2.827-6.828-2.828-5.32 0-9.647 4.322-9.65 9.639-.001 1.516.4 2.99 1.159 4.3l.255.44-1.02 3.722 3.818-1.002.433.256zM17.17 14.39c-.28-.14-1.65-.81-1.91-.9-.26-.1-.45-.14-.64.14-.19.28-.73.9-.9 1.09-.17.19-.34.21-.62.07-1.37-.68-2.31-1.2-3.23-2.78-.24-.41.24-.38.69-1.28.08-.17.04-.31-.02-.45-.06-.14-.54-1.31-.74-1.8-.19-.47-.39-.4-.54-.41-.14-.01-.31-.01-.48-.01-.17 0-.45.06-.69.31-.24.25-.92.9-.92 2.2 0 1.3.95 2.56 1.08 2.74.13.18 1.87 2.85 4.54 4 .64.27 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.26.22-.61.22-1.14.15-1.25-.07-.11-.26-.18-.54-.32z"/>
                                                            </svg>
                                                            <span>Chat on WhatsApp</span>
                                                        </a>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="secondary"
                                            className={`rounded-full border-none font-bold text-[10px] uppercase tracking-wider px-3 py-1 ${person.staff_details?.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-600'
                                                : person.staff_details?.status === 'locked'
                                                ? 'bg-purple-500/10 text-purple-600'
                                                : 'bg-amber-500/10 text-amber-600'
                                                }`}
                                        >
                                            {person.staff_details?.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <div className="text-xs font-bold text-slate-700">
                                                {person.staff_details?.pay_basis === 'fixed' ? (
                                                    <span>₹{(person.staff_details.basic_salary || 0).toLocaleString()}/mo</span>
                                                ) : (
                                                    <span>{person.staff_details?.hourly_rate ? `₹${person.staff_details.hourly_rate}/hr` : <span className="opacity-40 italic">No rate</span>}</span>
                                                )}
                                            </div>
                                            {person.staff_details?.pay_basis === 'fixed' ? (
                                                person.staff_details?.hourly_rate && person.staff_details.hourly_rate > 0 ? (
                                                    <div className="text-[10px] font-medium text-muted-foreground">
                                                        ₹{person.staff_details.hourly_rate}/hr
                                                    </div>
                                                ) : null
                                            ) : (
                                                person.staff_details?.basic_salary && person.staff_details.basic_salary > 0 ? (
                                                    <div className="text-[10px] font-medium text-muted-foreground">
                                                        ₹{(person.staff_details.basic_salary || 0).toLocaleString()} base
                                                    </div>
                                                ) : null
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                                            {person.role === 'teacher' ? (
                                                <a
                                                    href={`/hr/students?search=${encodeURIComponent(person.full_name || '')}`}
                                                    className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Users size={12} className="text-indigo-500" />
                                                    {person.student_count || 0} students
                                                </a>
                                            ) : (
                                                <span className="opacity-20">—</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                                            <Calendar size={12} />
                                            {person.staff_details?.joining_date ? new Date(person.staff_details.joining_date).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="relative">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 rounded-full"
                                                onClick={() => setOpenMenuId(openMenuId === person.id ? null : person.id)}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
    
                                            {openMenuId === person.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                    <div className={cn(
                                                        "absolute z-50 w-40 bg-card border border-border/40 rounded-2xl shadow-xl p-2 animate-in fade-in duration-200",
                                                        isLastItem ? "bottom-full mb-1 right-0 origin-bottom-right" : "top-10 right-0 origin-top-right"
                                                    )}>
                                                        <a
                                                            href={`/hr/staff/${person.id}`}
                                                            className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30 flex items-center gap-2"
                                                        >
                                                            View Profile
                                                        </a>
                                                        <button
                                                            onClick={() => { openEditStaff(person); setOpenMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30 flex items-center gap-2"
                                                        >
                                                            Edit Profile
                                                        </button>
                                                        <button
                                                            onClick={() => { handleStatusToggle(person.id, person.staff_details?.status || 'active'); setOpenMenuId(null); }}
                                                            className={cn(
                                                                "w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30 flex items-center gap-2",
                                                                person.staff_details?.status === 'active' ? "text-rose-500" : "text-emerald-500"
                                                            )}
                                                        >
                                                            {person.staff_details?.status === 'active' ? "Deactivate" : "Activate"}
                                                        </button>
                                                        {currentUserRole === 'super_admin' && person.role === 'teacher' && (
                                                            <button
                                                                onClick={async () => {
                                                                    const nextStatus = person.staff_details?.status === 'locked' ? 'active' : 'locked';
                                                                    const result = await updateStaffStatus(person.id, nextStatus);
                                                                    setOpenMenuId(null);
                                                                    if (result.success) {
                                                                        toast.success(`Tutor status updated to ${nextStatus}`);
                                                                    } else {
                                                                        toast.error(result.error);
                                                                    }
                                                                }}
                                                                className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-tighter hover:bg-muted/30 flex items-center gap-2 text-indigo-600"
                                                            >
                                                                {person.staff_details?.status === 'locked' ? "Unlock Tutor" : "Lock Tutor"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                {filteredStaff.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic">
                        <Users size={48} className="opacity-20 mb-4" />
                        <p>No staff records found matching your search.</p>
                    </div>
                )}
            </div>

            {/* Edit Staff Modal */}
            {editingStaff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl overflow-hidden border border-border/40 animate-in zoom-in-95 duration-200">
                        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border/20">
                            <h2 className="text-xl font-serif font-bold tracking-tight">Edit Staff Profile</h2>
                            <button onClick={() => setEditingStaff(null)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStaff} className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                <Input
                                    required
                                    value={editingStaff.full_name || ""}
                                    onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    placeholder="Full Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                                <Input
                                    required
                                    type="email"
                                    value={editingStaff.email}
                                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                    placeholder="Email"
                                />
                            </div>
                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access Role</label>
                                                <select
                                                    value={editingStaff.role}
                                                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                                                    className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-sm font-medium"
                                                >
                                                    <option value="teacher">Tutor</option>
                                                    <option value="operations">Operations</option>
                                                    <option value="hr">HR</option>
                                                    <option value="sales">Sales</option>
                                                    <option value="sales_head">Sales Head</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </select>
                                                <p className="text-[10px] text-muted-foreground">Controls dashboard and data access.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Job Title / Custom Role</label>
                                                <Input
                                                    required
                                                    value={editingStaff.staff_details?.job_title || ""}
                                                    onChange={(e) => setEditingStaff({
                                                        ...editingStaff,
                                                        staff_details: {
                                                            ...(editingStaff.staff_details || { status: 'active', joining_date: '' }),
                                                            job_title: e.target.value
                                                        }
                                                    })}
                                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                                    placeholder="e.g. Receptionist"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Number</label>
                                                <Input
                                                    required
                                                    type="tel"
                                                    value={editingStaff.staff_details?.mobile_number || ""}
                                                    onChange={(e) => {
                                                        setEditingStaff({
                                                            ...editingStaff,
                                                            staff_details: {
                                                                ...(editingStaff.staff_details || { status: 'active', joining_date: '' }),
                                                                mobile_number: e.target.value
                                                            }
                                                        });
                                                    }}
                                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                                    placeholder="e.g. +91 9876543210"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Employee ID</label>
                                                <Input
                                                    value={editingStaff.staff_details?.employee_id || ""}
                                                    onChange={(e) => {
                                                        setEditingStaff({
                                                            ...editingStaff,
                                                            staff_details: {
                                                                ...(editingStaff.staff_details || { status: 'active', joining_date: '' }),
                                                                employee_id: e.target.value
                                                            }
                                                        });
                                                    }}
                                                    className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                                    placeholder="EMP001"
                                                />
                                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pay Basis</label>
                                <select
                                    value={editPayBasis}
                                    onChange={(e) => {
                                        const val = e.target.value as "hourly" | "fixed";
                                        setEditPayBasis(val);
                                        setEditingStaff({
                                            ...editingStaff,
                                            staff_details: {
                                                ...(editingStaff.staff_details || { status: 'active', joining_date: '' }),
                                                pay_basis: val
                                            }
                                        });
                                    }}
                                    className="w-full h-12 rounded-2xl bg-muted/20 border-none px-4 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-sm font-medium"
                                >
                                    <option value="hourly">Hourly Pay</option>
                                    <option value="fixed">Fixed Pay</option>
                                </select>
                            </div>
                            {editPayBasis === "fixed" ? (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Basic Salary (₹)</label>
                                    <Input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editBasicSalary}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditBasicSalary(val);
                                            setEditingStaff({
                                                ...editingStaff,
                                                staff_details: {
                                                    ...(editingStaff.staff_details || { status: 'active', joining_date: '' }),
                                                    basic_salary: val === '' ? 0 : parseFloat(val)
                                                }
                                            });
                                        }}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        placeholder="e.g. 25000"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hourly Rate (₹)</label>
                                    <Input
                                        required
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editHourlyRate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setEditHourlyRate(val);
                                            setEditingStaff({
                                                ...editingStaff,
                                                staff_details: {
                                                    ...(editingStaff.staff_details || { status: 'active', joining_date: '' }),
                                                    hourly_rate: val === '' ? 0 : parseFloat(val)
                                                }
                                            });
                                        }}
                                        className="h-12 rounded-2xl bg-muted/20 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                                        placeholder="e.g. 200"
                                    />
                                </div>
                            )}
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditingStaff(null)}
                                    className="flex-1 rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 uppercase text-[10px] font-bold tracking-widest"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
