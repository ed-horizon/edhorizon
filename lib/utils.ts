import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hoursStr = parts[0];
  const minutesStr = parts[1];
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutesStr.padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

export function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return "";
  const cleanUrl = url.trim();
  if (/^https?:\/\//i.test(cleanUrl)) {
    return cleanUrl;
  }
  return `https://${cleanUrl}`;
}

export function getRoleDisplayName(role: string | null | undefined, name?: string | null): string {
  if (name) return name;
  if (!role) return "Staff";
  const mapping: Record<string, string> = {
    teacher: "Tutor",
    operations: "Operations",
    hr: "HR",
    admin: "Admin",
    super_admin: "Super Admin",
    student: "Student",
    parent: "Parent"
  };
  return mapping[role.toLowerCase()] || role;
}

export function formatClassTitle(title: string | null | undefined): { title: string; isCompensation: boolean } {
  if (!title) return { title: "", isCompensation: false };
  const isCompensation = title.includes("[Compensation]");
  const cleanTitle = title.replace(/\s*\[Compensation\]\s*/g, " ").replace(/\s+$/, "").trim();
  return { title: cleanTitle, isCompensation };
}

export function parseStudentIdAndMobile(customIdStr: string | null | undefined): { studentId: string; mobileNumber: string } {
  if (!customIdStr) return { studentId: "", mobileNumber: "" };
  const str = customIdStr.trim();
  if (str.startsWith("{")) {
    try {
      const parsed = JSON.parse(str);
      return {
        studentId: parsed.id || "",
        mobileNumber: parsed.mobile || ""
      };
    } catch (e) {
      // Fallback if parsing fails
    }
  }
  if (str.includes("|")) {
    const parts = str.split("|");
    return {
      studentId: parts[0] || "",
      mobileNumber: parts[1] || ""
    };
  }
  return { studentId: str, mobileNumber: "" };
}

export function formatStudentIdAndMobile(studentId: string | null | undefined, mobileNumber: string | null | undefined): string {
  return JSON.stringify({
    id: (studentId || "").trim(),
    mobile: (mobileNumber || "").trim()
  });
}

export function parseDescription(description: string | null | undefined): { studentId: string; cleanDescription: string } {
  if (!description) return { studentId: "", cleanDescription: "" };
  const str = description.trim();
  const match = str.match(/^\[student_id:([^\]]+)\]\s*([\s\S]*)/);
  if (match) {
    return {
      studentId: match[1].trim(),
      cleanDescription: match[2].trim()
    };
  }
  return { studentId: "", cleanDescription: str };
}

export function formatDescription(studentId: string | null | undefined, description: string | null | undefined): string {
  return `[student_id:${(studentId || "").trim()}] ${(description || "").trim()}`;
}

export function formatInIST(dateInput: string | Date | null | undefined, formatStr?: string): string {
  if (!dateInput) return "";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
  
  const month = partMap.month || "";
  const day = partMap.day || "";
  const hour = partMap.hour || "";
  const minute = partMap.minute || "";
  const dayPeriod = (partMap.dayPeriod || "").toLowerCase();
  
  if (formatStr === 'hh:mm a') {
    return `${hour}:${minute} ${dayPeriod}`;
  }
  
  return `${month} ${day}, ${hour}:${minute} ${dayPeriod}`;
}





