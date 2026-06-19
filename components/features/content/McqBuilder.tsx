'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, CheckCircle2, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    options: Option[];
    correctOptionId: string;
    explanation?: string;
    imageUrl?: string;
}

interface McqBuilderProps {
    onChange: (content: { questions: Question[] }) => void;
    initialData?: { questions: Question[] };
}

export function McqBuilder({ onChange, initialData }: McqBuilderProps) {
    const [questions, setQuestions] = useState<Question[]>(
        initialData?.questions || [
            {
                id: crypto.randomUUID(),
                text: '',
                options: [
                    { id: '1', text: '' },
                    { id: '2', text: '' }
                ],
                correctOptionId: '1',
                explanation: '',
                imageUrl: ''
            }
        ]
    )

    const updateQuestions = (newQuestions: Question[]) => {
        setQuestions(newQuestions);
        onChange({ questions: newQuestions });
    }

    const addQuestion = () => {
        const newQuestion: Question = {
            id: crypto.randomUUID(),
            text: '',
            options: [
                { id: '1', text: '' },
                { id: '2', text: '' }
            ],
            correctOptionId: '1',
            explanation: '',
            imageUrl: ''
        };
        updateQuestions([...questions, newQuestion]);
    }

    const removeQuestion = (id: string) => {
        updateQuestions(questions.filter(q => q.id !== id));
    }

    const updateQuestionField = (id: string, field: keyof Question, value: any) => {
        updateQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    }

    const addOption = (questionId: string) => {
        updateQuestions(questions.map(q => {
            if (q.id === questionId) {
                const nextId = (q.options.length + 1).toString();
                return { ...q, options: [...q.options, { id: nextId, text: '' }] };
            }
            return q;
        }));
    }

    const updateOptionText = (questionId: string, optionId: string, text: string) => {
        updateQuestions(questions.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    options: q.options.map(o => o.id === optionId ? { ...o, text } : o)
                };
            }
            return q;
        }));
    }

    const setCorrectOption = (questionId: string, optionId: string) => {
        updateQuestions(questions.map(q => q.id === questionId ? { ...q, correctOptionId: optionId } : q));
    }

    return (
        <div className="space-y-12">
            {questions.map((q, qIndex) => (
                <div key={q.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="absolute -left-12 top-2 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        Q{qIndex + 1}
                    </div>

                    <Card className="rounded-[2.5rem] p-8 border-border/40 shadow-xl bg-card transition-all hover:shadow-2xl">
                        <div className="flex justify-between items-start gap-4 mb-8">
                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic ml-1">Question Prompt</Label>
                                    <Input
                                        placeholder="Enter your question here..."
                                        value={q.text}
                                        onChange={(e) => updateQuestionField(q.id, 'text', e.target.value)}
                                        className="h-12 border-none bg-muted/30 rounded-xl px-6 font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic ml-1">Image URL (Optional)</Label>
                                        <Input
                                            placeholder="https://example.com/image.jpg"
                                            value={q.imageUrl}
                                            onChange={(e) => updateQuestionField(q.id, 'imageUrl', e.target.value)}
                                            className="h-10 border-none bg-muted/20 rounded-xl px-4 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic ml-1">Explanation / Notes</Label>
                                        <Input
                                            placeholder="Explain the answer..."
                                            value={q.explanation}
                                            onChange={(e) => updateQuestionField(q.id, 'explanation', e.target.value)}
                                            className="h-10 border-none bg-muted/20 rounded-xl px-4 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuestion(q.id)}
                                className="text-muted-foreground hover:text-red-500 rounded-full h-10 w-10 mt-6"
                            >
                                <Trash2 size={18} />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options.map((opt) => (
                                <div key={opt.id} className="relative">
                                    <Input
                                        placeholder={`Option ${opt.id}...`}
                                        value={opt.text}
                                        onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                                        className={cn(
                                            "h-12 border-2 bg-transparent rounded-xl px-4 font-medium transition-all",
                                            q.correctOptionId === opt.id
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                                                : "border-muted/30 focus-visible:ring-indigo-600"
                                        )}
                                    />
                                    <button
                                        onClick={() => setCorrectOption(q.id, opt.id)}
                                        className={cn(
                                            "absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center transition-all",
                                            q.correctOptionId === opt.id
                                                ? "bg-emerald-500 text-white"
                                                : "bg-muted text-muted-foreground opacity-20 hover:opacity-100"
                                        )}
                                    >
                                        <CheckCircle2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <Button
                                variant="ghost"
                                onClick={() => addOption(q.id)}
                                className="h-12 rounded-xl border-2 border-dashed border-border/40 text-muted-foreground hover:text-indigo-600 hover:border-indigo-600 font-bold text-xs uppercase tracking-widest gap-2"
                            >
                                <Plus size={14} />
                                Add Option
                            </Button>
                        </div>
                    </Card>
                </div>
            ))}

            <Button
                onClick={addQuestion}
                className="w-full h-16 rounded-[2.5rem] bg-muted/30 border-2 border-dashed border-border/60 text-muted-foreground hover:text-indigo-600 hover:border-indigo-600 transition-all font-black uppercase tracking-widest text-xs gap-3"
            >
                <Plus size={20} />
                Add Another Question
            </Button>
        </div>
    )
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn("bg-card border rounded-3xl", className)}>{children}</div>
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <label className={cn("block text-sm font-medium", className)}>{children}</label>
}
