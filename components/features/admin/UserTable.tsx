"use client";

import { useState, useEffect } from "react";
import { updateUserRoles, deleteUser } from "@/app/(dashboard)/super-admin/users/actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, Save, X, RotateCcw, CheckCircle2, AlertCircle, 
    ArrowLeft, Trash2, User, Briefcase, GraduationCap, 
    DollarSign, Calendar, Building, CreditCard, ShieldAlert, Search, Users 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function UserTable({ users: initialUsers, currentUserRole }: { users: any[], currentUserRole?: string }) {
    const [users, setUsers] = useState<any[]>(initialUsers);
    const [activeTab, setActiveTab] = useState<'staff' | 'student'>('staff');
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    // Save state for list page role edits
    const [isSavingRoles, setIsSavingRoles] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

    // Sync state if initialUsers changes
    useEffect(() => {
        setUsers(initialUsers);
        if (selectedUser) {
            const updatedSelected = initialUsers.find(u => u.id === selectedUser.id);
            if (updatedSelected) {
                setSelectedUser(updatedSelected);
            }
        }
    }, [initialUsers]);

    // Handle role edits in the table list view
    const handleRoleChange = (userId: string, newRole: string) => {
        const originalUser = users.find(u => u.id === userId);
        if (originalUser?.role === newRole) {
            const newPending = { ...pendingChanges };
            delete newPending[userId];
            setPendingChanges(newPending);
        } else {
            setPendingChanges(prev => ({
                ...prev,
                [userId]: newRole
            }));
        }
    };

    const handleSaveRoles = async () => {
        if (Object.keys(pendingChanges).length === 0) return;

        const changes = Object.entries(pendingChanges).map(([userId, newRole]) => ({
            userId,
            newRole
        }));

        setIsSavingRoles(true);
        const result = await updateUserRoles(changes);
        setIsSavingRoles(false);

        if (result.success) {
            toast.success("User roles updated successfully");
            setPendingChanges({});
        } else {
            toast.error(result.error || "Failed to update user roles");
        }
    };

    const handleCancelRoles = () => {
        setPendingChanges({});
    };

    // User removal/deletion handler
    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsSavingRoles(true);
        
        try {
            const result = await deleteUser(selectedUser.id);
            if (result.success) {
                toast.success(`Successfully removed account for ${selectedUser.full_name || selectedUser.email}`);
                setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
                setSelectedUser(null);
                setShowDeleteConfirm(false);
            } else {
                toast.error(result.error || "Failed to delete user account");
            }
        } catch (error) {
            console.error("Delete user error:", error);
            toast.error("Failed to delete user account");
        } finally {
            setIsSavingRoles(false);
        }
    };

    // Filtering logic
    const filteredUsers = users.filter(user => {
        // Tab check
        const isStaffRole = ['super_admin', 'admin', 'teacher', 'sales', 'hr', 'operations'].includes(user.role);
        const isStudentRole = ['student', 'parent'].includes(user.role);
        
        if (activeTab === 'staff' && !isStaffRole) return false;
        if (activeTab === 'student' && !isStudentRole) return false;

        // Search check
        const nameMatch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const emailMatch = user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        if (searchQuery && !nameMatch && !emailMatch) return false;

        // Role filter check
        if (roleFilter !== "all" && user.role !== roleFilter) return false;

        return true;
    });

    const hasChanges = Object.keys(pendingChanges).length > 0;

    // Render detailed user details view page
    if (selectedUser) {
        const isStaff = ['super_admin', 'admin', 'teacher', 'sales', 'hr', 'operations'].includes(selectedUser.role);
        const staffDetail = selectedUser.staff_details?.[0] || selectedUser.staff_details;
        const studentDetail = selectedUser.student_details?.[0] || selectedUser.student_details;

        return (
            <div className="space-y-6 animate-in fade-in duration-300 text-left">
                {/* Back bar */}
                <div className="flex items-center justify-between border-b border-border/10 pb-4">
                    <Button 
                        variant="ghost" 
                        onClick={() => setSelectedUser(null)} 
                        className="rounded-full gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Directory</span>
                    </Button>
                    
                    <Button
                        variant="destructive"
                        className="rounded-full gap-1.5 px-5 shadow-lg shadow-rose-500/10"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        <Trash2 size={15} />
                        Delete User
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Core Information */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-card border border-border/40 rounded-[2rem] p-6 text-center space-y-4 shadow-xl">
                            <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                                {selectedUser.full_name?.charAt(0).toUpperCase() || selectedUser.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-serif font-black uppercase text-foreground">{selectedUser.full_name || "No Name"}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{selectedUser.email}</p>
                            </div>
                            
                            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-none rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                                {selectedUser.role.replace("_", " ")}
                            </Badge>

                            <div className="border-t border-border/20 pt-4 text-left text-xs space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">User ID</span>
                                    <span className="font-mono text-[10px] text-foreground truncate max-w-[140px]" title={selectedUser.id}>
                                        {selectedUser.id}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Registration Date</span>
                                    <span className="text-foreground">
                                        {new Date(selectedUser.created_at).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Role Configuration Panel */}
                        <div className="bg-card border border-border/40 rounded-[2rem] p-6 space-y-4 shadow-xl">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                                <ShieldAlert size={14} />
                                <span>Role Settings</span>
                            </h4>
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Select System Privilege</label>
                                <Select
                                    defaultValue={selectedUser.role}
                                    onValueChange={async (val) => {
                                        setIsSavingRoles(true);
                                        const res = await updateUserRoles([{ userId: selectedUser.id, newRole: val }]);
                                        setIsSavingRoles(false);
                                        if (res.success) {
                                            toast.success("Role updated successfully!");
                                            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: val } : u));
                                            setSelectedUser({ ...selectedUser, role: val });
                                        } else {
                                            toast.error(res.error || "Role update failed");
                                        }
                                    }}
                                    disabled={isSavingRoles}
                                >
                                    <SelectTrigger className="w-full rounded-xl h-10">
                                        <SelectValue placeholder="System role" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                        <SelectItem value="sales">Sales</SelectItem>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="operations">Operations</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Password Reset Panel */}
                        {['super_admin', 'operations'].includes(currentUserRole || '') && (
                            <div className="bg-card border border-border/40 rounded-[2rem] p-6 space-y-4 shadow-xl">
                                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                                    <RotateCcw size={14} />
                                    <span>Reset Password</span>
                                </h4>
                                
                                {selectedUser.role === 'super_admin' && currentUserRole !== 'super_admin' ? (
                                    <p className="text-[11px] text-rose-500 font-semibold bg-rose-500/10 p-3 rounded-xl border border-rose-500/10">
                                        Only a Super Admin can change another Super Admin's password.
                                    </p>
                                ) : (
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.currentTarget;
                                        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
                                        if (!password || password.length < 6) {
                                            toast.error("Password must be at least 6 characters long.");
                                            return;
                                        }
                                        setIsResettingPassword(true);
                                        try {
                                            const { updateUserPassword } = await import("@/app/(dashboard)/super-admin/users/actions");
                                            const res = await updateUserPassword(selectedUser.id, password);
                                            if (res.success) {
                                                toast.success("Password reset successfully!");
                                                form.reset();
                                            } else {
                                                toast.error(res.error || "Failed to reset password.");
                                            }
                                        } catch (err: any) {
                                            toast.error(err.message || "An error occurred.");
                                        } finally {
                                            setIsResettingPassword(false);
                                        }
                                    }} className="space-y-3">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">New Password</label>
                                        <Input
                                            type="password"
                                            name="password"
                                            placeholder="Enter new password"
                                            className="rounded-xl h-10 text-xs"
                                            disabled={isResettingPassword}
                                            required
                                        />
                                        <Button
                                            type="submit"
                                            disabled={isResettingPassword}
                                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md"
                                        >
                                            {isResettingPassword ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <span>Update Password</span>
                                            )}
                                        </Button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Role-Specific Profile Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {isStaff ? (
                            <div className="bg-card border border-border/40 rounded-[2rem] p-8 space-y-6 shadow-xl">
                                <h3 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
                                    <Briefcase size={20} className="text-indigo-600" />
                                    <span>Tutor & Staff Profile Sheet</span>
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <DollarSign size={12} /> Basic Salary
                                        </span>
                                        <p className="text-xl font-bold text-foreground mt-1">
                                            ₹{(staffDetail?.basic_salary || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Calendar size={12} /> Joined Date
                                        </span>
                                        <p className="text-xl font-bold text-foreground mt-1">
                                            {staffDetail?.joining_date ? new Date(staffDetail.joining_date).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            }) : 'N/A'}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <Building size={12} /> Bank Name
                                        </span>
                                        <p className="text-sm font-semibold text-foreground mt-1">
                                            {staffDetail?.bank_name || 'Not Linked'}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <CreditCard size={12} /> Account Number
                                        </span>
                                        <p className="text-sm font-semibold font-mono text-foreground mt-1">
                                            {staffDetail?.account_number || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-card border border-border/40 rounded-[2rem] p-8 space-y-6 shadow-xl">
                                <h3 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
                                    <GraduationCap size={20} className="text-indigo-600" />
                                    <span>Student Portal Enrollment Sheet</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <GraduationCap size={12} /> Classroom Grade
                                        </span>
                                        <p className="text-xl font-bold text-foreground mt-1">
                                            {studentDetail?.grade_level || 'Primary Level'}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            <DollarSign size={12} /> Monthly Tuition Fee
                                        </span>
                                        <p className="text-xl font-bold text-foreground mt-1">
                                            ₹{(studentDetail?.monthly_fee || 0).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/20 border border-border/10">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                            Status
                                        </span>
                                        <p className="text-sm font-bold mt-1 text-emerald-600 uppercase tracking-widest text-xs">
                                            {studentDetail?.status || 'Active'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* DELETE USER CONFIRMATION MODAL */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-card border border-border/40 w-full max-w-[420px] rounded-[2rem] p-6 shadow-2xl space-y-4">
                            <h4 className="text-lg font-bold font-serif text-rose-600 flex items-center gap-2">
                                <ShieldAlert size={20} />
                                <span>Delete User Account</span>
                            </h4>
                            <p className="text-xs text-muted-foreground leading-normal">
                                Are you absolutely sure you want to delete the user <strong className="text-foreground">{selectedUser.full_name || selectedUser.email}</strong>? 
                                This action is permanent and cannot be undone. All database records (schedules, attendance history, materials) will be permanently cleared.
                            </p>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button 
                                    variant="ghost" 
                                    className="rounded-xl text-xs font-bold"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSavingRoles}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="rounded-xl text-xs font-bold gap-1 bg-rose-600 hover:bg-rose-700"
                                    onClick={handleDeleteUser}
                                    disabled={isSavingRoles}
                                >
                                    {isSavingRoles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={12} />}
                                    <span>Delete Account</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 text-left">
            {/* Action Bar (Search & Tab toggles) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/10 pb-4">
                {/* Toggles */}
                <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/20">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setActiveTab('staff');
                            setRoleFilter('all');
                        }}
                        className={cn(
                            "h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                            activeTab === 'staff' 
                                ? "bg-indigo-600 text-white shadow hover:bg-indigo-700" 
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <Briefcase size={13} className="mr-1.5" />
                        Staff Directory
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setActiveTab('student');
                            setRoleFilter('all');
                        }}
                        className={cn(
                            "h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                            activeTab === 'student' 
                                ? "bg-indigo-600 text-white shadow hover:bg-indigo-700" 
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <GraduationCap size={14} className="mr-1.5" />
                        Student Directory
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 h-9 rounded-xl text-xs w-full"
                        />
                    </div>

                    {/* Role Filter */}
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[130px] h-9 rounded-xl text-xs">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Roles</SelectItem>
                            {activeTab === 'staff' ? (
                                <>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="sales">Sales</SelectItem>
                                    <SelectItem value="hr">HR</SelectItem>
                                    <SelectItem value="operations">Operations</SelectItem>
                                </>
                            ) : (
                                <>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="parent">Parent</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Notification bar for inline updates */}
            {hasChanges && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-4 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                            {Object.keys(pendingChanges).length}
                        </div>
                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                            Unsaved role changes
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelRoles}
                            disabled={isSavingRoles}
                            className="text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-full"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveRoles}
                            disabled={isSavingRoles}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6"
                        >
                            {isSavingRoles ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save All Changes
                        </Button>
                    </div>
                </div>
            )}

            {/* Users Directory Table */}
            <div className="rounded-[1.5rem] border border-border/40 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b-border/30">
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground pl-6 py-4">Full Name</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Email</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Role</TableHead>
                            <TableHead className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground pr-6 text-right">Details Page</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => {
                            const isPending = pendingChanges[user.id] !== undefined;
                            const currentRole = pendingChanges[user.id] || user.role;

                            return (
                                <TableRow
                                    key={user.id}
                                    className={`transition-colors h-16 hover:bg-muted/10 cursor-pointer ${isPending ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : ''}`}
                                    onClick={() => setSelectedUser(user)}
                                >
                                    <TableCell className="font-semibold pl-6">
                                        <div className="flex items-center gap-3">
                                            {isPending && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                            )}
                                            {user.full_name || <span className="text-muted-foreground italic">No name provided</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Select
                                            value={currentRole}
                                            onValueChange={(val) => handleRoleChange(user.id, val)}
                                            disabled={isSavingRoles}
                                        >
                                            <SelectTrigger className={`w-[145px] h-9 rounded-lg border-muted-foreground/20 ${isPending ? 'ring-1 ring-indigo-500 border-indigo-500' : ''}`}>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/50">
                                                <SelectItem value="student">Student</SelectItem>
                                                <SelectItem value="teacher">Teacher</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                                <SelectItem value="sales">Sales</SelectItem>
                                                <SelectItem value="hr">HR</SelectItem>
                                                <SelectItem value="operations">Operations</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedUser(user);
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold rounded-lg"
                                        >
                                            View Profile &rarr;
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                                    No users found in this filter section.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
