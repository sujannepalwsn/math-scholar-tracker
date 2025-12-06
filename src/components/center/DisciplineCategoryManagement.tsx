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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type DisciplineCategory = Tables<'discipline_categories'>;

const severityLevels = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function DisciplineCategoryManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DisciplineCategory | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultSeverity, setDefaultSeverity] = useState<DisciplineCategory['default_severity']>("medium");

  // Fetch discipline categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["discipline-categories", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("discipline_categories")
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
    setDefaultSeverity("medium");
    setEditingCategory(null);
  };

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase.from("discipline_categories").insert({
        center_id: user.center_id,
        name,
        description: description || null,
        default_severity: defaultSeverity,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-categories"] });
      toast.success("Discipline category created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create discipline category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!editingCategory || !user?.center_id) throw new Error("Category or Center ID not found");
      const { error } = await supabase.from("discipline_categories").update({
        name,
        description: description || null,
        default_severity: defaultSeverity,
      }).eq("id", editingCategory.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-categories"] });
      toast.success("Discipline category updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update discipline category");
    },
  });

  const toggleCategoryStatusMutation = useMutation({
    mutationFn: async (category: DisciplineCategory) => {
      const { error } = await supabase.from("discipline_categories").update({
        is_active: !category.is_active,
      }).eq("id", category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-categories"] });
      toast.success("Discipline category status updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update category status");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discipline_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-categories"] });
      toast.success("Discipline category deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete discipline category");
    },
  });

  const handleEditClick = (category: DisciplineCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setDefaultSeverity(category.default_severity || "medium");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingCategory) {
      updateCategoryMutation.mutate();
    } else {
      createCategoryMutation.mutate();
    }
  };

  const getSeverityColor = (severity: DisciplineCategory['default_severity']) => {
    switch (severity) {
      case "low": return "text-green-600";
      case "medium": return "text-orange-600";
      case "high": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Manage Discipline Categories</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Category</Button>
            </DialogTrigger>
            <DialogContent aria-labelledby="discipline-category-manage-title" aria-describedby="discipline-category-manage-description">
              <DialogHeader>
                <DialogTitle id="discipline-category-manage-title">{editingCategory ? "Edit Discipline Category" : "Create New Discipline Category"}</DialogTitle>
                <DialogDescription id="discipline-category-manage-description">
                  {editingCategory ? "Update the details of this discipline category." : "Define a new category for discipline issues."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Misbehavior" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultSeverity">Default Severity</Label>
                  <Select value={defaultSeverity || "medium"} onValueChange={(value: DisciplineCategory['default_severity']) => setDefaultSeverity(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Default Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {severityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!name || createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="w-full"
                >
                  {editingCategory ? (updateCategoryMutation.isPending ? "Updating..." : "Update") : (createCategoryMutation.isPending ? "Creating..." : "Create")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No discipline categories created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Default Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${getSeverityColor(category.default_severity)}`}>
                      {category.default_severity?.toUpperCase() || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategoryStatusMutation.mutate(category)}
                      className={`flex items-center gap-1 ${category.is_active ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {category.is_active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Button>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteCategoryMutation.mutate(category.id)}>
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