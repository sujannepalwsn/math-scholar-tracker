import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { Clock, DollarSign, Edit, FileText, GraduationCap, Loader2, Plus, Settings, ShieldCheck, Trash2, Upload, UserPlus, Users, X, KeyRound, Shield, ShieldOff } from "lucide-react";
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
import { usePagination } from "@/hooks/usePagination";
import { ServerPagination } from "@/components/ui/ServerPagination";
import { toast } from "sonner"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import * as bcrypt from 'bcryptjs';
import TeacherFeaturePermissions from '@/components/center/TeacherFeaturePermissions';
import StaffHRModule from '@/components/center/StaffHRModule';
import { logger } from "@/utils/logger";

type Teacher = Tables<'teachers'>;

interface BulkTeacherEntry {
  name: string;
  email: string;
  contactNumber: string;
  hireDate: string;
  address: string;
  employeeId: string;
  dob: string;
  gender: string;
  monthlySalary: number;
  qualifications: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  expectedCheckIn: string;
  expectedCheckOut: string;
  regularInTime: string;
  regularOutTime: string;
}

import { hasPermission, hasActionPermission } from "@/utils/permissions";

export default function TeacherManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasFullAccess = hasActionPermission(user, 'teacher_management', 'edit');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  const [name, setName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [hireDate, setHireDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [contractEndDate, setContractEndDate] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [regularInTime, setRegularInTime] = useState("09:00");
  const [regularOutTime, setRegularOutTime] = useState("17:00");
  const [expectedCheckIn, setExpectedCheckIn] = useState("09:00");
  const [expectedCheckOut, setExpectedCheckOut] = useState("17:00");
  const [employeeId, setEmployeeId] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [qualifications, setQualifications] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [parsedBulkEntries, setParsedBulkEntries] = useState<BulkTeacherEntry[]>([]);

  const [isCreatingTeacherLogin, setIsCreatingTeacherLogin] = useState(false);
  const [selectedTeacherForLogin, setSelectedTeacherForLogin] = useState<Teacher | null>(null);
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [isChangingTeacherPassword, setIsChangingTeacherPassword] = useState(false);

  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedTeacherForPermissions, setSelectedTeacherForPermissions] = useState<Teacher | null>(null);

  const [showHRDialog, setShowHRDialog] = useState(false);
  const [selectedTeacherForHR, setSelectedTeacherForHR] = useState<Teacher | null>(null);

  // Class teacher assignment states
  const [showClassTeacherDialog, setShowClassTeacherDialog] = useState(false);
  const [selectedTeacherForClassAssign, setSelectedTeacherForClassAssign] = useState<Teacher | null>(null);
  const [classTeacherGrade, setClassTeacherGrade] = useState("select-grade");

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';
  const { currentPage, pageSize, setPage, getRange } = usePagination(10, 1, 'tr');

  const { data: teachersData, isLoading } = useQuery({
    queryKey: ["teachers", user?.center_id, isRestricted, user?.teacher_id, currentPage, pageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };
      const { from, to } = getRange();

      let query = supabase
        .from("teachers")
        .select("*, users!teachers_user_id_fkey(id, username, is_active)", { count: 'exact' })
        .eq("center_id", user.center_id);

      if (isRestricted) {
        query = query.eq('id', user?.teacher_id);
      }

      const { data, error, count } = await query
        .order("name")
        .range(from, to);

      if (error) {
        logger.error("Error fetching teachers:", error);
        throw error;
      }
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id });

  const teachers = teachersData?.data || [];
  const totalCount = teachersData?.count || 0;

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
    setContractEndDate("");
    setMonthlySalary(""); setRegularInTime("09:00"); setRegularOutTime("17:00");
    setExpectedCheckIn("09:00"); setExpectedCheckOut("17:00");
    setEmployeeId(""); setAddress(""); setDob(""); setGender("Male");
    setBankAccountName(""); setBankAccountNumber(""); setBankName("");
    setEmergencyContactName(""); setEmergencyContactRelation(""); setEmergencyContactPhone("");
    setQualifications("");
    setEditingTeacher(null); setBulkText(""); setParsedBulkEntries([]);
  };

  const parseCSV = (csv: string): string[][] => {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;
    for (let i = 0; i < csv.length; i++) {
      const ch = csv[i];
      const nxt = csv[i + 1];
      if (ch === '"') {
        if (inQuotes && nxt === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (current !== "" || row.length > 0) {
          row.push(current.trim());
          rows.push(row);
          row = [];
          current = "";
        }
        if (ch === "\r" && csv[i + 1] === "\n") i++;
      } else {
        current += ch;
      }
    }
    if (current !== "" || row.length > 0) {
      row.push(current.trim());
      rows.push(row);
    }
    return rows;
  };

  const parseBulkText = () => {
    const parsed = parseCSV(bulkText.trim());
    if (!parsed || parsed.length === 0) {
      toast.error("No valid entries found");
      return;
    }

    const header = parsed[0].map(h => h.toLowerCase().trim());
    const expectedFields = ["name", "email", "contact_number", "hire_date", "address", "employee_id", "dob", "gender", "monthly_salary", "qualifications", "bank_account_name", "bank_account_number", "bank_name", "emergency_contact_name", "emergency_contact_relation", "emergency_contact_phone", "expected_check_in", "expected_check_out", "regular_in_time", "regular_out_time"];

    let startIndex = 0;
    let hasHeader = expectedFields.every(f => header.includes(f));
    if (hasHeader) startIndex = 1;

    const entries: BulkTeacherEntry[] = [];
    for (let i = startIndex; i < parsed.length; i++) {
      const cols = parsed[i];
      if (cols.length === 0 || !cols[0]) continue;

      if (hasHeader) {
        const rowObj: any = {};
        for (let c = 0; c < header.length; c++) {
          rowObj[header[c]] = cols[c] || "";
        }
        entries.push({
          name: rowObj["name"] || "",
          email: rowObj["email"] || "",
          contactNumber: rowObj["contact_number"] || "",
          hireDate: rowObj["hire_date"] || format(new Date(), "yyyy-MM-dd"),
          address: rowObj["address"] || "",
          employeeId: rowObj["employee_id"] || "",
          dob: rowObj["dob"] || "",
          gender: rowObj["gender"] || "Male",
          monthlySalary: parseFloat(rowObj["monthly_salary"]) || 0,
          qualifications: rowObj["qualifications"] || "",
          bankAccountName: rowObj["bank_account_name"] || "",
          bankAccountNumber: rowObj["bank_account_number"] || "",
          bankName: rowObj["bank_name"] || "",
          emergencyContactName: rowObj["emergency_contact_name"] || "",
          emergencyContactRelation: rowObj["emergency_contact_relation"] || "",
          emergencyContactPhone: rowObj["emergency_contact_phone"] || "",
          expectedCheckIn: rowObj["expected_check_in"] || "09:00",
          expectedCheckOut: rowObj["expected_check_out"] || "17:00",
          regularInTime: rowObj["regular_in_time"] || "09:00",
          regularOutTime: rowObj["regular_out_time"] || "17:00",
        });
      } else {
        const [
          name = "", email = "", contactNumber = "", hireDate = format(new Date(), "yyyy-MM-dd"),
          address = "", employeeId = "", dob = "", gender = "Male",
          monthlySalary = "0", qualifications = "",
          bankAccountName = "", bankAccountNumber = "", bankName = "",
          emergencyContactName = "", emergencyContactRelation = "", emergencyContactPhone = "",
          expectedCheckIn = "09:00", expectedCheckOut = "17:00",
          regularInTime = "09:00", regularOutTime = "17:00"
        ] = cols;
        entries.push({
          name, email, contactNumber, hireDate, address, employeeId, dob, gender,
          monthlySalary: parseFloat(monthlySalary) || 0, qualifications,
          bankAccountName, bankAccountNumber, bankName,
          emergencyContactName, emergencyContactRelation, emergencyContactPhone,
          expectedCheckIn, expectedCheckOut, regularInTime, regularOutTime
        });
      }
    }
    setParsedBulkEntries(entries);
    entries.length > 0 ? toast.success(`Parsed ${entries.length} teacher entries`) : toast.error("No valid entries found");
  };

  const downloadTemplate = () => {
    const header = ["name", "email", "contact_number", "hire_date", "address", "employee_id", "dob", "gender", "monthly_salary", "qualifications", "bank_account_name", "bank_account_number", "bank_name", "emergency_contact_name", "emergency_contact_relation", "emergency_contact_phone", "expected_check_in", "expected_check_out", "regular_in_time", "regular_out_time"];
    const example = ["Jane Doe", "jane@example.com", "9800000000", "2024-01-01", "456 Avenue", "EMP001", "1990-01-01", "Female", "30000", "M.Sc Mathematics", "Jane Doe", "1234567890", "Global Bank", "Robert Doe", "Husband", "9811111111", "09:00", "17:00", "09:00", "17:00"];
    const csv = [header.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teachers-template.csv";
    a.click();
  };

  const handleCsvFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBulkText(String(reader.result || ""));
      toast.info("CSV loaded. Click Parse to review.");
    };
    reader.readAsText(file);
  };

  const createTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      if (!hasActionPermission(user, 'teacher_management', 'edit')) {
        throw new Error("Access Denied: You do not have permission to enrol faculty.");
      }
      const { error, data: newTeacher } = await supabase.from("teachers").insert({
        center_id: user.center_id, name, contact_number: contactNumber || null, email: email || null,
        hire_date: hireDate, contract_end_date: contractEndDate || null, is_active: true, monthly_salary: parseFloat(monthlySalary) || 0,
        regular_in_time: regularInTime || '09:00', regular_out_time: regularOutTime || '17:00',
        expected_check_in: expectedCheckIn || '09:00', expected_check_out: expectedCheckOut || '17:00',
        employee_id: employeeId || null, address: address || null, date_of_birth: dob || null, gender,
        qualifications: qualifications.split(',').map(q => q.trim()).filter(Boolean),
        bank_details: { account_name: bankAccountName, account_number: bankAccountNumber, bank_name: bankName },
        emergency_contact: { name: emergencyContactName, relation: emergencyContactRelation, phone: emergencyContactPhone }
      } as any).select().single();
      if (error) throw error;
      const defaultModules = [
        'take_attendance', 'lesson_tracking', 'homework_management', 'preschool_activities',
        'discipline_issues', 'test_management', 'student_report', 'meetings_management',
        'dashboard_access', 'class_routine', 'messaging', 'calendar_events', 'summary',
        'lesson_plans', 'leave_management', 'exams_results', 'published_results'
      ];

      const permissionsObj: any = {};
      const legacyObj: any = { teacher_id: newTeacher.id };

      defaultModules.forEach(mod => {
        permissionsObj[mod] = {
          enabled: true,
          can_view: true,
          can_edit: true,
          can_approve: ['lesson_plans', 'leave_management'].includes(mod),
          can_publish: ['exams_results', 'published_results'].includes(mod)
        };
        legacyObj[mod] = true;
      });

      const { error: permError } = await supabase.from('teacher_feature_permissions').insert({
        ...legacyObj,
        permissions: permissionsObj
      });
      if (permError) logger.error('Error seeding default permissions:', permError);
      return newTeacher;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Teacher added successfully!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to add teacher") });

  const bulkCreateTeachersMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      if (!hasActionPermission(user, 'teacher_management', 'edit')) {
        throw new Error("Access Denied: You do not have permission to perform bulk enrolment.");
      }
      if (parsedBulkEntries.length === 0) throw new Error("No entries to add");
      const teachersToInsert = parsedBulkEntries.map(entry => ({
        center_id: user.center_id,
        name: entry.name,
        contact_number: entry.contactNumber || null,
        email: entry.email || null,
        hire_date: entry.hireDate || format(new Date(), "yyyy-MM-dd"),
        is_active: true,
        address: entry.address || null,
        employee_id: entry.employeeId || null,
        date_of_birth: entry.dob || null,
        gender: entry.gender || "Male",
        monthly_salary: entry.monthlySalary || 0,
        qualifications: entry.qualifications ? entry.qualifications.split(',').map(q => q.trim()).filter(Boolean) : [],
        bank_details: {
          account_name: entry.bankAccountName || null,
          account_number: entry.bankAccountNumber || null,
          bank_name: entry.bankName || null
        },
        emergency_contact: {
          name: entry.emergencyContactName || null,
          relation: entry.emergencyContactRelation || null,
          phone: entry.emergencyContactPhone || null
        },
        expected_check_in: entry.expectedCheckIn || "09:00",
        expected_check_out: entry.expectedCheckOut || "17:00",
        regular_in_time: entry.regularInTime || '09:00',
        regular_out_time: entry.regularOutTime || '17:00'
      }));
      const { data: newTeachers, error } = await supabase.from("teachers").insert(teachersToInsert as any).select();
      if (error) throw error;
      if (newTeachers && newTeachers.length > 0) {
        const defaultModules = [
          'take_attendance', 'lesson_tracking', 'homework_management', 'preschool_activities',
          'discipline_issues', 'test_management', 'student_report', 'meetings_management',
          'dashboard_access', 'class_routine', 'messaging', 'calendar_events', 'summary',
          'lesson_plans', 'leave_management', 'exams_results', 'published_results'
        ];

        const permissions = newTeachers.map(t => {
          const permissionsObj: any = {};
          const legacyObj: any = { teacher_id: t.id };

          defaultModules.forEach(mod => {
            permissionsObj[mod] = {
              enabled: true,
              can_view: true,
              can_edit: true,
              can_approve: ['lesson_plans', 'leave_management'].includes(mod),
              can_publish: ['exams_results', 'published_results'].includes(mod)
            };
            legacyObj[mod] = true;
          });

          return {
            ...legacyObj,
            permissions: permissionsObj
          };
        });
        await supabase.from('teacher_feature_permissions').insert(permissions);
      }
      return newTeachers;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success(`${data?.length || 0} teachers added!`); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to add teachers") });

  const updateTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!editingTeacher || !user?.center_id) throw new Error("Teacher or Center ID not found");
      if (!hasActionPermission(user, 'teacher_management', 'edit')) {
        throw new Error("Access Denied: You do not have permission to update faculty records.");
      }
      const { error } = await supabase.from("teachers").update({
        name, contact_number: contactNumber || null, email: email || null, hire_date: hireDate,
        contract_end_date: contractEndDate || null,
        monthly_salary: parseFloat(monthlySalary) || 0, regular_in_time: regularInTime || '09:00', regular_out_time: regularOutTime || '17:00',
        expected_check_in: expectedCheckIn || '09:00', expected_check_out: expectedCheckOut || '17:00',
        employee_id: employeeId || null, address: address || null, date_of_birth: dob || null, gender,
        qualifications: qualifications.split(',').map(q => q.trim()).filter(Boolean),
        bank_details: { account_name: bankAccountName, account_number: bankAccountNumber, bank_name: bankName },
        emergency_contact: { name: emergencyContactName, relation: emergencyContactRelation, phone: emergencyContactPhone }
      } as any).eq("id", editingTeacher.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Teacher updated!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to update") });

  const toggleTeacherStatusMutation = useMutation({
    mutationFn: async (teacher: any) => {
      if (!hasActionPermission(user, 'teacher_management', 'edit')) {
        throw new Error("Access Denied: You do not have permission to toggle faculty status.");
      }

      const isActivating = !teacher.is_active;
      if (isActivating && teacher.contract_end_date && new Date(teacher.contract_end_date) < new Date()) {
        throw new Error("Cannot activate account with expired contract. Please renew contract first.");
      }

      const { error } = await supabase.from("teachers").update({ is_active: !teacher.is_active }).eq("id", teacher.id);
      if (error) throw error;

      if (teacher.user_id) {
        await supabase.from("users").update({ is_active: !teacher.is_active }).eq("id", teacher.user_id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Status updated!"); },
    onError: (error: any) => toast.error(error.message) });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasActionPermission(user, 'teacher_management', 'edit')) {
        throw new Error("Access Denied: You do not have permission to delete faculty records.");
      }
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["teachers"] }); toast.success("Teacher deleted!"); },
    onError: (error: any) => toast.error(error.message) });

  const createTeacherLoginMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherForLogin || !user?.center_id) throw new Error("Missing info");
      if (!hasActionPermission(user, 'teacher_management', 'edit')) {
        throw new Error("Access Denied: You do not have permission to generate faculty logins.");
      }
      const { data: existingUser, error: existingUserError } = await supabase.from('users').select('id').eq('username', teacherUsername).single();
      if (existingUserError && existingUserError.code !== 'PGRST116') throw existingUserError;
      if (existingUser) throw new Error('Username already exists.');

      if (selectedTeacherForLogin.contract_end_date && new Date(selectedTeacherForLogin.contract_end_date) < new Date()) {
        throw new Error("Cannot create login for teacher with expired contract.");
      }

      const hashedPassword = await bcrypt.hash(teacherPassword, 12);
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          username: teacherUsername,
          password_hash: hashedPassword,
          role: 'teacher',
          center_id: user.center_id,
          teacher_id: selectedTeacherForLogin.id,
          is_active: true
        })
        .select()
        .single();

      if (userError) throw userError;

      // Link user to teacher
      const { error: teacherUpdateError } = await supabase
        .from("teachers")
        .update({ user_id: newUser.id })
        .eq("id", selectedTeacherForLogin.id);

      if (teacherUpdateError) throw teacherUpdateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Login created!");
      setIsCreatingTeacherLogin(false);
      setSelectedTeacherForLogin(null);
      setTeacherUsername("");
      setTeacherPassword("");
    },
    onError: (error: any) => toast.error(error.message) });

  // Class teacher assignment mutation
  const assignClassTeacherMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacherForClassAssign || !user?.center_id || classTeacherGrade === "select-grade") throw new Error("Select a grade");
      if (!hasActionPermission(user, 'teacher_management', 'edit')) {
        throw new Error("Access Denied: You do not have permission to assign class teachers.");
      }
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

  const changeTeacherPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeacher || !teacherPassword) throw new Error("Missing info");
      const hashedPassword = await bcrypt.hash(teacherPassword, 12);
      const { error } = await supabase
        .from("users")
        .update({ password_hash: hashedPassword })
        .eq("id", selectedTeacher.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setIsChangingTeacherPassword(false);
      setTeacherPassword("");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleEditClick = (teacher: any) => {
    setEditingTeacher(teacher); setName(teacher.name);
    setContactNumber(teacher.phone || teacher.contact_number || ""); setEmail(teacher.email || "");
    setHireDate(teacher.hire_date ? format(new Date(teacher.hire_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setContractEndDate(teacher.contract_end_date || "");
    setMonthlySalary(teacher.monthly_salary?.toString() || "");
    setRegularInTime(teacher.regular_in_time || "09:00"); setRegularOutTime(teacher.regular_out_time || "17:00");
    setExpectedCheckIn(teacher.expected_check_in || "09:00"); setExpectedCheckOut(teacher.expected_check_out || "17:00");
    setEmployeeId(teacher.employee_id || ""); setAddress(teacher.address || "");
    setDob(teacher.date_of_birth || ""); setGender(teacher.gender || "Male");
    setBankAccountName(teacher.bank_details?.account_name || "");
    setBankAccountNumber(teacher.bank_details?.account_number || "");
    setBankName(teacher.bank_details?.bank_name || "");
    setEmergencyContactName(teacher.emergency_contact?.name || "");
    setEmergencyContactRelation(teacher.emergency_contact?.relation || "");
    setEmergencyContactPhone(teacher.emergency_contact?.phone || "");
    setQualifications(Array.isArray(teacher.qualifications) ? teacher.qualifications.join(', ') : "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => { editingTeacher ? updateTeacherMutation.mutate() : createTeacherMutation.mutate(); };
  const handleCreateLoginClick = (teacher: Teacher) => { setSelectedTeacherForLogin(teacher); setTeacherUsername(teacher.email || ''); setTeacherPassword(''); setIsCreatingTeacherLogin(true); };
  const handleManagePermissionsClick = (teacher: Teacher) => { setSelectedTeacherForPermissions(teacher); setShowPermissionsDialog(true); };
  const handleClassTeacherClick = (teacher: Teacher) => { setSelectedTeacherForClassAssign(teacher); setClassTeacherGrade("select-grade"); setShowClassTeacherDialog(true); };
  const handleHRClick = (teacher: Teacher) => { setSelectedTeacherForHR(teacher); setShowHRDialog(true); };

  const totalMonthlySalary = teachers.reduce((sum, t: any) => sum + (t.monthly_salary || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Users className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Faculty Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Institutional Personnel & Faculty Registry</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground leading-none">Monthly Payroll</span>
              <span className="font-black text-slate-700 text-sm">NPR {totalMonthlySalary.toLocaleString()}</span>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            {hasFullAccess && (
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black tracking-tight bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all duration-300">
                  <Plus className="h-5 w-5 mr-2" />
                  ENROL FACULTY
                </Button>
              </DialogTrigger>
            )}
          <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto" aria-labelledby="teacher-dialog-title" aria-describedby="teacher-dialog-description">
            <DialogHeader>
              <DialogTitle id="teacher-dialog-title">{editingTeacher ? "Edit Teacher" : "Add New Teacher(s)"}</DialogTitle>
              <DialogDescription id="teacher-dialog-description">{editingTeacher ? "Update details." : "Add individually or in bulk."}</DialogDescription>
            </DialogHeader>
            {editingTeacher ? (
              <div className="space-y-4 py-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="flex flex-nowrap w-full overflow-x-auto h-10 p-1 custom-scrollbar">
                    <TabsTrigger value="basic" className="flex-1 min-w-[100px]">Basic Info</TabsTrigger>
                    <TabsTrigger value="hr" className="flex-1 min-w-[100px]">HR & Bank</TabsTrigger>
                    <TabsTrigger value="timing" className="flex-1 min-w-[100px]">Timing</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Contact Number</Label><Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Hire Date</Label><Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Contract End Date</Label><Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                  </TabsContent>
                  <TabsContent value="hr" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Employee ID</Label><Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} /></div>
                      <div className="space-y-2"><Label>DOB</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Monthly Salary</Label><Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Skills & Qualifications (Comma Separated)</Label><Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="B.Ed, Mathematics, 5y Experience" /></div>
                    </div>
                    <div className="border p-3 rounded-lg space-y-3">
                       <Label className="font-bold">Bank Details</Label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1"><Label className="text-[10px]">Account Name</Label><Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-[10px]">Account Number</Label><Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-[10px]">Bank Name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
                       </div>
                    </div>
                    <div className="border p-3 rounded-lg space-y-3">
                       <Label className="font-bold">Emergency Contact</Label>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1"><Label className="text-[10px]">Name</Label><Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-[10px]">Relation</Label><Input value={emergencyContactRelation} onChange={(e) => setEmergencyContactRelation(e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-[10px]">Phone</Label><Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} /></div>
                       </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="timing" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Expected Check-in Boundary</Label><Input type="time" value={expectedCheckIn} onChange={(e) => setExpectedCheckIn(e.target.value)} /></div>
                      <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Expected Check-out Boundary</Label><Input type="time" value={expectedCheckOut} onChange={(e) => setExpectedCheckOut(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Regular Start Time</Label><Input type="time" value={regularInTime} onChange={(e) => setRegularInTime(e.target.value)} /></div>
                      <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Regular End Time</Label><Input type="time" value={regularOutTime} onChange={(e) => setRegularOutTime(e.target.value)} /></div>
                    </div>
                  </TabsContent>
                </Tabs>
                <Button onClick={handleSubmit} disabled={!name || updateTeacherMutation.isPending} className="w-full">{updateTeacherMutation.isPending ? "Updating..." : "Update Teacher"}</Button>
              </div>
            ) : (
              <Tabs defaultValue="individual" className="mt-4">
                <TabsList className="flex flex-nowrap overflow-x-auto w-full grid w-full grid-cols-2"><TabsTrigger value="individual">Individual</TabsTrigger><TabsTrigger value="bulk">Bulk</TabsTrigger></TabsList>
                <TabsContent value="individual" className="space-y-4 pt-4">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="flex flex-nowrap w-full overflow-x-auto h-10 p-1 custom-scrollbar">
                      <TabsTrigger value="basic" className="flex-1 min-w-[100px]">Basic Info</TabsTrigger>
                      <TabsTrigger value="hr" className="flex-1 min-w-[100px]">HR & Bank</TabsTrigger>
                      <TabsTrigger value="timing" className="flex-1 min-w-[100px]">Timing</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Contact</Label><Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Hire Date</Label><Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Contract End Date</Label><Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} /></div>
                      </div>
                      <div className="space-y-2"><Label>Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                    </TabsContent>
                    <TabsContent value="hr" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Employee ID</Label><Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} /></div>
                        <div className="space-y-2"><Label>DOB</Label><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Gender</Label>
                          <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Monthly Salary</Label><Input type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Skills & Qualifications (Comma Separated)</Label><Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="B.Ed, Mathematics, 5y Experience" /></div>
                      </div>
                      <div className="border p-3 rounded-lg space-y-3">
                         <Label className="font-bold">Bank Details</Label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-[10px]">Account Name</Label><Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">Account Number</Label><Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">Bank Name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
                         </div>
                      </div>
                      <div className="border p-3 rounded-lg space-y-3">
                         <Label className="font-bold">Emergency Contact</Label>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1"><Label className="text-[10px]">Name</Label><Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">Relation</Label><Input value={emergencyContactRelation} onChange={(e) => setEmergencyContactRelation(e.target.value)} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">Phone</Label><Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} /></div>
                         </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="timing" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Expected Check-in Boundary</Label><Input type="time" value={expectedCheckIn} onChange={(e) => setExpectedCheckIn(e.target.value)} /></div>
                        <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Expected Check-out Boundary</Label><Input type="time" value={expectedCheckOut} onChange={(e) => setExpectedCheckOut(e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Regular Start Time</Label><Input type="time" value={regularInTime} onChange={(e) => setRegularInTime(e.target.value)} /></div>
                        <div className="space-y-2"><Label><Clock className="h-4 w-4 inline" /> Regular End Time</Label><Input type="time" value={regularOutTime} onChange={(e) => setRegularOutTime(e.target.value)} /></div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <Button onClick={handleSubmit} disabled={!name || createTeacherMutation.isPending} className="w-full">{createTeacherMutation.isPending ? "Adding..." : "Add Teacher"}</Button>
                </TabsContent>
                <TabsContent value="bulk" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <Label>Bulk Entry (CSV Format)</Label>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Provide CSV text or upload a file</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-8 text-[10px] font-black uppercase tracking-widest">
                        Template
                      </Button>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        id="teacher-csv-upload"
                        className="hidden"
                        onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
                      />
                      <label htmlFor="teacher-csv-upload">
                        <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-black uppercase tracking-widest cursor-pointer">
                          <span>Upload CSV</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  <Textarea
                    placeholder="name, email, contact_number, hire_date, address, employee_id, dob, gender, monthly_salary, qualifications, bank_account_name, bank_account_number, bank_name, emergency_contact_name, emergency_contact_relation, emergency_contact_phone, expected_check_in, expected_check_out, regular_in_time, regular_out_time"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" onClick={parseBulkText} className="w-full h-10 font-black uppercase tracking-widest text-[10px] border-2">
                    <Upload className="h-4 w-4 mr-2" /> Parse Data
                  </Button>
                  {parsedBulkEntries.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Parsed Matrix ({parsedBulkEntries.length})</Label>
                      </div>
                      <div className="max-h-64 overflow-auto border rounded-2xl">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="text-[9px] font-black uppercase tracking-tighter">Name</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-tighter">Email</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-tighter">Contact</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-tighter">Salary</TableHead>
                              <TableHead className="text-[9px] font-black uppercase tracking-tighter">Timing</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedBulkEntries.map((entry, idx) => (
                              <TableRow key={idx} className="text-[10px]">
                                <TableCell className="font-bold">{entry.name}</TableCell>
                                <TableCell>{entry.email}</TableCell>
                                <TableCell>{entry.contactNumber}</TableCell>
                                <TableCell>NPR {entry.monthlySalary}</TableCell>
                                <TableCell>{entry.regularInTime}-{entry.regularOutTime}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <Button
                        onClick={() => bulkCreateTeachersMutation.mutate()}
                        disabled={bulkCreateTeachersMutation.isPending}
                        className="w-full h-12 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg"
                      >
                        {bulkCreateTeachersMutation.isPending ? "Adding Faculty..." : `Execute Batch Enrolment (${parsedBulkEntries.length})`}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
        <div className={cn("flex-1 transition-all duration-500", selectedTeacher ? "lg:w-1/2" : "w-full")}>
          <Card className="border-none shadow-strong overflow-hidden rounded-[2rem] bg-card/40 backdrop-blur-md border border-white/20">
            <CardHeader className="border-b border-border/10 bg-primary/5 py-6">
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
                        {!selectedTeacher && <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Contact Protocol</TableHead>}
                        {!selectedTeacher && <TableHead className="hidden sm:table-cell font-black uppercase text-[10px] tracking-widest px-6 py-4">Payroll</TableHead>}
                        <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">System Status</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right pr-6">Operations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.map((teacher: any) => {
                        return (
                          <TableRow
                            key={teacher.id}
                            className={cn(
                              "group/row transition-all duration-300 cursor-pointer",
                              selectedTeacher?.id === teacher.id ? "bg-primary/5" : ""
                            )}
                            onClick={() => setSelectedTeacher(teacher)}
                          >
                            <TableCell className="px-6 py-4">
                              <div className="space-y-1">
                                <p className="font-black text-slate-700 group-hover/row:text-primary transition-colors leading-none">{teacher.name}</p>
                                <p className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{teacher.email || 'No email registered'}</p>
                              </div>
                            </TableCell>
                            {!selectedTeacher && (
                              <TableCell className="px-6 py-4 font-bold text-primary text-xs">{teacher.contact_number || teacher.phone || '-'}</TableCell>
                            )}
                            {!selectedTeacher && (
                              <TableCell className="hidden sm:table-cell px-6 py-4">
                                <span className="font-black text-slate-600 text-xs">{teacher.monthly_salary ? `NPR ${teacher.monthly_salary.toLocaleString()}` : '-'}</span>
                              </TableCell>
                            )}
                            <TableCell className="px-6 py-4">
                              <Badge
                                variant={teacher.is_active ? "pulse" : "destructive"}
                              >
                                {teacher.is_active ? 'Active' : 'Suspended'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right pr-6">
                              <div className="flex justify-end gap-2 items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-9 w-9 rounded-xl bg-white shadow-soft transition-all",
                                    teacher.is_active ? "text-rose-500 hover:bg-rose-50" : "text-emerald-500 hover:bg-emerald-50"
                                  )}
                                  onClick={(e) => { e.stopPropagation(); toggleTeacherStatusMutation.mutate(teacher); }}
                                  title={teacher.is_active ? "Deactivate Account" : "Activate Account"}
                                >
                                  {teacher.is_active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                </Button>
                                {!teacher.user_id ? (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-9 rounded-xl font-black uppercase text-[10px] tracking-tighter bg-emerald-600 hover:bg-emerald-700 shadow-md animate-pulse border-none"
                                    onClick={(e) => { e.stopPropagation(); handleCreateLoginClick(teacher); }}
                                  >
                                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                    CREATE USER ACCOUNT
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase italic bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-soft">
                                    <ShieldCheck className="h-3.5 w-3.5" /> System Access Active
                                  </div>
                                )}
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white shadow-soft border border-slate-100 hover:bg-primary/5 transition-all" onClick={(e) => { e.stopPropagation(); handleEditClick(teacher); }}>
                                  <Edit className="h-4 w-4 text-primary" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <ServerPagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedTeacher && (
          <div className="lg:w-1/2 animate-in slide-in-from-right-8 duration-500">
            <Card className="rounded-[2.5rem] border-none shadow-strong bg-white overflow-hidden sticky top-8">
              <CardHeader className="bg-primary/5 border-b border-border/10 p-8 flex flex-row justify-between items-start">
                <div>
                  <div className="flex gap-2 mb-4">
                    <Badge className="bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-lg">Faculty Detail Matrix</Badge>
                    {selectedTeacher.users ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-black uppercase text-[10px] tracking-tighter">
                        Login Active: {selectedTeacher.users.username}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-black uppercase text-[10px] tracking-tighter">
                        No Login Account
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tight text-slate-800">{selectedTeacher.name}</CardTitle>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1">{selectedTeacher.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTeacher(null)} className="rounded-full hover:bg-rose-50 text-rose-500">
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-1">
                      <p className="label-caps">Contact Number</p>
                      <p className="font-black text-slate-700">{selectedTeacher.contact_number || selectedTeacher.phone || 'N/A'}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="label-caps">Monthly Salary</p>
                      <p className="font-black text-slate-700">NPR {selectedTeacher.monthly_salary?.toLocaleString() || '0'}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="label-caps">Hire Date</p>
                      <p className="font-black text-slate-700">{selectedTeacher.hire_date ? format(new Date(selectedTeacher.hire_date), "MMM d, yyyy") : 'N/A'}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="label-caps">Contract End</p>
                      <p className={cn("font-black", selectedTeacher.contract_end_date && new Date(selectedTeacher.contract_end_date) < new Date() ? "text-rose-600" : "text-slate-700")}>
                        {selectedTeacher.contract_end_date ? format(new Date(selectedTeacher.contract_end_date), "MMM d, yyyy") : 'PERMANENT'}
                      </p>
                   </div>
                   <div className="space-y-1">
                      <p className="label-caps">Employee ID</p>
                      <p className="font-black text-slate-700">{selectedTeacher.employee_id || 'N/A'}</p>
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <p className="label-caps">Responsibilities</p>
                  <div className="flex flex-wrap gap-2">
                    {getClassTeacherGrades(selectedTeacher.id).length > 0 ? (
                      getClassTeacherGrades(selectedTeacher.id).map((g: string) => (
                        <Badge key={g} variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-3 py-1 text-[10px] font-black uppercase">
                          Class {g} Teacher
                        </Badge>
                      ))
                    ) : <span className="text-xs text-muted-foreground italic">No class assignments</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11" onClick={() => handleEditClick(selectedTeacher)}>
                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit Profile
                  </Button>
                  {selectedTeacher.user_id && (
                    <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11" onClick={() => setIsChangingTeacherPassword(true)}>
                      <KeyRound className="h-3.5 w-3.5 mr-2" /> Change Password
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-xl font-black uppercase text-[10px] tracking-widest h-11",
                      selectedTeacher.is_active ? "text-rose-600 hover:bg-rose-50 border-rose-200" : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                    )}
                    onClick={() => toggleTeacherStatusMutation.mutate(selectedTeacher)}
                  >
                    {selectedTeacher.is_active ? (
                      <><ShieldOff className="h-3.5 w-3.5 mr-2" /> Deactivate Account</>
                    ) : (
                      <><Shield className="h-3.5 w-3.5 mr-2" /> Activate Account</>
                    )}
                  </Button>
                  <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11" onClick={() => handleHRClick(selectedTeacher)}>
                    <FileText className="h-3.5 w-3.5 mr-2" /> HR & Payroll
                  </Button>
                  <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11" onClick={() => handleManagePermissionsClick(selectedTeacher)}>
                    <Settings className="h-3.5 w-3.5 mr-2" /> Permissions
                  </Button>
                  <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11" onClick={() => handleClassTeacherClick(selectedTeacher)}>
                    <GraduationCap className="h-3.5 w-3.5 mr-2" /> Assign Grade
                  </Button>
                  {!selectedTeacher.user_id && (
                    <Button
                      variant="default"
                      className="rounded-xl font-black uppercase text-[10px] tracking-widest h-14 bg-gradient-to-r from-indigo-600 via-primary to-violet-600 shadow-xl shadow-primary/20 border-none hover:scale-[1.02] transition-all animate-in zoom-in duration-500"
                      onClick={() => handleCreateLoginClick(selectedTeacher)}
                    >
                      <UserPlus className="h-5 w-5 mr-3" /> INITIALIZE SYSTEM ACCESS
                    </Button>
                  )}
                </div>

                {hasFullAccess && (
                  <Button
                    variant="destructive"
                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
                    onClick={() => { if (window.confirm("Delete this faculty record permanent?")) { deleteTeacherMutation.mutate(selectedTeacher.id); setSelectedTeacher(null); } }}
                  >
                    Delete Faculty Record
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

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
                    return <SelectItem key={g} value={g || "unassigned"}>{g} {existing ? `(Currently: ${(existing as any).teachers?.name})` : ''}</SelectItem>;
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
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>Toggle features for {selectedTeacherForPermissions?.name}.</DialogDescription>
          </DialogHeader>
          {selectedTeacherForPermissions && <TeacherFeaturePermissions teacherId={selectedTeacherForPermissions.id} teacherName={selectedTeacherForPermissions.name} />}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangingTeacherPassword} onOpenChange={setIsChangingTeacherPassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password for {selectedTeacher?.name}</DialogTitle>
            <DialogDescription>Enter a new secure password for this faculty member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button
              onClick={() => changeTeacherPasswordMutation.mutate()}
              disabled={!teacherPassword || changeTeacherPasswordMutation.isPending}
              className="w-full"
            >
              {changeTeacherPasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* HR Module Dialog */}
      <Dialog open={showHRDialog} onOpenChange={setShowHRDialog}>
        <DialogContent className="w-[95vw] sm:max-w-3xl" aria-labelledby="hr-terminal-title" aria-describedby="hr-terminal-description">
          <DialogHeader>
            <DialogTitle id="hr-terminal-title" className="text-2xl font-black uppercase tracking-tight">Faculty HR Terminal</DialogTitle>
            <DialogDescription id="hr-terminal-description" className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">
               Managing profile for {selectedTeacherForHR?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTeacherForHR && <StaffHRModule teacherId={selectedTeacherForHR.id} teacherName={selectedTeacherForHR.name} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
