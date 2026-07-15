'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
    Video, Calendar, Clock, FileText, ChevronLeft, ChevronRight, 
    Download, GraduationCap, Flame, Sparkles, CreditCard, 
    Megaphone, Upload, Check, Image as ImageIcon, Camera, 
    ListTodo, ClipboardCheck, Activity, AlertCircle, Loader2
} from "lucide-react"
import { isSameDay, format, isAfter } from "date-fns"
import { cn, formatTime12Hour, ensureAbsoluteUrl, formatClassTitle } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { submitHomework, requestReschedule, applyForLeave, logStudentJoinClass, submitCompletedWorksheet, uploadStudentStudyMaterial } from "@/app/(dashboard)/attendance/actions"
import { createPaymentRecord } from "@/app/(dashboard)/payments/actions"
import { deleteUploadedR2File, uploadFileDirectToR2 } from "@/lib/r2-upload-client"
import { toast } from "sonner"
import { ClassLogsCalendarClient } from "@/components/features/class-logs/ClassLogsCalendarClient"

interface LiveClass {
    id: string;
    title: string;
    meeting_link: string;
    scheduled_at: string;
    status: string;
    topic_taught?: string | null;
    student_performance?: string | null;
    parent_note?: string | null;
    teacher?: { full_name: string } | null;
    tutor_joined_at?: string | null;
    student_joined_at?: string | null;
    parent_verified?: boolean | null;
    parent_dispute_reason?: string | null;
}

interface Homework {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    status: string;
    submission_url?: string | null;
    submission_notes?: string | null;
    teacher?: { full_name: string } | null;
    worksheet_url?: string | null;
}

interface Material {
    id: string;
    title: string;
    file_url: string;
    created_at: string;
    teacher?: { full_name: string } | null;
    teacher_id?: string | null;
}

interface AttendanceLog {
    id: string;
    status: 'present' | 'absent' | 'late';
    created_at: string;
    class?: { title: string, scheduled_at: string } | null;
}

interface StudentDetails {
    id: string;
    grade_level: string | null;
    monthly_fee: number;
    classes_per_month?: number | null;
    status: string;
    parent_email?: string | null;
    subject_name_1?: string | null;
    subject_name_2?: string | null;
    monthly_fee_2?: number | null;
    classes_per_month_2?: number | null;
    assigned_teacher_id_2?: string | null;
    subject_name_3?: string | null;
    monthly_fee_3?: number | null;
    classes_per_month_3?: number | null;
    assigned_teacher_id_3?: string | null;
    subject_name_4?: string | null;
    monthly_fee_4?: number | null;
    classes_per_month_4?: number | null;
    assigned_teacher_id_4?: string | null;
    subject_name_5?: string | null;
    monthly_fee_5?: number | null;
    classes_per_month_5?: number | null;
    assigned_teacher_id_5?: string | null;
    assigned_teacher?: { full_name: string | null } | null;
    assigned_teacher_2?: { full_name: string | null } | null;
    assigned_teacher_3?: { full_name: string | null } | null;
    assigned_teacher_4?: { full_name: string | null } | null;
    assigned_teacher_5?: { full_name: string | null } | null;
}

interface RescheduleRequest {
    id: string;
    class_id: string | null;
    student_id: string;
    teacher_id: string;
    requested_date: string;
    requested_time: string;
    reason: string | null;
    status: string;
    created_at: string;
    class?: { title: string; scheduled_at: string } | null;
    teacher?: { full_name: string } | null;
}

interface LeaveRequest {
    id: string;
    student_id: string;
    teacher_id: string | null;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: string;
    created_at: string;
    teacher?: { full_name: string } | null;
}

interface StudentDashboardClientProps {
    currentUserProfile: {
        id: string;
        email: string;
        role: string;
        full_name: string;
    } | null;
    studentName: string;
    todayClasses: LiveClass[];
    upcomingClass: LiveClass | null;
    allCalendarClasses: LiveClass[];
    homework: Homework[];
    materials: Material[];
    details: StudentDetails | null;
    attendanceHistory: AttendanceLog[];
    completedClasses: LiveClass[];
    rescheduleRequests: RescheduleRequest[];
    leaveRequests: LeaveRequest[];
    initialPayments: any[];
    activeSchedule?: any;
    activeSchedules?: any[];
}

export function StudentDashboardClient({
    currentUserProfile,
    studentName,
    todayClasses,
    upcomingClass,
    allCalendarClasses,
    homework,
    materials,
    details,
    attendanceHistory,
    completedClasses,
    rescheduleRequests,
    leaveRequests,
    initialPayments,
    activeSchedule,
    activeSchedules = []
}: StudentDashboardClientProps) {
    // Build active subjects list
    const activeSubjects: { name: string; fee: number; classesPerMonth: number; tutor: string }[] = [];
    if (details) {
        activeSubjects.push({
            name: details.subject_name_1 || "Maths",
            fee: Number(details.monthly_fee) || 4500,
            classesPerMonth: Number(details.classes_per_month) || 12,
            tutor: details.assigned_teacher?.full_name || "Unassigned"
        });
        if (details.subject_name_2) {
            activeSubjects.push({
                name: details.subject_name_2,
                fee: Number(details.monthly_fee_2) || 0,
                classesPerMonth: Number(details.classes_per_month_2) || 0,
                tutor: details.assigned_teacher_2?.full_name || "Unassigned"
            });
        }
        if (details.subject_name_3) {
            activeSubjects.push({
                name: details.subject_name_3,
                fee: Number(details.monthly_fee_3) || 0,
                classesPerMonth: Number(details.classes_per_month_3) || 0,
                tutor: details.assigned_teacher_3?.full_name || "Unassigned"
            });
        }
        if (details.subject_name_4) {
            activeSubjects.push({
                name: details.subject_name_4,
                fee: Number(details.monthly_fee_4) || 0,
                classesPerMonth: Number(details.classes_per_month_4) || 0,
                tutor: details.assigned_teacher_4?.full_name || "Unassigned"
            });
        }
        if (details.subject_name_5) {
            activeSubjects.push({
                name: details.subject_name_5,
                fee: Number(details.monthly_fee_5) || 0,
                classesPerMonth: Number(details.classes_per_month_5) || 0,
                tutor: details.assigned_teacher_5?.full_name || "Unassigned"
            });
        }
    } else {
        activeSubjects.push({
            name: "Maths",
            fee: 4500,
            classesPerMonth: 12,
            tutor: "Unassigned"
        });
    }

    const feeAmount = activeSubjects.reduce((sum, s) => sum + s.fee, 0);

    const [currentMonthDate, setCurrentMonthDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [dismissedCancelledIds, setDismissedCancelledIds] = useState<string[]>([])

    useEffect(() => {
        try {
            const saved = localStorage.getItem("student_dismissed_cancelled_classes")
            if (saved) {
                setDismissedCancelledIds(JSON.parse(saved))
            }
        } catch (e) {
            console.error("Failed to load dismissed cancelled class IDs from localStorage", e)
        }
    }, [])

    const handleDismissCancelledClass = (classId: string) => {
        setDismissedCancelledIds(prev => {
            if (prev.includes(classId)) return prev
            const next = [...prev, classId]
            try {
                localStorage.setItem("student_dismissed_cancelled_classes", JSON.stringify(next))
            } catch (e) {
                console.error("Failed to save dismissed cancelled class IDs to localStorage", e)
            }
            return next
        })
    }

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    // Calculate completed classes for each active subject based on its own specific schedule/billing cycle
    const subjectCompletions = activeSubjects.map(sub => {
        // Find an active schedule that matches this subject name
        const matchingSchedule = (activeSchedules || []).find(sch => 
            sch.title && sch.title.toLowerCase().includes(sub.name.toLowerCase())
        ) || activeSchedule;

        let startStr: string | null = null;
        let endStr: string | null = null;
        if (matchingSchedule) {
            startStr = matchingSchedule.start_date;
            endStr = matchingSchedule.end_date;
        }

        const completedClassesForSubject = completedClasses.filter(c => {
            const classTitleLower = (c.title || "").toLowerCase();
            
            // Check if class belongs to this subject
            // If the student is only enrolled in 1 subject, all classes belong to it.
            // If enrolled in multiple subjects, match by name.
            const matchesSubject = activeSubjects.length === 1 || classTitleLower.includes(sub.name.toLowerCase());
            if (!matchesSubject) return false;

            // Date boundary checks
            const classDateStr = c.scheduled_at.substring(0, 10);
            if (startStr && endStr) {
                return classDateStr >= startStr && classDateStr <= endStr;
            }
            
            // Fallback: current calendar month
            const currentMonthStr = String(currentMonth + 1).padStart(2, '0');
            const currentYearStr = String(currentYear);
            return classDateStr.startsWith(`${currentYearStr}-${currentMonthStr}`);
        });

        return {
            ...sub,
            completed: completedClassesForSubject.length
        };
    });

    const completedThisMonth = subjectCompletions.reduce((sum, s) => sum + s.completed, 0);

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cancelledClasses = allCalendarClasses.filter(c => 
        c.status === 'cancelled' && 
        new Date(c.scheduled_at) >= sevenDaysAgo
    )

    const monthlyClassesLimit = activeSubjects.reduce((sum, s) => sum + s.classesPerMonth, 0);
    const progressPercent = Math.min(100, Math.round((completedThisMonth / (monthlyClassesLimit || 12)) * 100))

    const isAnySubjectLimitReached = subjectCompletions.some(s => s.completed >= s.classesPerMonth && s.classesPerMonth > 0);
    const isAnySubjectOneRemaining = subjectCompletions.some(s => s.completed === s.classesPerMonth - 1 && s.classesPerMonth > 0);

    const showLimitReachedAlert = isAnySubjectLimitReached && details?.status !== 'active';
    const showOneRemainingReminder = isAnySubjectOneRemaining && details?.status !== 'active';

    const todayStr = new Date().toDateString()
    const clientTodayClasses = allCalendarClasses.filter(c => 
        new Date(c.scheduled_at).toDateString() === todayStr && c.status !== 'completed'
    )

    // Payment States
    const [payments, setPayments] = useState<any[]>(initialPayments)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [billingMonth, setBillingMonth] = useState(new Date().getMonth() + 1)
    const [billingYear, setBillingYear] = useState(new Date().getFullYear())
    const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi_qr'>('upi_qr')
    const [utrNumber, setUtrNumber] = useState("")
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)

    // Razorpay script loading helper
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if ((window as any).Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleRazorpayPayment = async () => {
        setIsProcessingPayment(true);
        const scriptLoaded = await loadRazorpayScript();
        
        // Callback helper to handle server logging of the transaction
        const processCompletedPayment = async (razorpayPaymentId: string) => {
            try {
                const res = await createPaymentRecord({
                    amount: feeAmount,
                    month: billingMonth,
                    year: billingYear,
                    method: 'razorpay',
                    transactionId: razorpayPaymentId
                });
                if (res.success) {
                    toast.success("Payment completed! Receipt generated and scheduling limits updated.");
                    setPayments(prev => [res.payment, ...prev]);
                    setPaymentModalOpen(false);
                    // Reload after 1s to update student dashboard status
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    toast.error(res.error || "Failed to log Razorpay payment.");
                }
            } catch (error: any) {
                toast.error("Error updating payment logs: " + error.message);
            } finally {
                setIsProcessingPayment(false);
            }
        };

        if (!scriptLoaded) {
            // FALLBACK / DEMO CHECKOUT MODE (Adblockers, offline, or sandbox demo without API Keys)
            toast.info("Simulating Razorpay Payment Sandbox Checkout...");
            setTimeout(async () => {
                const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
                await processCompletedPayment(mockPaymentId);
            }, 1500);
            return;
        }

        try {
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mocked_for_demo",
                amount: feeAmount * 100, // in paise
                currency: "INR",
                name: "EdHorizon Academy",
                description: `Tuition Fee - Cycle ${billingMonth}/${billingYear}`,
                handler: async function (response: any) {
                    await processCompletedPayment(response.razorpay_payment_id);
                },
                prefill: {
                    name: studentName,
                    email: "student@edhorizon.com",
                },
                modal: {
                    ondismiss: function() {
                        setIsProcessingPayment(false);
                        toast.error("Payment checkout cancelled.");
                    }
                },
                theme: {
                    color: "#4f46e5"
                }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                setIsProcessingPayment(false);
                toast.error("Payment failed: " + response.error.description);
            });
            rzp.open();
        } catch (err: any) {
            console.error("Razorpay initiation error:", err);
            toast.info("Razorpay failed to open (invalid keys). Running sandbox simulation...");
            setTimeout(async () => {
                const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
                await processCompletedPayment(mockPaymentId);
            }, 1500);
        }
    };

    const handleUpiPaymentSubmit = async () => {
        setIsProcessingPayment(true);
        try {
            const res = await createPaymentRecord({
                amount: feeAmount,
                month: billingMonth,
                year: billingYear,
                method: 'upi_qr',
                transactionId: 'Screenshot Shared'
            });
            if (res.success) {
                toast.success("UPI Payment log created! Please share the screenshot on WhatsApp.");
                setPayments(prev => [res.payment, ...prev]);
                setUtrNumber("");
                setPaymentModalOpen(false);
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                toast.error(res.error || "Failed to submit UPI payment log.");
            }
        } catch (error: any) {
            toast.error("Error submitting details: " + error.message);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Submit Homework Modal state
    const [submitModalOpen, setSubmitModalOpen] = useState(false)
    const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
    const [submissionNotes, setSubmissionNotes] = useState("")
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [selectedHomeworkFile, setSelectedHomeworkFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Submit Worksheet Modal state
    const [worksheetModalOpen, setWorksheetModalOpen] = useState(false)
    const [worksheetTitle, setWorksheetTitle] = useState("")
    const [worksheetPreview, setWorksheetPreview] = useState<string | null>(null)
    const [selectedWorksheetFile, setSelectedWorksheetFile] = useState<File | null>(null)
    const [isSubmittingWorksheet, setIsSubmittingWorksheet] = useState(false)

    // Submit Study Material Modal state
    const [studyMaterialModalOpen, setStudyMaterialModalOpen] = useState(false)
    const [studyMaterialTitle, setStudyMaterialTitle] = useState("")
    const [studyMaterialPreview, setStudyMaterialPreview] = useState<string | null>(null)
    const [selectedStudyMaterialFile, setSelectedStudyMaterialFile] = useState<File | null>(null)
    const [isSubmittingStudyMaterial, setIsSubmittingStudyMaterial] = useState(false)

    // Reschedule and Leave states
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
    const [leaveModalOpen, setLeaveModalOpen] = useState(false)

    const [rescheduleClassId, setRescheduleClassId] = useState("")
    const [rescheduleDate, setRescheduleDate] = useState("")
    const [rescheduleTime, setRescheduleTime] = useState("")
    const [rescheduleReason, setRescheduleReason] = useState("")
    const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false)

    const [leaveStartDate, setLeaveStartDate] = useState("")
    const [leaveEndDate, setLeaveEndDate] = useState("")
    const [leaveReason, setLeaveReason] = useState("")
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

    // Parses legacy description for embedded URLs, and renders clickable R2 and legacy worksheets.
    const renderHomeworkDescription = (hw: Homework) => {
        const desc = hw.description || '';
        const match = desc.match(/Attachment File:\s*(https?:\/\/[^\s\)\"\'\>]+)/i);
        let cleanDesc = desc;
        let attachmentUrl = hw.worksheet_url || null;

        if (match) {
            cleanDesc = desc.replace(/Attachment File:\s*https?:\/\/[^\s\)\"\'\>]+/i, '').trim();
            if (!attachmentUrl) {
                attachmentUrl = match[1];
            }
        }

        return (
            <div className="space-y-2">
                {cleanDesc ? (
                    <p className="text-xs text-muted-foreground leading-normal">{cleanDesc}</p>
                ) : (
                    <p className="text-xs text-muted-foreground italic leading-normal">No special instructions from teacher.</p>
                )}
                {attachmentUrl && (
                    <div className="mt-1">
                        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-300 font-bold uppercase tracking-wider text-[9px] rounded-lg border border-indigo-200/40 transition-colors">
                            <Download size={11} />
                            <span>Download Assigned Worksheet</span>
                        </a>
                    </div>
                )}
            </div>
        );
    }

    const handleRescheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!details?.id) {
            toast.error("Student profile details not loaded yet.")
            return
        }
        if (!rescheduleDate || !rescheduleTime) {
            toast.error("Please fill in date and time.")
            return
        }
        setIsSubmittingReschedule(true)
        try {
            const classIdToSubmit = rescheduleClassId && rescheduleClassId !== "any" ? rescheduleClassId : null;
            const res = await requestReschedule(
                classIdToSubmit,
                details.id,
                rescheduleDate,
                rescheduleTime,
                rescheduleReason
            )
            if (res.success) {
                toast.success("Reschedule request submitted successfully! Your teacher and Operations will coordinate.")
                setRescheduleModalOpen(false)
                setRescheduleClassId("")
                setRescheduleDate("")
                setRescheduleTime("")
                setRescheduleReason("")
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to submit reschedule request.")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.")
        } finally {
            setIsSubmittingReschedule(false)
        }
    }

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!leaveStartDate || !leaveEndDate) {
            toast.error("Please specify both start and end dates.")
            return
        }
        setIsSubmittingLeave(true)
        try {
            const res = await applyForLeave(
                leaveStartDate,
                leaveEndDate,
                leaveReason
            )
            if (res.success) {
                toast.success("Leave request submitted successfully!")
                setLeaveModalOpen(false)
                setLeaveStartDate("")
                setLeaveEndDate("")
                setLeaveReason("")
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to submit leave request.")
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred.")
        } finally {
            setIsSubmittingLeave(false)
        }
    }



    // Handle homework photo upload selection & conversion to local preview
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedHomeworkFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleHomeworkSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedHomework) return

        setIsSubmitting(true)
        const uploadContext = {
            purpose: "homework_submission" as const,
            homeworkId: selectedHomework.id,
        }
        let uploadedFileKey: string | null = null
        try {
            let finalUrl = ""

            if (selectedHomeworkFile) {
                uploadedFileKey = await uploadFileDirectToR2(selectedHomeworkFile, uploadContext)
                finalUrl = uploadedFileKey
            }

            const result = await submitHomework(selectedHomework.id, finalUrl, submissionNotes)
            
            if (result.success) {
                toast.success("Homework worksheet submitted successfully! Your teacher will review it.")
                setSubmitModalOpen(false)
                setPhotoPreview(null)
                setSelectedHomeworkFile(null)
                setSubmissionNotes("")
                setSelectedHomework(null)
                window.location.reload()
            } else {
                if (uploadedFileKey) await deleteUploadedR2File(uploadedFileKey, uploadContext)
                toast.error(result.error || "Failed to submit work")
            }
        } catch (error: unknown) {
            if (uploadedFileKey) await deleteUploadedR2File(uploadedFileKey, uploadContext)
            toast.error(error instanceof Error ? error.message : "An unexpected error occurred while submitting homework")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleWorksheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedWorksheetFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setWorksheetPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleWorksheetSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!worksheetTitle || !selectedWorksheetFile) {
            toast.error("Please provide a title and select a file.")
            return
        }
        setIsSubmittingWorksheet(true)
        const uploadContext = { purpose: "student_material" as const }
        let uploadedFileKey: string | null = null
        try {
            uploadedFileKey = await uploadFileDirectToR2(selectedWorksheetFile, uploadContext)
            const result = await submitCompletedWorksheet(worksheetTitle, uploadedFileKey)
            if (result.success) {
                toast.success("Completed worksheet uploaded successfully!")
                setWorksheetModalOpen(false)
                setWorksheetTitle("")
                setWorksheetPreview(null)
                setSelectedWorksheetFile(null)
                window.location.reload()
            } else {
                await deleteUploadedR2File(uploadedFileKey, uploadContext)
                toast.error(result.error || "Failed to upload worksheet")
            }
        } catch (error: unknown) {
            if (uploadedFileKey) await deleteUploadedR2File(uploadedFileKey, uploadContext)
            toast.error(error instanceof Error ? error.message : "An unexpected error occurred while submitting worksheet")
        } finally {
            setIsSubmittingWorksheet(false)
        }
    }

    const handleStudyMaterialFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedStudyMaterialFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setStudyMaterialPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleStudyMaterialSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!studyMaterialTitle || !selectedStudyMaterialFile) {
            toast.error("Please provide a title and select a file.")
            return
        }
        setIsSubmittingStudyMaterial(true)
        const uploadContext = { purpose: "student_material" as const }
        let uploadedFileKey: string | null = null
        try {
            uploadedFileKey = await uploadFileDirectToR2(selectedStudyMaterialFile, uploadContext)
            const result = await uploadStudentStudyMaterial(studyMaterialTitle, uploadedFileKey)
            if (result.success) {
                toast.success("Study material uploaded successfully!")
                setStudyMaterialModalOpen(false)
                setStudyMaterialTitle("")
                setStudyMaterialPreview(null)
                setSelectedStudyMaterialFile(null)
                window.location.reload()
            } else {
                await deleteUploadedR2File(uploadedFileKey, uploadContext)
                toast.error(result.error || "Failed to upload study material")
            }
        } catch (error: unknown) {
            if (uploadedFileKey) await deleteUploadedR2File(uploadedFileKey, uploadContext)
            toast.error(error instanceof Error ? error.message : "An unexpected error occurred while uploading study material")
        } finally {
            setIsSubmittingStudyMaterial(false)
        }
    }

    // Static announcements list
    const announcements = [
        { id: "1", title: "📝 Worksheet Contest", text: "Submit your Hindi & English handwriting worksheets by Saturday to win stars!", date: "Today" },
        { id: "2", title: "📅 Summer Schedule Update", text: "Classes on Sunday are suspended for the upcoming holiday.", date: "2 days ago" },
        { id: "3", title: "✨ Stars leaderboard", text: "Awesome progress made by our primary school kids this month. Keep it up!", date: "5 days ago" }
    ]

    // Sort future classes
    const futureClassesList = allCalendarClasses.filter(c => isAfter(new Date(c.scheduled_at), new Date()))

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {/* CANCELLED CLASSES ALERTS */}
            {cancelledClasses.filter(c => !dismissedCancelledIds.includes(c.id)).length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/35 rounded-[2rem] p-6 md:p-8 flex items-start gap-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl shrink-0">
                        <AlertCircle className="animate-pulse" size={24} />
                    </div>
                    <div className="space-y-3 flex-1 text-left">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Class Cancellation Alerts</span>
                            <h4 className="font-bold text-lg text-indigo-950 dark:text-amber-100 mt-1">
                                Notice: Scheduled Classes Cancelled
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-normal italic">
                                The following scheduled class session(s) have been cancelled. Please review the details below.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-amber-500/10">
                            {cancelledClasses.filter(c => !dismissedCancelledIds.includes(c.id)).map((c) => (
                                <div key={c.id} className="p-4 bg-white dark:bg-card border border-amber-500/15 rounded-2xl flex items-center justify-between gap-4">
                                    <div>
                                        {(() => {
                                            const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                            return (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight text-xs">{displayTitle}</p>
                                                    {isCompensation && (
                                                        <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                            Comp
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                                            Tutor: {c.teacher?.full_name || 'N/A'}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground/60 mt-1">
                                            Scheduled was: {format(new Date(c.scheduled_at), 'MMM dd, hh:mm a')}
                                        </p>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => handleDismissCancelledClass(c.id)}
                                        className="h-8 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-bold uppercase text-[9px] tracking-wider"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Parent-Friendly Header Banner */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden group border border-indigo-500/30">
                <div className="absolute -right-20 -top-20 h-80 w-80 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 h-60 w-60 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
                            <Flame size={14} className="text-amber-400 animate-bounce" />
                            <span>Parent & Student Portal</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                            Hello, {studentName}!
                        </h1>
                        <p className="text-indigo-100 text-sm md:text-base opacity-95 leading-relaxed">
                            Welcome to your learning page! Here, parents can easily join daily live video sessions, download worksheets, check tuition status, and upload photos of children's homework.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shrink-0">
                        <GraduationCap size={40} className="text-indigo-200 animate-pulse" />
                        <div>
                            <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-200">Current Grade</span>
                            <span className="text-xl font-bold tracking-tight">{details?.grade_level || 'Primary Grade'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Grid (2 Columns: Main Workspace Left, Administrative/Schedules Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* LEFT COLUMN: Main Classroom & Assignment Feed */}
                <div className="lg:col-span-6 space-y-8">
                    
                    {/* TODAY'S CLASS SECTION */}
                    <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
                        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20 flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-50 flex items-center gap-2">
                                    <Video className="text-indigo-600 dark:text-indigo-400 animate-pulse" size={20} />
                                    <span>Today's Live Class</span>
                                </CardTitle>
                                <CardDescription className="text-xs">Your classroom portal link is ready below.</CardDescription>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full">
                                {format(new Date(), 'EEEE, MMM dd')}
                            </span>
                        </CardHeader>
                        <CardContent className="p-6">
                            {clientTodayClasses.length === 0 ? (
                                <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed border-muted">
                                    <Calendar size={36} className="mx-auto mb-2 text-muted-foreground opacity-30" />
                                    <p className="text-sm text-muted-foreground font-semibold italic">No live classes scheduled for today.</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">Please refer to the upcoming list or select dates in the calendar.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {clientTodayClasses.map((c) => (
                                        <div key={c.id} className="relative group overflow-hidden bg-muted/20 rounded-2xl p-6 border border-border/40 hover:border-indigo-500/20 transition-all">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-500/10">
                                                            Active Now
                                                        </span>
                                                         {(() => {
                                                             const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                             return (
                                                                 <div className="flex items-center gap-2 flex-wrap mt-2">
                                                                     <h3 className="text-2xl font-bold tracking-tight text-indigo-950 dark:text-indigo-50 leading-tight">{displayTitle}</h3>
                                                                     {isCompensation && (
                                                                         <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
                                                                             Compensation
                                                                         </Badge>
                                                                     )}
                                                                 </div>
                                                             );
                                                         })()}
                                                        <p className="text-xs text-muted-foreground font-medium mt-1">
                                                            Teacher: <span className="font-bold text-foreground">{c.teacher?.full_name || 'Assigned Teacher'}</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                                                        <Clock size={14} className="text-indigo-500" />
                                                        <span>Class Time: {format(new Date(c.scheduled_at), 'hh:mm a')}</span>
                                                    </div>
                                                </div>

                                                <a href={ensureAbsoluteUrl(c.meeting_link)} target="_blank" rel="noopener noreferrer" className="shrink-0 w-full sm:w-auto" onClick={() => logStudentJoinClass(c.id)}>
                                                    <Button className="w-full sm:w-auto h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                                                        <span>Join Class</span>
                                                        <Video size={16} />
                                                    </Button>
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* HOMEWORK FEED & PHOTO UPLOAD */}
                    <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
                        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20">
                            <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-50 flex items-center gap-2">
                                <ListTodo className="text-indigo-600 dark:text-indigo-400" size={20} />
                                <span>Homework Sheets</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Upload photos of Hindi, English, and Math worksheets directly below so your teacher can grade them.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {homework.length === 0 ? (
                                <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-muted text-muted-foreground italic text-sm">
                                    🎉 All homework worksheets submitted! Well done!
                                </div>
                            ) : (
                                homework.map(hw => (
                                    <div key={hw.id} className="p-5 rounded-2xl border border-border/30 bg-muted/5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-indigo-500/20 transition-all">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-base text-foreground">{hw.title}</span>
                                                <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none", 
                                                    hw.status === 'completed' 
                                                        ? 'bg-emerald-100 text-emerald-700' 
                                                        : hw.status === 'submitted'
                                                        ? 'bg-indigo-100 text-indigo-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                )}>
                                                    {hw.status}
                                                </Badge>
                                            </div>
                                            {renderHomeworkDescription(hw)}
                                            
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2">
                                                <span>Tutor: {hw.teacher?.full_name || 'Assigned Tutor'}</span>
                                                {hw.due_date && (
                                                    <span className="text-rose-500">Due: {format(new Date(hw.due_date), 'MMM dd, yyyy')}</span>
                                                )}
                                            </div>

                                            {/* Submissions feedback log if submitted/completed */}
                                            {hw.submission_notes && (
                                                <div className="mt-2 text-xs bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100/30">
                                                    <span className="block text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">Parent Upload Note:</span>
                                                    <p className="italic text-muted-foreground">"{hw.submission_notes}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {hw.status === 'assigned' ? (
                                            <Button 
                                                onClick={() => { setSelectedHomework(hw); setSubmitModalOpen(true); }}
                                                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-[11px] gap-2 px-5 shrink-0 shadow-md shadow-indigo-600/10 flex items-center justify-center"
                                            >
                                                <Camera size={15} />
                                                <span>Upload Homework Photo</span>
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider shrink-0 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                                                <Check size={14} />
                                                <span>Submitted</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* UPLOADED WORKSHEETS (Study Material Downloads) */}
                    <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
                        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20 flex flex-row items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-50 flex items-center gap-2">
                                    <FileText className="text-indigo-600 dark:text-indigo-400" size={20} />
                                    <span>Uploaded Worksheets</span>
                                </CardTitle>
                                <CardDescription className="text-xs">Download worksheet files or upload completed assignments.</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setStudyMaterialModalOpen(true)}
                                    className="h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold uppercase tracking-wider text-[10px] gap-1.5 shadow-md shadow-violet-600/20 flex items-center justify-center shrink-0"
                                >
                                    <Upload size={12} />
                                    <span>Upload Study Material</span>
                                </Button>
                                <Button
                                    onClick={() => setWorksheetModalOpen(true)}
                                    className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-[10px] gap-1.5 shadow-md shadow-indigo-600/20 flex items-center justify-center shrink-0"
                                >
                                    <Upload size={12} />
                                    <span>Upload Completed</span>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {materials.length === 0 ? (
                                <div className="py-6 text-center text-muted-foreground italic text-xs">
                                    No worksheets uploaded yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Shared Worksheets */}
                                    {materials.filter(m => !m.title.startsWith('[Submitted Worksheet]') && !m.title.startsWith('[Study Material]')).length > 0 && (
                                        <div className="space-y-2">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Teacher's Worksheets</span>
                                            {materials.filter(m => !m.title.startsWith('[Submitted Worksheet]') && !m.title.startsWith('[Study Material]')).map(mat => (
                                                <div key={mat.id} className="p-4 rounded-xl border border-border/30 bg-muted/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/10 transition-all">
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <p className="font-semibold text-sm text-foreground truncate">{mat.title}</p>
                                                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                            Uploaded: {format(new Date(mat.created_at), 'MMM dd, yyyy')} • By {mat.teacher?.full_name || 'Teacher'}
                                                        </p>
                                                    </div>
                                                    <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                                                        <Button className="h-9 px-4 rounded-lg border border-border/50 text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-background hover:bg-muted">
                                                            <Download size={12} />
                                                            <span>Download</span>
                                                        </Button>
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Student Submitted Worksheets */}
                                    {materials.filter(m => m.title.startsWith('[Submitted Worksheet]') || m.title.startsWith('[Study Material]')).length > 0 && (
                                        <div className="space-y-2 pt-2 border-t border-border/10">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Your Submitted Worksheets</span>
                                            {materials.filter(m => m.title.startsWith('[Submitted Worksheet]') || m.title.startsWith('[Study Material]')).map(mat => (
                                                <div key={mat.id} className="p-4 rounded-xl border border-border/30 bg-muted/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/10 transition-all">
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <p className="font-semibold text-sm text-foreground truncate">{mat.title}</p>
                                                        <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                                                            Submitted: {format(new Date(mat.created_at), 'MMM dd, yyyy')}
                                                        </p>
                                                    </div>
                                                    <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                                                        <Button className="h-9 px-4 rounded-lg border border-border/50 text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-background hover:bg-muted">
                                                            <Download size={12} />
                                                            <span>View File</span>
                                                        </Button>
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* RIGHT COLUMN: Administrative, Performance, & Schedules Feed */}
                <div className="lg:col-span-6 space-y-8">
                    
                    {/* TUITION & PAYMENT STATUS */}
                    <Card className={cn(
                        "rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 relative transition-all",
                        showLimitReachedAlert 
                            ? "border-rose-500/60 dark:border-rose-500/40" 
                            : showOneRemainingReminder 
                            ? "border-amber-500/60 dark:border-amber-500/40" 
                            : "border-emerald-600/10"
                    )}>
                        <div className="absolute right-4 top-4 opacity-5 pointer-events-none text-emerald-600">
                            <CreditCard size={80} />
                        </div>
                        <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/10 px-6 py-5 border-b border-border/20">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <CreditCard size={18} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Tuition & Payout Hub</span>
                            </CardTitle>
                            <CardDescription className="text-xs">Ledger status & billing records.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Fee</span>
                                    <span className="text-3xl font-extrabold text-foreground">₹{feeAmount.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Status</span>
                                    <Badge className={cn("uppercase tracking-widest text-[9px] font-black border-none px-3 py-1.5 mt-1 rounded-full",
                                        details?.status === 'active' 
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                    )}>
                                        {details?.status === 'active' ? (
                                            <>
                                                <Check size={10} className="mr-1 inline-block" /> Paid & Active
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={10} className="mr-1 inline-block" /> Pending Renewal
                                            </>
                                        )}
                                    </Badge>
                                </div>
                            </div>

                            {/* Monthly Class Usage & Progress for each subject */}
                            <div className="space-y-4 pt-2 border-t border-border/10">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Enrolled Subjects</span>
                                {subjectCompletions.map((sub, idx) => {
                                    const subProgressPercent = sub.classesPerMonth > 0 
                                        ? Math.min(100, Math.round((sub.completed / sub.classesPerMonth) * 100))
                                        : 0;
                                    const isSubLimitReached = sub.completed >= sub.classesPerMonth && sub.classesPerMonth > 0;
                                    
                                    return (
                                        <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-muted/20 border border-border/5">
                                            <div className="flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-foreground">{sub.name}</span>
                                                    <span className="block text-[9px] text-muted-foreground font-semibold">Tutor: {sub.tutor} (₹{sub.fee})</span>
                                                </div>
                                                <span className="font-extrabold text-[11px] text-foreground">{sub.completed} / {sub.classesPerMonth} classes</span>
                                            </div>
                                            <div className="w-full bg-muted dark:bg-muted/30 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full rounded-full transition-all duration-500", 
                                                        isSubLimitReached
                                                            ? "bg-rose-500" 
                                                            : sub.completed === sub.classesPerMonth - 1
                                                            ? "bg-amber-500" 
                                                            : "bg-indigo-600"
                                                    )}
                                                    style={{ width: `${subProgressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                {showLimitReachedAlert && (
                                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs space-y-1 mt-2 animate-in fade-in duration-300">
                                        <p className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                                            <AlertCircle size={14} className="animate-pulse shrink-0" />
                                            <span>Payment Alert</span>
                                        </p>
                                        <p className="text-[11px] leading-normal font-medium">
                                            You have completed all classes for one or more of your active billing cycles. Please renew your subscription to continue scheduling classes.
                                        </p>
                                    </div>
                                )}

                                {showOneRemainingReminder && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs space-y-1 mt-2 animate-in fade-in duration-300">
                                        <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>Subscription Reminder</span>
                                        </p>
                                        <p className="text-[11px] leading-normal font-medium">
                                            Only 1 class remaining in your limit for an active subject package. Please plan your next payment cycle.
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <Button 
                                onClick={() => setPaymentModalOpen(true)}
                                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 mt-3"
                            >
                                <CreditCard size={14} />
                                <span>Pay Tuition / Renew</span>
                            </Button>

                            {/* Payment Ledger / History */}
                            <div className="pt-4 border-t border-border/10 space-y-2.5">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Payments</span>
                                {payments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic text-center py-2">No payments recorded.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                        {payments.map((p) => (
                                            <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20 border border-border/20">
                                                <div className="space-y-0.5">
                                                    <span className="font-bold block text-foreground">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                                        Cycle: {p.billing_month}/{p.billing_year} • {p.payment_method === 'razorpay' ? 'Razorpay' : 'UPI'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={cn("text-[8px] font-black uppercase px-2 py-0.5 border-none",
                                                        p.status === 'completed' 
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                            : p.status === 'pending'
                                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                                                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400"
                                                    )}>
                                                        {p.status}
                                                    </Badge>
                                                    {p.status === 'completed' && (
                                                        <Link href={`/payments/receipt/${p.id}`}>
                                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 border border-indigo-500/10 rounded-md">
                                                                Receipt
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* CLASS ADJUSTMENTS (RESCHEDULE & LEAVE) */}
                    <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
                        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
                                <span>Class Adjustments</span>
                            </CardTitle>
                            <CardDescription className="text-xs">Submit or view leave and reschedule requests.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    onClick={() => setRescheduleModalOpen(true)}
                                    className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-[10px] gap-2 shadow-md shadow-indigo-600/10 flex items-center justify-center"
                                >
                                    <Calendar size={14} />
                                    <span>Reschedule Class</span>
                                </Button>
                                <Button 
                                    onClick={() => setLeaveModalOpen(true)}
                                    className="h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold uppercase tracking-wider text-[10px] gap-2 shadow-md shadow-violet-600/10 flex items-center justify-center"
                                >
                                    <Clock size={14} />
                                    <span>Apply for Leave</span>
                                </Button>
                            </div>

                            {/* List of Requests */}
                            <div className="space-y-3 pt-3 border-t border-border/10 max-h-[300px] overflow-y-auto">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Active Requests & History</span>
                                
                                {rescheduleRequests.length === 0 && leaveRequests.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic text-center py-4">No leave or reschedule requests logged.</p>
                                ) : (
                                    <>
                                        {/* Leave Requests */}
                                        {leaveRequests.map(leave => (
                                            <div key={leave.id} className="p-3.5 rounded-xl border border-border/30 bg-muted/5 text-xs space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest text-[8px] bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded border border-violet-500/10 inline-block mb-1">Leave Request</span>
                                                        <p className="font-semibold text-foreground">
                                                            {format(new Date(leave.start_date + 'T00:00:00'), 'MMM dd')} - {format(new Date(leave.end_date + 'T00:00:00'), 'MMM dd, yyyy')}
                                                        </p>
                                                    </div>
                                                    <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-none rounded-full",
                                                        leave.status === 'approved' 
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                            : leave.status === 'rejected'
                                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                                    )}>
                                                        {leave.status}
                                                    </Badge>
                                                </div>
                                                {leave.reason && (
                                                    <p className="text-muted-foreground italic text-[11px] leading-relaxed">"{leave.reason}"</p>
                                                )}
                                                {leave.teacher?.full_name && (
                                                    <p className="text-[10px] text-muted-foreground/60 font-semibold mt-1">Notified: {leave.teacher.full_name}</p>
                                                )}
                                            </div>
                                        ))}

                                        {/* Reschedule Requests */}
                                        {rescheduleRequests.map(req => (
                                            <div key={req.id} className="p-3.5 rounded-xl border border-border/30 bg-muted/5 text-xs space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[8px] bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/10 inline-block mb-1">Reschedule Request</span>
                                                         <div className="font-semibold text-foreground">
                                                             {(() => {
                                                                 const { title: displayTitle, isCompensation } = formatClassTitle(req.class?.title || 'Study Class');
                                                                 return (
                                                                     <div className="flex items-center gap-2 flex-wrap">
                                                                         <span>For: {displayTitle}</span>
                                                                         {isCompensation && (
                                                                             <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                                 Comp
                                                                             </Badge>
                                                                         )}
                                                                     </div>
                                                                 );
                                                             })()}
                                                         </div>
                                                        <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px] mt-0.5">
                                                            Proposed: {format(new Date(req.requested_date + 'T00:00:00'), 'MMM dd, yyyy')} @ {formatTime12Hour(req.requested_time)}
                                                        </p>
                                                    </div>
                                                    <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-none rounded-full",
                                                        req.status === 'approved' 
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                                            : req.status === 'rejected'
                                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:rose-400'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                                    )}>
                                                        {req.status}
                                                    </Badge>
                                                </div>
                                                {req.reason && (
                                                    <p className="text-muted-foreground italic text-[11px] leading-relaxed">Reason: "{req.reason}"</p>
                                                )}
                                                {req.teacher?.full_name && (
                                                    <p className="text-[10px] text-muted-foreground/60 font-semibold mt-1">Tutor: {req.teacher.full_name}</p>
                                                )}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* UPCOMING CLASSES FEED */}
                    <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
                        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600" />
                                <span>Upcoming Classes Feed</span>
                            </CardTitle>
                            <CardDescription className="text-xs">Schedule overview of next few classes.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3 max-h-[300px] overflow-y-auto">
                            {futureClassesList.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic text-center py-4">No upcoming classes scheduled.</p>
                            ) : (
                                futureClassesList.map(c => (
                                    <div key={c.id} className="p-3.5 rounded-xl border border-border/30 bg-muted/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                        <div>
                                             {(() => {
                                                 const { title: displayTitle, isCompensation } = formatClassTitle(c.title);
                                                 return (
                                                     <div className="flex items-center gap-2 flex-wrap">
                                                         <p className="font-bold text-foreground">{displayTitle}</p>
                                                         {isCompensation && (
                                                             <Badge className="bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded-full scale-90">
                                                                 Comp
                                                             </Badge>
                                                         )}
                                                     </div>
                                                 );
                                             })()}
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Tutor: {c.teacher?.full_name}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="block text-[10px] font-bold text-indigo-600">{format(new Date(c.scheduled_at), 'MMM dd')}</span>
                                            <span className="block text-[9px] text-muted-foreground/60 mt-0.5">{format(new Date(c.scheduled_at), 'hh:mm a')}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* SCHOOL ANNOUNCEMENTS */}
                    <Card className="rounded-[2rem] border-border/40 shadow-xl overflow-hidden bg-card border-2 border-indigo-600/10">
                        <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 px-6 py-5 border-b border-border/20">
                            <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-50 flex items-center gap-2">
                                <Megaphone className="text-amber-500" size={20} />
                                <span>Announcements</span>
                            </CardTitle>
                            <CardDescription className="text-xs">Official school notices and important updates.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {announcements.map(ann => (
                                <div key={ann.id} className="text-sm space-y-1 pb-3.5 border-b border-border/10 last:border-b-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-indigo-950 dark:text-indigo-200">{ann.title}</span>
                                        <span className="text-[10px] text-muted-foreground/60 font-semibold">{ann.date}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{ann.text}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                </div>

            </div>

            {/* FULL MONTHLY CLASS LOGS CALENDAR */}
            {currentUserProfile && (
                <div className="pt-10 border-t border-border/20 text-left">
                    <div className="mb-6">
                        <h2 className="text-2xl font-serif font-bold italic text-indigo-950 dark:text-indigo-50">Monthly Attendance & Class Logs</h2>
                        <p className="text-xs text-muted-foreground italic mt-1">Review all your completed session logs, teacher feedback, and attendance records on the interactive calendar below.</p>
                    </div>
                    <ClassLogsCalendarClient 
                        currentUserProfile={currentUserProfile}
                        allTeachers={[]}
                        allStudents={[]}
                    />
                </div>
            )}

            {/* SUBMIT HOMEWORK PHOTO DIALOG (Radix Dialog Portal) */}
            <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <DialogHeader className="mb-6 relative z-10 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Sparkles className="text-indigo-500" size={20} />
                            <span>Submit Homework Photo</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Parents, select your child's completed Hindi, English or Math homework worksheet photo.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleHomeworkSubmit} className="space-y-5 relative z-10 text-left">
                        
                        {/* Homework photo select */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload Homework Photo *</Label>
                            
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted/50 rounded-xl p-6 bg-muted/5 hover:bg-muted/10 transition-colors relative group">
                                <input 
                                    type="file" 
                                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                                    onChange={handlePhotoChange} 
                                    required={!photoPreview}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                
                                {photoPreview ? (
                                    <div className="space-y-3 text-center">
                                        <div className="relative mx-auto h-28 w-28 rounded-xl overflow-hidden border-2 border-indigo-500/30 flex items-center justify-center bg-muted">
                                            {selectedHomeworkFile?.type.includes("pdf") ? (
                                                <div className="h-full w-full flex items-center justify-center bg-rose-50 text-rose-500 font-bold text-xs">PDF Document</div>
                                            ) : selectedHomeworkFile?.type.includes("word") || selectedHomeworkFile?.name.endsWith(".doc") || selectedHomeworkFile?.name.endsWith(".docx") ? (
                                                <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-500 font-bold text-xs">Word Document</div>
                                            ) : (
                                                <img src={photoPreview} alt="Worksheet preview" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                            <Check size={12} /> File selected: {selectedHomeworkFile?.name}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                                            <Camera size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Click to upload worksheet</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Supports Images, PDFs, Word docs</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submission notes */}
                        <div className="space-y-2">
                            <Label htmlFor="subNotes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Parent Remarks / Submission Notes</Label>
                            <Textarea 
                                id="subNotes" 
                                placeholder="Optional notes (e.g. Hindi workbook page 1 completed)" 
                                value={submissionNotes}
                                onChange={(e) => setSubmissionNotes(e.target.value)}
                                rows={3}
                                className="rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-sm" 
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setSubmitModalOpen(false); setPhotoPreview(null); setSelectedHomeworkFile(null); }}
                                className="h-11 px-6 rounded-lg font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-11 px-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                            >
                                {isSubmitting ? "Uploading..." : "Submit Homework Photo"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            {/* REQUEST RESCHEDULE DIALOG */}
            <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <DialogHeader className="mb-6 relative z-10 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Calendar className="text-indigo-500" size={20} />
                            <span>Request Class Reschedule</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Select the class you wish to reschedule, and propose a new date and time.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRescheduleSubmit} className="space-y-5 relative z-10 text-left text-xs">
                        
                        {/* Select Class */}
                        <div className="space-y-2">
                            <Label htmlFor="reschedule-class" className="font-bold uppercase tracking-wider text-muted-foreground">Select Upcoming Class *</Label>
                            <select 
                                id="reschedule-class" 
                                value={rescheduleClassId} 
                                onChange={(e) => setRescheduleClassId(e.target.value)}
                                className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background font-semibold"
                                required
                            >
                                <option value="" disabled>-- Choose a class --</option>
                                <option value="any">General Request (Not class-specific)</option>
                                {futureClassesList.map(c => {
                                     const { title: displayTitle } = formatClassTitle(c.title);
                                     return (
                                         <option key={c.id} value={c.id}>
                                             {displayTitle} ({format(new Date(c.scheduled_at), 'MMM dd @ hh:mm a')})
                                         </option>
                                     );
                                 })}
                            </select>
                        </div>

                        {/* Proposed Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="reschedule-date" className="font-bold uppercase tracking-wider text-muted-foreground">Proposed Date *</Label>
                                <input 
                                    id="reschedule-date"
                                    type="date"
                                    required
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reschedule-time" className="font-bold uppercase tracking-wider text-muted-foreground">Proposed Time *</Label>
                                <input 
                                    id="reschedule-time"
                                    type="time"
                                    required
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="reschedule-reason" className="font-bold uppercase tracking-wider text-muted-foreground">Reason for Rescheduling</Label>
                            <Textarea 
                                id="reschedule-reason" 
                                placeholder="Explain why you need to reschedule (e.g., family travel, school exam)" 
                                value={rescheduleReason}
                                onChange={(e) => setRescheduleReason(e.target.value)}
                                rows={3}
                                className="rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-sm" 
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setRescheduleModalOpen(false); }}
                                className="h-11 px-6 rounded-lg font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingReschedule}
                                className="h-11 px-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                            >
                                {isSubmittingReschedule ? "Submitting..." : "Submit Request"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* APPLY FOR LEAVE DIALOG */}
            <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <DialogHeader className="mb-6 relative z-10 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Clock className="text-violet-500" size={20} />
                            <span>Apply for Leave</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Parents can submit leave requests for single or multi-day absences.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleLeaveSubmit} className="space-y-5 relative z-10 text-left text-xs">
                        
                        {/* Start Date & End Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="leave-start" className="font-bold uppercase tracking-wider text-muted-foreground">Start Date *</Label>
                                <input 
                                    id="leave-start"
                                    type="date"
                                    required
                                    value={leaveStartDate}
                                    onChange={(e) => setLeaveStartDate(e.target.value)}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="leave-end" className="font-bold uppercase tracking-wider text-muted-foreground">End Date *</Label>
                                <input 
                                    id="leave-end"
                                    type="date"
                                    required
                                    value={leaveEndDate}
                                    onChange={(e) => setLeaveEndDate(e.target.value)}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="leave-reason" className="font-bold uppercase tracking-wider text-muted-foreground">Reason for Leave *</Label>
                            <Textarea 
                                id="leave-reason" 
                                placeholder="Please explain the reason (e.g. sickness, summer vacation)" 
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                rows={3}
                                className="rounded-xl border border-muted/50 focus-visible:ring-indigo-500 text-sm" 
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setLeaveModalOpen(false); }}
                                className="h-11 px-6 rounded-lg font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingLeave}
                                className="h-11 px-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-violet-600/20 flex items-center gap-2"
                            >
                                {isSubmittingLeave ? "Submitting..." : "Submit Leave Request"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* UPLOAD WORKSHEET DIALOG */}
            <Dialog open={worksheetModalOpen} onOpenChange={setWorksheetModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <DialogHeader className="mb-6 relative z-10 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Upload className="text-indigo-500" size={20} />
                            <span>Upload Completed Worksheet</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Upload your completed worksheet here for grading and review.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleWorksheetSubmit} className="space-y-5 relative z-10 text-left">
                        {/* Title of worksheet */}
                        <div className="space-y-2">
                            <Label htmlFor="worksheet-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Worksheet Name / Title *</Label>
                            <input 
                                id="worksheet-title"
                                type="text"
                                required
                                placeholder="E.g. Hindi Handwriting Page 4"
                                value={worksheetTitle}
                                onChange={(e) => setWorksheetTitle(e.target.value)}
                                className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-sm px-3 w-full bg-background"
                            />
                        </div>

                        {/* File upload selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload Worksheet File *</Label>
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted/50 rounded-xl p-6 bg-muted/5 hover:bg-muted/10 transition-colors relative group">
                                <input 
                                    type="file" 
                                    accept="image/*,application/pdf" 
                                    onChange={handleWorksheetFileChange} 
                                    required={!worksheetPreview}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                
                                {worksheetPreview ? (
                                    <div className="space-y-3 text-center">
                                        <div className="relative mx-auto h-28 w-28 rounded-xl overflow-hidden border-2 border-indigo-500/30 flex items-center justify-center bg-muted">
                                            {selectedWorksheetFile?.type.includes("pdf") ? (
                                                <div className="h-full w-full flex items-center justify-center bg-rose-50 text-rose-500 font-bold text-xs">PDF Document</div>
                                            ) : selectedWorksheetFile?.type.includes("word") || selectedWorksheetFile?.name.endsWith(".doc") || selectedWorksheetFile?.name.endsWith(".docx") ? (
                                                <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-500 font-bold text-xs">Word Document</div>
                                            ) : (
                                                <img src={worksheetPreview} alt="Worksheet preview" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                            <Check size={12} /> File selected: {selectedWorksheetFile?.name}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                                            <Upload size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Click to upload worksheet</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Supports PNG, JPG, JPEG, PDF, Word files</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setWorksheetModalOpen(false); setWorksheetPreview(null); setWorksheetTitle(""); setSelectedWorksheetFile(null); }}
                                className="h-11 px-6 rounded-lg font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingWorksheet}
                                className="h-11 px-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                            >
                                {isSubmittingWorksheet ? "Uploading..." : "Upload Worksheet"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* TUITION PAYMENT DIALOG */}
            <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                <DialogContent className="sm:max-w-[500px] w-[92vw] max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 md:p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <DialogHeader className="mb-4 relative z-10 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <CreditCard className="text-indigo-500" size={20} />
                            <span>Pay Tuition Fees</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Renew your monthly tuition subscription securely.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 relative z-10 text-left">
                        {/* Month and Year Select */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="billing-month" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Billing Month *</Label>
                                <select 
                                    id="billing-month"
                                    value={billingMonth}
                                    onChange={(e) => setBillingMonth(Number(e.target.value))}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>
                                            {format(new Date(2026, m - 1, 1), 'MMMM')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="billing-year" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Billing Year *</Label>
                                <select 
                                    id="billing-year"
                                    value={billingYear}
                                    onChange={(e) => setBillingYear(Number(e.target.value))}
                                    className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-xs px-3 w-full bg-background"
                                >
                                    <option value={currentYear}>{currentYear}</option>
                                    <option value={currentYear + 1}>{currentYear + 1}</option>
                                </select>
                            </div>
                        </div>

                        {/* Amount display */}
                        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/10 flex items-center justify-between">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Fee Due</span>
                                <span className="text-xs text-muted-foreground">Includes all classes for the cycle</span>
                            </div>
                             <span className="text-2xl font-black text-indigo-950 dark:text-indigo-50">₹{feeAmount.toLocaleString('en-IN')}</span>
                        </div>

                        {/* QR Code details */}
                        <div className="space-y-3 pt-1">
                            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-border/30 shadow-sm max-w-[200px] mx-auto">
                                <img 
                                    src="/images/payment-qr.jpg"
                                    alt="UPI QR Code"
                                    className="h-40 w-auto object-contain rounded-lg"
                                />
                                <span className="text-[9px] font-bold text-zinc-500 mt-2 uppercase tracking-wider">UPI ID: 7907026187@pthdfc</span>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-xs font-bold text-foreground">Scan with GPay, PhonePe, or any UPI App</p>
                                <p className="text-[11px] text-muted-foreground font-semibold">or pay directly using the upi number 7907026187</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-500/10 text-center space-y-1">
                                <p className="text-[11px] font-medium leading-relaxed text-amber-800 dark:text-amber-300">
                                    After making the payment, kindly share the payment screenshot in the Whatsapp group for verification and fee confirmation. Thankyou.
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setPaymentModalOpen(false); setUtrNumber(""); }}
                                className="h-11 px-6 rounded-lg font-bold text-xs"
                                disabled={isProcessingPayment}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpiPaymentSubmit}
                                disabled={isProcessingPayment}
                                className="h-11 px-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                            >
                                {isProcessingPayment ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} />
                                        <span>I Have Sent Screenshot</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* UPLOAD STUDY MATERIAL DIALOG */}
            <Dialog open={studyMaterialModalOpen} onOpenChange={setStudyMaterialModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <DialogHeader className="mb-6 relative z-10 text-left">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Upload className="text-violet-500" size={20} />
                            <span>Upload Study Material</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Upload document/worksheet study materials to share with your tutor.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleStudyMaterialSubmit} className="space-y-5 relative z-10 text-left">
                        {/* Title of study material */}
                        <div className="space-y-2">
                            <Label htmlFor="study-material-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Study Material Name / Title *</Label>
                            <input 
                                id="study-material-title"
                                type="text"
                                required
                                placeholder="E.g. Hindi Grammar Notes"
                                value={studyMaterialTitle}
                                onChange={(e) => setStudyMaterialTitle(e.target.value)}
                                className="rounded-xl h-10 border border-muted/50 focus-visible:ring-indigo-500 text-sm px-3 w-full bg-background"
                            />
                        </div>

                        {/* File upload selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload File *</Label>
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted/50 rounded-xl p-6 bg-muted/5 hover:bg-muted/10 transition-colors relative group">
                                <input 
                                    type="file" 
                                    accept="image/*,application/pdf" 
                                    onChange={handleStudyMaterialFileChange} 
                                    required={!studyMaterialPreview}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                
                                {studyMaterialPreview ? (
                                    <div className="space-y-3 text-center">
                                        <div className="relative mx-auto h-28 w-28 rounded-xl overflow-hidden border-2 border-indigo-500/30 flex items-center justify-center bg-muted">
                                            {selectedStudyMaterialFile?.type.includes("pdf") ? (
                                                <div className="h-full w-full flex items-center justify-center bg-rose-50 text-rose-500 font-bold text-xs">PDF Document</div>
                                            ) : selectedStudyMaterialFile?.type.includes("word") || selectedStudyMaterialFile?.name.endsWith(".doc") || selectedStudyMaterialFile?.name.endsWith(".docx") ? (
                                                <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-500 font-bold text-xs">Word Document</div>
                                            ) : (
                                                <img src={studyMaterialPreview} alt="Study material preview" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                            <Check size={12} /> File selected: {selectedStudyMaterialFile?.name}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <div className="h-10 w-10 bg-violet-50 rounded-full flex items-center justify-center mx-auto text-violet-500">
                                            <Upload size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Click to upload document/image</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Supports PNG, JPG, JPEG, PDF, Word files</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setStudyMaterialModalOpen(false); setStudyMaterialPreview(null); setStudyMaterialTitle(""); setSelectedStudyMaterialFile(null); }}
                                className="h-11 px-6 rounded-lg font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingStudyMaterial}
                                className="h-11 px-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-violet-600/20 flex items-center gap-2"
                            >
                                {isSubmittingStudyMaterial ? "Uploading..." : "Upload Material"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    )
}
