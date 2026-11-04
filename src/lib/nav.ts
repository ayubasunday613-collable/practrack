import {
  Award, BarChart3, BookOpen, Bell, ClipboardCheck, ClipboardList, FileText, FlaskConical, GraduationCap,
  Inbox, LayoutDashboard, Settings, Sparkles, User, Users, Send,
} from "lucide-react";
import type { NavItem } from "@/components/app/AppShell";

export const studentNav: NavItem[] = [
  { to: "/student", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/student/practicals", label: "My Practicals", icon: FlaskConical },
  { to: "/student/reports", label: "My Reports", icon: FileText },
  { to: "/student/submissions", label: "Submissions", icon: Send },
  { to: "/student/grades", label: "My Grades", icon: Award },
  { to: "/student/ai-feedback", label: "AI Feedback", icon: Sparkles },
  { to: "/student/profile", label: "My Profile", icon: User },
];

export const adminNav: NavItem[] = [
  { to: "/technologist", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/technologist/students", label: "Students", icon: Users },
  { to: "/technologist/courses", label: "Courses", icon: BookOpen },
  { to: "/technologist/practicals", label: "Manage Practicals", icon: FlaskConical },
  { to: "/technologist/submissions", label: "Report Submissions", icon: Inbox },
  { to: "/technologist/ai-grading", label: "AI Grading Setup", icon: Sparkles },
  { to: "/technologist/grade-approval", label: "Grade Approval", icon: ClipboardCheck },
  { to: "/technologist/reports", label: "Assessment Reports", icon: BarChart3 },
  { to: "/technologist/notifications", label: "Notifications", icon: Bell },
  { to: "/technologist/settings", label: "Settings", icon: Settings },
];

export { ClipboardList, GraduationCap };
