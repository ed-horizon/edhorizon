"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { addLead, getUniqueCourses } from "@/app/(dashboard)/sales/actions";
import { toast } from "sonner";

export default function CreateLeadDialog({ onSuccess, agents = [], userRole = "sales" }: { onSuccess?: () => void; agents?: any[]; userRole?: string }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [courses, setCourses] = useState<string[]>([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [customCourse, setCustomCourse] = useState("");

    useEffect(() => {
        if (open) {
            const fetchCourses = async () => {
                const list = await getUniqueCourses();
                setCourses(list);
                if (list.length > 0) {
                    setSelectedCourse(list[0]);
                }
            };
            fetchCourses();
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        
        try {
            const result = await addLead(formData);
            if (result?.error) {
                setError(result.error);
                toast.error(result.error);
            } else {
                toast.success("Lead created successfully!");
                setOpen(false);
                if (onSuccess) onSuccess();
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Plus className="h-4 w-4" />
                    Add Lead
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#0a0a0a] border-border/40 rounded-2xl shadow-xl p-8 max-h-[90vh] overflow-y-auto text-left">
                <DialogHeader>
                    <DialogTitle className="font-serif text-xl font-bold text-primary">Add New Lead</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {error && (
                        <div className="text-xs font-bold text-red-500 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Student Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                required
                                placeholder="e.g. Rahul Sharma"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="parent_name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parent Name</Label>
                            <Input
                                id="parent_name"
                                name="parent_name"
                                placeholder="e.g. Rajesh Sharma"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="parent@example.com"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="+91 99999 99999"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="class" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Age / Class</Label>
                            <Input
                                id="class"
                                name="class"
                                placeholder="e.g. Class 10"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="value" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expected Value (₹)</Label>
                            <Input
                                id="value"
                                name="value"
                                type="number"
                                placeholder="4500"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="lead_source" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lead Source</Label>
                            <select
                                id="lead_source"
                                name="lead_source"
                                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <option value="Meta ad">Meta ad</option>
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="referral">Referral</option>
                                <option value="website">Website</option>
                                <option value="Instagram">Instagram</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="required_course" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Required Course</Label>
                            <select
                                id="required_course"
                                name="required_course"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                {courses.map(course => (
                                    <option key={course} value={course}>{course}</option>
                                ))}
                                <option value="custom">+ Add custom course...</option>
                            </select>
                        </div>
                    </div>

                    {selectedCourse === "custom" && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                            <Label htmlFor="required_course_custom" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Course Name *</Label>
                            <Input
                                id="required_course_custom"
                                name="required_course_custom"
                                required
                                value={customCourse}
                                onChange={(e) => setCustomCourse(e.target.value)}
                                placeholder="e.g. Intermediate Sanskrit"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="call_status" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Call Status</Label>
                            <select
                                id="call_status"
                                name="call_status"
                                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs"
                            >
                                <option value="New">New</option>
                                <option value="Connected">Connected</option>
                                <option value="Busy">Busy</option>
                                <option value="Switched Off">Switched Off</option>
                                <option value="Not Reachable">Not Reachable</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="next_follow_up" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Follow Up</Label>
                            <Input
                                id="next_follow_up"
                                name="next_follow_up"
                                type="date"
                                className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                            />
                        </div>
                    </div>

                    {["sales_head", "admin", "super_admin"].includes(userRole) && (
                        <div className="space-y-1.5">
                            <Label htmlFor="assigned_to" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Salesperson</Label>
                            <select
                                id="assigned_to"
                                name="assigned_to"
                                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs"
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

                    <div className="space-y-1.5">
                        <Label htmlFor="feedback" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest Feedback / Update</Label>
                        <Input
                            id="feedback"
                            name="feedback"
                            placeholder="e.g. Called parent, demo scheduled for Friday"
                            className="rounded-xl border-muted-foreground/20 focus-visible:ring-indigo-500 h-10 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interaction Notes</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Add details about parent discussion..."
                            className="rounded-xl border-muted-foreground/20 min-h-[80px] focus-visible:ring-indigo-500 text-xs"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="rounded-xl font-bold text-xs uppercase tracking-wider h-10"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider h-10 px-5"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                "Save Lead"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
