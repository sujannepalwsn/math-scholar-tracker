import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LinkChildToParentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LinkChildToParent({ open, onOpenChange }: LinkChildToParentProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Fetch all parent users in this center
  const { data: parentUsers = [] } = useQuery({
    queryKey: ["parent-users", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, username, student_id")
        .eq("center_id", user.center_id)
        .eq("role", "parent")
        .eq("is_active", true)
        .order("username");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id && open,
  });

  // Fetch all students in this center
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-linking", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id && open,
  });

  // Fetch existing parent-student links for the center
  const { data: existingLinks = [], refetch: refetchLinks } = useQuery({
    queryKey: ["parent-student-links", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      
      // Get all students in this center first
      const { data: centerStudents } = await supabase
        .from("students")
        .select("id")
        .eq("center_id", user.center_id);
      
      if (!centerStudents || centerStudents.length === 0) return [];
      
      const studentIds = centerStudents.map(s => s.id);
      
      const { data, error } = await supabase
        .from("parent_students")
        .select(`
          id,
          parent_user_id,
          student_id,
          users:parent_user_id(username),
          students:student_id(name, grade)
        `)
        .in("student_id", studentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id && open,
  });

  // Get linked students for a parent
  const getLinkedStudentsForParent = (parentId: string) => {
    return existingLinks
      .filter((link: any) => link.parent_user_id === parentId)
      .map((link: any) => ({
        id: link.student_id,
        name: link.students?.name,
        grade: link.students?.grade,
      }));
  };

  // Check if link already exists
  const linkExists = (parentId: string, studentId: string) => {
    return existingLinks.some(
      (link: any) => link.parent_user_id === parentId && link.student_id === studentId
    );
  };

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParentId || !selectedStudentId) {
        throw new Error("Please select both parent and student");
      }

      if (linkExists(selectedParentId, selectedStudentId)) {
        throw new Error("This child is already linked to this parent");
      }

      const { error } = await supabase.from("parent_students").insert({
        parent_user_id: selectedParentId,
        student_id: selectedStudentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-student-links"] });
      toast.success("Child linked to parent successfully!");
      setSelectedParentId("");
      setSelectedStudentId("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to link child");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async ({ parentId, studentId }: { parentId: string; studentId: string }) => {
      const { error } = await supabase
        .from("parent_students")
        .delete()
        .eq("parent_user_id", parentId)
        .eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-student-links"] });
      toast.success("Child unlinked from parent");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unlink child");
    },
  });

  const selectedParentLinkedStudents = selectedParentId 
    ? getLinkedStudentsForParent(selectedParentId) 
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Link Multiple Children to Parent
          </DialogTitle>
          <DialogDescription>
            Link additional children to an existing parent account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Parent */}
          <div className="space-y-2">
            <Label>Select Parent Account</Label>
            <Select value={selectedParentId} onValueChange={setSelectedParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a parent..." />
              </SelectTrigger>
              <SelectContent>
                {parentUsers.map((parent: any) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show linked students for selected parent */}
          {selectedParentId && selectedParentLinkedStudents.length > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <Label className="text-sm">Currently linked children:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedParentLinkedStudents.map((student: any) => (
                  <Badge key={student.id} variant="secondary" className="flex items-center gap-1">
                    {student.name} (Grade {student.grade})
                    <button
                      type="button"
                      className="ml-1 text-destructive hover:text-destructive/80"
                      onClick={() => unlinkMutation.mutate({ 
                        parentId: selectedParentId, 
                        studentId: student.id 
                      })}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Select Student to Link */}
          <div className="space-y-2">
            <Label>Select Student to Link</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student..." />
              </SelectTrigger>
              <SelectContent>
                {students
                  .filter((s: any) => !linkExists(selectedParentId, s.id))
                  .map((student: any) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} (Grade {student.grade})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => linkMutation.mutate()}
            disabled={!selectedParentId || !selectedStudentId || linkMutation.isPending}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {linkMutation.isPending ? "Linking..." : "Link Child to Parent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}