import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const FEATURES = [
  { name: 'register_student', label: 'Register Student' },
  { name: 'take_attendance', label: 'Take Attendance' },
  { name: 'view_records', label: 'View Records' },
  { name: 'lesson_plans', label: 'Lesson Plans' },
  { name: 'lesson_tracking', label: 'Lesson Tracking' },
  { name: 'homework_management', label: 'Homework Management' },
  { name: 'preschool_activities', label: 'Preschool Activities' },
  { name: 'discipline_issues', label: 'Discipline Issues' },
  { name: 'teacher_management', label: 'Teacher Management' },
  { name: 'test_management', label: 'Test Management' },
  { name: 'summary', label: 'Summary' },
  { name: 'finance', label: 'Finance Management' },
  { name: 'ai_insights', label: 'AI Insights' },
  { name: 'meetings_management', label: 'Meetings Management' },
  { name: 'calendar_events', label: 'Calendar Events' },
  { name: 'class_routine', label: 'Class Routine' },
  { name: 'messaging', label: 'Messaging' },
];

export default function CenterFeaturePermissions() {
  const queryClient = useQueryClient();

  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: ['admin-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['center-feature-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('center_feature_permissions')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const permissionsByCenter = permissions.reduce((acc, perm) => {
    acc[perm.center_id] = perm;
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
    },
  });

  const handleToggle = (centerId: string, featureName: string, currentStatus: boolean) => {
    updatePermissionMutation.mutate({ centerId, featureName, isEnabled: !currentStatus });
  };

  if (centersLoading || permissionsLoading) {
    return <p>Loading feature permissions...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Center Feature Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10">Center Name</TableHead>
                {FEATURES.map(feature => (
                  <TableHead key={feature.name} className="text-center min-w-[120px]">{feature.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {centers.map(center => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium sticky left-0 bg-card z-10">{center.name}</TableCell>
                  {FEATURES.map(feature => {
                    const centerPerm = permissionsByCenter[center.id];
                    const isEnabled = centerPerm?.[feature.name] ?? true;
                    return (
                      <TableCell key={feature.name} className="text-center">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(center.id, feature.name, isEnabled)}
                          disabled={updatePermissionMutation.isPending}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}