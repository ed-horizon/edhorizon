'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, BookOpen, User, Layers } from "lucide-react"
import { getPendingCapsules, updateCapsuleStatus } from "@/app/(dashboard)/content/actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function CapsuleApprovalList() {
    const [capsules, setCapsules] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadCapsules()
    }, [])

    async function loadCapsules() {
        try {
            const data = await getPendingCapsules()
            setCapsules(data)
        } catch (error) {
            console.error("Failed to load capsules:", error)
            toast.error("Failed to load pending capsules")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAction(id: string, status: 'published' | 'rejected') {
        try {
            await updateCapsuleStatus(id, status)
            setCapsules(capsules.filter(c => c.id !== id))
            toast.success(`Capsule ${status === 'published' ? 'approved' : 'rejected'} successfully`)
        } catch (error) {
            console.error("Failed to update status:", error)
            toast.error("Action failed. Please try again.")
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
                ))}
            </div>
        )
    }

    if (capsules.length === 0) {
        return (
            <Card className="rounded-[2.5rem] border-2 border-dashed border-border/50 bg-muted/20 py-20 flex flex-col items-center justify-center text-muted-foreground italic">
                <Clock size={48} className="opacity-10 mb-4" />
                <p>No capsules awaiting approval.</p>
            </Card>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-6">
            {capsules.map((capsule) => (
                <Card key={capsule.id} className="rounded-[2.5rem] border border-border/40 shadow-xl overflow-hidden group hover:shadow-2xl transition-all bg-card">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-6">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Layers size={24} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold tracking-tight text-foreground">{capsule.title}</h3>
                                    <Badge variant="outline" className="rounded-full bg-indigo-50/50 text-indigo-600 border-indigo-100 text-[10px] uppercase font-black tracking-widest px-3 py-1">
                                        {capsule.type}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-muted-foreground italic font-medium">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-indigo-600/50" />
                                        <span>{capsule.author?.full_name || 'Anonymous'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={14} className="text-indigo-600/50" />
                                        <span>{capsule.topic?.title || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-600/50" />
                                        <span>{new Date(capsule.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-border/40">
                            <Button
                                onClick={() => handleAction(capsule.id, 'rejected')}
                                variant="ghost"
                                className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:text-red-600 hover:bg-red-50 gap-2 border border-transparent hover:border-red-100"
                            >
                                <XCircle size={14} />
                                Reject
                            </Button>
                            <Button
                                onClick={() => handleAction(capsule.id, 'published')}
                                className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-200"
                            >
                                <CheckCircle2 size={14} />
                                Approve
                            </Button>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
