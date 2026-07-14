import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReceiptToolbar } from "./ReceiptToolbar";

interface PaymentReceiptProps {
    params: Promise<{ id: string }>;
}

function numberToWords(num: number): string {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convert = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
        return '';
    };
    
    return convert(Math.floor(num)) + ' Rupees Only';
}

export default async function PaymentReceiptPage({ params }: PaymentReceiptProps) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch user profile role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role || 'student';
    const isManager = role === 'operations' || role === 'super_admin';

    // 2. Fetch the payment record
    const { data: payment, error } = await supabase
        .from('payments')
        .select(`
            *,
            student:profiles!student_id(full_name, email, student_details:student_details!student_details_id_fkey(grade_level))
        `)
        .eq('id', id)
        .single();

    if (error || !payment) {
        return notFound();
    }

    // Backfill receipt number if completed but missing
    if (payment.status === 'completed' && !payment.receipt_number) {
        const dateStr = new Date(payment.created_at).toISOString().slice(0, 10).replace(/-/g, "");
        const rand = Math.floor(1000 + Math.random() * 9000);
        const generatedReceipt = `EH-${dateStr}-${rand}`;

        const adminClient = createAdminClient();
        const { error: updateError } = await adminClient
            .from('payments')
            .update({ receipt_number: generatedReceipt })
            .eq('id', id);

        if (!updateError) {
            payment.receipt_number = generatedReceipt;
        } else {
            console.error("Failed to backfill receipt number:", updateError);
        }
    }

    // 3. Security: Check if student is viewing their own payment or if user is a manager
    if (payment.student_id !== user.id && !isManager) {
        return notFound(); // unauthorized access hidden as not found
    }

    // Fetch active schedule or last class to get the course/subject name
    const { data: schedules } = await supabase
        .from('class_schedules')
        .select('title')
        .eq('student_id', payment.student_id)
        .eq('status', 'active')
        .limit(1);

    let courseName = payment.subject_name || schedules?.[0]?.title;

    if (!courseName) {
        const { data: classes } = await supabase
            .from('live_classes')
            .select('title')
            .eq('student_id', payment.student_id)
            .order('scheduled_at', { ascending: false })
            .limit(1);
        courseName = classes?.[0]?.title || "Tuition";
    }

    const studentName = payment.student?.full_name || "Student";
    const studentDetails = Array.isArray(payment.student?.student_details)
        ? payment.student?.student_details[0]
        : payment.student?.student_details;
    const gradeLevel = studentDetails?.grade_level || "Academy Student";
    const amountWords = numberToWords(Number(payment.amount));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-10 px-4">
            {/* Top Toolbar (Hidden during print) */}
            <ReceiptToolbar isManager={isManager} />

            {/* Receipt Outer Container */}
            <div className="max-w-[650px] mx-auto bg-white text-zinc-900 border border-zinc-200 shadow-xl rounded-3xl p-6 md:p-10 font-sans print:shadow-none print:border-none print:p-0 print:my-0">
                
                {/* Double Border Frame */}
                <div className="border-2 border-zinc-800 p-6 md:p-8 rounded-2xl relative">
                    
                    {/* Header */}
                    <div className="text-center border-b-2 border-zinc-800 pb-6 mb-8 flex flex-col items-center">
                        <div className="mb-3 h-16 w-auto flex items-center justify-center">
                            <img src="/logo.png" alt="EdHorizon Logo" className="max-h-full w-auto object-contain" />
                        </div>
                        <h2 className="text-2xl font-black tracking-widest text-zinc-900 uppercase font-serif mt-1">
                            FEES RECEIPT
                        </h2>
                    </div>

                    {/* Metadata (Date & Receipt No) */}
                    <div className="flex justify-between font-bold text-sm text-zinc-700 mb-8 pb-3 border-b border-dashed border-zinc-300">
                        <div>
                            <span className="text-zinc-500 uppercase tracking-widest text-[10px] block mb-0.5">Date</span>
                            <span className="text-zinc-900 font-mono text-xs">
                                {format(new Date(payment.receipt_date ? (payment.receipt_date + "T12:00:00") : payment.created_at), 'MMMM dd, yyyy')}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-zinc-500 uppercase tracking-widest text-[10px] block mb-0.5">Receipt No</span>
                            <span className="text-indigo-600 font-mono text-sm font-black">
                                {payment.receipt_number || "AWAITING APPROVAL"}
                            </span>
                        </div>
                    </div>

                    {/* Receipt Body */}
                    <div className="space-y-6 text-zinc-950 mb-10">
                        <div className="flex flex-col md:flex-row md:items-end gap-2 pb-1 border-b border-dotted border-zinc-400">
                            <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold min-w-[140px]">Received From:</span>
                            <span className="flex-1 text-base font-serif italic text-zinc-900 font-bold border-none bg-transparent pl-1 md:pl-2">
                                {studentName}
                            </span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end gap-2 pb-1 border-b border-dotted border-zinc-400">
                            <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold min-w-[140px]">Towards Fees For:</span>
                            <span className="flex-1 text-base font-serif italic text-zinc-900 font-semibold border-none bg-transparent pl-1 md:pl-2">
                                {courseName} ({gradeLevel}) - Billing Cycle {payment.billing_month}/{payment.billing_year}
                            </span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-end gap-2 pb-1 border-b border-dotted border-zinc-400">
                            <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold min-w-[140px]">Sum of Rupees:</span>
                            <span className="flex-1 text-sm font-serif italic text-zinc-900 font-semibold border-none bg-transparent pl-1 md:pl-2">
                                {amountWords}
                            </span>
                        </div>
                    </div>

                    {/* Payment Box & Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t-2 border-zinc-800">
                        {/* Amount Box */}
                        <div className="bg-zinc-50 border-2 border-zinc-800 px-6 py-3 rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                            <span className="text-zinc-600 font-serif font-bold text-lg">INR</span>
                            <span className="text-2xl font-mono font-black text-zinc-900">
                                {Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Payment Method */}
                        <div className="text-zinc-700 text-xs font-semibold">
                            <span className="text-zinc-400 uppercase tracking-widest text-[9px] block mb-0.5">Paid Via</span>
                            <span className="text-zinc-900 font-bold uppercase tracking-wider">
                                {payment.payment_method === 'razorpay' ? 'Razorpay Online' : 'UPI QR Payment'}
                            </span>
                            {payment.transaction_id && (
                                <span className="block text-[10px] text-zinc-500 font-mono mt-0.5">
                                    Ref: {payment.transaction_id}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Receipt Footer */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-end pt-6 border-t border-zinc-200">
                        {/* Terms & Conditions */}
                        <div className="text-[10px] text-zinc-500 leading-relaxed max-w-[280px]">
                            <p className="font-bold text-zinc-700 uppercase tracking-wider mb-1">Terms & Conditions:</p>
                            <p>Fees once paid are non-refundable and non-transferable under any circumstances.</p>
                        </div>

                        {/* Signature Box */}
                        <div className="flex flex-col items-center ml-auto">
                            <div className="h-14 w-auto flex items-end justify-center mb-1">
                                <img src="/signature.png" alt="Authorized Signature" className="max-h-full w-auto object-contain" />
                            </div>
                            <div className="border-t border-zinc-800 w-48 text-center pt-1 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Authorized Signature</span>
                            </div>
                        </div>
                    </div>

                    {/* Tiny Thank You Note */}
                    <div className="text-center text-[10px] text-zinc-400 uppercase tracking-widest mt-8 pt-4 border-t border-dashed border-zinc-200">
                        Thank you for choosing EdHorizon!
                    </div>

                </div>
            </div>
        </div>
    );
}
