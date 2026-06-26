'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { assignHomework, uploadMaterial, requestReschedule, uploadFileToR2Action } from "@/app/(dashboard)/attendance/actions"
import { toast } from "sonner"
import { BookOpen, Upload, Calendar, FileText, Link2, Clock, Sparkles } from "lucide-react"

// --- 1. Assign Homework Dialog ---
interface AssignHomeworkProps {
    studentId: string
    studentName: string
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function AssignHomeworkDialog({ studentId, studentName, trigger, onSuccess }: AssignHomeworkProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [filePreview, setFilePreview] = useState("")
    const [fileName, setFileName] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setFileName(file.name)
            const reader = new FileReader()
            reader.onloadend = () => {
                setFilePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            toast.error("Please enter a homework title")
            return
        }

        setIsSubmitting(true)
        try {
            let worksheetUrl = ""

            if (selectedFile) {
                const formData = new FormData()
                formData.append('file', selectedFile)

                const uploadRes = await uploadFileToR2Action(
                    formData,
                    'teacher_material',
                    studentId
                )

                if (!uploadRes.success || !uploadRes.fileKey) {
                    throw new Error(uploadRes.error || "Failed to upload worksheet file")
                }

                worksheetUrl = uploadRes.fileKey
            }

            const result = await assignHomework(studentId, title, description, dueDate, worksheetUrl)
            if (result.success) {
                toast.success("Homework assigned successfully!")
                setTitle("")
                setDescription("")
                setDueDate("")
                setFilePreview("")
                setFileName("")
                setSelectedFile(null)
                setIsOpen(false)
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error || "Failed to assign homework")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to assign homework")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="flex items-center gap-2 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2">
                        <BookOpen size={14} className="text-indigo-600" />
                        <span>Send Homework</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-serif font-bold italic text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                        <BookOpen size={20} className="text-indigo-500" />
                        <span>Assign Homework: {studentName}</span>
                    </DialogTitle>
                    <DialogDescription className="italic">
                        Send a new task or learning challenge to your student.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="hw-title" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Homework Title *</Label>
                        <Input
                            id="hw-title"
                            placeholder="e.g. Chapter 4 Practice Questions"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-12 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hw-desc" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Instructions / Description</Label>
                        <Textarea
                            id="hw-desc"
                            placeholder="Provide task instructions, pages to read, or questions to answer..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="rounded-2xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hw-due" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Due Date</Label>
                        <Input
                            id="hw-due"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="h-12 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Attach Worksheet/File (Optional)</Label>
                        <div className="border-2 border-dashed border-muted/30 rounded-xl p-4 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer relative">
                            <Upload size={18} className="text-indigo-500 mb-1" />
                            <span className="text-xs font-bold text-foreground">Click to upload file</span>
                            <input 
                                type="file" 
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        {fileName && (
                            <p className="text-xs text-indigo-600 font-bold mt-1">Selected: {fileName}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-12 px-6 rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20"
                        >
                            {isSubmitting ? "Sending..." : "Assign Task"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- 2. Upload Material Dialog ---
interface UploadMaterialProps {
    studentId: string
    studentName: string
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function UploadMaterialDialog({ studentId, studentName, trigger, onSuccess }: UploadMaterialProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [fileUrl, setFileUrl] = useState("")
    const [fileName, setFileName] = useState("")
    const [filePreview, setFilePreview] = useState("")
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setFileName(file.name)
            const reader = new FileReader()
            reader.onloadend = () => {
                setFilePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            toast.error("Please enter a title")
            return
        }

        if (!fileUrl.trim() && !selectedFile) {
            toast.error("Please enter a document link or upload a worksheet file")
            return
        }

        setIsSubmitting(true)
        try {
            let finalFileUrl = fileUrl.trim()

            if (selectedFile) {
                const formData = new FormData()
                formData.append('file', selectedFile)

                const uploadRes = await uploadFileToR2Action(
                    formData,
                    'teacher_material',
                    studentId
                )

                if (!uploadRes.success || !uploadRes.fileKey) {
                    throw new Error(uploadRes.error || "Failed to upload worksheet file")
                }

                finalFileUrl = uploadRes.fileKey
            }

            const result = await uploadMaterial(studentId, title, finalFileUrl)
            if (result.success) {
                toast.success("Worksheet / Material shared successfully!")
                setTitle("")
                setFileUrl("")
                setFileName("")
                setFilePreview("")
                setSelectedFile(null)
                setIsOpen(false)
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error || "Failed to share material")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to share material")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="flex items-center gap-2 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2">
                        <Upload size={14} className="text-indigo-600" />
                        <span>Upload Study Material</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-serif font-bold italic text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                        <Upload size={20} className="text-indigo-500" />
                        <span>Upload Material: {studentName}</span>
                    </DialogTitle>
                    <DialogDescription className="italic">
                        Share worksheets, reading materials, or slide decks (PDF, Docs, Drive Links).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="mat-title" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Material Name / Title *</Label>
                        <Input
                            id="mat-title"
                            placeholder="e.g. Hindi Vowels Worksheet, Grade 1 Math Slides"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="h-12 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="mat-url" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Document Link (Google Drive, Dropbox, PDF)</Label>
                        <div className="relative">
                            <Link2 size={16} className="absolute left-4 top-4 text-muted-foreground" />
                            <Input
                                id="mat-url"
                                placeholder="https://drive.google.com/file/d/..."
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                className="h-12 pl-11 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground italic pl-1">
                            Ensure the link sharing permission is set to "Anyone with the link can view".
                        </p>
                    </div>

                    <div className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground my-1">— OR —</div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Upload Worksheet File / Image directly</Label>
                        <div className="border-2 border-dashed border-muted/30 rounded-xl p-4 flex flex-col items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer relative">
                            <Upload size={18} className="text-indigo-500 mb-1" />
                            <span className="text-xs font-bold text-foreground">Click to upload worksheet</span>
                            <input 
                                type="file" 
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        {fileName && (
                            <p className="text-xs text-indigo-600 font-bold mt-1">Selected: {fileName}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-12 px-6 rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20"
                        >
                            {isSubmitting ? "Sharing..." : "Share Document"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// --- 3. Request Reschedule Dialog ---
interface RequestRescheduleProps {
    studentId: string
    studentName: string
    classId?: string | null
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function RequestRescheduleDialog({ studentId, studentName, classId = null, trigger, onSuccess }: RequestRescheduleProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [requestedDate, setRequestedDate] = useState("")
    const [requestedTime, setRequestedTime] = useState("")
    const [reason, setReason] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!requestedDate || !requestedTime) {
            toast.error("Please select a date and time")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await requestReschedule(classId, studentId, requestedDate, requestedTime, reason)
            if (result.success) {
                toast.success("Reschedule request submitted successfully!")
                setRequestedDate("")
                setRequestedTime("")
                setReason("")
                setIsOpen(false)
                if (onSuccess) onSuccess()
            } else {
                toast.error(result.error || "Failed to request reschedule")
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to request reschedule")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="flex items-center gap-2 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2">
                        <Calendar size={14} className="text-indigo-600" />
                        <span>Request Reschedule</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-8 bg-white dark:bg-[#0a0a0a] border border-border/40 overflow-hidden shadow-2xl">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-serif font-bold italic text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                        <Calendar size={20} className="text-indigo-500" />
                        <span>Request Reschedule: {studentName}</span>
                    </DialogTitle>
                    <DialogDescription className="italic">
                        Propose a new date and time for the 1:1 classes. The operations team will review this.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="res-date" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Proposed Date *</Label>
                            <Input
                                id="res-date"
                                type="date"
                                value={requestedDate}
                                onChange={(e) => setRequestedDate(e.target.value)}
                                className="h-12 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="res-time" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Proposed Time *</Label>
                            <div className="relative">
                                <Clock size={16} className="absolute left-4 top-4 text-muted-foreground" />
                                <Input
                                    id="res-time"
                                    type="time"
                                    value={requestedTime}
                                    onChange={(e) => setRequestedTime(e.target.value)}
                                    className="h-12 pl-11 rounded-xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="res-reason" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Reason for Adjustment</Label>
                        <Textarea
                            id="res-reason"
                            placeholder="Explain why rescheduling is required (e.g. Teacher health, student exam, power outage)..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="rounded-2xl border-2 border-muted/30 focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-12 px-6 rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20"
                        >
                            {isSubmitting ? "Requesting..." : "Submit Request"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
