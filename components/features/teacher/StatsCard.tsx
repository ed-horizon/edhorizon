
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Clock } from "lucide-react";

interface StatsCardProps {
    stats: {
        students: number;
        capsules: number;
        hours: number;
    }
}

export default function StatsCard({ stats }: StatsCardProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[2.5rem] border-border/40 shadow-xl overflow-hidden bg-white dark:bg-[#111]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-60">Active Students</CardTitle>
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Users size={18} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-serif font-bold italic tracking-tight">{stats.students}</div>
                    <p className="text-[10px] text-muted-foreground italic font-black uppercase tracking-widest mt-2">Mentees assigned</p>
                </CardContent>
            </Card>
            
            <Card className="rounded-[2.5rem] border-border/40 shadow-xl overflow-hidden bg-white dark:bg-[#111]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-60">Created Capsules</CardTitle>
                    <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <BookOpen size={18} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-serif font-bold italic tracking-tight">{stats.capsules}</div>
                    <p className="text-[10px] text-muted-foreground italic font-black uppercase tracking-widest mt-2">Content modules</p>
                </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-border/40 shadow-xl overflow-hidden bg-white dark:bg-[#111]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-60">Teaching Hours</CardTitle>
                    <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Clock size={18} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-serif font-bold italic tracking-tight">{stats.hours}h</div>
                    <p className="text-[10px] text-muted-foreground italic font-black uppercase tracking-widest mt-2">Logged this month</p>
                </CardContent>
            </Card>
        </div>
    );
}
