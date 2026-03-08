import React, { useState } from "react";
import { Clock, DollarSign, Edit, GraduationCap, Loader2, Plus, Settings, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import * as bcrypt from 'bcryptjs';
import TeacherFeaturePermissions from '@/components/center/TeacherFeaturePermissions';

type Teacher = Tables<'teachers'>;

interface BulkTeacherEntry {
  name: string;
  email: string;
  contactNumber: string;
  monthlySalary: number;
  regularInTime: string;
  regularOutTime: string;
}

export default function TeacherManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [monthlySalary, setMonthlySalary] = useState("");
  const [regularInTime, setRegularInTime] = useState("09:00");
  const [regularOutTime, setRegularOutTime] = useState("17:00");

  const [bulkText, setBulkText] = useState("");
  const [parsedBulkEntries, setParsedBulkEntries] = useState<BulkTeacherEntry[]>([]);

  const [isCreatingTeacherLogin, setIsCreatingTeacherLogin] = useState(false);
  const [selectedTeacherForLogin, setSelectedTeacherForLogin] = useState<Teacher | null>(null);
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedTeacherForPermissions, setSelectedTeacherForPermissions] = useState<Teacher | null>(null);

  // Class teacher assignment states
  const [showClassTeacherDialog, setShowClassTeacherDialog] = useState(false);
  const [selectedTeacherForClassAssign, setSelectedTeacherForClassAssign] = useState<Teacher | null>(null);
  const [classTeacherGrade, setClassTeacherGrade] = useState("select-grade");

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("teachers")
        .select("*, users!teachers_user_id_fkey(id, username, is_active)")
        .eq("center_id", user.center_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  // Fetch students for unique grades
  const { data: students = [] } = useQuery({
    queryKey: ["students-grades", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("grade").eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  // Fetch class teacher assignments
  const { data: classTeacherAssignments = [] } = useQuery({
    queryKey: ["class-teacher-assignments", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("class_teacher_assignments")
        .select("*, teachers(name)")
        .eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const getClassTeacherGrades = (teacherId: string) => {
    return classTeacherAssignments.filter((a: any) => a.teacher_id === teacherId).map((a: any) => a.grade);
  };

  const resetForm = () => {
    setName(""); setContactNumber(""); setEmail("");
    setHireDate(format(new Date(), "yyyy-MM-dd"));
    setMonthlySalary(""); setRegularInTime("09:00"); setRegularOutTime("17:00");
    setEditingTeacher(null); setBulkText(""); setParsedBulkEntries([]);
  };

  const parseBulkText = () => {
    const lines = bulkText.trim().split('\n').filter(line => line.trim());
    const entries: BulkTeacherEntry[] = [];
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 1 && parts[0]) {
        entries.push({ name: parts[0], email: parts[1] || '', contactNumber: parts[2] || '', monthlySalary: parseFloat(parts[3]) || 0, regularInTime: parts[4] || '09:00', regularOutTime: parts[5] || '17:00' });
      }
    }
    setParsedBulkEntries(entries);
    entries.length > 0 ? toast.success(`Parsed ${entries.length} teacher entries`) : toast.error("No valid entries found");
  };

  const createTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error, data: newTeacher } = await supabase.from("teachers").insert({
        center_id: user.center_id, name, contact_number: contactNumber || null, email: email || null,
        hire_date: hireDate, is_active: true, monthly_salary: parseFloat(monthlySalary) || 0,
        regular_in_time: regularInTime || '09:00', regular_out_time: regularOutTime || '17:00' } as any).select().single();
      if (error) throw error;
      const { error: permError } = await supabase.from('teacher_feature_permissions').insert({
        teacher_id: newTeacher.id, take_attendance: true, lesson_tracking: true, homework_management: true,
        preschool_activities: true, discipline_issues: true, test_management: true, student_report_access: true, meetings_management: true });
      if (permError) console.error('Error seeding default permissions:', permError);
      return newTeacher;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Teacher added successfully!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to add teacher") });

  const bulkCreateTeachersMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      if (parsedBulkEntries.length === 0) throw new Error("No entries to add");
      const teachersToInsert = parsedBulkEntries.map(entry => ({
        center_id: user.center_id, name: entry.name, contact_number: entry.contactNumber || null, email: entry.email || null,
        hire_date: format(new Date(), "yyyy-MM-dd"), is_active: true, monthly_salary: entry.monthlySalary || 0,
        regular_in_time: entry.regularInTime || '09:00', regular_out_time: entry.regularOutTime || '17:00' }));
      const { data: newTeachers, error } = await supabase.from("teachers").insert(teachersToInsert as any).select();
      if (error) throw error;
      if (newTeachers && newTeachers.length > 0) {
        const permissions = newTeachers.map(t => ({ teacher_id: t.id, take_attendance: true, lesson_tracking: true, homework_management: true, preschool_activities: true, discipline_issues: true, test_management: true, student_report_access: true, meetings_management: true }));
        await supabase.from('teacher_feature_permissions').insert(permissions);
      }
      return newTeachers;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success(`${data?.length || 0} teachers added!`); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to add teachers") });

  const updateTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!editingTeacher || !user?.center_id) throw new Error("Teacher or Center ID not found");
      const { error } = await supabase.from("teachers").update({
        name, contact_number: contactNumber || null, email: email || null, hire_date: hireDate,
        monthly_salary: parseFloat(monthlySalary) || 0, regular_in_time: regularInTime || '09:00', regular_out_time: regularOutTime || '17:00' } as any).eq("id", editingTeacher.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Teacher updated!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to update") });

  const toggleTeacherStatusMutation = useMutation({
    mutationFn: async (teacher: Teacher) => {
      const { error } = await supabase.from("teachers").update({ is_active: !teacher.is_active }).eq("id", teacher.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Status updated!"); },
    onError: (error: any) => toast.error(error.message) });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("teachers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Teacher deleted!"); },
    onError: (error: any) => toast.error(error.message) });

  const createTeacherLoginMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherForLogin || !user?.center_id) throw new Error("Missing info");
      const { data: existingUser, error: existingUserError } = await supabase.from('users').select('id').eq('username', teacherUsername).single();
      if (existingUserError && existingUserError.code !== 'PGRST116') throw existingUserError;
      if (existingUser) throw new Error('Username already exists.');
      const hashedPassword = await bcrypt.hash(teacherPassword, 12);
      const { error } = await supabase.from("users").insert({ username: teacherUsername, password_hash: hashedPassword, role: 'teacher', center_id: user.center_id, teacher_id: selectedTeacherForLogin.id, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Login created!"); setIsCreatingTeacherLogin(false); setSelectedTeacherForLogin(null); setTeacherUsername(""); setTeacherPassword(""); },
    onError: (error: any) => toast.error(error.message) });

  // Class teacher assignment mutation
  const assignClassTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherForClassAssign || !user?.center_id || classTeacherGrade === "select-grade") throw new Error("Select a grade");
      // Upsert: replace existing assignment for that grade
      const { error } = await supabase.from("class_teacher_assignments").upsert({
        teacher_id: selectedTeacherForClassAssign.id,
        grade: classTeacherGrade,
        center_id: user.center_id }, { onConflict: 'grade,center_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-teacher-assignments"] });
      toast.success("Class teacher assigned!");
      setShowClassTeacherDialog(false);
      setClassTeacherGrade("select-grade");
    },
    onError: (error: any) => toast.error(error.message) });

  const handleEditClick = (teacher: any) => {
    setEditingTeacher(teacher); setName(teacher.name);
    setContactNumber(teacher.phone || teacher.contact_number || ""); setEmail(teacher.email || "");
    setHireDate(teacher.hire_date ? format(new Date(teacher.hire_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setMonthlySalary(teacher.monthly_salary?.toString() || "");
    setRegularInTime(teacher.regular_in_time || "09:00"); setRegularOutTime(teacher.regular_out_time || "17:00");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => { editingTeacher ? updateTeacherMutation.mutate() : createTeacherMutation.mutate(); };
  const handleCreateLoginClick = (teacher: Teacher) => { setSelectedTeacherForLogin(teacher); setTeacherUsername(teacher.email || ''); setTeacherPassword(''); setIsCreatingTeacherLogin(true); };
  const handleManagePermissionsClick = (teacher: Teacher) => { setSelectedTeacherForPermissions(teacher); setShowPermissionsDialog(true); };
  const handleClassTeacherClick = (teacher: Teacher) => { setSelectedTeacherForClassAssign(teacher); setClassTeacherGrade("select-grade"); setShowClassTeacherDialog(true); };

  const totalMonthlySalary = teachers.reduce((sum, t: any) => sum + (t.monthly_salary || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Faculty Nexus
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Manage human capital and institutional faculty.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Monthly Payroll</span>
              <span className="font-black text-slate-700 text-sm">₹{totalMonthlySalary.toLocaleString()}</span>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black tracking-tight bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all duration-300">
                <Plus className="h-5 w-5 mr-2" />
                ENROL FACULTY
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add New Teacher(s)"}</DialogTitle>
              <DialogDescription>{editingTeacher ? "Update details." : "Add individually or in bulk."}</DialogDescription>
            </DialogHeader>
            {editingTeacher ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Contact Number</Label><Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Hire Date</Label><Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label><DollarSign className="h-4 w-4 inline" /> Salary</Label><Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
                  <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> In</Label><Input type="time" value={regularInTime} onChange={(e) => setRegularInTime(e.target.value)} /></div>
                  <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Out</Label><Input type="time" value={regularOutTime} onChange={(e) => setRegularOutTime(e.target.value)} /></div>
                </div>
                <Button onClick={handleSubmit} disabled={!name || updateTeacherMutation.isPending} className="w-full">{updateTeacherMutation.isPending ? "Updating..." : "Update Teacher"}</Button>
              </div>
            ) : (
              <Tabs defaultValue="individual" className="mt-4">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="individual">Individual</TabsTrigger><TabsTrigger value="bulk">Bulk</TabsTrigger></TabsList>
                <TabsContent value="individual" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Contact</Label><Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Hire Date</Label><Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label><DollarSign className="h-4 w-4 inline" /> Salary</Label><Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
                    <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> In</Label><Input type="time" value={regularInTime} onChange={(e) => setRegularInTime(e.target.value)} /></div>
                    <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Out</Label><Input type="time" value={regularOutTime} onChange={(e) => setRegularOutTime(e.target.value)} /></div>
                  </div>
                  <Button onClick={handleSubmit} disabled={!name || createTeacherMutation.isPending} className="w-full">{createTeacherMutation.isPending ? "Adding..." : "Add Teacher"}</Button>
                </TabsContent>
                <TabsContent value="bulk" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Bulk Entry (CSV Format)</Label>
                    <p className="text-sm text-muted-foreground">Name, Email, Contact, Salary, InTime, OutTime</p>
                    <Textarea placeholder={`John Doe, john@example.com, 9876543210, 25000, 09:00, 17:00`} value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} />
                  </div>
                  <Button variant="outline" onClick={parseBulkText} className="w-full"><Upload className="h-4 w-4 mr-2" /> Parse</Button>
                  {parsedBulkEntries.length > 0 && (
                    <div className="space-y-2">
                      <Label>Parsed ({parsedBulkEntries.length})</Label>
                      <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
                        {parsedBulkEntries.map((entry, idx) => <div key={idx} className="py-1 border-b last:border-0"><strong>{entry.name}</strong> - {entry.email || 'No email'} - ₹{entry.monthlySalary}</div>)}
                      </div>
                      <Button onClick={() => bulkCreateTeachersMutation.mutate()} disabled={bulkCreateTeachersMutation.isPending} className="w-full">{bulkCreateTeachersMutation.isPending ? "Adding..." : `Add ${parsedBulkEntries.length} Teachers`}</Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            Staff Roster
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground font-medium italic">No active faculty profiles identified.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/5">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Faculty Member</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Contact Protocol</TableHead>
                    <TableHead className="hidden sm:table-cell font-black uppercase text-[10px] tracking-widest px-6 py-4">Payroll</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Responsibilities</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">System Status</TableHead>
                    <TableHead className="hidden sm:table-cell font-black uppercase text-[10px] tracking-widest px-6 py-4">Identity</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher: any) => {
                    const ctGrades = getClassTeacherGrades(teacher.id);
                    return (
                      <TableRow key={teacher.id} className="group transition-all duration-300 hover:bg-card/60">
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-black text-slate-700 group-hover:text-primary transition-colors leading-none">{teacher.name}</p>
                            <p className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{teacher.email || 'No email registered'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-bold text-primary text-xs">{teacher.contact_number || teacher.phone || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell px-6 py-4">
                          <span className="font-black text-slate-600 text-xs">{teacher.monthly_salary ? `₹${teacher.monthly_salary.toLocaleString()}` : '-'}</span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {ctGrades.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {ctGrades.map((g: string) => (
                                <Badge key={g} variant="secondary" className="bg-primary/5 text-primary border-none rounded-lg text-[9px] font-black uppercase tracking-tighter">
                                  <GraduationCap className="h-2.5 w-2.5 mr-1" />
                                  Class {g}
                                </Badge>
                              ))}
                            </div>
                          ) : <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Instructor</span>}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div
                            className={cn(
                              "inline-flex items-center gap-1.5 font-black uppercase text-[10px] tracking-tight cursor-pointer hover:opacity-70 transition-opacity",
                              teacher.is_active ? "text-green-600" : "text-red-600"
                            )}
                            onClick={() => toggleTeacherStatusMutation.mutate(teacher)}
                          >
                            <div className={cn("h-1.5 w-1.5 rounded-full", teacher.is_active ? "bg-green-600" : "bg-red-600")} />
                            {teacher.is_active ? 'Active' : 'Suspended'}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell px-6 py-4">
                          {teacher.users && teacher.users.length > 0 ? (
                            <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-black">{teacher.users[0].username}</code>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5" onClick={() => handleCreateLoginClick(teacher)}>
                              <UserPlus className="h-3 w-3 mr-1" /> GENERATE
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" onClick={() => handleEditClick(teacher)}>
                              <Edit className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" onClick={() => handleClassTeacherClick(teacher)} title="Assign Grade Oversight">
                              <GraduationCap className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" onClick={() => handleManagePermissionsClick(teacher)}>
                              <Settings className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft hover:bg-destructive/10" onClick={() => deleteTeacherMutation.mutate(teacher.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Teacher Assignment Dialog */}
      <Dialog open={showClassTeacherDialog} onOpenChange={setShowClassTeacherDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Class Teacher</DialogTitle>
            <DialogDescription>Assign {selectedTeacherForClassAssign?.name} as class teacher for a grade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Grade</Label>
              <Select value={classTeacherGrade} onValueChange={setClassTeacherGrade}>
                <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="select-grade" disabled>Select Grade</SelectItem>
                  {uniqueGrades.map(g => {
                    const existing = classTeacherAssignments.find((a: any) => a.grade === g);
                    return <SelectItem key={g} value={g!}>{g} {existing ? `(Currently: ${(existing as any).teachers?.name})` : ''}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => assignClassTeacherMutation.mutate()} disabled={classTeacherGrade === "select-grade" || assignClassTeacherMutation.isPending} className="w-full">
              {assignClassTeacherMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Teacher Login Dialog */}
      <Dialog open={isCreatingTeacherLogin} onOpenChange={setIsCreatingTeacherLogin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Login for {selectedTeacherForLogin?.name}</DialogTitle>
            <DialogDescription>Set username and password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Username</Label><Input value={teacherUsername} onChange={(e) => setTeacherUsername(e.target.value)} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)} /></div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsCreatingTeacherLogin(false)}>Cancel</Button>
              <Button onClick={() => createTeacherLoginMutation.mutate()} disabled={!teacherUsername || !teacherPassword || createTeacherLoginMutation.isPending}>
                {createTeacherLoginMutation.isPending ? 'Creating...' : 'Create Login'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Teacher Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>Toggle features for {selectedTeacherForPermissions?.name}.</DialogDescription>
          </DialogHeader>
          {selectedTeacherForPermissions && <TeacherFeaturePermissions teacherId={selectedTeacherForPermissions.id} teacherName={selectedTeacherForPermissions.name} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
