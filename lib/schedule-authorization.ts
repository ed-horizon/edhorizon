export const SCHEDULE_MANAGER_ROLES = new Set(['admin', 'super_admin', 'hr', 'operations']);

export type ScheduleActor = {
    id: string;
    role: string;
    isManager: boolean;
};

export function canManageSchedule(actor: ScheduleActor | null, teacherId: string) {
    return Boolean(actor && (actor.isManager || (actor.role === 'teacher' && actor.id === teacherId)));
}
