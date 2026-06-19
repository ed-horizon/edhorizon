import { getCoursesByModule } from "../../actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { parseDescription } from "@/lib/utils";
import { ModuleDetailClient } from "@/components/features/content/ModuleDetailClient";

export default async function ModuleDetail({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = await paramsPromise;

    // Basic UUID validation to prevent 22P02 Postgres errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
        return <div className="p-8 text-center text-rose-500 font-bold">Invalid Module ID format.</div>;
    }

    const courses = await getCoursesByModule(params.id);
    const supabase = await createClient();

    const { data: mod, error } = await supabase
        .from('modules')
        .select('*')
        .eq('id', params.id)
        .single();

    if (error || !mod) return <div className="p-8 text-center">Module not found or error loading details.</div>;

    const { studentId, cleanDescription } = parseDescription(mod.description);
    const parsedMod = {
        ...mod,
        student_id: studentId,
        description: cleanDescription
    };

    return (
        <div className="space-y-10">
            {/* Navigation and Theme Toggle wrapper */}
            <div className="flex items-center justify-between">
                <Link href="/content">
                    <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-border/40">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <ThemeToggle />
            </div>

            <ModuleDetailClient mod={parsedMod} initialCourses={courses} />
        </div>
    );
}
