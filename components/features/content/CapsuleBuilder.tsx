'use client'

import { useState } from "react"
import { CapsuleTypeSelector } from "./CapsuleTypeSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ArrowRight, ArrowLeft, Save, Sparkles, FileText, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { saveCapsule } from "@/app/(dashboard)/content/actions"
import { McqBuilder } from "./McqBuilder"
import { FlashcardBuilder } from "./FlashcardBuilder"

export function CapsuleBuilder({ topics, students }: { topics: any[]; students: any[] }) {
    const [step, setStep] = useState(1)
    const [type, setType] = useState('video')
    const [title, setTitle] = useState('')
    const [topicId, setTopicId] = useState('')
    const [customTopicTitle, setCustomTopicTitle] = useState('')
    const [studentId, setStudentId] = useState('')
    const [loading, setLoading] = useState(false)
    const [quizContent, setQuizContent] = useState<{ questions: any[] }>({ questions: [] })
    const [flashcardContent, setFlashcardContent] = useState<{ cards: any[] }>({ cards: [] })
    const router = useRouter()

    const handleSave = async () => {
        if (!title || !studentId) return;
        setLoading(true)
        try {
            await saveCapsule({
                title,
                topic_id: topicId || null,
                custom_topic_title: customTopicTitle,
                student_id: studentId,
                type,
                content: type === 'quiz'
                    ? quizContent
                    : type === 'flashcards'
                        ? flashcardContent
                        : (type === 'video' ? { videoUrl: '', description: '' } : {})
            });
            router.push('/content');
        } catch (error) {
            console.error("Failed to save capsule:", error);
            alert("Error saving capsule. Check console.");
        } finally {
            setLoading(false)
        }
    }

    // Filter topics so that they belong to the selected student's modules
    const studentTopics = topics.filter(t => !studentId || t.courses?.modules?.student_id === studentId);

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Progress Header */}
            <div className="flex items-center justify-between px-4">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-muted text-muted-foreground'
                            }`}>
                            {s}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest hidden sm:block ${step >= s ? 'text-indigo-600' : 'text-muted-foreground'
                            }`}>
                            {s === 1 ? 'Select Format' : s === 2 ? 'Core Details' : 'Design Content'}
                        </span>
                        {s < 3 && <div className="h-[2px] w-12 bg-muted mx-2" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Type Selection */}
            {step === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <h2 className="text-3xl font-serif font-bold">Choose your lesson format</h2>
                        <p className="text-muted-foreground mt-2">Pick the most effective way to teach this topic.</p>
                    </div>
                    <CapsuleTypeSelector selected={type} onSelect={setType} />
                    <div className="flex justify-center pt-8">
                        <Button
                            onClick={() => setStep(2)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs gap-3 shadow-xl"
                        >
                            Continue to Details
                            <ArrowRight size={18} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Meta Data */}
            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <h2 className="text-3xl font-serif font-bold">Set the Foundation</h2>
                        <p className="text-muted-foreground mt-2">Give your capsule a title and link it to the curriculum.</p>
                    </div>

                    <Card className="rounded-[2.5rem] p-10 border border-border/40 shadow-2xl bg-card space-y-8">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Capsule Title</Label>
                            <Input
                                placeholder="e.g., Introduction to Ancient India"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-14 rounded-2xl bg-muted/30 border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-bold text-lg px-6"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Allocate to Student</Label>
                            <select
                                value={studentId}
                                onChange={(e) => {
                                    setStudentId(e.target.value);
                                    setTopicId(''); // Reset topic selection when student changes
                                }}
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
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Parent Topic (Optional)</Label>
                            <select
                                value={topicId}
                                onChange={(e) => {
                                    setTopicId(e.target.value);
                                    if (e.target.value) {
                                        setCustomTopicTitle('');
                                    }
                                }}
                                disabled={!studentId}
                                className="w-full h-14 rounded-2xl bg-muted/30 border-none outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-sm px-6 appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">
                                    {!studentId ? "Please select a student first..." : "Select a Topic (Optional)..."}
                                </option>
                                {studentTopics.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.courses?.title} • {t.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {!topicId && studentId && (
                            <div className="space-y-2 animate-in fade-in duration-200">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Or Enter Custom Topic Name</Label>
                                <Input
                                    placeholder="e.g. Hindi Grammar Lessons"
                                    value={customTopicTitle}
                                    onChange={(e) => setCustomTopicTitle(e.target.value)}
                                    className="h-14 rounded-2xl bg-muted/30 border-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-bold text-sm px-6"
                                />
                            </div>
                        )}
                    </Card>

                    <div className="flex items-center justify-center gap-6 pt-8">
                        <Button
                            variant="ghost"
                            onClick={() => setStep(1)}
                            className="h-14 px-10 font-black uppercase tracking-widest text-xs gap-3"
                        >
                            <ArrowLeft size={18} />
                            Go Back
                        </Button>
                        <Button
                            onClick={() => setStep(3)}
                            disabled={!title || !studentId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-xs gap-3 shadow-xl"
                        >
                            Next: Build Content
                            <ArrowRight size={18} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Content Editor */}
            {step === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center">
                        <h2 className="text-3xl font-serif font-bold flex items-center justify-center gap-3">
                            <Sparkles className="text-amber-500" />
                            Design Content
                        </h2>
                        <p className="text-muted-foreground mt-2">Craft the interactive experience for your students.</p>
                    </div>

                    <Card className="rounded-[2.5rem] p-10 border border-border/40 shadow-2xl bg-card">
                        {type === 'video' ? (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Video Source URL</Label>
                                    <Input placeholder="YouTube or Vimeo Link..." className="h-12 rounded-xl bg-muted/30 border-none px-6" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground italic ml-1">Lesson Notes</Label>
                                    <Textarea placeholder="What will students learn in this video?" className="rounded-2xl bg-muted/30 border-none min-h-[150px] p-6 lg:p-8" />
                                </div>
                            </div>
                        ) : type === 'quiz' ? (
                            <McqBuilder onChange={setQuizContent} />
                        ) : (
                            <FlashcardBuilder onChange={setFlashcardContent} />
                        )}
                    </Card>

                    <div className="flex items-center justify-center gap-6 pt-8">
                        <Button
                            variant="ghost"
                            onClick={() => setStep(2)}
                            className="h-14 px-10 font-black uppercase tracking-widest text-xs gap-3"
                        >
                            <ArrowLeft size={18} />
                            Go Back
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-indigo-200"
                        >
                            {loading ? 'Saving...' : 'Finish & Publish'}
                            <Save size={18} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
