export interface RoleUsage {
  role: 'teacher' | 'student' | 'parent' | 'admin';
  dailyRequests: number;
  activeDaysPerMonth: number;
  topModules: {
    moduleId: string;
    weight: number; // Percentage of total requests
  }[];
}

export const ROLE_USAGE_MODELS: RoleUsage[] = [
  {
    role: 'teacher',
    dailyRequests: 120,
    activeDaysPerMonth: 22,
    topModules: [
      { moduleId: 'attendance', weight: 0.30 },
      { moduleId: 'lesson_tracking', weight: 0.20 },
      { moduleId: 'homework', weight: 0.15 },
      { moduleId: 'messages', weight: 0.10 },
      { moduleId: 'dashboard', weight: 0.10 },
      { moduleId: 'teacher_reports', weight: 0.05 },
      { moduleId: 'class_routine', weight: 0.10 }
    ]
  },
  {
    role: 'student',
    dailyRequests: 45,
    activeDaysPerMonth: 22,
    topModules: [
      { moduleId: 'homework', weight: 0.40 },
      { moduleId: 'published_results', weight: 0.20 },
      { moduleId: 'dashboard', weight: 0.20 },
      { moduleId: 'class_routine', weight: 0.10 },
      { moduleId: 'messages', weight: 0.10 }
    ]
  },
  {
    role: 'parent',
    dailyRequests: 15,
    activeDaysPerMonth: 25,
    topModules: [
      { moduleId: 'student_reports', weight: 0.30 },
      { moduleId: 'attendance_summary', weight: 0.25 },
      { moduleId: 'messages', weight: 0.20 },
      { moduleId: 'finance', weight: 0.15 },
      { moduleId: 'dashboard', weight: 0.10 }
    ]
  },
  {
    role: 'admin',
    dailyRequests: 80,
    activeDaysPerMonth: 26,
    topModules: [
      { moduleId: 'finance', weight: 0.20 },
      { moduleId: 'student_registration', weight: 0.15 },
      { moduleId: 'teacher_registration', weight: 0.10 },
      { moduleId: 'hr_management', weight: 0.10 },
      { moduleId: 'summary_dashboard', weight: 0.15 },
      { moduleId: 'settings', weight: 0.10 },
      { moduleId: 'records', weight: 0.10 },
      { moduleId: 'leave_management', weight: 0.10 }
    ]
  }
];

export interface SystemUsageConstants {
  avgRowSizeChars: number; // To estimate DB storage
  edgeFunctionExecutionTimeMs: number;
  storageObjectAvgSizeKb: number;
}

export const SYSTEM_USAGE_CONSTANTS: SystemUsageConstants = {
  avgRowSizeChars: 500, // Roughly 0.5KB per row on average
  edgeFunctionExecutionTimeMs: 150,
  storageObjectAvgSizeKb: 250 // Average for images/documents
};
