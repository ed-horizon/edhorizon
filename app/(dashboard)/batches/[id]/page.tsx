import { notFound } from "next/navigation";
import { getBatchById, getAvailableStudentsForBatch, getBatchesWithContent, getTutorsList } from "../actions";
import BatchDetailClient from "@/components/features/batches/BatchDetailClient";

export const metadata = {
    title: "Batch Hub | EdHorizon",
    description: "Manage batch details, student enrollment, sessions, and learning content."
};

interface BatchDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
    const { id } = await params;

    const [batch, availableStudents, batchesWithContent, tutors] = await Promise.all([
        getBatchById(id),
        getAvailableStudentsForBatch(id),
        getBatchesWithContent(id),
        getTutorsList()
    ]);

    if (!batch) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <BatchDetailClient 
                batch={batch}
                availableStudents={availableStudents}
                batchesWithContent={batchesWithContent}
                tutors={tutors}
            />
        </div>
    );
}
