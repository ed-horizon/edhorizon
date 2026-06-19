'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { updatePayrollDeduction } from "@/app/(dashboard)/hr/payroll/actions"
import { toast } from "sonner"
import { RefreshCw, Calculator } from "lucide-react"

export function PayrollDeductionEditor({ item, children }: { item: any, children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [deductions, setDeductions] = useState(item.deductions || 0)
    const [reason, setReason] = useState(item.deduction_reason || "")
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        if (deductions < 0) {
            toast.error("Deductions cannot be negative.")
            return
        }

        setLoading(true)
        try {
            const result = await updatePayrollDeduction(item.id, Number(deductions), reason)
            if (!result.success) {
                toast.error(result.error || "Failed to update deductions")
                return
            }
            toast.success("Deductions applied successfully.")
            setOpen(false)
        } catch (err: any) {
            toast.error("Error connecting to server")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] bg-white dark:bg-[#111]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <Calculator size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold italic font-serif">Apply Deductions</DialogTitle>
                            <DialogDescription className="italic">Modify the penalty or unpaid leave for {item.staff?.profile?.full_name}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                            Deduction Amount (₹)
                            <span className="text-emerald-600">Gross Total: ₹{Number(item.amount).toLocaleString()}</span>
                        </label>
                        <Input 
                            type="number"
                            min="0"
                            placeholder="0.00"
                            className="h-12 rounded-xl bg-muted/50 font-bold"
                            value={deductions}
                            onChange={(e) => setDeductions(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason / Justification</label>
                        <Textarea 
                            placeholder="E.g., Missing timesheet, Unpaid leaves, etc."
                            className="resize-none rounded-xl bg-muted/50"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading} className="font-black uppercase tracking-widest text-[10px] rounded-xl px-6">Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Apply Penalty"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
