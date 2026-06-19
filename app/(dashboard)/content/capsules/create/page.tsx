import { getTopics, getTutorStudents } from "../../actions";
import { CapsuleBuilder } from "@/components/features/content/CapsuleBuilder";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CreateCapsulePage() {
    const topics = await getTopics();
    const students = await getTutorStudents();

    return (
        <div className="space-y-10 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Link href="/content">
                        <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-border/40">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Create New Capsule</h1>
                        <p className="text-muted-foreground mt-1">Design an interactive learning unit for your syllabus.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            {/* Builder Component */}
            <CapsuleBuilder topics={topics} students={students} />
        </div>
    );
}
