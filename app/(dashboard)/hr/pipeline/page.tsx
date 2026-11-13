import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isHRPipelineAuthorized } from "@/lib/hr-candidates";
import { getHRCandidates } from "./actions";
import { CandidatePipelineView } from "@/components/features/hr/candidate-pipeline/CandidatePipelineView";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { UsersRound, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
    title: "HR Candidate Pipeline | EdHorizon LMS",
    description: "Manage candidate profiles, interview pipeline, and hiring feedback.",
};

export default async function HRPipelinePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (!isHRPipelineAuthorized(profile?.role)) {
        redirect("/hr");
    }

    const { candidates } = await getHRCandidates();

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div className="flex items-center gap-3">
                    <Link href="/hr">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl border border-border bg-card"
                            title="Back to HR Dashboard"
                        >
                            <ArrowLeft size={16} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <UsersRound className="text-indigo-600" size={24} />
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground font-serif">
                                HR Pipeline
                            </h1>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            HR recruitment CRM to track candidate leads, interviews, discussed salaries, and feedback.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                    <ThemeToggle />
                </div>
            </div>

            {/* Main Pipeline Board */}
            <CandidatePipelineView
                initialCandidates={candidates}
                currentUserRole={profile?.role || "hr"}
            />
        </div>
    );
}

