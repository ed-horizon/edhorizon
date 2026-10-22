import { getBatches, getTutorsList } from "./actions";
import { createClient } from "@/lib/supabase/server";
import BatchesListClient from "@/components/features/batches/BatchesListClient";

export const metadata = {
    title: "Batch Classes | EdHorizon",
    description: "Manage cohort batch classes, enrollment rosters, session schedules, and learning content."
};

export default async function BatchesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userRole = 'student';
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (profile?.role) {
            userRole = profile.role;
        }
    }

    const [batches, tutors] = await Promise.all([
        getBatches(),
        getTutorsList()
    ]);

    return (
        <div className="space-y-8">
            <BatchesListClient 
                initialBatches={batches} 
                tutors={tutors} 
                userRole={userRole} 
            />
        </div>
    );
}
