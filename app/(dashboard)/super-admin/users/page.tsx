
import { getUsers } from "./actions";
import UserTable from "@/components/features/admin/UserTable";
import CreateUserModal from "@/components/features/admin/CreateUserModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AdminUsersPage() {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id || '').single();
    const currentUserRole = profile?.role || '';
    const users = await getUsers();
    console.log(">>> [DIAGNOSTIC] Logged in User:", user?.email, "| Role in DB:", profile?.role, "| Users Fetched count:", users?.length);

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-primary">User Management</h1>
                    <p className="text-muted-foreground">Manage platform access and roles.</p>
                </div>
                <CreateUserModal />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>View and manage all registered users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <UserTable users={users} currentUserRole={currentUserRole} />
                </CardContent>
            </Card>
        </div>
    );
}
