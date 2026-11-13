
"use client";

import { Button } from "@/components/ui/button";
import { UserPlus, CreditCard, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { runPayrollMock } from "@/app/(dashboard)/hr/actions";
import { toast } from "sonner";
import { useState } from "react";

export function DashboardActions() {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleRunPayroll = async () => {
        setIsProcessing(true);
        const result = await runPayrollMock();
        setIsProcessing(false);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="space-y-3">
            <button 
                onClick={() => router.push('/hr/pipeline')}
                className="w-full h-14 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all flex items-center justify-center gap-3 shadow-sm"
            >
                <UsersRound size={16} className="text-indigo-600 dark:text-indigo-400" />
                Candidate Pipeline
            </button>
            <button 
                onClick={() => router.push('/hr/staff')}
                className="w-full h-14 bg-card border-2 border-dashed border-indigo-600/30 text-indigo-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 dark:hover:bg-muted/40 transition-all flex items-center justify-center gap-3"
            >
                <UserPlus size={16} />
                Add New Staff
            </button>
            <button 
                onClick={handleRunPayroll}
                disabled={isProcessing}
                className="w-full h-14 bg-indigo-600 shadow-xl shadow-indigo-600/20 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
                <CreditCard size={16} />
                {isProcessing ? "Processing..." : "Run Payroll"}
            </button>
        </div>
    );
}
