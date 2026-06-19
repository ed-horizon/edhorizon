'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    User, Shield, Key, Loader2, Sparkles, Phone, GraduationCap, 
    BookOpen, Calendar, IndianRupee, Users, Briefcase, Clock, CreditCard, Mail
} from "lucide-react";
import { cn, parseStudentIdAndMobile } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getSettingsProfileDetails } from "./actions";
import { format } from "date-fns";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [details, setDetails] = useState<any>(null);

    // Security states
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await getSettingsProfileDetails();
                if (data) {
                    setUser(data.profile);
                    setFullName(data.profile.full_name || "");
                    setRole(data.profile.role || "");
                    setEmail(data.email || "");
                    setDetails(data.details);
                }
            } catch (err) {
                console.error("Error fetching settings user profile details:", err);
                toast.error("Failed to load detailed profile data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const canEditName = ['hr', 'operations', 'super_admin', 'admin'].includes(role);
        if (!canEditName) {
            toast.error("You do not have permission to edit your profile name.");
            return;
        }
        setIsSaving(true);
        const supabase = createClient();
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user.id);

            if (error) throw error;
            toast.success("Profile settings updated successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        setIsResetting(true);
        const supabase = createClient();
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success("Password updated successfully!");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            toast.error(err.message || "Failed to update password.");
        } finally {
            setIsResetting(false);
        }
    };

    const isStudentOrParent = role === 'student' || role === 'parent';
    const parsedStudent = isStudentOrParent && details ? parseStudentIdAndMobile(details.custom_student_id) : null;
    const canEditName = ['hr', 'operations', 'super_admin', 'admin'].includes(role);

    return (
        <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-700 text-left">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-500/10">
                        <Sparkles size={12} />
                        <span>System Preferences</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
                        Portal Settings
                    </h1>
                    <p className="text-xs text-muted-foreground italic font-medium">
                        Configure your account preferences, profile, and security protocols.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[30vh]">
                    <Loader2 className="text-indigo-600 animate-spin mr-2" size={24} />
                    <span className="text-xs font-black uppercase text-indigo-600/50">Loading configurations...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="md:col-span-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border text-left",
                                activeTab === 'profile'
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <User size={16} />
                            <span>My Profile</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border text-left",
                                activeTab === 'security'
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                    : "bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <Shield size={16} />
                            <span>Security & Auth</span>
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="md:col-span-8">
                        {activeTab === 'profile' && (
                            <Card className="rounded-[2.5rem] border border-border/40 shadow-xl overflow-hidden bg-card">
                                <CardHeader className="bg-muted/10 border-b border-border/10 p-8">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        <User className="text-indigo-600" size={20} />
                                        <span>Personal Information</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Manage your portal profile and metadata settings.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <form onSubmit={handleSaveProfile} className="space-y-6">
                                        <div className="flex items-center gap-4 border-b border-border/10 pb-6">
                                            <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-2xl border border-indigo-500/20">
                                                {email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground capitalize">{fullName || "System User"}</h3>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Role: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{role || "Staff"}</span></p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5 text-xs">
                                                <Label htmlFor="fullname">Full Name {!canEditName && "(Read-Only)"}</Label>
                                                <Input
                                                    id="fullname"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    disabled={!canEditName}
                                                    className={cn(
                                                        "rounded-xl h-11 text-xs",
                                                        !canEditName && "bg-muted/30 cursor-not-allowed border-none opacity-80"
                                                    )}
                                                    placeholder="Enter your name"
                                                />
                                            </div>
                                            <div className="space-y-1.5 text-xs">
                                                <Label htmlFor="email">Email Address (Read-Only)</Label>
                                                <Input
                                                    id="email"
                                                    value={email}
                                                    disabled
                                                    className="rounded-xl h-11 text-xs bg-muted/30 cursor-not-allowed border-none opacity-80"
                                                />
                                            </div>
                                        </div>

                                        {canEditName && (
                                            <div className="flex justify-end pt-2">
                                                <Button
                                                    type="submit"
                                                    disabled={isSaving}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs px-6 h-11 shadow-md shadow-indigo-600/10"
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        "Save Changes"
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </form>

                                    {/* Role-Specific Detail Grid */}
                                    {isStudentOrParent ? (
                                        details ? (
                                            <div className="border-t border-border/10 pt-6 mt-8 space-y-6">
                                                <div>
                                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                                                        <GraduationCap className="text-indigo-600" size={16} />
                                                        <span>Academic & Admission Details</span>
                                                    </h3>
                                                    <p className="text-[10px] text-muted-foreground">Detailed educational and billing credentials associated with this student account.</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Student ID */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <User size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Student ID</span>
                                                            <span className="block font-bold text-foreground font-mono">
                                                                {parsedStudent?.studentId || "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Contact Number */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <Phone size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Contact Number</span>
                                                            <span className="block font-bold text-foreground font-mono">
                                                                {parsedStudent?.mobileNumber || "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Subject / Grade Level */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Subject / Grade Level</span>
                                                            <span className="block font-bold text-foreground">
                                                                {details.grade_level || "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Assigned Tutor */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <Users size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Assigned Tutor</span>
                                                            <span className="block font-bold text-foreground">
                                                                {details.assigned_teacher_name || "Not Assigned"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Classes per Month */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <Calendar size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Classes Per Month</span>
                                                            <span className="block font-bold text-foreground">
                                                                {details.classes_per_month ?? "Not Set"} classes
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Monthly Fee */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <IndianRupee size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Tuition Fees (Monthly)</span>
                                                            <span className="block font-bold text-foreground">
                                                                {details.monthly_fee !== undefined && details.monthly_fee !== null ? `₹${details.monthly_fee.toLocaleString()}` : "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-t border-border/10 pt-6 mt-8 text-center text-xs text-muted-foreground italic">
                                                No educational details found for this student account.
                                            </div>
                                        )
                                    ) : (
                                        details ? (
                                            <div className="border-t border-border/10 pt-6 mt-8 space-y-6">
                                                <div>
                                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                                                        <Briefcase className="text-indigo-600" size={16} />
                                                        <span>Employment & Financial Details</span>
                                                    </h3>
                                                    <p className="text-[10px] text-muted-foreground">Official work registry, base salary tier, and registered bank details.</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Employee ID */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <Shield size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Employee ID</span>
                                                            <span className="block font-bold text-foreground font-mono">
                                                                {details.employee_id || "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Account Status */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <User size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Status</span>
                                                            <span className="block font-bold text-foreground capitalize">
                                                                {details.status || "Active"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Joining Date */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <Calendar size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Date of Joining</span>
                                                            <span className="block font-bold text-foreground">
                                                                {details.joining_date ? format(new Date(details.joining_date), 'PP') : "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Hourly Rate */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <Clock size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Hourly Tuition Rate</span>
                                                            <span className="block font-bold text-foreground font-mono">
                                                                {details.hourly_rate !== undefined && details.hourly_rate !== null ? `₹${details.hourly_rate}/hr` : "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Basic Monthly Salary */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <IndianRupee size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Basic Monthly Salary</span>
                                                            <span className="block font-bold text-foreground">
                                                                {details.basic_salary !== undefined && details.basic_salary !== null ? `₹${Number(details.basic_salary).toLocaleString()}` : "Not Set"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Bank Name */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <CreditCard size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Bank Name</span>
                                                            <span className="block font-bold text-foreground">
                                                                {details.bank_name || "Not Configured"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Bank Account Number */}
                                                    <div className="bg-muted/10 border border-border/30 rounded-2xl p-4 flex items-start gap-3 sm:col-span-2">
                                                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                                                            <CreditCard size={16} />
                                                        </div>
                                                        <div className="space-y-0.5 text-xs">
                                                            <span className="block text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Bank Account Number</span>
                                                            <span className="block font-bold text-foreground font-mono">
                                                                {details.account_number || "Not Configured"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-t border-border/10 pt-6 mt-8 text-center text-xs text-muted-foreground italic">
                                                No employment details found for this staff account.
                                            </div>
                                        )
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === 'security' && (
                            <Card className="rounded-[2.5rem] border border-border/40 shadow-xl overflow-hidden bg-card">
                                <CardHeader className="bg-muted/10 border-b border-border/10 p-8">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                                        <Shield className="text-indigo-600" size={20} />
                                        <span>Account Security</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Update your password and manage session permissions.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                                        <div className="space-y-1.5 text-xs">
                                            <Label htmlFor="new-pw">New Password</Label>
                                            <Input
                                                id="new-pw"
                                                type="password"
                                                required
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="rounded-xl h-11 text-xs"
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        <div className="space-y-1.5 text-xs">
                                            <Label htmlFor="confirm-pw">Confirm New Password</Label>
                                            <Input
                                                id="confirm-pw"
                                                type="password"
                                                required
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="rounded-xl h-11 text-xs"
                                                placeholder="Confirm new password"
                                            />
                                        </div>

                                        <div className="flex justify-end pt-2">
                                            <Button
                                                type="submit"
                                                disabled={isResetting}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs px-6 h-11 shadow-md shadow-indigo-600/10"
                                            >
                                                {isResetting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                        Updating...
                                                    </>
                                                ) : (
                                                    "Update Password"
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
