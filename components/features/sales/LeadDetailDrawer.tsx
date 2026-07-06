"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, Loader2, Save, Send, MessageSquare, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateLead, getLeadNotes, addLeadNote, getUniqueCourses } from "@/app/(dashboard)/sales/actions";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface LeadDetailDrawerProps {
    lead: any | null;
    onClose: () => void;
    onUpdate: () => void;
    agents: any[];
}

const STATUS_OPTIONS = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "demo_scheduled", label: "Demo Scheduled" },
    { value: "feedback", label: "Feedback" },
    { value: "converted", label: "Converted (Won)" },
    { value: "not_converted", label: "Not Converted (Lost)" }
];

export default function LeadDetailDrawer({ lead, onClose, onUpdate, agents }: LeadDetailDrawerProps) {
    const [editData, setEditData] = useState<any>(null);
    const [notes, setNotes] = useState<any[]>([]);
    const [newNoteContent, setNewNoteContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [courses, setCourses] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>("sales");

    useEffect(() => {
        const fetchRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile?.role) {
                    setUserRole(profile.role);
                }
            }
        };
        fetchRole();
    }, []);

    useEffect(() => {
        if (lead) {
            const fetchCourses = async () => {
                const list = await getUniqueCourses();
                setCourses(list);
            };
            fetchCourses();

            setEditData({
                name: lead.name,
                parent_name: lead.parent_name || "",
                email: lead.email || "",
                phone: lead.phone || "",
                value: lead.value || 0,
                class: lead.class || "",
                feedback: lead.feedback || "",
                status: lead.status || "new",
                assigned_to: lead.assigned_to?.id || lead.assigned_to || "",
                lead_source: lead.lead_source || "Meta ad",
                required_course: lead.required_course || "Spoken Hindi",
                required_course_custom: "",
                call_status: lead.call_status || "New",
                lost_reason: lead.lost_reason || "",
                next_follow_up: lead.next_follow_up ? new Date(lead.next_follow_up).toISOString().substring(0, 10) : ""
            });
            fetchNotes(lead.id);
        } else {
            setEditData(null);
            setNotes([]);
        }
    }, [lead]);

    const fetchNotes = async (id: string) => {
        setIsLoadingNotes(true);
        const fetchedNotes = await getLeadNotes(id);
        setNotes(fetchedNotes);
        setIsLoadingNotes(false);
    };

    const handleSaveDetails = async () => {
        if (!lead || !editData) return;
        setIsSaving(true);
        
        // Auto-generate note if status changed
        const statusChanged = editData.status !== lead.status;
        const result = await updateLead(lead.id, editData);
        setIsSaving(false);
        
        if (result.success) {
            if (statusChanged) {
                await addLeadNote(lead.id, `System: Stage changed from "${lead.status}" to "${editData.status}"`);
            }

            // Re-fetch courses list so if a custom course was added, it is available
            const list = await getUniqueCourses();
            setCourses(list);

            // If a custom course was submitted, update the local editData state so it selects the new course
            if (editData.required_course === "custom" && editData.required_course_custom) {
                setEditData((prev: any) => ({
                    ...prev,
                    required_course: prev.required_course_custom,
                    required_course_custom: ""
                }));
            }

            toast.success("Lead details updated!");
            onUpdate();
        } else {
            toast.error("Error updating details: " + result.error);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead || !newNoteContent.trim()) return;
        setIsAddingNote(true);
        const result = await addLeadNote(lead.id, newNoteContent);
        setIsAddingNote(false);
        if (result.success) {
            toast.success("Follow-up log comment added!");
            setNewNoteContent("");
            fetchNotes(lead.id);
        } else {
            toast.error("Error logging follow-up: " + result.error);
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

    const cleanPhone = editData?.phone ? editData.phone.replace(/[^0-9]/g, '') : '';
    // Format to 91XXXXXXXXXX
    const whatsappPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return (
        <AnimatePresence>
            {lead && editData && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                    />

                    {/* Drawer Content */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "tween", duration: 0.3 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-card border-l border-border/40 z-50 overflow-y-auto flex flex-col shadow-2xl p-6 space-y-6 text-left"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between pb-4 border-b border-border/40">
                            <div>
                                <Badge className={`mb-2 font-bold text-[10px] uppercase tracking-wider ${getStatusStyles(editData.status)}`}>
                                    {editData.status.replace("_", " ")}
                                </Badge>
                                <h2 className="text-xl font-serif font-black text-primary uppercase tracking-tight truncate max-w-[360px]">
                                    {editData.name}
                                </h2>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-muted-foreground" onClick={onClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
                            {/* Lead Details Card */}
                            <div className="bg-muted/20 p-5 rounded-2xl border border-border/40 space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500">Lead Tracking Info</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student Name *</Label>
                                        <Input
                                            id="drawer-name"
                                            value={editData.name}
                                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-parent" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parent Name</Label>
                                        <Input
                                            id="drawer-parent"
                                            value={editData.parent_name}
                                            onChange={(e) => setEditData({ ...editData, parent_name: e.target.value })}
                                            className="h-9 text-xs rounded-xl"
                                            placeholder="Parent Name"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-class" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Age / Class</Label>
                                        <Input
                                            id="drawer-class"
                                            value={editData.class}
                                            onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                                            className="h-9 text-xs rounded-xl"
                                            placeholder="e.g. Class 10"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-value" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expected Value (₹)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground/75"><IndianRupee className="h-3.5 w-3.5" /></span>
                                            <Input
                                                id="drawer-value"
                                                type="number"
                                                value={editData.value}
                                                onChange={(e) => setEditData({ ...editData, value: parseFloat(e.target.value) || 0 })}
                                                className="h-9 text-xs pl-8 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                                        <Input
                                            id="drawer-email"
                                            type="email"
                                            value={editData.email}
                                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                            className="h-9 text-xs rounded-xl"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-phone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                                        <div className="flex gap-1">
                                            <Input
                                                id="drawer-phone"
                                                value={editData.phone}
                                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                                                className="h-9 text-xs rounded-xl flex-1"
                                                placeholder="+91 99999 99999"
                                            />
                                            {whatsappPhone && (
                                                <a 
                                                    href={`https://wa.me/${whatsappPhone}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                >
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        className="h-9 px-2 border-emerald-500/35 hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/20"
                                                        title="Message on WhatsApp"
                                                    >
                                                        WhatsApp
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-source" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lead Source</Label>
                                        <select
                                            id="drawer-source"
                                            value={editData.lead_source}
                                            onChange={(e) => setEditData({ ...editData, lead_source: e.target.value })}
                                            className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs"
                                        >
                                            <option value="Meta ad">Meta ad</option>
                                            <option value="WhatsApp">WhatsApp</option>
                                            <option value="referral">Referral</option>
                                            <option value="website">Website</option>
                                            <option value="Instagram">Instagram</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-course" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Required Course</Label>
                                        <select
                                            id="drawer-course"
                                            value={editData.required_course}
                                            onChange={(e) => setEditData({ ...editData, required_course: e.target.value })}
                                            className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs"
                                        >
                                            {courses.map((course) => (
                                                <option key={course} value={course}>
                                                    {course}
                                                </option>
                                            ))}
                                            <option value="custom">+ Add custom course...</option>
                                        </select>
                                    </div>
                                    {editData.required_course === "custom" && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <Label htmlFor="drawer-course-custom" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Course Name *</Label>
                                            <Input
                                                id="drawer-course-custom"
                                                required
                                                value={editData.required_course_custom || ""}
                                                onChange={(e) => setEditData({ ...editData, required_course_custom: e.target.value })}
                                                placeholder="e.g. Intermediate Sanskrit"
                                                className="h-9 text-xs rounded-xl"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={`grid gap-4 ${["sales_head", "admin", "super_admin"].includes(userRole) ? "grid-cols-2" : "grid-cols-1"}`}>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-status" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status / Stage</Label>
                                        <select
                                            id="drawer-status"
                                            value={editData.status}
                                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                            className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs"
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {["sales_head", "admin", "super_admin"].includes(userRole) && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="drawer-agent" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Salesperson</Label>
                                            <select
                                                id="drawer-agent"
                                                value={editData.assigned_to || ""}
                                                onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value || null })}
                                                className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs"
                                            >
                                                <option value="">Unassigned</option>
                                                {agents.map((agent) => (
                                                    <option key={agent.id} value={agent.id}>
                                                        {agent.full_name || agent.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-call-status" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Call Status</Label>
                                        <select
                                            id="drawer-call-status"
                                            value={editData.call_status}
                                            onChange={(e) => setEditData({ ...editData, call_status: e.target.value })}
                                            className="flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs"
                                        >
                                            <option value="New">New</option>
                                            <option value="Connected">Connected</option>
                                            <option value="Busy">Busy</option>
                                            <option value="Switched Off">Switched Off</option>
                                            <option value="Not Reachable">Not Reachable</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-followup" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Follow Up</Label>
                                        <Input
                                            id="drawer-followup"
                                            type="date"
                                            value={editData.next_follow_up}
                                            onChange={(e) => setEditData({ ...editData, next_follow_up: e.target.value })}
                                            className="h-9 text-xs rounded-xl"
                                        />
                                    </div>
                                </div>

                                {editData.status === 'not_converted' && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="drawer-lost" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lost Lead Reason</Label>
                                        <Input
                                            id="drawer-lost"
                                            value={editData.lost_reason}
                                            onChange={(e) => setEditData({ ...editData, lost_reason: e.target.value })}
                                            className="h-9 text-xs rounded-xl"
                                            placeholder="e.g. Fees too high, timing issue, referral elsewhere"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="drawer-feedback" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest Update/Feedback</Label>
                                    <Textarea
                                        id="drawer-feedback"
                                        value={editData.feedback}
                                        onChange={(e) => setEditData({ ...editData, feedback: e.target.value })}
                                        className="min-h-[50px] text-xs rounded-xl border-muted-foreground/20"
                                        placeholder="Add quick summary that appears in directory..."
                                    />
                                </div>

                                <div className="flex justify-end pt-1">
                                    <Button
                                        onClick={handleSaveDetails}
                                        disabled={isSaving}
                                        className="h-9 text-[10px] font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 px-5 shadow"
                                    >
                                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                        Save Settings
                                    </Button>
                                </div>
                            </div>

                            {/* Comment logs / Activity Stream */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                                    <MessageSquare size={13} />
                                    Activity & Follow-Up Logs
                                </h3>

                                <form onSubmit={handleAddNote} className="space-y-2">
                                    <Textarea
                                        value={newNoteContent}
                                        onChange={(e) => setNewNoteContent(e.target.value)}
                                        placeholder="Add a new follow-up comment..."
                                        className="text-xs rounded-xl min-h-[70px] border-border/40 focus-visible:ring-indigo-500"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={isAddingNote || !newNoteContent.trim()}
                                            className="h-8 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl gap-1.5 px-4 shadow"
                                        >
                                            {isAddingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                            Log Comment
                                        </Button>
                                    </div>
                                </form>

                                <div className="space-y-3 pt-2">
                                    {isLoadingNotes ? (
                                        <div className="flex justify-center py-6 text-muted-foreground/60 text-xs gap-2 items-center">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                            Loading logs...
                                        </div>
                                    ) : notes.length > 0 ? (
                                        notes.map((note) => (
                                            <div key={note.id} className="p-3 bg-muted/10 rounded-xl border border-border/20 space-y-1 text-xs">
                                                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                    <span className="font-bold text-foreground">
                                                        {note.created_by?.full_name || "Sales Agent"}
                                                    </span>
                                                    <span>
                                                        {new Date(note.created_at).toLocaleDateString(undefined, {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        })}
                                                    </span>
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed font-medium">
                                                    {note.content}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 border border-dashed border-border/25 rounded-2xl text-muted-foreground/40 text-xs">
                                            No follow-up log comments recorded yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
