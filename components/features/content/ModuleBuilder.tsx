'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Save, ArrowLeft, BookOpen, Calculator, Atom, Globe, Languages } from "lucide-react"
import { useRouter } from "next/navigation"
import { saveModule } from "@/app/(dashboard)/content/actions"

const ICONS = [
    { name: 'BookOpen', icon: BookOpen, label: 'Reading / General' },
    { name: 'Calculator', icon: Calculator, label: 'Mathematics' },
    { name: 'Atom', icon: Atom, label: 'Science' },
    { name: 'Globe', icon: Globe, label: 'Social Studies' },
    { name: 'Languages', icon: Languages, label: 'Languages' },
]

export function ModuleBuilder({ students }: { students: any[] }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [studentId, setStudentId] = useState('')
    const [selectedIcon, setSelectedIcon] = useState('BookOpen')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        if (!title || !studentId) return;
        setLoading(true)
        try {
            await saveModule({
                title,
                description,
                student_id: studentId,
                icon: selectedIcon
            });
            router.push('/content');
            router.refresh();
        } catch (error) {
            console.error("Failed to save module:", error);
            alert("Error saving module. Check console.");
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            <Card className="rounded-[2.5rem] p-10 border border-border/40 shadow-2xl bg-card space-y-8">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Module Title</Label>
                    <Input
                        placeholder="e.g., Mathematics Mastery"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-14 rounded-2xl bg-muted/30 border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-bold text-lg px-6"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Allocate to Student</Label>
                    <select
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full h-14 rounded-2xl bg-muted/30 border-none outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-sm px-6 appearance-none cursor-pointer"
                    >
                        <option value="">Select a Student...</option>
                        {students.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.full_name} ({s.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Description</Label>
                    <Textarea
                        placeholder="Describe the scope of this module..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="rounded-2xl bg-muted/30 border-none min-h-[120px] p-6 text-sm"
                    />
                </div>

                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Select Module Icon</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {ICONS.map((ico) => {
                            const IconComponent = ico.icon;
                            const isSelected = selectedIcon === ico.name;
                            return (
                                <button
                                    key={ico.name}
                                    type="button"
                                    onClick={() => setSelectedIcon(ico.name)}
                                    className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${
                                        isSelected 
                                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 shadow-md ring-2 ring-indigo-600/10' 
                                            : 'border-border/40 hover:bg-muted/10 text-muted-foreground'
                                    }`}
                                >
                                    <IconComponent size={24} />
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-center">{ico.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-center gap-6 pt-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/content')}
                    className="h-14 px-10 font-black uppercase tracking-widest text-xs gap-3"
                >
                    <ArrowLeft size={18} />
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={loading || !title || !studentId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-200"
                >
                    {loading ? 'Creating...' : 'Create Module'}
                    <Save size={18} />
                </Button>
            </div>
        </div>
    )
}
