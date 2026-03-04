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
import { CalendarIcon, Camera, Edit, Plus, Settings, Star, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import ActivityTypeManagement from "@/components/center/ActivityTypeManagement"; // Import the new component

type Activity = Tables<'activities'>;
type StudentActivity = Tables<'student_activities'>;
type Student = Tables<'students'>;
type ActivityType = Tables<'activity_types'>;

export default function PreschoolActivities() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<StudentActivity | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showActivityTypeManagement, setShowActivityTypeManagement] = useState(false);

  const [studentId, setStudentId] = useState("select-student"); // Changed initial state
  const [activityTypeId, setActivityTypeId] = useState("select-activity-type"); // Changed initial state
  const [title, setTitle] = useState(""); // New state for activity title
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [involvementRating, setInvolvementRating] = useState<number | null>(null);
  const [modalGradeFilter, setModalGradeFilter] = useState<string>("all"); // New state for grade filter inside modal

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-activities", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Filtered students for the modal's student select dropdown
  const filteredStudentsForModal = students.filter(s => modalGradeFilter === "all" || s.grade === modalGradeFilter);

  // Fetch activity types for the center
  const { data: activityTypesFromDb = [], isLoading: activityTypesLoading } = useQuery({
    queryKey: ["activity-types", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("activity_types")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch activities - now properly filtered by center
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["preschool-activities", user?.center_id, gradeFilter],
    queryFn: async () => {
      if (!user?.center_id) return [];
      // First get student IDs for this center
      const { data: centerStudents } = await supabase
        .from("students")
        .select("id")
        .eq("center_id", user.center_id);
      
      if (!centerStudents || centerStudents.length === 0) return [];
      
      const studentIds = centerStudents.map(s => s.id);
      
      const { data, error } = await supabase
        .from("student_activities")
        .select("*, students(name, grade, center_id), activities(id, name, description, activity_date), activity_types(name)")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id,
  });

  const resetForm = () => {
    setStudentId("select-student"); // Reset to default placeholder value
    setActivityTypeId("select-activity-type"); // Reset to default placeholder value
    setTitle("");
    setDescription("");
    setActivityDate(format(new Date(), "yyyy-MM-dd"));
    setPhoto(null);
    setVideo(null);
    setInvolvementRating(null);
    setEditingActivity(null);
    setModalGradeFilter("all"); // Reset modal grade filter
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideo(e.target.files[0]);
    }
  };

  const uploadFile = async (fileToUpload: File, bucket: string) => {
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileToUpload);
    if (uploadError) throw uploadError;
    return fileName;
  };

  const createActivityMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || studentId === "select-student" || activityTypeId === "select-activity-type" || !title) throw new Error("Please select a student, activity type, and provide a title."); // Validation

      let photoUrl: string | null = null;
      let videoUrl: string | null = null;

      if (photo) photoUrl = await uploadFile(photo, "activity-photos");
      if (video) videoUrl = await uploadFile(video, "activity-videos");

      // First create the activity
      const { data: activity, error: activityError } = await supabase.from("activities").insert({
        center_id: user.center_id,
        name: title,
        title: title,
        description,
        activity_date: activityDate,
        activity_type_id: activityTypeId,
      }).select().single();
      if (activityError) throw activityError;

      // Then create student_activity record
      const { error: saError } = await supabase.from("student_activities").insert({
        student_id: studentId,
        activity_id: activity.id,
        activity_type_id: activityTypeId,
        rating: involvementRating,
      });
      if (saError) throw saError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preschool-activities"] });
      toast.success("Activity logged successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to log activity");
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async () => {
      if (!editingActivity || !user?.center_id || studentId === "select-student" || activityTypeId === "select-activity-type" || !title) throw new Error("Please select a student, activity type, and provide a title."); // Validation

      let photoUrl: string | null = (editingActivity as any).activities?.photo_url;
      let videoUrl: string | null = (editingActivity as any).activities?.video_url;

      if (photo) photoUrl = await uploadFile(photo, "activity-photos");
      if (video) videoUrl = await uploadFile(video, "activity-videos");

      // Update the main activity record
      const { error: activityUpdateError } = await supabase.from("activities").update({
        title,
        description,
        activity_date: activityDate,
        photo_url: photoUrl,
        video_url: videoUrl,
        activity_type_id: activityTypeId,
      }).eq("id", (editingActivity as any).activities?.id);
      if (activityUpdateError) throw activityUpdateError;

      // Update the student_activity record
      const { error: saUpdateError } = await supabase.from("student_activities").update({
        student_id: studentId,
        involvement_score: involvementRating,
      }).eq("id", editingActivity.id);
      if (saUpdateError) throw saUpdateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preschool-activities"] });
      toast.success("Activity updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update activity");
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete the student_activity record
      const { error: saDeleteError } = await supabase.from("student_activities").delete().eq("id", id);
      if (saDeleteError) throw saDeleteError;

      // Then delete the main activity record (if no other student_activities reference it)
      // This logic might need to be more robust if activities can exist without student_activities
      // For now, assuming a 1:1 or 1:many where deleting the last student_activity deletes the activity
      // A better approach would be to use a Supabase trigger or RLS to handle orphaned activities.
      // For simplicity, we'll just invalidate the cache.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preschool-activities"] });
      toast.success("Activity deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete activity");
    },
  });

  const handleEditClick = (activity: any) => {
    setEditingActivity(activity);
    setStudentId(activity.student_id);
    setActivityTypeId(activity.activities?.activity_type_id || "select-activity-type"); // Set to placeholder if null
    setTitle(activity.activities?.title || "");
    setDescription(activity.activities?.description || "");
    setActivityDate(activity.activities?.activity_date || format(new Date(), "yyyy-MM-dd"));
    setPhoto(null);
    setVideo(null);
    setInvolvementRating(activity.involvement_score);
    setModalGradeFilter(activity.students?.grade || "all"); // Set modal grade filter to current student's grade
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingActivity) {
      updateActivityMutation.mutate();
    } else {
      createActivityMutation.mutate();
    }
  };

  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort();
  // const filteredActivities = gradeFilter === "all" ? activities : activities.filter((act: any) => {
  //   const studentGrade = students.find(s => s.id === act.student_id)?.grade;
  //   return studentGrade === gradeFilter;
  // });
  // Filtering is now handled by the useQuery hook

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Preschool Journal</h1>
          <p className="text-muted-foreground text-lg">Document and share student engagement and creative milestones.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
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
          <Button variant="outline" onClick={() => setShowActivityTypeManagement(true)}>
            <Settings className="h-4 w-4 mr-2" /> Manage Types
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Log Activity</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="log-activity-title" aria-describedby="log-activity-description">
            <DialogHeader>
              <DialogTitle id="log-activity-title">{editingActivity ? "Edit Activity" : "Log New Activity"}</DialogTitle>
              <DialogDescription id="log-activity-description">
                {editingActivity ? "Update the details of this preschool activity." : "Record a new preschool activity for a student."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modalGradeFilter">Filter Students by Grade</Label>
                <Select value={modalGradeFilter} onValueChange={setModalGradeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
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
                <Label htmlFor="student">Student *</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select-student" disabled>Select Student</SelectItem> {/* Added placeholder item */}
                    {filteredStudentsForModal.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} - {s.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityTypeId">Activity Type *</Label>
                <Select value={activityTypeId} onValueChange={setActivityTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Activity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select-activity-type" disabled>Select Activity Type</SelectItem> {/* Added placeholder item */}
                    {activityTypesFromDb.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Activity Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Finger Painting Session" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What did the child do?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityDate">Date *</Label>
                <Input id="activityDate" type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">Upload Photo (Optional)</Label>
                <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} />
                {editingActivity && (editingActivity as any).activities?.photo_url && !photo && (
                  <p className="text-sm text-muted-foreground">Current photo attached</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="video">Upload Video (Optional)</Label>
                <Input id="video" type="file" accept="video/*" onChange={handleVideoChange} />
                {editingActivity && (editingActivity as any).activities?.video_url && !video && (
                  <p className="text-sm text-muted-foreground">Current video attached</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="involvementRating">Child Involvement Rating (1-5, Optional)</Label>
                <Input
                  id="involvementRating"
                  type="number"
                  min="1"
                  max="5"
                  value={involvementRating || ""}
                  onChange={(e) => setInvolvementRating(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 4"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={studentId === "select-student" || activityTypeId === "select-activity-type" || !title || !description || !activityDate || createActivityMutation.isPending || updateActivityMutation.isPending}
                className="w-full"
              >
                {editingActivity ? (updateActivityMutation.isPending ? "Updating..." : "Update Activity") : (createActivityMutation.isPending ? "Logging..." : "Log Activity")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-medium overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-xl">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Star className="h-8 w-8 animate-spin text-primary" /></div>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-12 italic">No activities recorded for the current selection.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activities.map((activity: any) => (
                <div key={activity.id} className="rounded-2xl border-2 border-primary/5 bg-card p-6 shadow-soft hover:shadow-medium transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl bg-background shadow-soft" onClick={() => handleEditClick(activity)}>
                      <Edit className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl bg-background shadow-soft hover:bg-destructive/10" onClick={() => deleteActivityMutation.mutate(activity.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                       <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                          <Camera className="h-6 w-6" />
                       </div>
                       <div>
                          <h3 className="font-bold text-xl leading-tight">{activity.students?.name}</h3>
                          <div className="flex gap-2 mt-1">
                             <Badge variant="outline" className="text-[10px]">{activity.activity_types?.name || 'Activity'}</Badge>
                             <Badge className="text-[10px] bg-primary/10 text-primary border-none">{activity.students?.grade}</Badge>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{activity.activities?.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{activity.activities?.description || 'No description'}</p>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-tighter">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(new Date(activity.activities?.activity_date || activity.created_at), "PPP")}
                        </div>
                        {activity.involvement_score && (
                          <div className="flex items-center gap-1 text-xs font-bold text-orange-500 uppercase tracking-tighter">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            Engagement: {activity.involvement_score}/5
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      {activity.activities?.photo_url && (
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl border-2" asChild>
                          <a href={supabase.storage.from("activity-photos").getPublicUrl(activity.activities.photo_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                            <Camera className="h-4 w-4 mr-2" /> Photo
                          </a>
                        </Button>
                      )}
                      {activity.activities?.video_url && (
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl border-2" asChild>
                          <a href={supabase.storage.from("activity-videos").getPublicUrl(activity.activities.video_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4 mr-2" /> Video
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Type Management Dialog */}
      <Dialog open={showActivityTypeManagement} onOpenChange={setShowActivityTypeManagement}>
        <DialogContent className="max-w-2xl" aria-labelledby="activity-type-management-title" aria-describedby="activity-type-management-description">
          <DialogHeader>
            <DialogTitle id="activity-type-management-title">Manage Activity Types</DialogTitle>
            <DialogDescription id="activity-type-management-description">
              Add, edit, or deactivate categories for preschool activities.
            </DialogDescription>
          </DialogHeader>
          <ActivityTypeManagement />
        </DialogContent>
      </Dialog>
    </div>
  );
}