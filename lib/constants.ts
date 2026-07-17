
import {
    BookOpen,
    LayoutDashboard,
    Users,
    Settings,
    BarChart3,
    DollarSign,
    FileText,
    GraduationCap,
    Briefcase,
    UsersRound,
    CalendarDays
} from "lucide-react";

export const ROLE_REDIRECTS = {
    super_admin: "/super-admin",
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/student", // Parents view student dashboard (read-only)
    sales: "/sales",
    sales_head: "/sales",
    hr: "/hr",
    operations: "/operations",
};

export const NAV_ITEMS = [
    {
        title: "Operations",
        href: "/operations",
        icon: Settings,
        roles: ["super_admin", "admin", "operations"],
    },
    {
        title: "Schedules Monitor",
        href: "/operations/schedules",
        icon: CalendarDays,
        roles: ["super_admin", "admin", "operations"],
    },
    {
        title: "Fees Ledger",
        href: "/operations/fee-ledger",
        icon: DollarSign,
        roles: ["super_admin", "admin", "operations"],
    },
    {
        title: "Dashboard",
        href: "/student",
        icon: LayoutDashboard,
        roles: ["student", "parent"],
    },

    {
        title: "Class Schedules",
        href: "/admin/schedules",
        icon: CalendarDays,
        roles: ["super_admin", "admin", "hr", "operations"],
    },
    {
        title: "Tutor Schedules",
        href: "/tutors-schedule",
        icon: UsersRound,
        roles: ["sales", "sales_head", "hr", "operations", "super_admin", "admin"],
    },
    {
        title: "Learn",
        href: "/student/learn",
        icon: BookOpen,
        roles: ["student", "parent"],
    },
    {
        title: "Dashboard",
        href: "/teacher",
        icon: LayoutDashboard,
        roles: ["teacher"],
    },
    {
        title: "My Classes",
        href: "/teacher/classes",
        icon: Users,
        roles: ["teacher"],
    },
    {
        title: "Dashboard",
        href: "/super-admin",
        icon: LayoutDashboard,
        roles: ["super_admin"],
    },
    {
        title: "Monthly Report",
        href: "/super-admin/monthly-report",
        icon: BarChart3,
        roles: ["super_admin"],
    },
    {
        title: "My Students",
        href: "/super-admin/my-students",
        icon: GraduationCap,
        roles: ["super_admin"],
    },
    {
        title: "Sales Leaderboard",
        href: "/super-admin/sales-leaderboard",
        icon: BarChart3,
        roles: ["super_admin"],
    },
    {
        title: "Users",
        href: "/super-admin/users",
        icon: Users,
        roles: ["super_admin", "admin"],
    },
    {
        title: "Content",
        href: "/content",
        icon: FileText,
        roles: ["super_admin", "admin", "teacher"],
    },
    {
        title: "Pipeline",
        href: "/sales",
        icon: DollarSign,
        roles: ["sales", "sales_head", "super_admin"],
    },
    {
        title: "Staff & Payroll",
        href: "/hr",
        icon: Briefcase,
        roles: ["hr", "super_admin"],
    },
    {
        title: "Staff Directory",
        href: "/hr/staff",
        icon: Users,
        roles: ["hr", "super_admin", "admin"],
    },
    {
        title: "Student Directory",
        href: "/hr/students",
        icon: GraduationCap,
        roles: ["hr", "super_admin", "admin", "operations"],
    },
    {
        title: "Payroll Pulse",
        href: "/hr/payroll",
        icon: DollarSign,
        roles: ["hr", "super_admin"],
    },
    {
        title: "Sales Performance",
        href: "/hr/sales-performance",
        icon: BarChart3,
        roles: ["hr", "super_admin"],
    },
    {
        title: "Monthly Class Logs",
        href: "/class-logs",
        icon: CalendarDays,
        roles: ["student", "parent", "teacher", "hr", "super_admin", "operations", "admin", "sales_head"],
    },
];
