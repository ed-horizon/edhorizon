'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, BookOpen, ChevronRight, Settings } from "lucide-react"
import Link from "next/link"
import { saveCourse } from "@/app/(dashboard)/content/actions"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export function ModuleDetailClient({ mod, initialCourses }: { mod: any, initialCourses: any[] }) {
    const [courses, setCourses] = useState(initialCourses)
    const [showModal, setShowModal] = useState(false)
    const [title, setTitle] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title) return
        setLoading(true)
        try {
            const newCourse = await saveCourse({
                module_id: mod.id,
                title
            })
            setCourses(prev => [...prev, newCourse])
            setShowModal(false)
            setTitle('')
            router.refresh()
        } catch (error) {
            console.error("Failed to add course:", error)
            alert("Error adding course.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Module</span>
                        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">{mod.title}</h1>
                    </div>
                    <p className="text-muted-foreground italic text-sm">{mod.description}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="rounded-2xl h-12 px-6 gap-2 border-border/40 font-bold text-xs uppercase tracking-widest">
                        <Settings size={16} />
                        Module Settings
                    </Button>
                </div>
            </div>

            {/* Courses Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2 px-2">
                    <h2 className="text-2xl font-serif font-bold">Grade Levels & Courses</h2>
                    <Button 
                        onClick={() => setShowModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs gap-2"
                    >
                        <Plus size={18} />
                        Add Course
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {courses.map((course) => (
                        <Card key={course.id} className="rounded-[2rem] border border-border/30 hover:shadow-xl transition-all overflow-hidden group">
                            <Link href={`/content/courses/${course.id}`} className="flex items-center p-6 gap-6">
                                <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                    <BookOpen size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-1 italic">
                                        Curriculum course structure.
                                    </p>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">Active</span>
                                    </div>
                                    <ChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        </Card>
                    ))}
                    {courses.length === 0 && (
                        <div className="py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground italic">
                            <Plus size={48} className="opacity-10 mb-4" />
                            <p>No courses found in this module yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full rounded-[2.5rem] p-8 space-y-6 bg-card border border-border/40 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-2xl font-serif font-bold">Add New Course</h3>
                        <form onSubmit={handleAddCourse} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Course Title</Label>
                                <Input 
                                    placeholder="e.g. Grade 1 English" 
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
                                    {loading ? 'Adding...' : 'Add Course'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    )
}
