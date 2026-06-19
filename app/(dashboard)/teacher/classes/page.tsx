import { getLiveClasses } from "@/app/(dashboard)/attendance/actions";
import { TeacherLiveClasses } from "@/components/features/teacher/TeacherLiveClasses";

export default async function TeacherClassesPage() {
    const liveClasses = await getLiveClasses();

    return (
        <div className="p-8 md:p-12 max-w-[1600px] mx-auto space-y-8">
            <div>
                <h1 className="text-4xl font-serif font-bold italic tracking-tight text-indigo-950 dark:text-indigo-50">
                    Live Classes Directory
                </h1>
                <p className="text-muted-foreground italic mt-1">
                    Manage and launch all scheduled sessions for your students.
                </p>
            </div>
            <TeacherLiveClasses classes={liveClasses} />
        </div>
    );
}
