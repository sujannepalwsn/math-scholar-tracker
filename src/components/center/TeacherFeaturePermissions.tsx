import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DialogDescription } from "@/components/ui/dialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Check, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const TEACHER_FEATURES = [
  { name: 'leave_management', label: 'Leave Applications' },
  { name: 'dashboard_access', label: 'Dashboard' },
  { name: 'take_attendance', label: 'Take Attendance' },
  { name: 'class_routine', label: 'Class Routine' },
  { name: 'lesson_plans', label: 'Lesson Plan Management' },
  { name: 'lesson_tracking', label: 'Lesson Tracking' },
  { name: 'homework_management', label: 'Homework' },
  { name: 'test_management', label: 'Tests' },
  { name: 'preschool_activities', label: 'Activities' },
  { name: 'discipline_issues', label: 'Discipline' },
  { name: 'messaging', label: 'Messages' },
  { name: 'meetings_management', label: 'Meetings' },
  { name: 'calendar_events', label: 'Calendar & Events' },
  { name: 'student_report', label: 'Student Report' },
  { name: 'attendance_summary', label: 'Attendance Summary' },
  { name: 'summary', label: 'Summary' },
  { name: 'chapter_performance', label: 'Chapter Performance' },
  { name: 'teacher_reports', label: 'Teacher Reports' },
  { name: 'view_records', label: 'View Records' },
  { name: 'finance', label: 'Finance Access' },
  { name: 'about_institution', label: 'About Institution' },
  { name: 'settings_access', label: 'Settings Access' },
  { name: 'register_student', label: 'Students Registration' },
  { name: 'teacher_management', label: 'Teachers Registration' },
  { name: 'teachers_attendance', label: 'Teachers Attendance' },
  { name: 'my_attendance', label: 'My Attendance' },
  { name: 'hr_management', label: 'HR Management' },
  { name: 'student_id_cards', label: 'Student ID Cards' },
  { name: 'inventory_assets', label: 'Inventory & Assets' },
  { name: 'transport_tracking', label: 'Transport & Tracking' },
  { name: 'exams_results', label: 'Exams & Results' },
  { name: 'published_results', label: 'Published Results' },
];

interface ModulePermission {
  enabled: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_publish: boolean;
}

export default function TeacherFeaturePermissions({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: centerPermissions } = useQuery({
    queryKey: ['center-feature-permissions', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('center_feature_permissions').select('id, academics, finance, attendance, messaging, exams, students, teachers, preschool_activities, hr_management, leave_management').eq('center_id', user?.center_id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const { data: permissionMeta, isLoading: metaLoading } = useQuery({
    queryKey: ['module-permissions-meta'],
    queryFn: async () => {
      const { data, error } = await supabase.from('module_permissions_meta').select('id, module_name, permission_name, label');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: rawPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['teacher-feature-permissions', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_feature_permissions').select('id, teacher_id, student_report_access, activities, attendance_edit, teacher_scope_mode')
        .eq('teacher_id', teacherId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId
  });

  const permissions = rawPermissions?.permissions || {};
  const scopeMode = rawPermissions?.teacher_scope_mode || 'restricted';

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ updatedPermissions, legacyFields }: { updatedPermissions: any, legacyFields: any }) => {
      if (rawPermissions) {
        const { error } = await supabase
          .from('teacher_feature_permissions')
          .update({
            permissions: updatedPermissions,
            ...legacyFields // Sync legacy boolean columns for RLS support
          })
          .eq('teacher_id', teacherId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teacher_feature_permissions')
          .insert({
            teacher_id: teacherId,
            teacher_scope_mode: 'restricted', // Default for new records
            permissions: updatedPermissions,
            ...legacyFields
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-feature-permissions', teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Permissions updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update permissions');
    }
  });

  const handleScopeToggle = async (isFull: boolean) => {
    const newMode = isFull ? 'full' : 'restricted';
    const { error } = await supabase
      .from('teacher_feature_permissions')
      .update({ teacher_scope_mode: newMode })
      .eq('teacher_id', teacherId);

    if (error) {
      toast.error(error.message || 'Failed to update scope mode');
    } else {
      queryClient.invalidateQueries({ queryKey: ['teacher-feature-permissions', teacherId] });
      toast.success(`Teacher Scope Mode set to ${newMode.toUpperCase()}`);
    }
  };

  const handleToggle = (featureName: string, field: keyof ModulePermission, value: boolean) => {
    const currentModule = permissions[featureName] || {
      enabled: false,
      can_view: false,
      can_edit: false,
      can_approve: false,
      can_publish: false
    };

    let updatedModule = { ...currentModule, [field]: value };

    // Master Toggle logic: If OFF, disable everything
    if (field === 'enabled' && value === false) {
      updatedModule = {
        enabled: false,
        can_view: false,
        can_edit: false,
        can_approve: false,
        can_publish: false
      };
    }
    // If turning ON master toggle, enable ALL sub-permissions by default
    else if (field === 'enabled' && value === true) {
      updatedModule = {
        enabled: true,
        can_view: true,
        can_edit: true,
        can_approve: true,
        can_publish: true
      };
    }

    const updatedPermissions = {
      ...permissions,
      [featureName]: updatedModule
    };

    // Prepare legacy fields for RLS compatibility
    // Legacy column should be true ONLY if both enabled and can_view are true
    // This ensures that backend RLS (which relies on boolean columns) correctly blocks access.
    // ALSO: Explicitly handle dashboard_access which might not have can_view toggle in UI but needs to be synced
    const legacyFields: Record<string, boolean> = {
      [featureName]: updatedModule.enabled && (featureName === 'dashboard_access' ? true : updatedModule.can_view)
    };

    // If it's a major feature like student_report or preschool_activities, sync specialized column names too
    if (featureName === 'student_report') legacyFields['student_report_access'] = legacyFields[featureName];
    if (featureName === 'preschool_activities') legacyFields['activities'] = legacyFields[featureName];

    updatePermissionMutation.mutate({ updatedPermissions, legacyFields });
  };

  if (permissionsLoading || metaLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card className="max-h-[80vh] overflow-hidden flex flex-col border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Access Control Matrix</CardTitle>
            <DialogDescription className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
              Defining operational boundaries for {teacherName}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tighter text-primary">Teacher Scope Mode</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                {scopeMode === 'full' ? 'Full Access' : 'Restricted Scope'}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className={cn("text-[10px] font-black uppercase", scopeMode !== 'full' ? "text-primary" : "text-slate-400")}>Restricted</span>
              <Switch
                checked={scopeMode === 'full'}
                onCheckedChange={(val) => handleScopeToggle(val)}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-300"
              />
              <span className={cn("text-[10px] font-black uppercase", scopeMode === 'full' ? "text-primary" : "text-slate-400")}>Full</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto flex-1 px-0">
        <div className="overflow-x-auto border rounded-2xl">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Module</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Master</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">View</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Edit</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Approve</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Publish</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEACHER_FEATURES.filter(f => {
                if (!centerPermissions) return true;
                return centerPermissions[f.name] !== false;
              }).map(feature => {
                const modulePerms: ModulePermission = permissions[feature.name] || {
                  enabled: false,
                  can_view: false,
                  can_edit: false,
                  can_approve: false,
                  can_publish: false
                };

                const dbMeta = permissionMeta?.find(m => m.module_key === feature.name);

                // Hardcoded fallbacks to ensure toggles show even if meta fetch fails or table is empty
                const meta = {
                  has_approve: dbMeta?.has_approve || ['lesson_plans', 'leave_management'].includes(feature.name),
                  has_publish: dbMeta?.has_publish || ['exams_results', 'published_results'].includes(feature.name)
                };

                const isMasterOn = modulePerms.enabled;

                return (
                  <TableRow key={feature.name} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-xs py-3">{feature.label}</TableCell>

                    {/* Master Toggle */}
                    <TableCell className="text-center">
                      <Switch
                        checked={isMasterOn}
                        onCheckedChange={(val) => handleToggle(feature.name, 'enabled', val)}
                        disabled={updatePermissionMutation.isPending}
                        className="scale-90"
                      />
                    </TableCell>

                    {/* View Permission */}
                    <TableCell className="text-center">
                      <Switch
                        checked={modulePerms.can_view}
                        onCheckedChange={(val) => handleToggle(feature.name, 'can_view', val)}
                        disabled={!isMasterOn || updatePermissionMutation.isPending}
                        className="scale-75"
                      />
                    </TableCell>

                    {/* Edit Permission */}
                    <TableCell className="text-center">
                      <Switch
                        checked={modulePerms.can_edit}
                        onCheckedChange={(val) => handleToggle(feature.name, 'can_edit', val)}
                        disabled={!isMasterOn || !modulePerms.can_view || updatePermissionMutation.isPending}
                        className="scale-75"
                      />
                    </TableCell>

                    {/* Approve Permission */}
                    <TableCell className="text-center">
                      {meta.has_approve ? (
                        <Switch
                          checked={modulePerms.can_approve}
                          onCheckedChange={(val) => handleToggle(feature.name, 'can_approve', val)}
                          disabled={!isMasterOn || !modulePerms.can_view || updatePermissionMutation.isPending}
                          className="scale-75"
                        />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>

                    {/* Publish Permission */}
                    <TableCell className="text-center">
                      {meta.has_publish ? (
                        <Switch
                          checked={modulePerms.can_publish}
                          onCheckedChange={(val) => handleToggle(feature.name, 'can_publish', val)}
                          disabled={!isMasterOn || !modulePerms.can_view || updatePermissionMutation.isPending}
                          className="scale-75"
                        />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
