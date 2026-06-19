'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ChevronRight, PlayCircle, HelpCircle, FileText, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { saveTopic } from "@/app/(dashboard)/content/actions"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function CourseDetailClient({ course, initialTopics }: { course: any, initialTopics: any[] }) {
    const [topics, setTopics] = useState(initialTopics)
    const [showModal, setShowModal] = useState(false)
    const [title, setTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

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
            {/* Topics Section */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-serif font-bold">Syllabus & Topics</h2>
                    <Button 
                        onClick={() => setShowModal(true)}
                        variant="outline" 
                        className="rounded-2xl h-10 px-6 gap-2 border-border/40 font-bold text-xs uppercase tracking-widest bg-card cursor-pointer"
                    >
                        <Plus size={14} />
                        Add Topic
                    </Button>
                </div>

                <div className="space-y-6">
                    {topics.map((topic) => (
                        <div key={topic.id} className="space-y-4">
                            <div className="flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-indigo-600" />
                                    <h3 className="text-xl font-bold text-foreground">{topic.title}</h3>
                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black italic">
                                        {topic.capsules?.length || 0} Capsules
                                    </Badge>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                    <MoreHorizontal size={14} />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-4">
                                {topic.capsules?.map((capsule: any) => (
                                    <Card key={capsule.id} className="rounded-[2.5rem] border border-border/30 hover:border-indigo-500/50 hover:shadow-2xl transition-all overflow-hidden bg-card group">
                                        <CardHeader className="p-6 pb-2">
                                            <div className="flex items-start justify-between">
                                                <div className={`p-3 rounded-2xl w-fit mb-4 ${capsule.type === 'video' ? 'bg-rose-50 text-rose-600' :
                                                    capsule.type === 'quiz' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-indigo-50 text-indigo-600'
                                                    }`}>
                                                    {capsule.type === 'video' ? <PlayCircle size={20} /> :
                                                        capsule.type === 'quiz' ? <HelpCircle size={20} /> :
                                                            <FileText size={20} />}
                                                </div>
                                                <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider rounded-full py-0.5 px-3 border-border/50">
                                                    {capsule.status}
                                                </Badge>
                                            </div>
                                            <h4 className="font-bold text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{capsule.title}</h4>
                                        </CardHeader>
                                        <CardContent className="p-6 pt-0">
                                            <div className="flex items-center justify-between mt-6">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Last Updated: {new Date(capsule.created_at).toLocaleDateString()}</span>
                                                <Link href={`/student/learn/${capsule.id}`}>
                                                    <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 bg-muted/30 hover:bg-indigo-600 hover:text-white transition-all">
                                                        <ChevronRight size={18} />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Link href="/content/capsules/create" className="flex">
                                    <Button variant="outline" className="rounded-[2.5rem] border-2 border-dashed border-border/50 h-auto min-h-[180px] w-full flex flex-col items-center justify-center gap-3 hover:bg-muted/30 transition-all bg-transparent cursor-pointer">
                                        <Plus className="text-muted-foreground" size={32} />
                                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground italic">Add Capsule</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
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
        </div>
    )
}
