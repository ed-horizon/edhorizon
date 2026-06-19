'use client'

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
    IndianRupee, PieChart, CheckCircle2, Clock, 
    User, Sparkles, AlertCircle, RefreshCw, Undo2, Award, PiggyBank, MinusCircle
} from "lucide-react";
import { updatePayrollItemDraft, approvePayrollItem } from "@/app/(dashboard)/hr/payroll/actions";

interface PayrollItemsManagerProps {
    initialItems: any[];
    runId: string;
    runStatus: string;
}

export function PayrollItemsManager({ initialItems, runId, runStatus }: PayrollItemsManagerProps) {
    const isRunFinalized = runStatus === 'completed' || runStatus === 'paid';
    const [isPending, startTransition] = useTransition();

    // Parse items to extract draft reason and bonus from DB columns
    const [items, setItems] = useState(() => {
        return initialItems.map((item) => {
            return {
                ...item,
                draftDeductions: item.deductions_amount ?? item.deductions ?? 0,
                draftReason: item.deduction_reason || "",
                draftBonus: item.bonus_amount || 0,
                isSaving: false
            };
        });
    });

    // Handle local field changes
    const handleFieldChange = (itemId: string, field: 'draftDeductions' | 'draftReason' | 'draftBonus', value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    [field]: value
                };
            }
            return item;
        }));
    };

    // Save draft on blur
    const handleSaveDraft = async (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item || item.payout_status === 'processing' || item.payout_status === 'paid' || isRunFinalized) return;

        // Mark item as saving in local state
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, isSaving: true } : i));

        try {
            const result = await updatePayrollItemDraft(
                itemId,
                Number(item.draftDeductions) || 0,
                item.draftReason || "",
                Number(item.draftBonus) || 0
            );

            if (!result.success) {
                toast.error(`Failed to save changes: ${result.error}`);
            }
        } catch (err) {
            toast.error("Network error while saving changes");
        } finally {
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, isSaving: false } : i));
        }
    };

    // Toggle approval status
    const handleToggleApproval = async (itemId: string, approve: boolean) => {
        const item = items.find(i => i.id === itemId);
        if (!item || isRunFinalized) return;

        // Perform inline validation
        if (Number(item.draftDeductions) < 0) {
            toast.error("Deductions cannot be negative.");
            return;
        }
        if (Number(item.draftBonus) < 0) {
            toast.error("Bonus cannot be negative.");
            return;
        }

        startTransition(async () => {
            try {
                const result = await approvePayrollItem(
                    itemId,
                    Number(item.draftDeductions) || 0,
                    item.draftReason || "",
                    Number(item.draftBonus) || 0,
                    approve
                );

                if (result.success) {
                    setItems(prev => prev.map(i => {
                        if (i.id === itemId) {
                            return {
                                ...i,
                                payout_status: approve ? 'processing' : 'pending'
                            };
                        }
                        return i;
                    }));
                    toast.success(approve ? "Payout approved successfully!" : "Approval revoked.");
                } else {
                    toast.error(result.error || "Failed to update approval status.");
                }
            } catch (err) {
                toast.error("Connection error while updating approval.");
            }
        });
    };

    // Calculate aggregates in real-time
    const totalAccrued = items.reduce((acc, item) => acc + Number(item.basic_amount), 0);
    const totalDeductions = items.reduce((acc, item) => acc + (Number(item.draftDeductions) || 0), 0);
    const totalBonuses = items.reduce((acc, item) => acc + (Number(item.draftBonus) || 0), 0);
    const totalNetPay = totalAccrued - totalDeductions + totalBonuses;

    return (
        <div className="space-y-10">
            {/* Aggregates Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/30 shadow-sm p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-indigo-600">
                        <PiggyBank size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-2">
                        <PiggyBank size={14}/> Accrued Payout
                    </p>
                    <p className="text-4xl font-serif font-bold text-indigo-900 dark:text-indigo-100 tracking-tighter">
                        ₹{totalAccrued.toLocaleString()}
                    </p>
                </Card>

                <Card className="rounded-[2.5rem] bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/30 shadow-sm p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-rose-600">
                        <MinusCircle size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2 flex items-center gap-2">
                        <MinusCircle size={14}/> Total Deductions
                    </p>
                    <p className="text-4xl font-serif font-bold text-rose-950 dark:text-rose-200 tracking-tighter">
                        - ₹{totalDeductions.toLocaleString()}
                    </p>
                </Card>

                <Card className="rounded-[2.5rem] bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/30 shadow-sm p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-amber-600">
                        <Award size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2">
                        <Award size={14}/> Total Bonuses
                    </p>
                    <p className="text-4xl font-serif font-bold text-amber-900 dark:text-amber-100 tracking-tighter">
                        + ₹{totalBonuses.toLocaleString()}
                    </p>
                </Card>

                <Card className="rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Sparkles size={120} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2 flex items-center gap-2">
                        <Sparkles size={14}/> Final Gross Pay
                    </p>
                    <p className="text-4xl font-serif font-bold tracking-tighter">
                        ₹{totalNetPay.toLocaleString()}
                    </p>
                </Card>
            </div>

            {/* Individual Staff Slips DataGrid */}
            <Card className="rounded-[2.5rem] bg-card shadow-xl border border-border/40 overflow-hidden">
                <div className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-[10px] uppercase font-black tracking-widest bg-muted/20 text-muted-foreground border-b border-border/10">
                                <tr>
                                    <th className="px-8 py-5">Personnel</th>
                                    <th className="px-5 py-5 text-center">Accrued Payout</th>
                                    <th className="px-5 py-5 text-center min-w-[150px]">Deductions (₹)</th>
                                    <th className="px-5 py-5 text-center min-w-[200px]">Deduction Reason</th>
                                    <th className="px-5 py-5 text-center min-w-[150px]">Bonus (₹)</th>
                                    <th className="px-5 py-5 text-center">Final Gross Pay</th>
                                    <th className="px-8 py-5 text-right">Approval Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {items.map((item) => {
                                    const accrued = Number(item.basic_amount) || 0;
                                    const ded = Number(item.draftDeductions) || 0;
                                    const bon = Number(item.draftBonus) || 0;
                                    const net = accrued - ded + bon;
                                    const isApproved = item.payout_status === 'processing' || item.payout_status === 'paid';
                                    const isEditingDisabled = isApproved || isRunFinalized;

                                    return (
                                        <tr key={item.id} className="hover:bg-muted/5 transition-colors group">
                                            {/* Personnel details */}
                                            <td className="px-8 py-5 flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold group-hover:scale-105 transition-transform shadow-inner">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{item.profile?.full_name || "Unknown Personnel"}</p>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{item.profile?.role}</p>
                                                </div>
                                            </td>

                                            {/* Accrued Base Payout */}
                                            <td className="px-5 py-5 text-center font-bold text-slate-700 dark:text-slate-300">
                                                ₹{accrued.toLocaleString()}
                                            </td>

                                            {/* Deductions Input */}
                                            <td className="px-5 py-5 text-center">
                                                <div className="relative max-w-[120px] mx-auto">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">₹</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.draftDeductions}
                                                        onChange={(e) => handleFieldChange(item.id, 'draftDeductions', e.target.value)}
                                                        onBlur={() => handleSaveDraft(item.id)}
                                                        disabled={isEditingDisabled}
                                                        className="h-10 pl-7 pr-2 text-center rounded-xl bg-muted/20 font-bold focus-visible:ring-rose-500 border border-border/50 text-foreground"
                                                    />
                                                </div>
                                            </td>

                                            {/* Deduction Reason Input */}
                                            <td className="px-5 py-5 text-center">
                                                <Input
                                                    type="text"
                                                    placeholder="E.g., missing shift, leaves..."
                                                    value={item.draftReason}
                                                    onChange={(e) => handleFieldChange(item.id, 'draftReason', e.target.value)}
                                                    onBlur={() => handleSaveDraft(item.id)}
                                                    disabled={isEditingDisabled}
                                                    className="h-10 px-4 rounded-xl bg-muted/20 text-xs text-foreground focus-visible:ring-indigo-500 border border-border/50"
                                                />
                                            </td>

                                            {/* Bonus Input */}
                                            <td className="px-5 py-5 text-center">
                                                <div className="relative max-w-[120px] mx-auto">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">₹</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.draftBonus}
                                                        onChange={(e) => handleFieldChange(item.id, 'draftBonus', e.target.value)}
                                                        onBlur={() => handleSaveDraft(item.id)}
                                                        disabled={isEditingDisabled}
                                                        className="h-10 pl-7 pr-2 text-center rounded-xl bg-muted/20 font-bold focus-visible:ring-amber-500 border border-border/50 text-foreground"
                                                    />
                                                </div>
                                            </td>

                                            {/* Calculated Final Gross Pay */}
                                            <td className="px-5 py-5 text-center">
                                                <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-none font-bold text-sm px-3.5 py-1.5 shadow-sm rounded-xl">
                                                    ₹{net.toLocaleString()}
                                                </Badge>
                                            </td>

                                            {/* Status and Action Buttons */}
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {isApproved ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-full shadow-inner border border-emerald-100/20">
                                                                <CheckCircle2 size={14} />
                                                                <span>Approved</span>
                                                            </div>
                                                            {!isRunFinalized && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    onClick={() => handleToggleApproval(item.id, false)}
                                                                    disabled={isPending}
                                                                    title="Revoke approval to edit"
                                                                    className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                                                >
                                                                    <Undo2 size={16} />
                                                                </Button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600/80 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg">
                                                                <Clock size={11} />
                                                                <span>Pending</span>
                                                            </div>
                                                            {!isRunFinalized && (
                                                                <Button 
                                                                    size="sm"
                                                                    onClick={() => handleToggleApproval(item.id, true)}
                                                                    disabled={isPending}
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 h-9 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
                                                                >
                                                                    Approve
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
}
