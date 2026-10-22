import { getLiveClasses } from "@/app/(dashboard)/attendance/actions";
import { TeacherLiveClasses } from "@/components/features/teacher/TeacherLiveClasses";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";

export default async function TeacherClassesPage() {
    const liveClasses = await getLiveClasses();

    return (
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-serif font-bold italic tracking-tight text-indigo-950 dark:text-indigo-50">
                        Live Classes Directory
                    </h1>
                    <p className="text-muted-foreground italic mt-1">
                        Manage and launch all scheduled sessions for your students.
                    </p>
                </div>
                <Link href="/batches">
                    <Button variant="outline" className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                        <Layers size={16} />
                        View Cohort Batch Classes →
                    </Button>
                </Link>
            </div>
            <TeacherLiveClasses classes={liveClasses} />
        </div>
    );
}
