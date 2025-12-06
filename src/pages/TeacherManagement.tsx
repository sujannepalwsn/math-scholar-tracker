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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Check, X, UserPlus, Settings, Upload, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
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

  // Individual entry form
  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [monthlySalary, setMonthlySalary] = useState("");
  const [regularInTime, setRegularInTime] = useState("09:00");
  const [regularOutTime, setRegularOutTime] = useState("17:00");

  // Bulk entry
  const [bulkText, setBulkText] = useState("");
  const [parsedBulkEntries, setParsedBulkEntries] = useState<BulkTeacherEntry[]>([]);

  const [isCreatingTeacherLogin, setIsCreatingTeacherLogin] = useState(false);
  const [selectedTeacherForLogin, setSelectedTeacherForLogin] = useState<Teacher | null>(null);
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedTeacherForPermissions, setSelectedTeacherForPermissions] = useState<Teacher | null>(null);

  // Fetch teachers
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
    enabled: !!user?.center_id,
  });

  const resetForm = () => {
    setName("");
    setContactNumber("");
    setEmail("");
    setHireDate(format(new Date(), "yyyy-MM-dd"));
    setMonthlySalary("");
    setRegularInTime("09:00");
    setRegularOutTime("17:00");
    setEditingTeacher(null);
    setBulkText("");
    setParsedBulkEntries([]);
  };

  // Parse bulk text (CSV-like format: name, email, contact, salary, inTime, outTime)
  const parseBulkText = () => {
    const lines = bulkText.trim().split('\n').filter(line => line.trim());
    const entries: BulkTeacherEntry[] = [];
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 1 && parts[0]) {
        entries.push({
          name: parts[0] || '',
          email: parts[1] || '',
          contactNumber: parts[2] || '',
          monthlySalary: parseFloat(parts[3]) || 0,
          regularInTime: parts[4] || '09:00',
          regularOutTime: parts[5] || '17:00',
        });
      }
    }
    
    setParsedBulkEntries(entries);
    if (entries.length > 0) {
      toast.success(`Parsed ${entries.length} teacher entries`);
    } else {
      toast.error("No valid entries found");
    }
  };

  const createTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error, data: newTeacher } = await supabase.from("teachers").insert({
        center_id: user.center_id,
        name,
        contact_number: contactNumber || null,
        email: email || null,
        hire_date: hireDate,
        is_active: true,
        monthly_salary: parseFloat(monthlySalary) || 0,
        regular_in_time: regularInTime || '09:00',
        regular_out_time: regularOutTime || '17:00',
      } as any).select().single();
      if (error) throw error;

      // Seed initial default permissions
      const { error: permError } = await supabase.from('teacher_feature_permissions').insert({
        teacher_id: newTeacher.id,
        take_attendance: true,
        lesson_tracking: true,
        homework_management: true,
        preschool_activities: true,
        discipline_issues: true,
        test_management: true,
        student_report_access: true,
        meetings_management: true,
      });
      if (permError) console.error('Error seeding default permissions:', permError);

      return newTeacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher added successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add teacher");
    },
  });

  const bulkCreateTeachersMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      if (parsedBulkEntries.length === 0) throw new Error("No entries to add");

      const teachersToInsert = parsedBulkEntries.map(entry => ({
        center_id: user.center_id,
        name: entry.name,
        contact_number: entry.contactNumber || null,
        email: entry.email || null,
        hire_date: format(new Date(), "yyyy-MM-dd"),
        is_active: true,
        monthly_salary: entry.monthlySalary || 0,
        regular_in_time: entry.regularInTime || '09:00',
        regular_out_time: entry.regularOutTime || '17:00',
      }));

      const { data: newTeachers, error } = await supabase
        .from("teachers")
        .insert(teachersToInsert as any)
        .select();
      if (error) throw error;

      // Create default permissions for all new teachers
      if (newTeachers && newTeachers.length > 0) {
        const permissions = newTeachers.map(t => ({
          teacher_id: t.id,
          take_attendance: true,
          lesson_tracking: true,
          homework_management: true,
          preschool_activities: true,
          discipline_issues: true,
          test_management: true,
          student_report_access: true,
          meetings_management: true,
        }));
        await supabase.from('teacher_feature_permissions').insert(permissions);
      }

      return newTeachers;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success(`${data?.length || 0} teachers added successfully!`);
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add teachers");
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!editingTeacher || !user?.center_id) throw new Error("Teacher or Center ID not found");
      const { error } = await supabase.from("teachers").update({
        name,
        contact_number: contactNumber || null,
        email: email || null,
        hire_date: hireDate,
        monthly_salary: parseFloat(monthlySalary) || 0,
        regular_in_time: regularInTime || '09:00',
        regular_out_time: regularOutTime || '17:00',
      } as any).eq("id", editingTeacher.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update teacher");
    },
  });

  const toggleTeacherStatusMutation = useMutation({
    mutationFn: async (teacher: Teacher) => {
      const { error } = await supabase.from("teachers").update({
        is_active: !teacher.is_active,
      }).eq("id", teacher.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher status updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update teacher status");
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete teacher");
    },
  });

  const createTeacherLoginMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherForLogin || !user?.center_id) throw new Error("Teacher or Center ID not found");

      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('username', teacherUsername)
        .single();

      if (existingUserError && existingUserError.code !== 'PGRST116') throw existingUserError;
      if (existingUser) {
        throw new Error('Username already exists. Please choose a different one.');
      }

      const hashedPassword = await bcrypt.hash(teacherPassword, 12);

      const { error } = await supabase.from("users").insert({
        username: teacherUsername,
        password_hash: hashedPassword,
        role: 'teacher',
        center_id: user.center_id,
        teacher_id: selectedTeacherForLogin.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher login created successfully!");
      setIsCreatingTeacherLogin(false);
      setSelectedTeacherForLogin(null);
      setTeacherUsername("");
      setTeacherPassword("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create teacher login");
    },
  });

  const handleEditClick = (teacher: any) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setContactNumber(teacher.phone || teacher.contact_number || "");
    setEmail(teacher.email || "");
    setHireDate(teacher.hire_date ? format(new Date(teacher.hire_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setMonthlySalary(teacher.monthly_salary?.toString() || "");
    setRegularInTime(teacher.regular_in_time || "09:00");
    setRegularOutTime(teacher.regular_out_time || "17:00");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTeacher) {
      updateTeacherMutation.mutate();
    } else {
      createTeacherMutation.mutate();
    }
  };

  const handleCreateLoginClick = (teacher: Teacher) => {
    setSelectedTeacherForLogin(teacher);
    setTeacherUsername(teacher.email || '');
    setTeacherPassword('');
    setIsCreatingTeacherLogin(true);
  };

  const handleManagePermissionsClick = (teacher: Teacher) => {
    setSelectedTeacherForPermissions(teacher);
    setShowPermissionsDialog(true);
  };

  // Calculate total monthly salary expense
  const totalMonthlySalary = teachers.reduce((sum, t: any) => sum + (t.monthly_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Management</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <DollarSign className="h-4 w-4" />
            Total Monthly Salary: ₹{totalMonthlySalary.toLocaleString()}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Teacher(s)</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTeacher ? "Edit Teacher" : "Add New Teacher(s)"}</DialogTitle>
              <DialogDescription>
                {editingTeacher ? "Update the details of this teacher." : "Add teachers individually or in bulk."}
              </DialogDescription>
            </DialogHeader>
            
            {editingTeacher ? (
              // Individual edit form
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., jane@example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g., 9876543210" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hireDate">Hire Date</Label>
                    <Input id="hireDate" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlySalary" className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" /> Monthly Salary
                    </Label>
                    <Input 
                      id="monthlySalary" 
                      type="number" 
                      value={monthlySalary} 
                      onChange={(e) => setMonthlySalary(e.target.value)} 
                      placeholder="e.g., 25000" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regularInTime" className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> In Time
                    </Label>
                    <Input 
                      id="regularInTime" 
                      type="time" 
                      value={regularInTime} 
                      onChange={(e) => setRegularInTime(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regularOutTime" className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> Out Time
                    </Label>
                    <Input 
                      id="regularOutTime" 
                      type="time" 
                      value={regularOutTime} 
                      onChange={(e) => setRegularOutTime(e.target.value)} 
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!name || updateTeacherMutation.isPending}
                  className="w-full"
                >
                  {updateTeacherMutation.isPending ? "Updating..." : "Update Teacher"}
                </Button>
              </div>
            ) : (
              // Add new with tabs
              <Tabs defaultValue="individual" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual">Individual Entry</TabsTrigger>
                  <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
                </TabsList>
                
                <TabsContent value="individual" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., jane@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g., 9876543210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">Hire Date</Label>
                      <Input id="hireDate" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthlySalary" className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> Monthly Salary
                      </Label>
                      <Input 
                        id="monthlySalary" 
                        type="number" 
                        value={monthlySalary} 
                        onChange={(e) => setMonthlySalary(e.target.value)} 
                        placeholder="e.g., 25000" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regularInTime" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> In Time
                      </Label>
                      <Input 
                        id="regularInTime" 
                        type="time" 
                        value={regularInTime} 
                        onChange={(e) => setRegularInTime(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="regularOutTime" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Out Time
                      </Label>
                      <Input 
                        id="regularOutTime" 
                        type="time" 
                        value={regularOutTime} 
                        onChange={(e) => setRegularOutTime(e.target.value)} 
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!name || createTeacherMutation.isPending}
                    className="w-full"
                  >
                    {createTeacherMutation.isPending ? "Adding..." : "Add Teacher"}
                  </Button>
                </TabsContent>
                
                <TabsContent value="bulk" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Bulk Entry (CSV Format)</Label>
                    <p className="text-sm text-muted-foreground">
                      Enter one teacher per line: Name, Email, Contact, Salary, InTime, OutTime
                    </p>
                    <Textarea 
                      placeholder={`John Doe, john@example.com, 9876543210, 25000, 09:00, 17:00
Jane Smith, jane@example.com, 9876543211, 30000, 08:30, 16:30
...`}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      rows={6}
                    />
                  </div>
                  
                  <Button variant="outline" onClick={parseBulkText} className="w-full">
                    <Upload className="h-4 w-4 mr-2" /> Parse Entries
                  </Button>
                  
                  {parsedBulkEntries.length > 0 && (
                    <div className="space-y-2">
                      <Label>Parsed Entries ({parsedBulkEntries.length})</Label>
                      <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
                        {parsedBulkEntries.map((entry, idx) => (
                          <div key={idx} className="py-1 border-b last:border-0">
                            <strong>{entry.name}</strong> - {entry.email || 'No email'} - ₹{entry.monthlySalary}
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={() => bulkCreateTeachersMutation.mutate()}
                        disabled={bulkCreateTeachersMutation.isPending}
                        className="w-full"
                      >
                        {bulkCreateTeachersMutation.isPending ? "Adding..." : `Add ${parsedBulkEntries.length} Teachers`}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers ({teachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading teachers...</p>
          ) : teachers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No teachers registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher: any) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>{teacher.contact_number || teacher.phone || '-'}</TableCell>
                      <TableCell>{teacher.email || '-'}</TableCell>
                      <TableCell>
                        {teacher.monthly_salary ? `₹${teacher.monthly_salary.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {teacher.regular_in_time && teacher.regular_out_time 
                          ? `${teacher.regular_in_time} - ${teacher.regular_out_time}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTeacherStatusMutation.mutate(teacher)}
                          className={`flex items-center gap-1 ${teacher.is_active ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {teacher.is_active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {teacher.is_active ? 'Active' : 'Inactive'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {teacher.users && teacher.users.length > 0 ? (
                          <span className="text-green-600 flex items-center gap-1 text-sm">
                            <Check className="h-4 w-4" /> {teacher.users[0].username}
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateLoginClick(teacher)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" /> Create
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(teacher)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleManagePermissionsClick(teacher)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteTeacherMutation.mutate(teacher.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Teacher Login Dialog */}
      <Dialog open={isCreatingTeacherLogin} onOpenChange={setIsCreatingTeacherLogin}>
        <DialogContent aria-labelledby="create-teacher-login-title" aria-describedby="create-teacher-login-description">
          <DialogHeader>
            <DialogTitle id="create-teacher-login-title">Create Login for {selectedTeacherForLogin?.name}</DialogTitle>
            <DialogDescription id="create-teacher-login-description">
              Set a username and password for this teacher to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="teacherUsername">Username</Label>
              <Input
                id="teacherUsername"
                value={teacherUsername}
                onChange={(e) => setTeacherUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherPassword">Password</Label>
              <Input
                id="teacherPassword"
                type="password"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsCreatingTeacherLogin(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createTeacherLoginMutation.mutate()}
                disabled={!teacherUsername || !teacherPassword || createTeacherLoginMutation.isPending}
              >
                {createTeacherLoginMutation.isPending ? 'Creating...' : 'Create Login'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Teacher Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-2xl" aria-labelledby="manage-teacher-permissions-title" aria-describedby="manage-teacher-permissions-description">
          <DialogHeader>
            <DialogTitle id="manage-teacher-permissions-title">Manage Teacher Permissions</DialogTitle>
            <DialogDescription id="manage-teacher-permissions-description">
              Enable or disable specific features for {selectedTeacherForPermissions?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedTeacherForPermissions && (
            <TeacherFeaturePermissions
              teacherId={selectedTeacherForPermissions.id}
              teacherName={selectedTeacherForPermissions.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
