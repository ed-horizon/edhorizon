'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Layers, 
    ArrowLeft, 
    Users, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    RotateCcw, 
    DollarSign, 
    Video, 
    ExternalLink, 
    Plus, 
    Trash2, 
    Edit, 
    Copy, 
    Check, 
    BookOpen, 
    ShieldCheck, 
    UserPlus, 
    CreditCard, 
    FileText, 
    HelpCircle,
    Info,
    Download,
    Upload,
    FileUp,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { McqBuilder } from "@/components/features/content/McqBuilder";
import { FlashcardBuilder } from "@/components/features/content/FlashcardBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
    BatchSessionStatus, 
    FeeStatus, 
    BatchStatus,
    updateBatch, 
    deleteBatch, 
    enrollStudentInBatch, 
    removeStudentFromBatch, 
    updateBatchEnrollmentFee, 
    createBatchSession, 
    updateBatchSessionStatus, 
    deleteBatchSession,
    createBatchContent,
    deleteBatchContent,
    copyBatchContent,
    createBatchCapsule,
    uploadBatchFile
} from "@/app/(dashboard)/batches/actions";
import { calculateBatchSchedule } from "@/lib/batch-schedule";
import { cn, ensureAbsoluteUrl } from "@/lib/utils";

interface BatchDetailClientProps {
    batch: any;
    availableStudents: any[];
    batchesWithContent?: any[];
    availableCapsules?: any[];
    tutors: any[];
}

export default function BatchDetailClient({ 
    batch, 
    availableStudents, 
    batchesWithContent = [],
    tutors 
}: BatchDetailClientProps) {
    const router = useRouter();
    const isTeacher = batch.user_role === 'teacher';
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState(isTeacher ? "sessions" : "overview");

    // Local state for enrollments and fresh content for instant reactivity
    const [localEnrollments, setLocalEnrollments] = useState<any[]>(batch.enrollments || []);
    const [localAvailableStudents, setLocalAvailableStudents] = useState<any[]>(availableStudents || []);
    const [localContent, setLocalContent] = useState<any[]>(batch.assigned_content || []);

    useEffect(() => {
        setLocalEnrollments(batch.enrollments || []);
    }, [batch.enrollments]);

    useEffect(() => {
        setLocalAvailableStudents(availableStudents || []);
    }, [availableStudents]);

    useEffect(() => {
        setLocalContent(batch.assigned_content || []);
    }, [batch.assigned_content]);

    // Edit Batch state
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editData, setEditData] = useState({
        name: batch.name,
        course_name: batch.course_name,
        teacher_id: batch.teacher_id || "none",
        capacity: batch.capacity,
        start_date: batch.start_date,
        end_date: batch.end_date || "",
        course_duration_days: batch.course_duration_days || 30,
        schedule_description: batch.schedule_description,
        meeting_link: batch.meeting_link || "",
        status: batch.status as BatchStatus,
        default_course_fee: batch.default_course_fee,
        agreed_tutor_payout: batch.agreed_tutor_payout,
        notes: batch.notes || ""
    });

    // Enroll Student state
    const [isEnrollOpen, setIsEnrollOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [enrollFee, setEnrollFee] = useState(batch.default_course_fee || 0);
    const [enrollFeeStatus, setEnrollFeeStatus] = useState<FeeStatus>("unpaid");
    const [enrollPaidAmount, setEnrollPaidAmount] = useState(0);
    const [enrollPaymentMethod, setEnrollPaymentMethod] = useState("other");
    const [enrollTxId, setEnrollTxId] = useState("");
    const [enrollNotes, setEnrollNotes] = useState("");

    // Update Fee Modal state
    const [editingEnrollment, setEditingEnrollment] = useState<any>(null);

    // Create Session state
    const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
    const [sessionTitle, setSessionTitle] = useState("");
    const [sessionDate, setSessionDate] = useState("");
    const [sessionDuration, setSessionDuration] = useState(60);
    const [sessionMeetingLink, setSessionMeetingLink] = useState(batch.meeting_link || "");
    const [sessionNotes, setSessionNotes] = useState("");

    // Reschedule Session state
    const [reschedulingSession, setReschedulingSession] = useState<any>(null);
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleNote, setRescheduleNote] = useState("");

    // Fresh Content Modals state
    const [isAddContentOpen, setIsAddContentOpen] = useState(false);
    const [contentCreationMode, setContentCreationMode] = useState<'capsule' | 'upload' | 'url'>('capsule');

    // Capsule creation state
    const [capsuleFormat, setCapsuleFormat] = useState<'quiz' | 'flashcards' | 'video'>('quiz');
    const [capsuleTitle, setCapsuleTitle] = useState('');
    const [capsuleDesc, setCapsuleDesc] = useState('');
    const [quizContent, setQuizContent] = useState<{ questions: any[] }>({ questions: [] });
    const [flashcardContent, setFlashcardContent] = useState<{ cards: any[] }>({ cards: [] });
    const [capsuleVideoUrl, setCapsuleVideoUrl] = useState('');

    // File upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadDesc, setUploadDesc] = useState('');
    const [isUploadingFile, setIsUploadingFile] = useState(false);

    // URL material state
    const [newContentTitle, setNewContentTitle] = useState("");
    const [newContentType, setNewContentType] = useState("document");
    const [newContentUrl, setNewContentUrl] = useState("");
    const [newContentDesc, setNewContentDesc] = useState("");

    const [isCopyContentOpen, setIsCopyContentOpen] = useState(false);
    const [selectedSourceBatchId, setSelectedSourceBatchId] = useState("");
    const [selectedMaterialIdsToCopy, setSelectedMaterialIdsToCopy] = useState<string[]>([]);

    // General loading & error
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const canManage = batch.can_manage;
    const canTrackSession = batch.can_manage || batch.is_assigned_tutor;

    const copyMeetingLink = () => {
        if (batch.meeting_link) {
            navigator.clipboard.writeText(batch.meeting_link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleUpdateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setErrorMessage(null);
        try {
            const res = await updateBatch(batch.id, {
                ...editData,
                teacher_id: editData.teacher_id === "none" ? null : editData.teacher_id,
                capacity: Number(editData.capacity),
                course_duration_days: Number(editData.course_duration_days) || null,
                default_course_fee: Number(editData.default_course_fee),
                agreed_tutor_payout: Number(editData.agreed_tutor_payout),
            });
            if (!res.success) {
                setErrorMessage(res.error || "Failed to update batch");
                setActionLoading(false);
                return;
            }
            setIsEditOpen(false);
            router.refresh();
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to update batch");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteBatch = async () => {
        if (!confirm("Are you sure you want to delete this batch? All enrollments, sessions, and content links will be removed.")) return;
        setActionLoading(true);
        try {
            const res = await deleteBatch(batch.id);
            if (res.success) {
                router.push('/batches');
            } else {
                alert(res.error || "Failed to delete batch");
                setActionLoading(false);
            }
        } catch (err: any) {
            alert(err.message || "Error deleting batch");
            setActionLoading(false);
        }
    };

    const handleEnrollStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) {
            setErrorMessage("Please select a student");
            return;
        }
        setActionLoading(true);
        setErrorMessage(null);
        try {
            const res = await enrollStudentInBatch(
                batch.id,
                selectedStudentId,
                Number(enrollFee) || 0,
                enrollFeeStatus,
                Number(enrollPaidAmount) || 0,
                enrollPaymentMethod,
                enrollTxId,
                enrollNotes
            );
            if (!res.success) {
                setErrorMessage(res.error || "Failed to enroll student");
                setActionLoading(false);
                return;
            }

            // Immediately update local state
            const targetStudent = localAvailableStudents.find(s => s.id === selectedStudentId);
            if (targetStudent) {
                const newEnrollment = {
                    id: 'temp-' + Date.now(),
                    student_id: selectedStudentId,
                    course_fee: Number(enrollFee) || 0,
                    fee_status: enrollFeeStatus,
                    paid_amount: Number(enrollPaidAmount) || 0,
                    payment_method: enrollPaymentMethod,
                    transaction_id: enrollTxId,
                    fee_notes: enrollNotes,
                    status: 'active',
                    enrolled_at: new Date().toISOString(),
                    student: {
                        id: targetStudent.id,
                        full_name: targetStudent.full_name,
                        email: targetStudent.email,
                        parent_email: targetStudent.parent_email,
                        status: targetStudent.status,
                        grade_level: targetStudent.grade_level,
                        custom_student_id: targetStudent.custom_student_id,
                    }
                };
                setLocalEnrollments(prev => [...prev, newEnrollment]);
                setLocalAvailableStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, is_already_enrolled: true } : s));
            }

            setIsEnrollOpen(false);
            setSelectedStudentId("");
            setEnrollPaidAmount(0);
            setEnrollTxId("");
            setEnrollNotes("");
            router.refresh();
        } catch (err: any) {
            setErrorMessage(err.message || "Error enrolling student");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveStudent = async (studentId: string, studentName: string) => {
        if (!confirm(`Are you sure you want to remove ${studentName} from this batch?`)) return;
        setActionLoading(true);
        try {
            const res = await removeStudentFromBatch(batch.id, studentId);
            if (!res.success) {
                alert(res.error || "Failed to remove student");
            } else {
                setLocalEnrollments(prev => prev.filter(e => e.student_id !== studentId));
                setLocalAvailableStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_already_enrolled: false } : s));
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveFeeUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEnrollment) return;
        setActionLoading(true);
        try {
            const res = await updateBatchEnrollmentFee(editingEnrollment.id, batch.id, {
                course_fee: Number(editingEnrollment.course_fee),
                fee_status: editingEnrollment.fee_status,
                paid_amount: Number(editingEnrollment.paid_amount),
                payment_method: editingEnrollment.payment_method,
                transaction_id: editingEnrollment.transaction_id,
                fee_notes: editingEnrollment.fee_notes,
            });
            if (!res.success) {
                alert(res.error || "Failed to update fee record");
            } else {
                setLocalEnrollments(prev => prev.map(e => e.id === editingEnrollment.id ? { ...editingEnrollment } : e));
                setEditingEnrollment(null);
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionDate) {
            setErrorMessage("Scheduled date and time is required");
            return;
        }
        setActionLoading(true);
        setErrorMessage(null);
        try {
            const res = await createBatchSession(batch.id, {
                title: sessionTitle?.trim() || undefined,
                scheduled_at: sessionDate,
                duration_minutes: Number(sessionDuration) || 60,
                meeting_link: sessionMeetingLink,
                notes: sessionNotes
            });
            if (!res.success) {
                setErrorMessage(res.error || "Failed to schedule session");
                setActionLoading(false);
                return;
            }
            setIsAddSessionOpen(false);
            setSessionTitle("");
            setSessionDate("");
            setSessionNotes("");
            router.refresh();
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to schedule session");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateSessionStatus = async (sessionId: string, newStatus: BatchSessionStatus) => {
        setActionLoading(true);
        try {
            const res = await updateBatchSessionStatus(sessionId, batch.id, newStatus);
            if (!res.success) {
                alert(res.error || "Failed to update session status");
            } else {
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRescheduleSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reschedulingSession || !rescheduleDate) return;
        setActionLoading(true);
        try {
            const res = await updateBatchSessionStatus(reschedulingSession.id, batch.id, 'rescheduled', {
                scheduled_at: rescheduleDate,
                notes: rescheduleNote || `Rescheduled to ${new Date(rescheduleDate).toLocaleString()}`
            });
            if (!res.success) {
                alert(res.error || "Failed to reschedule session");
            } else {
                setReschedulingSession(null);
                setRescheduleDate("");
                setRescheduleNote("");
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm("Are you sure you want to delete this session?")) return;
        setActionLoading(true);
        try {
            const res = await deleteBatchSession(sessionId, batch.id);
            if (!res.success) {
                alert(res.error || "Failed to delete session");
            } else {
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateCapsule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!capsuleTitle.trim()) {
            toast.error("Please enter a title for the capsule.");
            return;
        }
        setActionLoading(true);
        try {
            const payload = capsuleFormat === 'quiz'
                ? quizContent
                : capsuleFormat === 'flashcards'
                    ? flashcardContent
                    : { videoUrl: capsuleVideoUrl, description: capsuleDesc };

            const res = await createBatchCapsule(batch.id, {
                title: capsuleTitle.trim(),
                type: capsuleFormat,
                content: payload,
                description: capsuleDesc.trim() || undefined
            });

            if (res.success) {
                toast.success("Interactive capsule created and added to batch!");
                setLocalContent(prev => [{
                    id: res.contentId,
                    batch_id: batch.id,
                    capsule_id: res.capsuleId,
                    title: capsuleTitle.trim(),
                    type: capsuleFormat,
                    description: capsuleDesc.trim() || null,
                    created_at: new Date().toISOString()
                }, ...prev]);
                setIsAddContentOpen(false);
                setCapsuleTitle('');
                setCapsuleDesc('');
                setQuizContent({ questions: [] });
                setFlashcardContent({ cards: [] });
                setCapsuleVideoUrl('');
                router.refresh();
            } else {
                toast.error(res.error || "Failed to create capsule");
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUploadDirectFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error("Please select a file from your device.");
            return;
        }
        if (!uploadTitle.trim()) {
            toast.error("Please enter a title for the material.");
            return;
        }
        setIsUploadingFile(true);
        try {
            const fd = new FormData();
            fd.append('batchId', batch.id);
            fd.append('title', uploadTitle.trim());
            if (uploadDesc.trim()) fd.append('description', uploadDesc.trim());
            fd.append('file', selectedFile);

            const res = await uploadBatchFile(fd);
            if (res.success) {
                toast.success("File uploaded and saved to batch materials!");
                setLocalContent(prev => [res.data, ...prev]);
                setIsAddContentOpen(false);
                setSelectedFile(null);
                setUploadTitle('');
                setUploadDesc('');
                router.refresh();
            } else {
                toast.error(res.error || "Failed to upload file");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to upload file");
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleCreateContent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContentTitle.trim()) {
            setErrorMessage("Title is required");
            return;
        }
        setActionLoading(true);
        try {
            const res = await createBatchContent(batch.id, {
                title: newContentTitle.trim(),
                type: newContentType,
                content_url: newContentUrl.trim() || undefined,
                description: newContentDesc.trim() || undefined,
            });
            if (!res.success) {
                alert(res.error || "Failed to create material");
            } else {
                if (res.item) {
                    setLocalContent(prev => [res.item, ...prev]);
                }
                setIsAddContentOpen(false);
                setNewContentTitle("");
                setNewContentUrl("");
                setNewContentDesc("");
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteContent = async (contentId: string, title: string) => {
        if (!confirm(`Delete "${title}" from this batch?`)) return;
        setActionLoading(true);
        try {
            const res = await deleteBatchContent(contentId, batch.id);
            if (!res.success) {
                alert(res.error || "Failed to delete material");
            } else {
                setLocalContent(prev => prev.filter(c => c.id !== contentId));
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleCopyContentSubmit = async () => {
        if (selectedMaterialIdsToCopy.length === 0) {
            alert("Please select at least one material to copy");
            return;
        }
        setActionLoading(true);
        try {
            const res = await copyBatchContent(batch.id, selectedMaterialIdsToCopy);
            if (!res.success) {
                alert(res.error || "Failed to copy materials");
            } else {
                setIsCopyContentOpen(false);
                setSelectedMaterialIdsToCopy([]);
                setSelectedSourceBatchId("");
                router.refresh();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'upcoming':
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Upcoming</Badge>;
            case 'ongoing':
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Ongoing</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Completed</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getSessionStatusBadge = (status: BatchSessionStatus) => {
        switch (status) {
            case 'scheduled':
                return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">Scheduled</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
            case 'not_conducted':
                return <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30">Not Conducted</Badge>;
            case 'rescheduled':
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Rescheduled</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
        }
    };

    const getFeeStatusBadge = (status: FeeStatus) => {
        switch (status) {
            case 'paid':
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Paid</Badge>;
            case 'unpaid':
                return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30">Unpaid</Badge>;
            case 'partially_paid':
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Partial</Badge>;
            case 'waived':
                return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">Waived</Badge>;
        }
    };

    const enrolledCount = localEnrollments.length;
    const capacityPct = Math.min(100, Math.round((enrolledCount / batch.capacity) * 100));

    return (
        <div className="space-y-6">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {isTeacher ? (
                    <Link href="/teacher" className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Tutor Dashboard
                    </Link>
                ) : (
                    <Link href="/batches" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to All Batches
                    </Link>
                )}

                {canManage && (
                    <div className="flex items-center gap-2">
                        <Button 
                            id="edit-batch-button"
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsEditOpen(true)}
                            className="gap-1.5"
                        >
                            <Edit className="h-3.5 w-3.5" />
                            Edit Batch
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleDeleteBatch} 
                            disabled={actionLoading}
                            className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            {/* Header Banner */}
            <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                                {batch.course_name}
                            </Badge>
                            {getStatusBadge(batch.status)}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground">{batch.name}</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{batch.schedule_description}</span>
                            <span className="opacity-40">•</span>
                            <Calendar className="h-4 w-4" />
                            <span>Started: {batch.start_date}</span>
                            {batch.end_date && <span>— Ends: {batch.end_date}</span>}
                        </p>
                    </div>

                    {batch.meeting_link && (
                        <div className="flex items-center gap-2 shrink-0">
                            <a href={batch.meeting_link} target="_blank" rel="noopener noreferrer">
                                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20">
                                    <Video className="h-4 w-4" />
                                    Join Live Session
                                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                </Button>
                            </a>
                            <Button variant="outline" size="icon" onClick={copyMeetingLink} title="Copy link">
                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Capacity Bar */}
                <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Cohort Capacity: <strong className="text-foreground">{enrolledCount} / {batch.capacity} Students</strong></span>
                        <span>{capacityPct}% Full</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                capacityPct >= 100 ? "bg-rose-500" : capacityPct >= 75 ? "bg-amber-500" : "bg-indigo-500"
                            )}
                            style={{ width: `${capacityPct}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex border-b border-border/60 gap-2 pb-px overflow-x-auto [scrollbar-width:none]">
                {!isTeacher && (
                    <>
                        <button
                            type="button"
                            onClick={() => setActiveTab("overview")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap",
                                activeTab === "overview"
                                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <Info className="h-4 w-4" /> Overview
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("students")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap",
                                activeTab === "students"
                                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <Users className="h-4 w-4" /> Students & Fees ({enrolledCount})
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => setActiveTab("sessions")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap",
                        activeTab === "sessions"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                >
                    <Calendar className="h-4 w-4" /> Class Schedules ({batch.stats.total_sessions})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("content")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap",
                        activeTab === "content"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                >
                    <BookOpen className="h-4 w-4" /> Batch Content ({localContent.length})
                </button>
            </div>

            {/* ================= TAB 1: OVERVIEW ================= */}
            {!isTeacher && activeTab === "overview" && (
                <div className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tutor Card */}
                        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                                    <span>Assigned Tutor</span>
                                    <ShieldCheck className="h-4 w-4 text-indigo-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {batch.teacher ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                                                {batch.teacher.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground">{batch.teacher.full_name}</div>
                                                <div className="text-xs text-muted-foreground">{batch.teacher.email}</div>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Agreed Course Stipend</div>
                                            <div className="text-lg font-bold text-foreground">
                                                ₹{batch.agreed_tutor_payout.toLocaleString()}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                Fixed course payment. Managed manually via HR Payroll. Does not calculate hourly rates.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-4 text-center text-muted-foreground text-sm">
                                        No tutor currently assigned to this batch.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Financial Snapshot */}
                        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                                    <span>Course Fee Snapshot</span>
                                    <DollarSign className="h-4 w-4 text-emerald-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-lg bg-muted/30">
                                        <span className="text-[10px] uppercase text-muted-foreground block font-bold">Default Fee</span>
                                        <span className="font-bold text-foreground text-base">₹{batch.default_course_fee.toLocaleString()}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-muted/30">
                                        <span className="text-[10px] uppercase text-muted-foreground block font-bold">Expected</span>
                                        <span className="font-bold text-foreground text-base">₹{batch.stats.total_expected_fees.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400 block font-bold">Collected</span>
                                        <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">₹{batch.stats.total_collected_fees.toLocaleString()}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 block font-bold">Pending</span>
                                        <span className="font-bold text-amber-700 dark:text-amber-300 text-base">₹{batch.stats.pending_receivables.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sessions Progress */}
                        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                                    <span>Sessions Tracking</span>
                                    <CheckCircle2 className="h-4 w-4 text-violet-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-2xl font-bold">
                                    {batch.stats.completed_sessions} / {batch.stats.total_sessions}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Conducted sessions vs planned cohort syllabus classes.
                                </p>
                                <div className="pt-2">
                                    <Button variant="outline" size="sm" onClick={() => setActiveTab("sessions")} className="w-full text-xs">
                                        Manage Class Sessions
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Batch Notes */}
                    {batch.notes && (
                        <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold">Cohort Notes & Guidelines</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{batch.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ================= TAB 2: ENROLLED STUDENTS & COURSE FEES ================= */}
            {!isTeacher && activeTab === "students" && (
                <div className="space-y-6 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Enrolled Students Roster</h2>
                            <p className="text-xs text-muted-foreground">Active students enrolled in this batch and their one-time course fee status.</p>
                        </div>

                        {canManage && (
                            <Button 
                                id="enroll-student-button"
                                onClick={() => setIsEnrollOpen(true)} 
                                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <UserPlus className="h-4 w-4" />
                                Enroll Student from Academy
                            </Button>
                        )}
                    </div>

                    {/* Students Table */}
                    <div className="rounded-xl border border-border/60 bg-card/80 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40 font-semibold">
                                    <tr>
                                        <th className="py-3 px-4">Student</th>
                                        <th className="py-3 px-4">Contact</th>
                                        <th className="py-3 px-4">Course Fee</th>
                                        <th className="py-3 px-4">Paid</th>
                                        <th className="py-3 px-4">Fee Status</th>
                                        <th className="py-3 px-4">Enrolled At</th>
                                        {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {localEnrollments.length === 0 ? (
                                        <tr>
                                            <td colSpan={canManage ? 7 : 6} className="py-8 text-center text-muted-foreground">
                                                No students enrolled in this batch yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        localEnrollments.map((enr: any) => (
                                            <tr key={enr.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-foreground">{enr.student.full_name}</div>
                                                    <div className="text-xs text-muted-foreground">{enr.student.email}</div>
                                                </td>
                                                <td className="py-3 px-4 text-xs text-muted-foreground">
                                                    {enr.student.parent_email ? `Parent: ${enr.student.parent_email}` : (enr.student.grade_level || "—")}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-medium">
                                                    ₹{enr.course_fee.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                    ₹{enr.paid_amount.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {getFeeStatusBadge(enr.fee_status)}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-muted-foreground">
                                                    {new Date(enr.enrolled_at).toLocaleDateString()}
                                                </td>
                                                {canManage && (
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => setEditingEnrollment({ ...enr })}
                                                                className="h-8 gap-1 text-xs"
                                                            >
                                                                <CreditCard className="h-3.5 w-3.5" />
                                                                Fee
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => handleRemoveStudent(enr.student_id, enr.student.full_name)}
                                                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                                title="Remove from batch"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= TAB 3: SESSIONS SCHEDULE & TRACKING ================= */}
            {activeTab === "sessions" && (
                <div className="space-y-6 pt-2">
                    {/* Notice Banner */}
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 text-xs flex items-start gap-3">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                        <div>
                            <strong className="font-semibold block mb-0.5">Session Completion Tracking:</strong>
                            Batch session status is for syllabus and class conduction tracking only. It does not mark individual student attendance, calculate attendance percentages, or affect tutor payroll. Batch tutor payments are fixed and managed manually via HR Payroll.
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">Batch Syllabus Sessions</h2>
                            <p className="text-xs text-muted-foreground">Track completed classes, rescheduled sessions, or cancellations.</p>
                        </div>

                        {canTrackSession && (
                            <Button 
                                id="add-session-button"
                                onClick={() => setIsAddSessionOpen(true)} 
                                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Plus className="h-4 w-4" />
                                Add Session
                            </Button>
                        )}
                    </div>

                    {/* Sessions Grid / Table */}
                    <div className="space-y-3">
                        {batch.sessions.length === 0 ? (
                            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                                <h4 className="font-bold">No Sessions Scheduled</h4>
                                <p className="text-xs text-muted-foreground mt-1">Schedule upcoming classes for this cohort.</p>
                            </div>
                        ) : (
                            batch.sessions.map((sess: any) => (
                                <div 
                                    key={sess.id}
                                    className="p-4 rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-border transition-colors"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                Session #{sess.session_number || "—"}
                                            </span>
                                            <h4 className="font-semibold text-foreground text-sm">{sess.title}</h4>
                                            {getSessionStatusBadge(sess.status)}
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(sess.scheduled_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {new Date(sess.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({sess.duration_minutes}m)
                                            </span>
                                            {sess.conducted_by_name && (
                                                <span>Conducted by: <strong>{sess.conducted_by_name}</strong></span>
                                            )}
                                        </div>

                                        {sess.notes && (
                                            <p className="text-xs text-muted-foreground italic mt-1">
                                                Note: {sess.notes}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        {sess.meeting_link && (
                                            <a href={sess.meeting_link} target="_blank" rel="noopener noreferrer">
                                                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                                    <Video className="h-3.5 w-3.5" /> Join
                                                </Button>
                                            </a>
                                        )}

                                        {canTrackSession && (
                                            <Select 
                                                value={sess.status}
                                                onValueChange={(val: BatchSessionStatus) => {
                                                    if (val === 'rescheduled') {
                                                        setReschedulingSession(sess);
                                                        setRescheduleDate(sess.scheduled_at);
                                                    } else {
                                                        handleUpdateSessionStatus(sess.id, val);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-8 w-[150px] text-xs">
                                                    <SelectValue placeholder="Update Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                                    <SelectItem value="completed">Mark Completed</SelectItem>
                                                    <SelectItem value="not_conducted">Not Conducted</SelectItem>
                                                    <SelectItem value="rescheduled">Reschedule...</SelectItem>
                                                    <SelectItem value="cancelled">Cancel Session</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {canManage && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDeleteSession(sess.id)}
                                                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                title="Delete Session"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ================= TAB 4: BATCH LEARNING CONTENT ================= */}
            {activeTab === "content" && (
                <div className="space-y-6 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-serif font-bold text-foreground">Batch Learning Materials</h2>
                            <p className="text-xs text-muted-foreground">Fresh study materials, resources, video links, and assignments created for this batch.</p>
                        </div>

                        {canTrackSession && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {(batchesWithContent || []).length > 0 && (
                                    <Button 
                                        variant="outline"
                                        onClick={() => setIsCopyContentOpen(true)}
                                        className="gap-2 border-indigo-500/30 text-indigo-600 hover:bg-indigo-50/50"
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copy from Another Batch
                                    </Button>
                                )}
                                <Button 
                                    id="add-batch-content-button"
                                    onClick={() => setIsAddContentOpen(true)} 
                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Batch Material
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {localContent.length === 0 ? (
                            <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-border bg-card/30">
                                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                                <h4 className="font-bold text-foreground">No Materials Added Yet</h4>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    Create fresh study materials, session notes, assignment links, or copy materials from a previous batch.
                                </p>
                                {canTrackSession && (
                                    <div className="flex items-center justify-center gap-3 mt-4">
                                        <Button size="sm" onClick={() => setIsAddContentOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                            <Plus className="h-4 w-4 mr-1.5" /> Add Material
                                        </Button>
                                        {(batchesWithContent || []).length > 0 && (
                                            <Button size="sm" variant="outline" onClick={() => setIsCopyContentOpen(true)}>
                                                <Copy className="h-4 w-4 mr-1.5" /> Copy Previous Batch Content
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            localContent.map((item: any) => (
                                <Card key={item.id} className="border border-border/60 bg-card/70 backdrop-blur-sm shadow-sm hover:border-indigo-500/20 transition-all">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                                                    {item.capsule_id ? `✨ ${item.type || 'capsule'}` : (item.type || 'document')}
                                                </Badge>
                                                {item.source_batch_id && (
                                                    <Badge variant="outline" className="text-[9px] bg-muted/60 text-muted-foreground border-border/50">
                                                        Shared from other batch
                                                    </Badge>
                                                )}
                                            </div>
                                            {canTrackSession && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleDeleteContent(item.id, item.title)}
                                                    className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                    title="Delete material"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                        <CardTitle className="text-base font-bold text-foreground mt-1.5">{item.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-1">
                                        {item.description && (
                                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                                            <span>
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Active'}
                                            </span>

                                            {item.capsule_id ? (
                                                <a 
                                                    href={`/student/learn/${item.capsule_id}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                >
                                                    <Button size="sm" className="h-7 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold">
                                                        <Sparkles className="h-3 w-3" />
                                                        <span>Play Capsule</span>
                                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                                    </Button>
                                                </a>
                                            ) : item.content_url ? (
                                                item.content_url.startsWith('http://') || item.content_url.startsWith('https://') ? (
                                                    <a 
                                                        href={ensureAbsoluteUrl(item.content_url)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50">
                                                            <ExternalLink className="h-3 w-3" />
                                                            <span>Open Link</span>
                                                        </Button>
                                                    </a>
                                                ) : (
                                                    <a 
                                                        href={`/api/batch-materials/${item.id}/download`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50">
                                                            <Download className="h-3 w-3" />
                                                            <span>Download File</span>
                                                        </Button>
                                                    </a>
                                                )
                                            ) : (
                                                <span className="text-[10px] italic text-muted-foreground/60">No attached file or link</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ================= MODAL: EDIT BATCH ================= */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdateBatch}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Edit Batch Parameters</DialogTitle>
                            <DialogDescription>Update batch settings, schedule, and agreed tutor stipend.</DialogDescription>
                        </DialogHeader>

                        {errorMessage && (
                            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-batch-name">Batch Name</Label>
                                    <Input
                                        id="edit-batch-name"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-course-name">Course Name</Label>
                                    <Input
                                        id="edit-course-name"
                                        value={editData.course_name}
                                        onChange={(e) => setEditData({ ...editData, course_name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-tutor">Assigned Tutor</Label>
                                    <Select
                                        value={editData.teacher_id}
                                        onValueChange={(val) => setEditData({ ...editData, teacher_id: val })}
                                    >
                                        <SelectTrigger id="edit-tutor">
                                            <SelectValue placeholder="Select Tutor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Tutor Assigned</SelectItem>
                                            {tutors.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.full_name} ({t.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-capacity">Student Capacity</Label>
                                    <Input
                                        id="edit-capacity"
                                        type="number"
                                        min="1"
                                        value={editData.capacity}
                                        onChange={(e) => setEditData({ ...editData, capacity: parseInt(e.target.value) || 20 })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-status">Batch Status</Label>
                                    <Select
                                        value={editData.status}
                                        onValueChange={(val: BatchStatus) => setEditData({ ...editData, status: val })}
                                    >
                                        <SelectTrigger id="edit-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="upcoming">Upcoming</SelectItem>
                                            <SelectItem value="ongoing">Ongoing</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-payout">Agreed Tutor Stipend (₹)</Label>
                                    <Input
                                        id="edit-payout"
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={editData.agreed_tutor_payout}
                                        onChange={(e) => setEditData({ ...editData, agreed_tutor_payout: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-start-date">Start Date</Label>
                                    <Input
                                        id="edit-start-date"
                                        type="date"
                                        value={editData.start_date}
                                        onChange={(e) => {
                                            const newStart = e.target.value;
                                            const days = editData.course_duration_days || 10;
                                            const calc = calculateBatchSchedule(newStart, batch.recurring_days || [], days);
                                            setEditData({
                                                ...editData,
                                                start_date: newStart,
                                                end_date: calc.endDateStr
                                            });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-duration-days">Total Number of Classes / Sessions</Label>
                                    <Input
                                        id="edit-duration-days"
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={editData.course_duration_days || ""}
                                        onChange={(e) => {
                                            const days = parseInt(e.target.value, 10) || 0;
                                            const calc = calculateBatchSchedule(editData.start_date, batch.recurring_days || [], days);
                                            setEditData({
                                                ...editData,
                                                course_duration_days: days,
                                                end_date: calc.endDateStr
                                            });
                                        }}
                                    />
                                    {editData.end_date && (
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                            Calculated End Date: <span className="text-indigo-600 font-semibold">{editData.end_date}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-schedule">Schedule Description (Optional)</Label>
                                <Input
                                    id="edit-schedule"
                                    value={editData.schedule_description}
                                    onChange={(e) => setEditData({ ...editData, schedule_description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-link">Meeting Link</Label>
                                <Input
                                    id="edit-link"
                                    value={editData.meeting_link}
                                    onChange={(e) => setEditData({ ...editData, meeting_link: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-notes">Notes</Label>
                                <Textarea
                                    id="edit-notes"
                                    value={editData.notes}
                                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {actionLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ================= MODAL: ENROLL STUDENT ================= */}
            <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleEnrollStudent}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Enroll Student from Academy</DialogTitle>
                            <DialogDescription>
                                Select an already registered academy student to add to this batch. Reuses existing account credentials.
                            </DialogDescription>
                        </DialogHeader>

                        {errorMessage && (
                            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="grid gap-4 py-4">
                            {/* Selected Student Card */}
                            {selectedStudentId ? (
                                (() => {
                                    const selected = localAvailableStudents.find(s => s.id === selectedStudentId);
                                    return (
                                        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                                    {(selected?.full_name || 'S').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-foreground">
                                                        {selected?.full_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {selected?.email}
                                                        {selected?.parent_email && ` • Parent: ${selected.parent_email}`}
                                                        {selected?.grade_level && ` • ${selected.grade_level}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedStudentId("")}
                                                className="h-8 text-xs border-indigo-300 dark:border-indigo-800"
                                            >
                                                Change
                                            </Button>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="search-student">Select Academy Student *</Label>
                                    <Input
                                        id="search-student"
                                        placeholder="Filter by student name or email..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="mb-2"
                                    />

                                    <div className="max-h-52 overflow-y-auto border border-border/40 rounded-lg divide-y divide-border/30 bg-background/50">
                                        {localAvailableStudents.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-muted-foreground">
                                                No active academy students found in system.
                                            </div>
                                        ) : localAvailableStudents.filter(s => 
                                            !studentSearch ||
                                            s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                            s.email.toLowerCase().includes(studentSearch.toLowerCase())
                                        ).length === 0 ? (
                                            <div className="p-4 text-center text-xs text-muted-foreground">
                                                No students match &quot;{studentSearch}&quot;
                                            </div>
                                        ) : (
                                            localAvailableStudents
                                                .filter(s => 
                                                    !studentSearch ||
                                                    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                    s.email.toLowerCase().includes(studentSearch.toLowerCase())
                                                )
                                                .map(s => (
                                                    <div 
                                                        key={s.id}
                                                        onClick={() => !s.is_already_enrolled && setSelectedStudentId(s.id)}
                                                        className={cn(
                                                            "p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors",
                                                            s.is_already_enrolled ? "opacity-40 cursor-not-allowed bg-muted/20" :
                                                            selectedStudentId === s.id ? "bg-indigo-500/15 border-l-4 border-indigo-600 font-semibold" : "hover:bg-muted/40"
                                                        )}
                                                    >
                                                        <div>
                                                            <div className="text-foreground font-medium">{s.full_name}</div>
                                                            <div className="text-muted-foreground text-[10px]">
                                                                {s.email}
                                                                {s.parent_email && ` • Parent: ${s.parent_email}`}
                                                                {s.grade_level && ` • ${s.grade_level}`}
                                                            </div>
                                                        </div>
                                                        {s.is_already_enrolled ? (
                                                            <Badge variant="outline" className="text-[10px]">Already Enrolled</Badge>
                                                        ) : selectedStudentId === s.id ? (
                                                            <Check className="h-4 w-4 text-indigo-600" />
                                                        ) : null}
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="enroll-fee">One-Time Course Fee (₹)</Label>
                                    <Input
                                        id="enroll-fee"
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="e.g. 999"
                                        value={enrollFee}
                                        onChange={(e) => setEnrollFee(parseFloat(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="enroll-status">Payment Status</Label>
                                    <Select 
                                        value={enrollFeeStatus} 
                                        onValueChange={(val: FeeStatus) => {
                                            setEnrollFeeStatus(val);
                                            if (val === 'paid') setEnrollPaidAmount(enrollFee);
                                        }}
                                    >
                                        <SelectTrigger id="enroll-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unpaid">Unpaid</SelectItem>
                                            <SelectItem value="paid">Paid Full</SelectItem>
                                            <SelectItem value="partially_paid">Partially Paid</SelectItem>
                                            <SelectItem value="waived">Waived / Free</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {enrollFeeStatus !== 'unpaid' && enrollFeeStatus !== 'waived' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-muted/30 border border-border/40">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="paid-amt">Amount Paid (₹)</Label>
                                        <Input
                                            id="paid-amt"
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={enrollPaidAmount}
                                            onChange={(e) => setEnrollPaidAmount(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pay-method">Payment Method</Label>
                                        <Select value={enrollPaymentMethod} onValueChange={setEnrollPaymentMethod}>
                                            <SelectTrigger id="pay-method">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="razorpay">Razorpay</SelectItem>
                                                <SelectItem value="upi_qr">UPI / QR</SelectItem>
                                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-full space-y-1.5">
                                        <Label htmlFor="tx-id">Transaction ID / Reference (Optional)</Label>
                                        <Input
                                            id="tx-id"
                                            placeholder="e.g. UPI-12345678"
                                            value={enrollTxId}
                                            onChange={(e) => setEnrollTxId(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="enroll-notes">Fee Notes (Optional)</Label>
                                <Input
                                    id="enroll-notes"
                                    placeholder="e.g. 10% sibling discount applied"
                                    value={enrollNotes}
                                    onChange={(e) => setEnrollNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEnrollOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                id="submit-enroll-button"
                                type="submit" 
                                disabled={actionLoading || !selectedStudentId} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {actionLoading ? "Enrolling..." : "Enroll Student"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ================= MODAL: UPDATE ENROLLMENT FEE ================= */}
            {editingEnrollment && (
                <Dialog open={true} onOpenChange={() => setEditingEnrollment(null)}>
                    <DialogContent className="max-w-md">
                        <form onSubmit={handleSaveFeeUpdate}>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold">Update Course Fee & Payment</DialogTitle>
                                <DialogDescription>
                                    Manage fee details for {editingEnrollment.student.full_name}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-course-fee">Total Course Fee (₹)</Label>
                                    <Input
                                        id="edit-course-fee"
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={editingEnrollment.course_fee}
                                        onChange={(e) => setEditingEnrollment({ ...editingEnrollment, course_fee: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-fee-status">Payment Status</Label>
                                    <Select 
                                        value={editingEnrollment.fee_status} 
                                        onValueChange={(val: FeeStatus) => {
                                            setEditingEnrollment({
                                                ...editingEnrollment,
                                                fee_status: val,
                                                paid_amount: val === 'paid' ? editingEnrollment.course_fee : editingEnrollment.paid_amount
                                            });
                                        }}
                                    >
                                        <SelectTrigger id="edit-fee-status">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unpaid">Unpaid</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="partially_paid">Partially Paid</SelectItem>
                                            <SelectItem value="waived">Waived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-paid-amt">Amount Paid (₹)</Label>
                                    <Input
                                        id="edit-paid-amt"
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={editingEnrollment.paid_amount}
                                        onChange={(e) => setEditingEnrollment({ ...editingEnrollment, paid_amount: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-method">Payment Method</Label>
                                    <Select 
                                        value={editingEnrollment.payment_method || 'other'} 
                                        onValueChange={(val) => setEditingEnrollment({ ...editingEnrollment, payment_method: val })}
                                    >
                                        <SelectTrigger id="edit-method">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="razorpay">Razorpay</SelectItem>
                                            <SelectItem value="upi_qr">UPI / QR</SelectItem>
                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-tx">Transaction ID / Reference</Label>
                                    <Input
                                        id="edit-tx"
                                        value={editingEnrollment.transaction_id || ""}
                                        onChange={(e) => setEditingEnrollment({ ...editingEnrollment, transaction_id: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-fnotes">Notes</Label>
                                    <Input
                                        id="edit-fnotes"
                                        value={editingEnrollment.fee_notes || ""}
                                        onChange={(e) => setEditingEnrollment({ ...editingEnrollment, fee_notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingEnrollment(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {actionLoading ? "Saving..." : "Save Payment"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* ================= MODAL: ADD SESSION ================= */}
            <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
                <DialogContent className="max-w-md">
                    <form onSubmit={handleAddSession}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Schedule Batch Session</DialogTitle>
                            <DialogDescription>
                                Add an upcoming cohort class session to the batch calendar.
                            </DialogDescription>
                        </DialogHeader>

                        {errorMessage && (
                            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="grid gap-4 py-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="session-title">Session Title (Optional)</Label>
                                <Input
                                    id="session-title"
                                    placeholder={`e.g. Orientation (Leave blank for Session #${(batch.sessions?.length || 0) + 1})`}
                                    value={sessionTitle}
                                    onChange={(e) => setSessionTitle(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="session-datetime">Scheduled Date & Time *</Label>
                                    <Input
                                        id="session-datetime"
                                        type="datetime-local"
                                        value={sessionDate}
                                        onChange={(e) => setSessionDate(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="session-duration">Duration (Minutes)</Label>
                                    <Input
                                        id="session-duration"
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={sessionDuration}
                                        onChange={(e) => setSessionDuration(parseInt(e.target.value) || 60)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="session-link">Meeting Link (Inherits batch link if empty)</Label>
                                <Input
                                    id="session-link"
                                    placeholder="https://meet.google.com/..."
                                    value={sessionMeetingLink}
                                    onChange={(e) => setSessionMeetingLink(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="session-notes">Syllabus Topic / Notes (Optional)</Label>
                                <Textarea
                                    id="session-notes"
                                    placeholder="Key concepts to cover or homework expectations..."
                                    value={sessionNotes}
                                    onChange={(e) => setSessionNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddSessionOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                id="submit-session-button"
                                type="submit" 
                                disabled={actionLoading} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {actionLoading ? "Scheduling..." : "Schedule Session"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ================= MODAL: RESCHEDULE SESSION ================= */}
            {reschedulingSession && (
                <Dialog open={true} onOpenChange={() => setReschedulingSession(null)}>
                    <DialogContent className="max-w-md">
                        <form onSubmit={handleRescheduleSession}>
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold">Reschedule Session</DialogTitle>
                                <DialogDescription>
                                    Reschedule {reschedulingSession.title}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="reschedule-date">New Date & Time *</Label>
                                    <Input
                                        id="reschedule-date"
                                        type="datetime-local"
                                        value={rescheduleDate ? new Date(rescheduleDate).toISOString().slice(0, 16) : ""}
                                        onChange={(e) => setRescheduleDate(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="reschedule-reason">Reschedule Reason / Note</Label>
                                    <Input
                                        id="reschedule-reason"
                                        placeholder="e.g. Tutor requested moving from Tuesday to Thursday"
                                        value={rescheduleNote}
                                        onChange={(e) => setRescheduleNote(e.target.value)}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setReschedulingSession(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {actionLoading ? "Updating..." : "Confirm Reschedule"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* ================= MODAL: ADD BATCH MATERIAL & CAPSULES ================= */}
            <Dialog open={isAddContentOpen} onOpenChange={setIsAddContentOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <span>Add Batch Content & Materials</span>
                        </DialogTitle>
                        <DialogDescription>
                            Create interactive learning capsules (quizzes, flashcards), upload study documents/PDFs directly from your computer, or attach resource links.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Selector Tabs */}
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-muted/40 rounded-xl border border-border/40 my-2">
                        <button
                            type="button"
                            onClick={() => setContentCreationMode('capsule')}
                            className={cn(
                                "flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all",
                                contentCreationMode === 'capsule'
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Capsule Maker</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setContentCreationMode('upload')}
                            className={cn(
                                "flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all",
                                contentCreationMode === 'upload'
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Direct File Upload</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setContentCreationMode('url')}
                            className={cn(
                                "flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all",
                                contentCreationMode === 'url'
                                    ? "bg-indigo-600 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Resource Link</span>
                        </button>
                    </div>

                    {/* TAB 1: INTERACTIVE CAPSULE MAKER */}
                    {contentCreationMode === 'capsule' && (
                        <form onSubmit={handleCreateCapsule} className="space-y-4 pt-2">
                            {/* Format selector */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Lesson Format
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'quiz', label: 'Quiz / MCQ' },
                                        { key: 'flashcards', label: 'Flashcard Deck' },
                                        { key: 'video', label: 'Video Lesson' }
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            type="button"
                                            onClick={() => setCapsuleFormat(f.key as any)}
                                            className={cn(
                                                "py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all",
                                                capsuleFormat === f.key
                                                    ? "bg-indigo-500/15 border-indigo-600 text-indigo-700 dark:text-indigo-300 font-extrabold"
                                                    : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="capsule-title">Capsule Title *</Label>
                                <Input
                                    id="capsule-title"
                                    placeholder="e.g. Session 1: Sound Practice Quiz"
                                    value={capsuleTitle}
                                    onChange={(e) => setCapsuleTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="capsule-desc">Instructions / Learning Goals (Optional)</Label>
                                <Textarea
                                    id="capsule-desc"
                                    placeholder="Instructions for students before starting this capsule..."
                                    value={capsuleDesc}
                                    onChange={(e) => setCapsuleDesc(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            {/* Format Specific Builders */}
                            {capsuleFormat === 'quiz' && (
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-indigo-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            Interactive Questions Builder
                                        </span>
                                    </div>
                                    <McqBuilder onChange={setQuizContent} />
                                </div>
                            )}

                            {capsuleFormat === 'flashcards' && (
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-indigo-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            Interactive Flashcards Deck Builder
                                        </span>
                                    </div>
                                    <FlashcardBuilder onChange={setFlashcardContent} />
                                </div>
                            )}

                            {capsuleFormat === 'video' && (
                                <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
                                    <Label htmlFor="capsule-video-url">Video Presentation URL (YouTube, Vimeo, or MP4) *</Label>
                                    <Input
                                        id="capsule-video-url"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        value={capsuleVideoUrl}
                                        onChange={(e) => setCapsuleVideoUrl(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsAddContentOpen(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={actionLoading || !capsuleTitle.trim()} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span>{actionLoading ? "Creating Capsule..." : "Create & Add Capsule"}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    )}

                    {/* TAB 2: DIRECT FILE UPLOAD */}
                    {contentCreationMode === 'upload' && (
                        <form onSubmit={handleUploadDirectFile} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="direct-file-input">Select File from Device (PDF, Document, Worksheet) *</Label>
                                <div className="p-6 border-2 border-dashed border-border/70 hover:border-indigo-500/60 rounded-2xl bg-muted/10 text-center transition-all">
                                    <FileUp className="h-8 w-8 mx-auto text-indigo-500 mb-2" />
                                    <p className="text-xs font-medium text-foreground mb-1">
                                        {selectedFile ? selectedFile.name : "Choose a PDF, Word doc, or file from your computer"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mb-3">
                                        Supports PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, PNG, JPG (up to 50MB)
                                    </p>
                                    <input
                                        id="direct-file-input"
                                        type="file"
                                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) {
                                                setSelectedFile(f);
                                                if (!uploadTitle.trim()) {
                                                    setUploadTitle(f.name.replace(/\.[^/.]+$/, ""));
                                                }
                                            }
                                        }}
                                        className="text-xs cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="upload-title">Material Title *</Label>
                                <Input
                                    id="upload-title"
                                    placeholder="e.g. Session 1 Practice Worksheet"
                                    value={uploadTitle}
                                    onChange={(e) => setUploadTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="upload-desc">Description / Instructions (Optional)</Label>
                                <Textarea
                                    id="upload-desc"
                                    placeholder="Instructions for students on how to use this document..."
                                    value={uploadDesc}
                                    onChange={(e) => setUploadDesc(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsAddContentOpen(false)}>
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isUploadingFile || !selectedFile || !uploadTitle.trim()} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                                >
                                    <Upload className="h-4 w-4" />
                                    <span>{isUploadingFile ? "Uploading to Cloud..." : "Upload & Save to Batch"}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    )}

                    {/* TAB 3: RESOURCE URL */}
                    {contentCreationMode === 'url' && (
                        <form onSubmit={handleCreateContent} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="material-title">Material Title *</Label>
                                <Input
                                    id="material-title"
                                    placeholder="e.g. Session 1 Slide Deck & Worksheets"
                                    value={newContentTitle}
                                    onChange={(e) => setNewContentTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="material-type">Resource Type</Label>
                                <Select value={newContentType} onValueChange={setNewContentType}>
                                    <SelectTrigger id="material-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="document">Document / Notes</SelectItem>
                                        <SelectItem value="video">Video Recording</SelectItem>
                                        <SelectItem value="link">Web Link / Article</SelectItem>
                                        <SelectItem value="assignment">Assignment / Project</SelectItem>
                                        <SelectItem value="quiz">External Assessment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="material-url">Resource URL / Link *</Label>
                                <Input
                                    id="material-url"
                                    placeholder="https://drive.google.com/... or https://..."
                                    value={newContentUrl}
                                    onChange={(e) => setNewContentUrl(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="material-desc">Instructions / Description (Optional)</Label>
                                <Textarea
                                    id="material-desc"
                                    placeholder="Brief instructions or summary of what students should read/watch..."
                                    value={newContentDesc}
                                    onChange={(e) => setNewContentDesc(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsAddContentOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={actionLoading || !newContentTitle.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {actionLoading ? "Saving..." : "Add to Batch"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ================= MODAL: COPY CONTENT FROM ANOTHER BATCH ================= */}
            <Dialog open={isCopyContentOpen} onOpenChange={setIsCopyContentOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Copy Materials from Previous Batch</DialogTitle>
                        <DialogDescription>
                            Select a previously created batch to share its study materials, notes, and links with this new cohort.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="source-batch">Select Source Batch</Label>
                            <Select 
                                value={selectedSourceBatchId} 
                                onValueChange={(val) => {
                                    setSelectedSourceBatchId(val);
                                    const source = (batchesWithContent || []).find((b: any) => b.id === val);
                                    if (source) {
                                        setSelectedMaterialIdsToCopy(source.materials.map((m: any) => m.id));
                                    } else {
                                        setSelectedMaterialIdsToCopy([]);
                                    }
                                }}
                            >
                                <SelectTrigger id="source-batch">
                                    <SelectValue placeholder="Choose a batch to copy from..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {(batchesWithContent || []).map((b: any) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name} ({b.course_name}) — {b.materials.length} items
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedSourceBatchId && (() => {
                            const source = (batchesWithContent || []).find((b: any) => b.id === selectedSourceBatchId);
                            if (!source) return null;

                            const allSelected = source.materials.length > 0 && selectedMaterialIdsToCopy.length === source.materials.length;

                            return (
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between text-xs font-semibold px-1">
                                        <span>Materials in {source.name}:</span>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                if (allSelected) {
                                                    setSelectedMaterialIdsToCopy([]);
                                                } else {
                                                    setSelectedMaterialIdsToCopy(source.materials.map((m: any) => m.id));
                                                }
                                            }}
                                            className="text-indigo-600 hover:underline"
                                        >
                                            {allSelected ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto border border-border/40 rounded-xl divide-y divide-border/30 bg-muted/20">
                                        {source.materials.map((mat: any) => {
                                            const isChecked = selectedMaterialIdsToCopy.includes(mat.id);
                                            return (
                                                <label 
                                                    key={mat.id} 
                                                    className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            if (isChecked) {
                                                                setSelectedMaterialIdsToCopy(prev => prev.filter(id => id !== mat.id));
                                                            } else {
                                                                setSelectedMaterialIdsToCopy(prev => [...prev, mat.id]);
                                                            }
                                                        }}
                                                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[9px] uppercase font-bold">
                                                                {mat.type}
                                                            </Badge>
                                                            <span className="font-semibold text-foreground text-xs truncate">
                                                                {mat.title}
                                                            </span>
                                                        </div>
                                                        {mat.description && (
                                                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                                                {mat.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCopyContentOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            disabled={actionLoading || selectedMaterialIdsToCopy.length === 0} 
                            onClick={handleCopyContentSubmit}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {actionLoading ? "Copying..." : `Copy Selected (${selectedMaterialIdsToCopy.length}) Materials`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
