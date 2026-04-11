import React, { useState, useEffect } from "react";
import { Calendar, Package, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PACKAGE_FEATURES, PackageType } from "@/lib/package-presets"
import { cn } from "@/lib/utils"
import { applyPackagePreset, calculateProRatedAmount } from "@/utils/package-utils"

const FEATURES = [
  { name: 'parent_portal', label: 'Parent Portal' },
  { name: 'leave_management', label: 'Leave Applications' },
  { name: 'dashboard_access', label: 'Dashboard' },
  { name: 'take_attendance', label: 'Take Attendance' },
  { name: 'class_routine', label: 'Class Routine' },
  { name: 'lesson_plans', label: 'Lesson Plan Management' },
  { name: 'lesson_tracking', label: 'Lesson Tracking' },
  { name: 'homework_management', label: 'Homework' },
  { name: 'test_management', label: 'Tests' },
  { name: 'exams_results', label: 'Exams & Results' },
  { name: 'published_results', label: 'Published Results' },
  { name: 'preschool_activities', label: 'Activities' },
  { name: 'discipline_issues', label: 'Discipline' },
  { name: 'register_student', label: 'Students Registration' },
  { name: 'teacher_management', label: 'Teachers Registration' },
  { name: 'teachers_attendance', label: 'Teachers Attendance' },
  { name: 'hr_management', label: 'HR Management' },
  { name: 'student_id_cards', label: 'Student ID Cards' },
  { name: 'inventory_assets', label: 'Inventory & Assets' },
  { name: 'transport_tracking', label: 'Transport & Tracking' },
  { name: 'settings_access', label: 'Settings' },
  { name: 'messaging', label: 'Messages' },
  { name: 'meetings_management', label: 'Meetings' },
  { name: 'calendar_events', label: 'Calendar & Events' },
  { name: 'student_report', label: 'Student Report' },
  { name: 'attendance_summary', label: 'Attendance Summary' },
  { name: 'summary', label: 'Summary' },
  { name: 'teacher_reports', label: 'Teacher Reports' },
  { name: 'chapter_performance', label: 'Chapter Performance' },
  { name: 'view_records', label: 'View Records' },
  { name: 'finance', label: 'Finance' },
  { name: 'about_institution', label: 'About Institution' },
];

const TEACHER_FEATURES = [
  { name: 'parent_portal', label: 'Parent Portal' },
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
  { name: 'hr_management', label: 'HR Management' },
  { name: 'student_id_cards', label: 'Student ID Cards' },
  { name: 'inventory_assets', label: 'Inventory & Assets' },
  { name: 'transport_tracking', label: 'Transport & Tracking' },
  { name: 'exams_results', label: 'Exams & Results' },
  { name: 'published_results', label: 'Published Results' },
];

export default function CenterFeaturePermissions() {
  const queryClient = useQueryClient();
  const [highlightedFeatures, setHighlightedFeatures] = useState<Record<string, Set<string>>>({});

  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: ['admin-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centers").select("id, name, logo_url, address, phone, email")
        .order('name');
      if (error) throw error;
      return data;
    } });

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers").select("id, name, email, department, subject, grade, status, user_id, centers(name)");
      if (error) throw error;
      return data;
    } });

  const { data: teacherPermissions = [] } = useQuery({
    queryKey: ['teacher-feature-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_feature_permissions').select('id, teacher_id, student_report_access, activities, attendance_edit, teacher_scope_mode');
      if (error) throw error;
      return data;
    } });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['center-feature-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('center_feature_permissions').select('id, academics, finance, attendance, messaging, exams, students, teachers, preschool_activities, hr_management, leave_management');
      if (error) throw error;
      return data;
    } });

  const permissionsByCenter = permissions.reduce((acc, perm) => {
    acc[perm.center_id] = perm;
    return acc;
  }, {} as Record<string, any>);

  const permissionsByTeacher = teacherPermissions.reduce((acc, perm) => {
    acc[perm.teacher_id] = perm;
    return acc;
  }, {} as Record<string, any>);

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ centerId, featureName, isEnabled }: { centerId: string; featureName: string; isEnabled: boolean }) => {
      const existingPerm = permissionsByCenter[centerId];
      
      if (existingPerm) {
        const { error } = await supabase
          .from('center_feature_permissions')
          .update({ [featureName]: isEnabled })
          .eq('center_id', centerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('center_feature_permissions')
          .insert({ center_id: centerId, [featureName]: isEnabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['center-feature-permissions'] });
      toast.success('Feature permission updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update feature permission');
    } });

  const updateTeacherPermissionMutation = useMutation({
    mutationFn: async ({ teacherId, featureName, isEnabled }: { teacherId: string; featureName: string; isEnabled: boolean }) => {
      const existingPerm = permissionsByTeacher[teacherId];

      if (existingPerm) {
        const { error } = await supabase
          .from('teacher_feature_permissions')
          .update({ [featureName]: isEnabled })
          .eq('teacher_id', teacherId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teacher_feature_permissions')
          .insert({ teacher_id: teacherId, [featureName]: isEnabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-feature-permissions'] });
      toast.success('Teacher permission updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update teacher permission');
    } });

  const handleToggle = (centerId: string, featureName: string, currentStatus: boolean) => {
    updatePermissionMutation.mutate({ centerId, featureName, isEnabled: !currentStatus });
  };

  const handleTeacherToggle = (teacherId: string, featureName: string, currentStatus: boolean) => {
    updateTeacherPermissionMutation.mutate({ teacherId, featureName, isEnabled: !currentStatus });
  };

  const applyPackageMutation = useMutation({
    mutationFn: async ({ centerId, packageType }: { centerId: string; packageType: PackageType }) => {
      // 1. Get current subscription and plans for invoice generation
      const { data: currentSub } = await supabase
        .from("center_subscriptions").select("id, center_id, plan_id, status, subscription_plans(id, name, price)")
        .eq("center_id", centerId)
        .eq("status", "Active")
        .maybeSingle();

      const { data: plans } = await supabase.from("subscription_plans").select("id, name, price, interval");
      const targetPlan = plans?.find(p => p.features?.[0] === packageType);

      if (targetPlan) {
        let amount = targetPlan.price;
        if (currentSub) {
          amount = calculateProRatedAmount(
            currentSub.billed_amount || currentSub.subscription_plans?.price || 0,
            currentSub.subscription_days || 30,
            currentSub.start_date!,
            targetPlan.price
          );
        }

        // Generate SaaS Invoice
        await supabase
          .from('saas_invoices')
          .insert({
            center_id: centerId,
            plan_id: targetPlan.id,
            amount: amount,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Unpaid'
          });

        // Update or Insert active subscription record
        if (currentSub) {
          await supabase.from('center_subscriptions').update({ status: 'Inactive' }).eq('id', currentSub.id);
        }

        await supabase.from('center_subscriptions').insert({
          center_id: centerId,
          plan_id: targetPlan.id,
          package_type: packageType,
          status: 'Active',
          start_date: new Date().toISOString(),
          billed_amount: amount
        });
      }

      const result = await applyPackagePreset(centerId, packageType);
      return { centerId, features: result.features };
    },
    onSuccess: ({ centerId, features }) => {
      queryClient.invalidateQueries({ queryKey: ['center-feature-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-feature-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-centers'] });

      // Trigger highlight effect
      setHighlightedFeatures(prev => ({
        ...prev,
        [centerId]: new Set(Object.keys(features))
      }));

      setTimeout(() => {
        setHighlightedFeatures(prev => {
          const next = { ...prev };
          delete next[centerId];
          return next;
        });
      }, 2000);

      toast.success('Package applied! You can still customize features below.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to apply package');
    }
  });

  if (centersLoading || permissionsLoading) {
    return <p>Loading feature permissions...</p>;
  }

  return (
    <div className="space-y-8">
    <Card>
      <CardHeader>
        <CardTitle>Manage Center Feature Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          <div className="overflow-x-auto">
  <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 top-0 bg-background z-20 min-w-[200px]">Center Name & Package</TableHead>
                {FEATURES.map(feature => (
                  <TableHead key={feature.name} className="text-center min-w-[120px] sticky top-0 bg-background z-10">{feature.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {centers.map(center => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium sticky left-0 bg-card z-10 space-y-2 py-4">
                    <div className="font-black text-sm uppercase tracking-tight">{center.name}</div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={center.package_type || 'Premium'}
                        onValueChange={(val) => applyPackageMutation.mutate({ centerId: center.id, packageType: val as PackageType })}
                        disabled={applyPackageMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-[10px] font-black uppercase tracking-widest bg-primary/5 border-none shadow-none">
                          <Package className="h-3 w-3 mr-1 text-primary" />
                          <SelectValue placeholder="Select Package" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Basic" className="text-[10px] font-black uppercase tracking-widest">Basic</SelectItem>
                          <SelectItem value="Standard" className="text-[10px] font-black uppercase tracking-widest">Standard</SelectItem>
                          <SelectItem value="Premium" className="text-[10px] font-black uppercase tracking-widest">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                      {applyPackageMutation.isPending && applyPackageMutation.variables?.centerId === center.id && (
                         <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                      )}
                    </div>
                  </TableCell>
                  {FEATURES.map(feature => {
                    const centerPerm = permissionsByCenter[center.id];
                    const isEnabled = centerPerm?.[feature.name] ?? true;
                    const isHighlighted = highlightedFeatures[center.id]?.has(feature.name);

                    return (
                      <TableCell
                        key={feature.name}
                        className={cn(
                          "text-center transition-all duration-500",
                          isHighlighted && "bg-primary/20 scale-110"
                        )}
                      >
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(center.id, feature.name, isEnabled)}
                          disabled={updatePermissionMutation.isPending || applyPackageMutation.isPending}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
</div>
        </div>
      </CardContent>
    </Card>

    </div>
  );
}