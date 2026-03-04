import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Edit, FileText, FileUp, Plus, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type LessonPlan = Tables<'lesson_plans'>;
type Student = Tables<'students'>; // Import Student type to get grades

export default function LessonPlans() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLessonPlan, setEditingLessonPlan] = useState<LessonPlan | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all"); // New grade filter state

  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [lessonDate, setLessonDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [media, setMedia] = useState<File | null>(null);

  // Fetch students to get unique grades
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-grades", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("grade")
        .eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort();

  // Fetch lesson plans
  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ["lesson-plans-for-tracking", user?.center_id, subjectFilter, gradeFilter], // Add gradeFilter to query key
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("lesson_plans")
        .select("*")
        .eq("center_id", user.center_id)
        .order("lesson_date", { ascending: false });

      if (subjectFilter !== "all") {
        query = query.eq("subject", subjectFilter);
      }
      if (gradeFilter !== "all") { // Apply grade filter
        query = query.eq("grade", gradeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const resetForm = () => {
    setSubject("");
    setChapter("");
    setTopic("");
    setLessonDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setFile(null);
    setMedia(null);
    setEditingLessonPlan(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMedia(e.target.files[0]);
    }
  };

  const uploadFile = async (fileToUpload: File, bucket: string) => {
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileToUpload);
    if (uploadError) {
      console.error(`Upload error for bucket ${bucket}:`, uploadError);
      throw uploadError;
    }
    return fileName;
  };

  const createLessonPlanMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");

      let fileUrl: string | null = null;
      let mediaUrl: string | null = null;

      if (file) fileUrl = await uploadFile(file, "lesson-files");
      if (media) mediaUrl = await uploadFile(media, "lesson-plan-media");

      const { error } = await supabase.from("lesson_plans").insert({
        center_id: user.center_id,
        teacher_id: user.teacher_id || null,
        subject,
        chapter,
        topic,
        class: gradeFilter === "all" ? "General" : gradeFilter,
        grade: gradeFilter === "all" ? null : gradeFilter,
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success("Lesson Plan created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create lesson plan");
    },
  });

  const updateLessonPlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingLessonPlan || !user?.center_id) throw new Error("Lesson Plan or Center ID not found");

      let fileUrl: string | null = editingLessonPlan.lesson_file_url;

      if (file) fileUrl = await uploadFile(file, "lesson-files");

      const { error } = await supabase.from("lesson_plans").update({
        subject,
        chapter,
        topic,
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
        grade: gradeFilter === "all" ? null : gradeFilter, // Update grade
      }).eq("id", editingLessonPlan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success("Lesson Plan updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update lesson plan");
    },
  });

  const deleteLessonPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success("Lesson Plan deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete lesson plan");
    },
  });

  const handleEditClick = (lessonPlan: LessonPlan) => {
    setEditingLessonPlan(lessonPlan);
    setSubject(lessonPlan.subject);
    setChapter(lessonPlan.chapter);
    setTopic(lessonPlan.topic);
    setLessonDate(lessonPlan.lesson_date);
    setNotes(lessonPlan.notes || "");
    setFile(null); // Clear file input for edit
    setMedia(null); // Clear media input for edit
    setGradeFilter(lessonPlan.grade || "all"); // Set grade filter to current lesson plan's grade
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingLessonPlan) {
      updateLessonPlanMutation.mutate();
    } else {
      createLessonPlanMutation.mutate();
    }
  };

  const uniqueSubjects = Array.from(new Set(lessonPlans.map(lp => lp.subject))).sort();
  // const filteredLessonPlans = subjectFilter === "all" ? lessonPlans : lessonPlans.filter(lp => lp.subject === subjectFilter);
  // The filtering is now handled by the useQuery hook

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Curriculum Planner</h1>
          <p className="text-muted-foreground text-lg">Design and organize your teaching roadmap.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}> {/* New Grade Filter */}
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Create Lesson Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="lesson-plan-create-title" aria-describedby="lesson-plan-create-description">
              <DialogHeader>
                <DialogTitle id="lesson-plan-create-title">{editingLessonPlan ? "Edit Lesson Plan" : "Create New Lesson Plan"}</DialogTitle>
                <DialogDescription id="lesson-plan-create-description">
                  {editingLessonPlan ? "Update the details of this lesson plan." : "Fill in the details to create a new lesson plan."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Mathematics" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chapter">Chapter *</Label>
                    <Input id="chapter" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g., Algebra" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Linear Equations" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade (Optional)</Label> {/* Input for grade */}
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {uniqueGrades.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lessonDate">Date *</Label>
                  <Input id="lessonDate" type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Key points, teaching strategies, etc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Upload Lesson Plan File (PDF, DOCX - Optional)</Label>
                  <Input id="file" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                  {editingLessonPlan?.lesson_file_url && !file && (
                    <p className="text-sm text-muted-foreground">Current file: {editingLessonPlan.lesson_file_url.split('-').pop()}</p>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!subject || !chapter || !topic || !lessonDate || createLessonPlanMutation.isPending || updateLessonPlanMutation.isPending}
                  className="w-full"
                >
                  {editingLessonPlan ? (updateLessonPlanMutation.isPending ? "Updating..." : "Update Lesson Plan") : (createLessonPlanMutation.isPending ? "Creating..." : "Create Lesson Plan")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-medium overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-xl">Plan Library</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><FileText className="h-8 w-8 animate-spin text-primary" /></div>
          ) : lessonPlans.length === 0 ? (
            <p className="text-muted-foreground text-center py-12 italic">No lesson plans found for the current selection.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lessonPlans.map((lp) => (
                <div key={lp.id} className="rounded-2xl border-2 border-primary/5 bg-card p-6 shadow-soft hover:shadow-medium transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl bg-background shadow-soft" onClick={() => handleEditClick(lp)}>
                      <Edit className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl bg-background shadow-soft hover:bg-destructive/10" onClick={() => deleteLessonPlanMutation.mutate(lp.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                       <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                          <FileText className="h-6 w-6" />
                       </div>
                       <div>
                          <h3 className="font-bold text-xl leading-tight">{lp.subject}: {lp.chapter}</h3>
                          <div className="flex gap-2 mt-1">
                             <Badge variant="outline" className="text-[10px]">{lp.topic}</Badge>
                             {lp.grade && <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 border-none">Grade {lp.grade}</Badge>}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{lp.notes || 'No additional notes.'}</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-primary">
                        <CalendarIcon className="h-4 w-4" />
                        Scheduled: {format(new Date(lp.lesson_date), "PPP")}
                      </div>
                    </div>

                    {lp.lesson_file_url && (
                      <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full rounded-xl border-2" asChild>
                          <a href={supabase.storage.from("lesson-files").getPublicUrl(lp.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" /> Download Material
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}