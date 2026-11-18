'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, CheckCircle2, ClipboardPaste, Sparkles, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseQuizText } from "@/lib/quiz-parser"
import { toast } from "sonner"

function safeUUID(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 10);
}

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
        initialData?.questions && initialData.questions.length > 0
            ? initialData.questions
            : [
                  {
                      id: safeUUID(),
                      text: "",
                      options: [
                          { id: "1", text: "" },
                          { id: "2", text: "" },
                      ],
                      correctOptionId: "1",
                      explanation: "",
                      imageUrl: "",
                  },
              ]
    );

    const [showQuickPaste, setShowQuickPaste] = useState(false);
    const [pasteRawText, setPasteRawText] = useState("");

    const updateQuestions = (newQuestions: Question[]) => {
        setQuestions(newQuestions);
        onChange({ questions: newQuestions });
    };

    // Pass initial state to parent on mount so default question is captured
    useEffect(() => {
        onChange({ questions });
    }, []);

    const addQuestion = () => {
        const newQuestion: Question = {
            id: safeUUID(),
            text: "",
            options: [
                { id: "1", text: "" },
                { id: "2", text: "" },
            ],
            correctOptionId: "1",
            explanation: "",
            imageUrl: "",
        };
        updateQuestions([...questions, newQuestion]);
    };

    const removeQuestion = (id: string) => {
        if (questions.length <= 1) return;
        updateQuestions(questions.filter((q) => q.id !== id));
    };

    const updateQuestionField = (id: string, field: keyof Question, value: any) => {
        updateQuestions(
            questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
        );
    };

    const addOption = (questionId: string) => {
        updateQuestions(
            questions.map((q) => {
                if (q.id === questionId) {
                    const nextId = (q.options.length + 1).toString();
                    return { ...q, options: [...q.options, { id: nextId, text: "" }] };
                }
                return q;
            })
        );
    };

    const removeOption = (questionId: string, optionId: string) => {
        updateQuestions(
            questions.map((q) => {
                if (q.id === questionId && q.options.length > 2) {
                    const nextOptions = q.options.filter((o) => o.id !== optionId);
                    const nextCorrect =
                        q.correctOptionId === optionId ? nextOptions[0].id : q.correctOptionId;
                    return { ...q, options: nextOptions, correctOptionId: nextCorrect };
                }
                return q;
            })
        );
    };

    const updateOptionText = (questionId: string, optionId: string, text: string) => {
        updateQuestions(
            questions.map((q) => {
                if (q.id === questionId) {
                    return {
                        ...q,
                        options: q.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
                    };
                }
                return q;
            })
        );
    };

    const setCorrectOption = (questionId: string, optionId: string) => {
        updateQuestions(
            questions.map((q) => (q.id === questionId ? { ...q, correctOptionId: optionId } : q))
        );
    };

    // Quick Paste Handler
    const handleApplyPaste = (mode: "replace" | "append") => {
        if (!pasteRawText.trim()) {
            toast.error("Please paste your quiz text first.");
            return;
        }

        const res = parseQuizText(pasteRawText);
        if (!res.success || res.questions.length === 0) {
            toast.error(res.error || "Could not parse quiz. Please check formatting.");
            return;
        }

        const newParsed: Question[] = res.questions.map((q) => ({
            id: safeUUID(),
            text: q.text,
            options: q.options.map((o, idx) => ({ id: String(idx + 1), text: o.text })),
            correctOptionId: q.correctOptionId || "1",
            explanation: q.explanation || "",
            imageUrl: "",
        }));

        if (mode === "replace") {
            updateQuestions(newParsed);
            toast.success(`Imported ${newParsed.length} question(s), replacing existing questions.`);
        } else {
            // Append mode: remove initial empty placeholder if only 1 blank question exists
            const existingNonEmpty = questions.filter((q) => q.text.trim().length > 0);
            updateQuestions([...existingNonEmpty, ...newParsed]);
            toast.success(`Added ${newParsed.length} question(s) to quiz.`);
        }

        setPasteRawText("");
        setShowQuickPaste(false);
    };

    // Check if pasted text inside an individual prompt looks like a whole quiz
    const handlePromptPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, questionId: string) => {
        const text = e.clipboardData.getData("text");
        // If pasted text contains multiple lines with option letters like A. or B.
        if (text && (text.includes("\n") || text.includes("\r")) && /[A-D][\.\)]/i.test(text)) {
            const parsed = parseQuizText(text);
            if (parsed.success && parsed.questions.length > 0) {
                // Pre-fill paste modal and suggest quick import
                toast.info("Detected full quiz text! Opening Quick Paste importer for you.", {
                    duration: 4000,
                });
                setPasteRawText(text);
                setShowQuickPaste(true);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Quick Paste Full Quiz Toolbar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-foreground">
                        {questions.length} Question{questions.length !== 1 ? "s" : ""} in Quiz
                    </span>
                </div>
                <Button
                    type="button"
                    variant={showQuickPaste ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowQuickPaste(!showQuickPaste)}
                    className="h-8 rounded-xl font-bold text-xs gap-1.5 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                >
                    <ClipboardPaste size={14} />
                    <span>{showQuickPaste ? "Close Quick Paste" : "📋 Quick Paste Full Quiz"}</span>
                </Button>
            </div>

            {/* QUICK PASTE PANEL */}
            {showQuickPaste && (
                <div className="p-5 rounded-2xl bg-card border-2 border-dashed border-indigo-500/40 space-y-4 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <ClipboardPaste className="text-indigo-600" size={16} />
                                Quick Paste Quiz (Auto-Parser)
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Paste your quiz questions from ChatGPT, Word, Google Docs, or text files. The parser automatically detects question numbers, options (A, B, C, D), and answers!
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowQuickPaste(false)}
                            className="h-8 w-8 rounded-lg"
                        >
                            <X size={16} />
                        </Button>
                    </div>

                    <Textarea
                        rows={8}
                        placeholder={`Paste your quiz here, for example:\n\n1. What is the sound of letter 'A'?\nA. /æ/ as in apple\nB. /b/ as in ball\nC. /k/ as in cat\nD. /d/ as in dog\nAnswer: A\n\n2. Which word has a short 'e' sound?\nA. Bed\nB. Bee\nC. Sea\nAnswer: A`}
                        value={pasteRawText}
                        onChange={(e) => setPasteRawText(e.target.value)}
                        className="font-mono text-xs leading-relaxed rounded-xl bg-background border-border"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-border/50">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-indigo-500" />
                            <span>Supports formats like 1. / Q1:, A. / a) / (A), and Answer: A / Ans: B</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyPaste("append")}
                                className="h-8 rounded-xl text-xs font-semibold"
                            >
                                Append to Existing
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => handleApplyPaste("replace")}
                                className="h-8 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Import & Replace All
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUESTIONS LIST */}
            <div className="space-y-6">
                {questions.map((q, qIndex) => (
                    <div key={q.id} className="relative group animate-in fade-in duration-200">
                        <Card className="rounded-2xl p-5 border border-border/60 shadow-sm bg-card hover:border-indigo-500/30 transition-all">
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <span className="h-7 w-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                                        {qIndex + 1}
                                    </span>
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Question #{qIndex + 1}
                                    </Label>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeQuestion(q.id)}
                                    disabled={questions.length <= 1}
                                    className="text-muted-foreground hover:text-red-500 rounded-lg h-8 w-8 disabled:opacity-20"
                                    title={
                                        questions.length <= 1
                                            ? "At least one question is required"
                                            : "Delete question"
                                    }
                                >
                                    <Trash2 size={15} />
                                </Button>
                            </div>

                            {/* Question Prompt */}
                            <div className="space-y-3 mb-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Question Prompt *
                                    </Label>
                                    <Textarea
                                        rows={2}
                                        placeholder="Type or paste your question prompt here..."
                                        value={q.text}
                                        onChange={(e) =>
                                            updateQuestionField(q.id, "text", e.target.value)
                                        }
                                        onPaste={(e) => handlePromptPaste(e, q.id)}
                                        className="resize-none font-medium text-sm rounded-xl border-border bg-background focus-visible:ring-indigo-600"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Image URL (Optional)
                                        </Label>
                                        <Input
                                            placeholder="https://example.com/illustration.png"
                                            value={q.imageUrl || ""}
                                            onChange={(e) =>
                                                updateQuestionField(q.id, "imageUrl", e.target.value)
                                            }
                                            className="h-9 rounded-xl text-xs bg-background border-border"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Explanation / Notes (Optional)
                                        </Label>
                                        <Input
                                            placeholder="Explain why this answer is correct..."
                                            value={q.explanation || ""}
                                            onChange={(e) =>
                                                updateQuestionField(q.id, "explanation", e.target.value)
                                            }
                                            className="h-9 rounded-xl text-xs bg-background border-border"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Options Grid */}
                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Options (Click checkmark to select correct answer)
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => addOption(q.id)}
                                        className="h-7 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 rounded-lg"
                                    >
                                        <Plus size={13} />
                                        <span>Add Option</span>
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {q.options.map((opt, optIndex) => {
                                        const isCorrect = q.correctOptionId === opt.id;
                                        const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D...

                                        return (
                                            <div
                                                key={opt.id}
                                                className="relative flex items-center gap-1.5"
                                            >
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-muted-foreground">
                                                        {optionLetter}.
                                                    </span>
                                                    <Input
                                                        placeholder={`Option ${optionLetter}...`}
                                                        value={opt.text}
                                                        onChange={(e) =>
                                                            updateOptionText(q.id, opt.id, e.target.value)
                                                        }
                                                        className={cn(
                                                            "h-10 rounded-xl pl-8 pr-9 font-medium text-xs transition-all",
                                                            isCorrect
                                                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500"
                                                                : "border-border bg-background focus-visible:ring-indigo-600"
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setCorrectOption(q.id, opt.id)}
                                                        title={
                                                            isCorrect
                                                                ? "Marked as correct answer"
                                                                : "Click to mark as correct answer"
                                                        }
                                                        className={cn(
                                                            "absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center transition-all",
                                                            isCorrect
                                                                ? "bg-emerald-500 text-white"
                                                                : "text-muted-foreground/30 hover:text-emerald-600 hover:bg-emerald-50"
                                                        )}
                                                    >
                                                        <CheckCircle2 size={13} />
                                                    </button>
                                                </div>

                                                {q.options.length > 2 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeOption(q.id, opt.id)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-lg shrink-0"
                                                        title="Remove option"
                                                    >
                                                        <Trash2 size={13} />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Add Question Button */}
            <Button
                type="button"
                onClick={addQuestion}
                className="w-full h-14 rounded-2xl bg-muted/30 border-2 border-dashed border-border/70 text-muted-foreground hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all font-bold text-xs uppercase tracking-wider gap-2 shadow-xs"
            >
                <Plus size={16} />
                <span>Add Question ({questions.length + 1})</span>
            </Button>
        </div>
    );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("bg-card border rounded-3xl", className)}>{children}</div>;
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
    return <label className={cn("block text-sm font-medium", className)}>{children}</label>;
}
