import React, { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, ClipboardList } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Requirement {
  id: string;
  module_name: string;
  requirement_description: string;
}

export default function CenterRequirements({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newModule, setNewModule] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ["center-requirements", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_requirements").select("id")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Requirement[];
    },
    enabled: !!centerId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("center_requirements").insert({
        center_id: centerId,
        module_name: newModule,
        requirement_description: newDescription,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-requirements"] });
      setIsAdding(false);
      setNewModule("");
      setNewDescription("");
      toast.success("Requirement added successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (req: Requirement) => {
      const { error } = await supabase
        .from("center_requirements")
        .update({
          module_name: req.module_name,
          requirement_description: req.requirement_description,
        })
        .eq("id", req.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-requirements"] });
      setEditingId(null);
      toast.success("Requirement updated successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("center_requirements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-requirements"] });
      toast.success("Requirement deleted successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (isLoading) return <div>Loading requirements...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Additional Requirements</h2>
        <Button onClick={() => setIsAdding(true)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Add Requirement
        </Button>
      </div>

      {isAdding && (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-lg">New Requirement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Module Name</Label>
              <Input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="e.g., Library Management" />
            </div>
            <div className="space-y-2">
              <Label>Requirement Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Describe the specific needs..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!newModule}>Save Requirement</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {requirements.map((req) => (
          <Card key={req.id} className="relative group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              {editingId === req.id ? (
                <Input
                  value={req.module_name}
                  onChange={(e) => {
                    const updated = requirements.map(r => r.id === req.id ? { ...r, module_name: e.target.value } : r);
                    queryClient.setQueryData(["center-requirements", centerId], updated);
                  }}
                />
              ) : (
                <CardTitle className="text-lg font-bold">{req.module_name}</CardTitle>
              )}
              <div className="flex gap-2">
                {editingId === req.id ? (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate(req)}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(req.id)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(req.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingId === req.id ? (
                <Textarea
                  value={req.requirement_description}
                  onChange={(e) => {
                    const updated = requirements.map(r => r.id === req.id ? { ...r, requirement_description: e.target.value } : r);
                    queryClient.setQueryData(["center-requirements", centerId], updated);
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{req.requirement_description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {requirements.length === 0 && !isAdding && (
        <div className="text-center py-12 border-2 border-dashed rounded-3xl">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">No additional requirements logged yet.</p>
        </div>
      )}
    </div>
  );
}
