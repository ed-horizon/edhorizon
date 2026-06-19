'use client'

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    CreditCard, ArrowLeft, Loader2, Share2, Plus, 
    Check, X, ClipboardList, RefreshCw, Sparkles, LogOut, Search
} from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPendingPayments, processPaymentApproval, recordManualPayment, getAllPayments } from "@/app/(dashboard)/payments/actions";
import { getStudentsWithClasses } from "@/app/(dashboard)/attendance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FeeLedgerPage() {
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [allPayments, setAllPayments] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Manual Payment States
    const [showManualPayment, setShowManualPayment] = useState(false);
    const [manualStudentId, setManualStudentId] = useState("");
    const [manualAmount, setManualAmount] = useState("");
    const [manualMonth, setManualMonth] = useState(new Date().getMonth() + 1);
    const [manualYear, setManualYear] = useState(new Date().getFullYear());
    const [manualMethod, setManualMethod] = useState<'bank_transfer' | 'cash' | 'other'>('bank_transfer');
    const [manualTxnId, setManualTxnId] = useState("");
    const [isSavingManualPayment, setIsSavingManualPayment] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [fetchedPayments, fetchedAllPayments, fetchedStudents] = await Promise.all([
                getPendingPayments(),
                getAllPayments(),
                getStudentsWithClasses()
            ]);
            setPendingPayments(fetchedPayments || []);
            setAllPayments(fetchedAllPayments || []);
            setStudents(fetchedStudents || []);
        } catch (error) {
            console.error("Failed to load fees ledger data:", error);
            toast.error("Failed to load payments info");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleApprovePayment = async (paymentId: string) => {
        setIsLoading(true);
        try {
            const res = await processPaymentApproval(paymentId, 'completed');
            if (res.success) {
                toast.success(
                    <div className="flex flex-col gap-1 text-left">
                        <span className="font-bold text-foreground">Payment approved successfully!</span>
                        <span className="text-muted-foreground text-[10px] font-mono">Receipt No: {res.receiptNumber}</span>
                        <a 
                            href={`/payments/receipt/${paymentId}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                            View / Print Receipt
                        </a>
                    </div>
                );
                try {
                    window.open(`/payments/receipt/${paymentId}`, '_blank');
                } catch (e) {
                    console.error("Popup blocked:", e);
                }
                await loadData();
            } else {
                toast.error(res.error || "Failed to approve payment.");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectPayment = async (paymentId: string) => {
        setIsLoading(true);
        try {
            const res = await processPaymentApproval(paymentId, 'failed');
            if (res.success) {
                toast.success("Payment request marked as failed/rejected.");
                await loadData();
            } else {
                toast.error(res.error || "Failed to reject payment.");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualStudentChange = (studentId: string) => {
        setManualStudentId(studentId);
        const selectedStudent = students.find(s => s.id === studentId);
        if (selectedStudent) {
            const details = Array.isArray(selectedStudent.student_details)
                ? selectedStudent.student_details[0]
                : selectedStudent.student_details;
            if (details?.monthly_fee) {
                setManualAmount(String(details.monthly_fee));
            } else {
                setManualAmount("4500");
            }
        }
    };

    const handleRecordManualPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualStudentId || !manualAmount) {
            toast.error("Please select a student and enter amount.");
            return;
        }
        setIsSavingManualPayment(true);
        try {
            const res = await recordManualPayment({
                studentId: manualStudentId,
                amount: Number(manualAmount),
                month: manualMonth,
                year: manualYear,
                method: manualMethod,
                transactionId: manualTxnId
            });
            if (res.success) {
                const newPaymentId = res.payment?.id;
                toast.success(
                    <div className="flex flex-col gap-1 text-left">
                        <span className="font-bold text-foreground">Manual payment recorded!</span>
                        {res.payment?.receipt_number && (
                            <span className="text-muted-foreground text-[10px] font-mono">Receipt No: {res.payment.receipt_number}</span>
                        )}
                        {newPaymentId && (
                            <a 
                                href={`/payments/receipt/${newPaymentId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                                View / Print Receipt
                            </a>
                        )}
                    </div>
                );
                if (newPaymentId) {
                    try {
                        window.open(`/payments/receipt/${newPaymentId}`, '_blank');
                    } catch (e) {
                        console.error("Popup blocked:", e);
                    }
                }
                setShowManualPayment(false);
                setManualStudentId("");
                setManualAmount("");
                setManualTxnId("");
                await loadData();
            } else {
                toast.error(res.error || "Failed to record manual payment.");
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred.");
        } finally {
            setIsSavingManualPayment(false);
        }
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-left">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/10 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/operations">
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-full shadow-sm hover:scale-105 transition-transform">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/10">
                            <CreditCard size={12} />
                            <span>Tuition Payments Desk</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mt-1">
                            Fees Receipts Ledger
                        </h1>
                        <p className="text-xs text-muted-foreground italic font-medium">
                            Verify incoming UPI transactions, record manual fees, and audit historical receipt generation.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button 
                        onClick={() => setShowManualPayment(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md h-10 text-xs font-bold"
                    >
                        <Plus className="h-4 w-4" />
                        Record Manual Payment
                    </Button>
                    <ThemeToggle />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="text-indigo-600 animate-spin mr-2" size={24} />
                    <span className="text-xs font-black uppercase text-indigo-600/50">Fetching payment records...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Tuition Fees Approvals Queue (5 Cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        <Card className="rounded-[2.5rem] border border-border/40 shadow-xl bg-card overflow-hidden">
                            <CardHeader className="bg-indigo-600/10 border-b border-border/10 p-6">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <CreditCard size={18} className="text-indigo-600" />
                                    <span>Tuition Fees Approvals Queue</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Verify and approve pending UPI/Manual QR payment submissions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                                {pendingPayments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic text-center py-10">
                                        No pending payment verifications.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingPayments.map((payment) => (
                                            <div key={payment.id} className="p-4 border border-indigo-500/20 rounded-2xl bg-indigo-50/5 dark:bg-indigo-950/5 text-xs space-y-2.5">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[8px] bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/10 inline-block mb-1">
                                                            UPI Payment Request
                                                        </span>
                                                        <p className="font-bold text-foreground">
                                                            {payment.student?.full_name || 'Student'}
                                                        </p>
                                                        <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
                                                            Cycle: {payment.billing_month}/{payment.billing_year}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-black text-indigo-600">
                                                        ₹{Number(payment.amount).toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                                
                                                <div className="p-2.5 rounded-xl bg-muted/40 font-mono text-[10px] text-muted-foreground flex justify-between items-center">
                                                    <span>UTR: {payment.transaction_id || 'N/A'}</span>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-5 w-5 rounded-md hover:bg-muted text-muted-foreground"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(payment.transaction_id || '');
                                                            toast.success("UTR copied!");
                                                        }}
                                                    >
                                                        <Share2 size={10} />
                                                    </Button>
                                                </div>

                                                <div className="flex justify-end gap-2 pt-1">
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleRejectPayment(payment.id)}
                                                        variant="ghost"
                                                        className="h-8 border border-rose-500/20 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase tracking-wider px-3"
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleApprovePayment(payment.id)}
                                                        className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 shadow-md shadow-indigo-600/10"
                                                    >
                                                        Approve & Activate
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Fees Receipts Ledger (7 Cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="rounded-[2.5rem] border border-border/40 shadow-xl bg-card overflow-hidden">
                            <CardHeader className="bg-indigo-600/10 border-b border-border/10 p-6">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <ClipboardList size={18} className="text-indigo-600" />
                                    <span>Fees Receipts Ledger</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    View recent payment records and access auto-generated receipts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                                {/* Search and Filter */}
                                {(() => {
                                    const filteredPayments = allPayments.filter((p) => {
                                        const matchesSearch = searchQuery.trim() === "" || (
                                            (p.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                            (p.student?.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                            (p.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                            (p.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                            (p.payment_method?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                            (`${p.billing_month}/${p.billing_year}`.includes(searchQuery))
                                        );

                                        if (searchQuery.trim() === "") {
                                            if (!p.created_at) return false;
                                            const pDate = new Date(p.created_at);
                                            const now = new Date();
                                            const pMidnight = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate()).getTime();
                                            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                            const diffDays = (todayMidnight - pMidnight) / (24 * 60 * 60 * 1000);
                                            return diffDays <= 1; // today or yesterday
                                        }

                                        return matchesSearch;
                                    });

                                    return (
                                        <>
                                            <div className="space-y-1">
                                                <div className="relative">
                                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                                                    <Input
                                                        placeholder="Search by student name, email, receipt number, UTR..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="h-10 rounded-xl bg-muted/40 border-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 pl-10 pr-10 text-xs"
                                                    />
                                                    {searchQuery && (
                                                        <button 
                                                            onClick={() => setSearchQuery("")} 
                                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground italic pl-1">
                                                    {searchQuery.trim() === "" 
                                                        ? "Showing today's and yesterday's receipts. Search to view older records." 
                                                        : `Found ${filteredPayments.length} matching records.`}
                                                </p>
                                            </div>

                                            {filteredPayments.length === 0 ? (
                                                <div className="text-center py-10 space-y-2">
                                                    <p className="text-xs text-muted-foreground italic">
                                                        No payment records found.
                                                    </p>
                                                    {searchQuery.trim() === "" && (
                                                        <p className="text-[10px] text-muted-foreground/60 italic">
                                                            Try searching in the input above to access older historical receipts.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {filteredPayments.map((p) => (
                                            <div key={p.id} className="p-4 border border-border/60 rounded-2xl bg-card text-xs flex items-center justify-between gap-4 hover:border-indigo-500/20 transition-colors">
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-foreground">
                                                            {p.student?.full_name || 'Student'}
                                                        </span>
                                                        <Badge className={cn("text-[8px] font-black uppercase px-2 py-0.5 border-none rounded-full",
                                                            p.status === 'completed' 
                                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                : p.status === 'pending'
                                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                                                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400"
                                                        )}>
                                                            {p.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground font-semibold">
                                                        Cycle: {p.billing_month}/{p.billing_year} • {p.payment_method === 'razorpay' ? 'Razorpay' : p.payment_method === 'upi_qr' ? 'UPI QR' : p.payment_method.replace('_', ' ').toUpperCase()}
                                                    </p>
                                                    {p.receipt_number && (
                                                        <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                                                            Receipt: {p.receipt_number}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                                                    <span className="font-black text-sm text-foreground">
                                                        ₹{Number(p.amount).toLocaleString('en-IN')}
                                                    </span>
                                                    {p.status === 'completed' && (
                                                        <a href={`/payments/receipt/${p.id}`} target="_blank" rel="noopener noreferrer">
                                                            <Button size="sm" variant="outline" className="h-7 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-md border-indigo-500/20 px-2.5">
                                                                Receipt
                                                            </Button>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </div>

                </div>
            )}

            {/* RECORD MANUAL PAYMENT DIALOG */}
            {showManualPayment && (
                <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-[440px] rounded-[2rem] p-8 bg-card border-none shadow-2xl relative text-left">
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute right-4 top-4 text-muted-foreground rounded-full"
                            onClick={() => { setShowManualPayment(false); }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        
                        <CardHeader className="px-0 pb-4">
                            <CardTitle className="font-serif text-xl font-bold flex items-center gap-2">
                                <Sparkles className="text-indigo-600" size={18} />
                                <span>Record Manual Payment</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Manually activate student and record a direct bank transfer, cash payment, or check.
                            </CardDescription>
                        </CardHeader>
                        
                        <form onSubmit={handleRecordManualPaymentSubmit} className="space-y-4 text-xs">
                            <div className="space-y-1.5">
                                <Label htmlFor="manual-student">Select Student *</Label>
                                <Select onValueChange={handleManualStudentChange} value={manualStudentId} required>
                                    <SelectTrigger id="manual-student" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                        <SelectValue placeholder="Select student profile..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-border/40">
                                        {students.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="rounded-lg">
                                                {s.full_name || s.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-1.5">
                                <Label htmlFor="manual-amount">Amount (₹) *</Label>
                                <Input 
                                    id="manual-amount"
                                    required
                                    type="number"
                                    value={manualAmount}
                                    onChange={(e) => setManualAmount(e.target.value)}
                                    placeholder="4500"
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-month">Month (1-12) *</Label>
                                    <Input 
                                        id="manual-month"
                                        required
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={manualMonth}
                                        onChange={(e) => setManualMonth(Number(e.target.value))}
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="manual-year">Year *</Label>
                                    <Input 
                                        id="manual-year"
                                        required
                                        type="number"
                                        value={manualYear}
                                        onChange={(e) => setManualYear(Number(e.target.value))}
                                        className="rounded-xl h-10 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="manual-method">Payment Method *</Label>
                                <Select onValueChange={(val: any) => setManualMethod(val)} value={manualMethod} required>
                                    <SelectTrigger id="manual-method" className="h-10 rounded-xl border border-muted/50 bg-background text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-border/40">
                                        <SelectItem value="bank_transfer" className="rounded-lg">Bank Transfer / IMPS</SelectItem>
                                        <SelectItem value="cash" className="rounded-lg">Cash Payment</SelectItem>
                                        <SelectItem value="other" className="rounded-lg">Other Method</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="manual-txnid">Transaction reference ID / Details</Label>
                                <Input 
                                    id="manual-txnid"
                                    value={manualTxnId}
                                    onChange={(e) => setManualTxnId(e.target.value)}
                                    placeholder="e.g. TXN98765432 or CASH_PAID"
                                    className="rounded-xl h-10 text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button 
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl font-bold uppercase tracking-wider text-[10px]"
                                    onClick={() => { setShowManualPayment(false); }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit"
                                    disabled={isSavingManualPayment}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] h-10"
                                >
                                    {isSavingManualPayment ? (
                                        <>
                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Record Payment"
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
