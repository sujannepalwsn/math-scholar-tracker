import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type ActivityType = Tables<'activity_types'>;

export default function ActivityTypeManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Fetch activity types
  const { data: activityTypes = [], isLoading } = useQuery({
    queryKey: ["activity-types", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("activity_types")
        .select("*")
        .eq("center_id", user.center_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingType(null);
  };

  const createActivityTypeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase.from("activity_types").insert({
        center_id: user.center_id,
        name,
        description: description || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-types"] });
      toast.success("Activity type created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create activity type");
    },
  });

  const updateActivityTypeMutation = useMutation({
    mutationFn: async () => {
      if (!editingType || !user?.center_id) throw new Error("Activity Type or Center ID not found");
      const { error } = await supabase.from("activity_types").update({
        name,
        description: description || null,
      }).eq("id", editingType.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-types"] });
      toast.success("Activity type updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update activity type");
    },
  });

  const toggleActivityTypeStatusMutation = useMutation({
    mutationFn: async (type: ActivityType) => {
      const { error } = await supabase.from("activity_types").update({
        is_active: !type.is_active,
      }).eq("id", type.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-types"] });
      toast.success("Activity type status updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update activity type status");
    },
  });

  const deleteActivityTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-types"] });
      toast.success("Activity type deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete activity type");
    },
  });

  const handleEditClick = (type: ActivityType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingType) {
      updateActivityTypeMutation.mutate();
    } else {
      createActivityTypeMutation.mutate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Activity Types</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Type</Button>
            </DialogTrigger>
            <DialogContent aria-labelledby="activity-type-manage-title" aria-describedby="activity-type-manage-description">
              <DialogHeader>
                <DialogTitle id="activity-type-manage-title">Create Fee Heading</DialogTitle>
                <DialogDescription id="activity-type-manage-description">
                  Define a new category for fees (e.g., Tuition, Transport).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Type Name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Art & Craft" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!name || createActivityTypeMutation.isPending || updateActivityTypeMutation.isPending}
                  className="w-full"
                >
                  {editingType ? (updateActivityTypeMutation.isPending ? "Updating..." : "Update") : (createActivityTypeMutation.isPending ? "Creating..." : "Create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading activity types...</p>
        ) : activityTypes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No activity types created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{type.description || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActivityTypeStatusMutation.mutate(type)}
                      className={`flex items-center gap-1 ${type.is_active ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {type.is_active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {type.is_active ? 'Active' : 'Inactive'}
                    </Button>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(type)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteActivityTypeMutation.mutate(type.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}