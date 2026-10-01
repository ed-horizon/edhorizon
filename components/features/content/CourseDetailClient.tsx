'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ChevronRight, PlayCircle, HelpCircle, FileText, MoreHorizontal, Pencil, Search, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { saveTopic } from "@/app/(dashboard)/content/actions"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { EditCapsuleModal } from "./EditCapsuleModal"
import { cn } from "@/lib/utils"

export function CourseDetailClient({ course, initialTopics }: { course: any, initialTopics: any[] }) {
    const [topics, setTopics] = useState(initialTopics)
    const [showModal, setShowModal] = useState(false)
    const [title, setTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const [editingCapsule, setEditingCapsule] = useState<any>(null)
    const [selectedFilter, setSelectedFilter] = useState<'active' | 'completed' | 'all'>('active')
    const [searchQuery, setSearchQuery] = useState('')
    const router = useRouter()

    const allCapsules = topics.flatMap(t => t.capsules || [])
    const activeCount = allCapsules.filter(c => !(c.quiz_completions && c.quiz_completions.length > 0)).length
    const completedCount = allCapsules.filter(c => c.quiz_completions && c.quiz_completions.length > 0).length
    const totalCount = allCapsules.length

    const handleAddTopic = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title) return
        setLoading(true)
        try {
            const newTopic = await saveTopic({
                course_id: course.id,
                title
            })
            setTopics(prev => [...prev, { ...newTopic, capsules: [] }])
            setShowModal(false)
            setTitle('')
            router.refresh()
        } catch (error) {
            console.error("Failed to add topic:", error)
            alert("Error adding topic.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-10">
            {/* Filter and Control Bar */}
            <div className="bg-card rounded-[2.5rem] p-6 border border-border/30 shadow-xl flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search capsules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 bg-muted/20 border-none rounded-full h-12 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 text-xs"
                        />
                    </div>

                    {/* Sliding Segmented Tab matching Student Directory */}
                    <div className="flex p-1 bg-muted/40 rounded-full w-full sm:w-fit border border-border/20">
                        <button
                            onClick={() => setSelectedFilter("active")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                                selectedFilter === "active" 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <span>Active</span>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-extrabold",
                                selectedFilter === "active" ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {activeCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setSelectedFilter("completed")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                                selectedFilter === "completed" 
                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <span>Completed</span>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-extrabold",
                                selectedFilter === "completed" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {completedCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setSelectedFilter("all")}
                            className={cn(
                                "flex-1 sm:flex-none px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                                selectedFilter === "all" 
                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <span>All</span>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-extrabold",
                                selectedFilter === "all" ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {totalCount}
                            </span>
                        </button>
                    </div>
                </div>

                <Button 
                    onClick={() => setShowModal(true)}
                    variant="outline" 
                    className="rounded-full h-12 px-8 gap-2 border-border/40 font-bold text-xs uppercase tracking-widest bg-card cursor-pointer w-full lg:w-auto"
                >
                    <Plus size={16} />
                    Add Topic
                </Button>
            </div>

            {/* Topics Section */}
            <div className="space-y-8">
                <h2 className="text-2xl font-serif font-bold px-2">Syllabus & Topics</h2>

                <div className="space-y-8">
                    {topics.map((topic) => {
                        const rawCapsules = topic.capsules || []
                        
                        // Filter capsules by tab & search query
                        const filteredCapsules = rawCapsules.filter((capsule: any) => {
                            const isCompleted = capsule.quiz_completions && capsule.quiz_completions.length > 0
                            const matchesTab = 
                                selectedFilter === 'active' ? !isCompleted :
                                selectedFilter === 'completed' ? isCompleted :
                                true

                            const matchesSearch = !searchQuery.trim() || 
                                capsule.title?.toLowerCase().includes(searchQuery.toLowerCase())

                            return matchesTab && matchesSearch
                        })

                        // Sort so active capsules stay in front
                        const sortedCapsules = [...filteredCapsules].sort((a: any, b: any) => {
                            const aComp = a.quiz_completions && a.quiz_completions.length > 0 ? 1 : 0
                            const bComp = b.quiz_completions && b.quiz_completions.length > 0 ? 1 : 0
                            return aComp - bComp // Active (0) before Completed (1)
                        })

                        return (
                            <div key={topic.id} className="space-y-4">
                                <div className="flex items-center justify-between px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                                        <h3 className="text-xl font-bold text-foreground">{topic.title}</h3>
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg text-[10px] font-black italic">
                                            {sortedCapsules.length} {selectedFilter === 'all' ? 'Capsules' : `${selectedFilter} capsules`}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                        <MoreHorizontal size={14} />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-4">
                                    {sortedCapsules.map((capsule: any) => {
                                        const isCompleted = capsule.quiz_completions && capsule.quiz_completions.length > 0
                                        const completion = isCompleted ? capsule.quiz_completions[0] : null

                                        return (
                                            <Card key={capsule.id} className="rounded-[2.5rem] border border-border/30 hover:border-indigo-500/50 hover:shadow-2xl transition-all overflow-hidden bg-card group">
                                                <CardHeader className="p-6 pb-2">
                                                    <div className="flex items-start justify-between">
                                                        <div className={`p-3 rounded-2xl w-fit mb-4 ${capsule.type === 'video' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' :
                                                            capsule.type === 'quiz' || capsule.type === 'mcq' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' :
                                                                'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300'
                                                            }`}>
                                                            {capsule.type === 'video' ? <PlayCircle size={20} /> :
                                                                capsule.type === 'quiz' || capsule.type === 'mcq' ? <HelpCircle size={20} /> :
                                                                    <FileText size={20} />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider rounded-full py-0.5 px-3 border-border/50">
                                                                {capsule.status}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setEditingCapsule(capsule)}
                                                                className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-indigo-600"
                                                                title="Edit / Delete Capsule"
                                                            >
                                                                <Pencil size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="font-bold text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{capsule.title}</h4>
                                                        {isCompleted ? (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-none text-[10px] font-bold py-1 px-3.5 gap-1.5 shadow-sm">
                                                                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                                    Completed by {completion?.student?.full_name || 'Student'} ({completion?.score !== undefined ? `${completion.score}%` : 'Done'})
                                                                </Badge>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-none text-[10px] font-bold py-1 px-3.5 gap-1.5 shadow-sm">
                                                                    <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                                                                    Active (Pending Student Completion)
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-6 pt-0">
                                                    <div className="flex items-center justify-between mt-6">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                                                            {new Date(capsule.created_at).toLocaleDateString()}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setEditingCapsule(capsule)}
                                                                className="rounded-full text-[10px] font-bold uppercase tracking-wider h-8 px-3 cursor-pointer"
                                                            >
                                                                Manage
                                                            </Button>
                                                            <Link href={`/student/learn/${capsule.id}`}>
                                                                <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 bg-muted/30 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                                                                    <ChevronRight size={18} />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}

                                    {sortedCapsules.length === 0 && (
                                        <div className="col-span-full py-10 bg-muted/10 rounded-[2rem] border border-dashed border-border/40 text-center text-xs text-muted-foreground italic">
                                            No {selectedFilter === 'all' ? '' : selectedFilter} capsules found in this topic.
                                        </div>
                                    )}

                                    {selectedFilter !== 'completed' && (
                                        <Link href="/content/capsules/create" className="flex">
                                            <Button variant="outline" className="rounded-[2.5rem] border-2 border-dashed border-border/50 h-auto min-h-[180px] w-full flex flex-col items-center justify-center gap-3 hover:bg-muted/30 transition-all bg-transparent cursor-pointer">
                                                <Plus className="text-muted-foreground" size={32} />
                                                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground italic">Add Capsule</span>
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {topics.length === 0 && (
                        <div className="py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground italic">
                            <Plus size={48} className="opacity-10 mb-4" />
                            <p>No topics added to this course syllabus yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full rounded-[2.5rem] p-8 space-y-6 bg-card border border-border/40 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-2xl font-serif font-bold">Add New Topic</h3>
                        <form onSubmit={handleAddTopic} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Topic Title</Label>
                                <Input 
                                    placeholder="e.g. Introduction to Fractions" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="rounded-xl h-12"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl h-12 px-6"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-6"
                                >
                                    {loading ? 'Adding...' : 'Add Topic'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            <EditCapsuleModal
                capsule={editingCapsule}
                isOpen={!!editingCapsule}
                onClose={() => setEditingCapsule(null)}
            />
        </div>
    )
}


