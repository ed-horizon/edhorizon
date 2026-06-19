
"use client";

import { Button } from "@/components/ui/button";
import { UserPlus, CreditCard } from "lucide-react";
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
        <div className="space-y-4">
            <button 
                onClick={() => router.push('/hr/staff')}
                className="w-full h-16 bg-card border-2 border-dashed border-indigo-600/30 text-indigo-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
            >
                <UserPlus size={16} />
                Add New Staff
            </button>
            <button 
                onClick={handleRunPayroll}
                disabled={isProcessing}
                className="w-full h-16 bg-indigo-600 shadow-xl shadow-indigo-600/20 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
                <CreditCard size={16} />
                {isProcessing ? "Processing..." : "Run Payroll"}
            </button>
        </div>
    );
}
