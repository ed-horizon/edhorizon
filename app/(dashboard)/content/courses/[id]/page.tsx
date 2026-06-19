import { getTopicsByCourse } from "../../actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { CourseDetailClient } from "@/components/features/content/CourseDetailClient";

export default async function CourseDetail({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = await paramsPromise;
    const topics = await getTopicsByCourse(params.id);
    const supabase = await createClient();

    const { data: course } = await supabase
        .from('courses')
        .select('*, modules(id, title)')
        .eq('id', params.id)
        .single();

    if (!course) return <div>Course not found</div>;

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href={`/content/modules/${course.modules?.id}`}>
                        <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-border/40">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Course</span>
                            <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">{course.title}</h1>
                        </div>
                        <p className="text-muted-foreground italic text-sm">{course.description || 'Curriculum management for this grade level.'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            <CourseDetailClient course={course} initialTopics={topics} />
        </div>
    );
}
