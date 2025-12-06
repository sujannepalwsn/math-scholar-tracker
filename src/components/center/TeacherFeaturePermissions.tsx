import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { DialogDescription } from '@/components/ui/dialog';

const TEACHER_FEATURES = [
  { name: 'take_attendance', label: 'Take Attendance' },
  { name: 'lesson_tracking', label: 'Lesson Tracking' },
  { name: 'homework_management', label: 'Homework Management' },
  { name: 'preschool_activities', label: 'Preschool Activities' },
  { name: 'discipline_issues', label: 'Discipline Issues' },
  { name: 'test_management', label: 'Test Management' },
  { name: 'student_report_access', label: 'Student Report Access' },
  { name: 'meetings_management', label: 'Meetings Management' },
];

export default function TeacherFeaturePermissions({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const queryClient = useQueryClient();

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['teacher-feature-permissions', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_feature_permissions')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ featureName, isEnabled }: { featureName: string; isEnabled: boolean }) => {
      if (permissions) {
        // Update existing record
        const { error } = await supabase
          .from('teacher_feature_permissions')
          .update({ [featureName]: isEnabled })
          .eq('teacher_id', teacherId);
        if (error) throw error;
      } else {
        // Insert new record with this permission set
        const { error } = await supabase
          .from('teacher_feature_permissions')
          .insert({ teacher_id: teacherId, [featureName]: isEnabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-feature-permissions', teacherId] });
      toast.success('Teacher feature permission updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update teacher feature permission');
    },
  });

  const handleToggle = (featureName: string, currentStatus: boolean) => {
    updatePermissionMutation.mutate({ featureName, isEnabled: !currentStatus });
  };

  if (permissionsLoading) {
    return <p>Loading teacher permissions...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle id="teacher-permissions-title">Manage Features for {teacherName}</CardTitle>
        <DialogDescription id="teacher-permissions-description">
          Enable or disable specific features for this teacher.
        </DialogDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead className="text-center">Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TEACHER_FEATURES.map(feature => {
              // Get current status from permissions, default to true if not set
              const isEnabled = permissions?.[feature.name as keyof typeof permissions] ?? true;
              return (
                <TableRow key={feature.name}>
                  <TableCell className="font-medium">{feature.label}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={Boolean(isEnabled)}
                      onCheckedChange={() => handleToggle(feature.name, Boolean(isEnabled))}
                      disabled={updatePermissionMutation.isPending}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
