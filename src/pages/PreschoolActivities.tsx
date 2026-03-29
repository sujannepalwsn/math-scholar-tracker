import React, { useState } from "react";
import { CalendarIcon, Camera, CheckSquare, Edit, Plus, Settings, Star, Trash2, Users, Video } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { toast } from "sonner"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import { Tables } from "@/integrations/supabase/types"
import ActivityTypeManagement from "@/components/center/ActivityTypeManagement"; // Import the new component
import { Badge } from "@/components/ui/badge"
import { compressImage } from "@/lib/image-utils";
import { hasPermission, hasActionPermission } from "@/utils/permissions";


type Activity = Tables<'activities'>;
type StudentActivity = Tables<'student_activities'>;
type Student = Tables<'students'>;
type ActivityType = Tables<'activity_types'>;

export default function PreschoolActivities() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isRestricted = user?.role === 'teacher' && user?.teacher_scope_mode !== 'full';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<StudentActivity | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showActivityTypeManagement, setShowActivityTypeManagement] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activityTypeId, setActivityTypeId] = useState("select-activity-type"); // Changed initial state
  const [title, setTitle] = useState(""); // New state for activity title
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [involvementRating, setInvolvementRating] = useState<number | null>(null);
  const [modalGradeFilter, setModalGradeFilter] = useState<string>("all"); // New state for grade filter inside modal
  const { page, setPage, pageSize, setPageSize } = usePagination();

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-activities", user?.center_id, isRestricted, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .eq("is_active", true);

      if (isRestricted && user?.teacher_id) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id);
        const myGrades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        if (myGrades.length > 0) {
          // Fix: Wrap grades in quotes for PostgREST
          query = query.or(`grade.in.(${myGrades.map(g => `"${g}"`).join(',')})`);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

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
    enabled: !!user?.center_id });

  // Fetch activities - now properly filtered by center and teacher
  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ["preschool-activities", user?.center_id, gradeFilter, user?.id, isRestricted, page, pageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };

      // Get student IDs for this center to filter activities
      const { data: centerStudents } = await supabase
        .from("students")
        .select("id")
        .eq("center_id", user.center_id);
      
      if (!centerStudents || centerStudents.length === 0) return { data: [], count: 0 };
      
      const studentIds = centerStudents.map(s => s.id);
      
      let query = supabase
        .from("student_activities")
        .select("*, students(name, grade, center_id), activities!inner(*), activity_types(name)", { count: "exact" })
        .in("student_id", studentIds);

      if (isRestricted) {
        query = query.eq('activities.created_by', user?.id);
      }

      if (gradeFilter !== "all") {
        query = query.eq("students.grade", gradeFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id,
    placeholderData: (previousData) => previousData
  });

  const activities = activitiesData?.data || [];
  const totalRows = activitiesData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const resetForm = () => {
    setSelectedStudentIds([]);
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
    let finalFile: File | Blob = fileToUpload;

    // Compress if it's an image
    if (fileToUpload.type.startsWith('image/')) {
      finalFile = await compressImage(fileToUpload, 100);
    }

    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, finalFile);
    if (uploadError) throw uploadError;
    return fileName;
  };

  const createActivityMutation = useMutation({
    mutationFn: async () => {
      if (!hasActionPermission(user, 'preschool_activities', 'edit')) {
        throw new Error("Access Denied: You do not have permission to log activities.");
      }
      if (!user?.center_id || selectedStudentIds.length === 0 || activityTypeId === "select-activity-type" || !title) throw new Error("Please select at least one student, activity type, and provide a title."); // Validation

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
        photo_url: photoUrl,
        video_url: videoUrl,
        created_by: user.id }).select().single();
      if (activityError) throw activityError;

      // Then create student_activity records for all selected students
      const studentActivityRecords = selectedStudentIds.map(sid => ({
        student_id: sid,
        activity_id: activity.id,
        activity_type_id: activityTypeId,
        involvement_score: involvementRating }));

      const { error: saError } = await supabase.from("student_activities").insert(studentActivityRecords);
      if (saError) throw saError;

      // Notify Parents
      const { data: parentUsers } = await supabase.from('users').select('id, student_id').in('student_id', selectedStudentIds).eq('role', 'parent');
      if (parentUsers && parentUsers.length > 0) {
        const notifications = parentUsers.map(pu => ({
          user_id: pu.id,
          center_id: user.center_id!,
          title: "New Student Activity",
          message: `Your child ${students.find(s => s.id === pu.student_id)?.name} participated in: ${title}.`,
          type: "info",
          link: "/parent-activities"
        }));
        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        if (notifError) throw notifError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preschool-activities"] });
      toast.success("Activity logged successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to log activity");
    } });

  const updateActivityMutation = useMutation({
    mutationFn: async () => {
      if (!hasActionPermission(user, 'preschool_activities', 'edit')) {
        throw new Error("Access Denied: You do not have permission to modify activities.");
      }
      if (!editingActivity || !user?.center_id || selectedStudentIds.length === 0 || activityTypeId === "select-activity-type" || !title) throw new Error("Please select a student, activity type, and provide a title."); // Validation

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
        activity_type_id: activityTypeId }).eq("id", (editingActivity as any).activities?.id);
      if (activityUpdateError) throw activityUpdateError;

      // Update the student_activity record (Updates only the current record being edited)
      const { error: saUpdateError } = await supabase.from("student_activities").update({
        student_id: selectedStudentIds[0],
        involvement_score: involvementRating }).eq("id", editingActivity.id);
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
    } });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasActionPermission(user, 'preschool_activities', 'edit')) {
        throw new Error("Access Denied: You do not have permission to delete activities.");
      }
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
    } });

  const handleEditClick = (activity: any) => {
    setEditingActivity(activity);
    setSelectedStudentIds([activity.student_id]);
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
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Camera className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Creative Journal
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Co-Curricular Milestone Hub</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={gradeFilter} onValueChange={(v) => { setGradeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActionPermission(user, 'preschool_activities', 'edit') && (
            <Button variant="outline" onClick={() => setShowActivityTypeManagement(true)} className="rounded-xl h-11">
              <Settings className="h-4 w-4 mr-2" /> Categories
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              {hasActionPermission(user, 'preschool_activities', 'edit') && (
                <Button><Plus className="h-4 w-4 mr-2" /> Log Activity</Button>
              )}
            </DialogTrigger>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="log-activity-title" aria-describedby="log-activity-description">
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Selected Students ({selectedStudentIds.length})</Label>
                   <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest" onClick={() => setSelectedStudentIds(filteredStudentsForModal.map(s => s.id))}>Select All</Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest" onClick={() => setSelectedStudentIds([])}>Clear</Button>
                   </div>
                </div>
                <div className="border border-muted/20 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-muted/5">
                   {filteredStudentsForModal.map((s) => (
                     <div key={s.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-muted/10">
                        <Checkbox
                          id={`student-${s.id}`}
                          checked={selectedStudentIds.includes(s.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedStudentIds(prev => [...prev, s.id]);
                            else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                          }}
                        />
                        <label htmlFor={`student-${s.id}`} className="text-sm font-bold text-slate-700 cursor-pointer flex-1">
                          {s.name} <span className="text-[10px] text-muted-foreground uppercase ml-2 tracking-tighter">{s.grade}</span>
                        </label>
                     </div>
                   ))}
                   {filteredStudentsForModal.length === 0 && (
                     <p className="text-center py-4 text-xs italic text-muted-foreground">No students found for selected grade.</p>
                   )}
                </div>
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
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                />
                {editingActivity && (editingActivity as any).activities?.photo_url && !photo && (
                  <p className="text-sm text-muted-foreground">Current photo attached</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="video">Upload Video (Optional)</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={handleVideoChange}
                />
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
                disabled={selectedStudentIds.length === 0 || activityTypeId === "select-activity-type" || !title || !description || !activityDate || createActivityMutation.isPending || updateActivityMutation.isPending}
                className="w-full"
              >
                {editingActivity ? (updateActivityMutation.isPending ? "Updating..." : "Update Activity") : (createActivityMutation.isPending ? "Logging..." : `Log Activity for ${selectedStudentIds.length} Students`)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2rem] bg-card/40 backdrop-blur-md border border-white/20">
        <CardHeader className="border-b border-border/10 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            Activity Stream
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && !activities.length ? (
            <TableSkeleton columns={5} rows={pageSize} />
          ) : activities.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">No activities recorded for selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10">
                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student & Title</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type & Grade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activity Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Involvement</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Media & Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity: any) => (
                    <TableRow key={activity.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground/90 leading-none">{activity.students?.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{activity.activities?.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {activity.activity_types?.name || 'Milestone'}
                          </Badge>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {activity.students?.grade}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          {format(new Date(activity.activities?.activity_date || activity.created_at), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {activity.involvement_score ? (
                          <div className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-black">
                            <Star className="h-3 w-3 fill-current" />
                            {activity.involvement_score}
                          </div>
                        ) : <span className="text-xs text-slate-400 font-bold">N/A</span>}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          {activity.activities?.photo_url && (
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary" asChild>
                               <a href={supabase.storage.from("activity-photos").getPublicUrl(activity.activities.photo_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                 <Camera className="h-4 w-4" />
                               </a>
                             </Button>
                          )}
                          {activity.activities?.video_url && (
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary" asChild>
                               <a href={supabase.storage.from("activity-videos").getPublicUrl(activity.activities.video_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                 <Video className="h-4 w-4" />
                               </a>
                             </Button>
                          )}
                          {hasActionPermission(user, 'preschool_activities', 'edit') && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleEditClick(activity)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:bg-destructive/10" onClick={() => deleteActivityMutation.mutate(activity.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <ServerPagination
            currentPage={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Activity Type Management Dialog */}
      <Dialog open={showActivityTypeManagement} onOpenChange={setShowActivityTypeManagement}>
        <DialogContent className="w-[95vw] sm:max-w-2xl" aria-labelledby="activity-type-management-title" aria-describedby="activity-type-management-description">
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