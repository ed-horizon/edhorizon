'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

interface ReceiptToolbarProps {
    isManager: boolean;
}

export function ReceiptToolbar({ isManager }: ReceiptToolbarProps) {
    return (
        <div className="max-w-[650px] mx-auto mb-6 flex justify-between items-center print:hidden">
            <Link href={isManager ? "/operations" : "/student"}>
                <Button variant="ghost" className="gap-2 rounded-xl text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                </Button>
            </Link>
            <Button 
                onClick={() => window.print()}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md h-10 px-5"
            >
                <Printer size={16} />
                <span>Print Receipt</span>
            </Button>
        </div>
    );
}
