'use client'

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Save, X, AlertTriangle } from "lucide-react"
import { updateCapsule, deleteCapsule } from "@/app/(dashboard)/content/actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface EditCapsuleModalProps {
    capsule: any
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function EditCapsuleModal({ capsule, isOpen, onClose, onSuccess }: EditCapsuleModalProps) {
    const router = useRouter()
    const [title, setTitle] = useState(capsule?.title || '')
    const [status, setStatus] = useState(capsule?.status || 'published')
    const [videoUrl, setVideoUrl] = useState(capsule?.content?.videoUrl || '')
    const [description, setDescription] = useState(capsule?.content?.description || '')
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)

    if (!isOpen || !capsule) return null

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            toast.error("Capsule title is required.")
            return
        }

        setSaving(true)
        try {
            const updatedContent = {
                ...(capsule.content || {}),
                ...(capsule.type === 'video' ? { videoUrl, description } : {})
            }

            const res = await updateCapsule(capsule.id, {
                title,
                status,
                content: updatedContent
            })

            if (res && res.success === false) {
                toast.error(res.error || "Failed to update capsule.")
                return
            }

            toast.success("Capsule updated successfully!")
            onClose()
            if (onSuccess) onSuccess()
            router.refresh()
        } catch (err: any) {
            console.error("Error updating capsule:", err)
            toast.error(err?.message || "Failed to update capsule.")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            const res = await deleteCapsule(capsule.id)
            if (res && res.success === false) {
                toast.error(res.error || "Failed to delete capsule.")
                return
            }

            toast.success("Capsule deleted successfully.")
            onClose()
            if (onSuccess) onSuccess()
            router.refresh()
        } catch (err: any) {
            console.error("Error deleting capsule:", err)
            toast.error(err?.message || "Failed to delete capsule.")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-lg w-full rounded-[2.5rem] p-8 space-y-6 bg-card border border-border/40 shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full italic">
                        {capsule.type} Capsule
                    </span>
                    <h3 className="text-2xl font-serif font-bold text-foreground">Edit Capsule</h3>
                </div>

                {!showConfirmDelete ? (
                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">
                                Capsule Title
                            </Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter title..."
                                className="h-12 rounded-xl"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">
                                Status
                            </Label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full h-12 rounded-xl bg-muted/30 border border-border/40 font-bold text-sm px-4 appearance-none cursor-pointer"
                            >
                                <option value="published">Published (Visible to Assigned Student)</option>
                                <option value="draft">Draft (Hidden from Student)</option>
                            </select>
                        </div>

                        {capsule.type === 'video' && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">
                                        Video URL
                                    </Label>
                                    <Input
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        placeholder="YouTube or Vimeo Link..."
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">
                                        Description / Notes
                                    </Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Lesson notes..."
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setShowConfirmDelete(true)}
                                className="rounded-xl h-11 px-4 text-xs font-bold gap-2"
                            >
                                <Trash2 size={16} />
                                Delete
                            </Button>

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="rounded-xl h-11 px-5"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold text-xs gap-2"
                                >
                                    <Save size={16} />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6 py-4 text-center">
                        <div className="h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-bold text-foreground">Are you absolutely sure?</h4>
                            <p className="text-sm text-muted-foreground italic">
                                This will permanently delete <strong>&quot;{capsule.title}&quot;</strong> and all associated student completion records.
                            </p>
                        </div>
                        <div className="flex justify-center gap-4 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowConfirmDelete(false)}
                                className="rounded-xl h-11 px-6 font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={deleting}
                                onClick={handleDelete}
                                className="rounded-xl h-11 px-6 font-bold gap-2"
                            >
                                <Trash2 size={16} />
                                {deleting ? 'Deleting...' : 'Yes, Delete Capsule'}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
