import { getModules } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Book, Plus, BookOpen, Layers, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ContentStudio() {
    const modules = await getModules();

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Content Studio</h1>
                    <p className="text-muted-foreground mt-1">Manage your subjects, courses, and learning capsules.</p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl border-none p-8 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                    <div>
                        <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
                            <Plus size={24} />
                        </div>
                        <h3 className="text-xl font-bold">New Module</h3>
                        <p className="text-xs opacity-70 mt-1 italic text-indigo-100">Create a high-level subject area.</p>
                    </div>
                    <Link href="/content/modules/create">
                        <Button className="mt-8 bg-white text-indigo-600 hover:bg-white/90 rounded-2xl h-12 font-black uppercase tracking-widest text-xs w-full">
                            Get Started
                        </Button>
                    </Link>
                </Card>

                <Card className="rounded-[2.5rem] bg-card border border-border/40 shadow-xl p-8 flex flex-col justify-between group overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Book size={80} />
                    </div>
                    <div>
                        <div className="p-3 bg-amber-500/10 rounded-2xl w-fit mb-4 text-amber-600">
                            <BookOpen size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Create Capsule</h3>
                        <p className="text-xs text-muted-foreground mt-1 italic">Flashcards, MCQs, or Videos.</p>
                    </div>
                    <Link href="/content/capsules/create">
                        <Button variant="outline" className="mt-8 border-indigo-600 text-indigo-600 rounded-2xl h-12 font-black uppercase tracking-widest text-xs w-full">
                            Launch Builder
                        </Button>
                    </Link>
                </Card>

                <Card className="rounded-[2.5rem] bg-card border border-border/40 shadow-xl p-8 flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Content Units</p>
                    <p className="text-3xl font-bold text-foreground tracking-tighter">1,240 Capsules</p>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted" />
                            ))}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground relative bottom-0.5 ml-2">+12 active teachers</span>
                    </div>
                </Card>
            </div>

            {/* Modules Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-serif font-bold px-2">Active Modules</h2>
                    <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-indigo-600">View All</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {modules.map((mod: any) => (
                        <Card key={mod.id} className="rounded-[2.5rem] border border-border/30 shadow-xl overflow-hidden hover:shadow-2xl transition-all">
                            <div className="h-40 bg-gradient-to-br from-indigo-500 to-violet-600 p-8 text-white relative">
                                <div className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <MoreVertical size={16} />
                                </div>
                                <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
                                    <Layers size={20} />
                                </div>
                                <h3 className="text-2xl font-bold tracking-tight">{mod.title}</h3>
                            </div>
                            <CardContent className="p-8">
                                {mod.student?.full_name && (
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit mb-4 italic">
                                        Assigned to: {mod.student.full_name}
                                    </div>
                                )}
                                <p className="text-sm text-muted-foreground line-clamp-2 italic mb-6">
                                    {mod.description || "No description provided."}
                                </p>
                                <Link href={`/content/modules/${mod.id}`}>
                                    <Button className="w-full rounded-2xl h-12 font-bold uppercase tracking-widest text-xs bg-muted text-foreground hover:bg-muted/80">
                                        Manage Courses
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                    {modules.length === 0 && (
                        <div className="col-span-full py-20 bg-muted/20 rounded-[3rem] border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground italic">
                            <Book size={48} className="opacity-10 mb-4" />
                            <p>No modules found. Create your first subject above!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
