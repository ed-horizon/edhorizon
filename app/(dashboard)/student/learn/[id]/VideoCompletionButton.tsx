'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { trackVideoCompletion } from "../actions"
import { toast } from "sonner"

export function VideoCompletionButton({ capsuleId }: { capsuleId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleComplete = async () => {
        setLoading(true)
        try {
            await trackVideoCompletion(capsuleId)
            toast.success("Lesson completed! XP awarded.")
            router.push('/student/learn')
            router.refresh()
        } catch (err: any) {
            console.error("Failed to track video completion:", err)
            toast.error(err?.message || "Failed to mark lesson complete.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleComplete}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-200 cursor-pointer"
        >
            <CheckCircle2 size={18} />
            {loading ? 'Saving...' : 'Complete Lesson'}
            <ArrowRight size={18} />
        </Button>
    )
}
