import React, { useState, useEffect } from "react";
import { UserRole } from "@/types/roles";
import { AlertTriangle, Download, GraduationCap, Loader2, Pencil, Save, Search, Trash2, Upload, User, User as UserIcon, UserPlus, Users, X, ChevronRight, ChevronLeft, Check, Camera } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { usePagination } from "@/hooks/usePagination"
import { ServerPagination } from "@/components/ui/ServerPagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge"
import LinkChildToParent from "@/components/center/LinkChildToParent";
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/image-utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AdmissionWorkflow from "@/components/center/AdmissionWorkflow"
import StudentPromotion from "@/components/center/StudentPromotion"
import AlumniManagement from "@/components/center/AlumniManagement"
import ParentManagement from "@/components/center/ParentManagement"
import { hasPermission, hasActionPermission } from "@/utils/permissions";
import { logger } from "@/utils/logger";
import { tracking } from "@/utils/tracking";

interface Student {
  id: string;
  name: string;
  grade: string;
  school_name: string;
  parent_name: string;
  contact_number: string;
  center_id: string;
}

type StudentInput = {
  name: string;
  grade: string;
  school_name: string;
  parent_name: string;
  contact_number: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  roll_number?: string | null;
  address?: string | null;
  center_id?: string | null;
};

export default function RegisterStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const hasFullAccess = hasActionPermission(user, 'register_student', 'edit');
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    school_name: "",
    parent_name: "",
    contact_number: "",
    date_of_birth: "",
    gender: "Male",
    blood_group: "",
    address: "",
    photo_url: "",
    roll_number: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreatingParent, setIsCreatingParent] = useState(false);
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<Student | null>(null);
  const [parentUsername, setParentUsername] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [csvPreviewRows, setCsvPreviewRows] = useState<StudentInput[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [multilineText, setMultilineText] = useState("");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [showLinkChildDialog, setShowLinkChildDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';
  const { currentPage, pageSize, setPage, getRange } = usePagination(10, 1, 'st');

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [gradeFilter, searchFilter, setPage]);

  // Fetch students with pagination
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", user?.center_id, isRestricted, user?.teacher_id, gradeFilter, searchFilter, currentPage, pageSize],
    queryFn: async () => {
      const { from, to } = getRange();
      let query = supabase
        .from("students")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });

      if (user?.role !== UserRole.ADMIN && user?.center_id) {
        query = query.eq("center_id", user.center_id);
      }

      if (isRestricted) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user?.teacher_id);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user?.teacher_id);
        const myGrades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        if (myGrades.length > 0) {
          query = query.in('grade', myGrades);
        } else {
          return { data: [], count: 0 };
        }
      }

      if (gradeFilter !== "all") {
        query = query.eq("grade", gradeFilter);
      }

      if (searchFilter) {
        query = query.or(`name.ilike.%${searchFilter}%,parent_name.ilike.%${searchFilter}%,contact_number.ilike.%${searchFilter}%`);
      }

      const { data, error, count } = await query.range(from, to);
      if (error) {
        logger.error("Error fetching students:", error);
        throw error;
      }
      return { data: (data as Student[]) || [], count: count || 0 };
    },
    enabled: !!user?.center_id,
    placeholderData: (previousData) => previousData });

  const students = studentsData?.data || [];
  const totalCount = studentsData?.count || 0;

  // For unique grades dropdown, we still need a global fetch or a separate query
  const { data: allGrades = [] } = useQuery({
    queryKey: ["all-student-grades", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from('students').select('grade').eq('center_id', user.center_id);
      if (error) return [];
      return Array.from(new Set(data.map(s => s.grade))).filter(Boolean).sort();
    },
    enabled: !!user?.center_id
  });

  const uniqueGrades = allGrades;

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.name) errors.name = "Full name is required";
      if (!formData.date_of_birth) errors.date_of_birth = "Date of birth is required";
    } else if (step === 2) {
      if (!formData.grade) errors.grade = "Grade is required";
      if (!formData.school_name) errors.school_name = "Academy name is required";
    } else if (step === 3) {
      if (!formData.parent_name) errors.parent_name = "Guardian name is required";
      if (!formData.contact_number) errors.contact_number = "Contact number is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (currentStep < 3 && validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  // Single student create
  const createMutation = useMutation({
    mutationFn: async (student: typeof formData) => {
      if (!user?.center_id) throw new Error("Security Context: Center ID not verified. Registration aborted.");
      if (!hasActionPermission(user, 'register_student', 'edit')) {
        throw new Error("Access Denied: You do not have permission to register students.");
      }
      let photo_url = student.photo_url;

      if (photoFile) {
        const compressedFile = await compressImage(photoFile, 100);
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `student-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('activity-photos')
          .upload(fileName, compressedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        photo_url = fileName;
      }

      const { data: center } = await supabase.from('centers').select('short_code').eq('id', user.center_id).maybeSingle();
      const { data: lastStudent } = await supabase
        .from('students')
        .select('student_id_number')
        .eq('center_id', user.center_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const year = new Date().getFullYear();
      let sequence = 1;

      if (lastStudent?.student_id_number) {
        const parts = lastStudent.student_id_number.split('-');
        if (parts.length === 3) {
          const lastSeq = parseInt(parts[2]);
          if (!isNaN(lastSeq)) sequence = lastSeq + 1;
        }
      }

      const studentIdNumber = `${center?.short_code || 'SCH'}-${year}-${sequence.toString().padStart(4, '0')}`;

      const { error } = await supabase.from("students").insert([
        {
          name: student.name,
          grade: student.grade,
          school_name: student.school_name,
          parent_name: student.parent_name,
          contact_number: student.contact_number,
          date_of_birth: student.date_of_birth || null,
          gender: student.gender,
          blood_group: student.blood_group || null,
          address: student.address || null,
          roll_number: student.roll_number || null,
          photo_url,
          student_id_number: studentIdNumber,
          center_id: user?.center_id },
      ]);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      tracking.trackEvent('feature_action', 'create_student', {
        grade: variables.grade,
        school: variables.school_name
      });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setFormData({
        name: "",
        grade: "",
        school_name: "",
        parent_name: "",
        contact_number: "",
        date_of_birth: "",
        gender: "Male",
        blood_group: "",
        address: "",
        photo_url: "",
        roll_number: ""
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      setCurrentStep(1);
      toast.success("Student registered successfully!");
    },
    onError: (error: any) => {
      logger.error("Registration error:", error);
      toast.error(error.message || "Failed to register student");
    } });

  // Update
  const updateMutation = useMutation({
    mutationFn: async (student: any) => {
      if (!user?.center_id) throw new Error("Security Context: Center ID not verified. Update aborted.");
      if (!hasActionPermission(user, 'register_student', 'edit')) {
        throw new Error("Access Denied: You do not have permission to update student records.");
      }
      let photo_url = student.photo_url;

      if (photoFile) {
        const compressedFile = await compressImage(photoFile, 100);
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `student-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('activity-photos')
          .upload(fileName, compressedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        photo_url = fileName;
      }

      const { error } = await supabase
        .from("students")
        .update({
          name: student.name,
          grade: student.grade,
          school_name: student.school_name,
          parent_name: student.parent_name,
          contact_number: student.contact_number,
          date_of_birth: student.date_of_birth || null,
          gender: student.gender,
          blood_group: student.blood_group || null,
          address: student.address || null,
          roll_number: student.roll_number || null,
          photo_url
        })
        .eq("id", student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditingId(null);
      setEditData(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setIsEditDialogOpen(false);
      toast.success("Student updated successfully!");
    },
    onError: (error: any) => {
      logger.error("Update error:", error);
      toast.error(error.message || "Failed to update student");
    } });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasActionPermission(user, 'register_student', 'edit')) {
        throw new Error("Access Denied: You do not have permission to delete student records.");
      }
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully!");
    },
    onError: (error: any) => {
      logger.error("Deletion error:", error);
      toast.error(error.message || "Failed to delete student");
    } });

  // Create parent account
  const createParentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentForParent || !user?.center_id) {
        throw new Error("Student or Center ID not found.");
      }
      if (!hasActionPermission(user, 'register_student', 'edit')) {
        throw new Error("Access Denied: You do not have permission to create parent accounts.");
      }
      const { data, error } = await supabase.functions.invoke('create-parent-account', {
        body: {
          username: parentUsername,
          password: parentPassword,
          studentId: selectedStudentForParent.id
        } });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create parent account via Edge Function');
      return data;
    },
    onMutate: () => {
      if (!hasPermission(user, 'parent_portal')) {
        throw new Error("Parent Portal feature is disabled. Enable it to create parent accounts.");
      }
    },
    onSuccess: () => {
      toast.success("Parent account created successfully");
      setIsCreatingParent(false);
      setSelectedStudentForParent(null);
      setParentUsername("");
      setParentPassword("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create parent account");
    } });

  // Bulk insert
  const bulkInsertMutation = useMutation({
    mutationFn: async (rows: StudentInput[]) => {
      if (!hasActionPermission(user, 'register_student', 'edit')) {
        throw new Error("Access Denied: You do not have permission to perform bulk imports.");
      }
      if (!rows.length) return;
      const rowsWithCenter = rows.map((r) => ({
        ...r,
        center_id: user?.center_id || null }));
      const { error } = await supabase.from("students").insert(rowsWithCenter);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Bulk students added successfully");
      setCsvPreviewRows([]);
      setMultilineText("");
      setShowPreviewDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Bulk insert failed");
    } });

  // CSV Parsing
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

  const mapRowsToStudents = (rows: string[][]) => {
    const errors: string[] = [];
    if (!rows || rows.length === 0) return { rows: [], errors };
    const header = rows[0].map((h) => h.toLowerCase());
    let startIndex = 0;
    let hasHeader = false;
    const expectedFields = ["name", "grade", "school_name", "parent_name", "contact_number", "date_of_birth", "gender", "blood_group", "roll_number", "address"];
    const matchesHeader = expectedFields.every((f) => header.includes(f));
    if (matchesHeader) {
      hasHeader = true;
      startIndex = 1;
    }
    const output: StudentInput[] = [];
    for (let i = startIndex; i < rows.length; i++) {
      const cols = rows[i];
      let student: StudentInput;
      if (hasHeader) {
        const rowObj: any = {};
        for (let c = 0; c < header.length; c++) {
          const key = header[c].trim();
          const val = cols[c] ?? "";
          rowObj[key] = val;
        }
        student = {
          name: (rowObj["name"] || "").trim(),
          grade: (rowObj["grade"] || "").trim(),
          school_name: (rowObj["school_name"] || rowObj["school"] || "").trim(),
          parent_name: (rowObj["parent_name"] || rowObj["parent"] || "").trim(),
          contact_number: (rowObj["contact_number"] || rowObj["contact"] || "").trim(),
          date_of_birth: (rowObj["date_of_birth"] || "").trim() || null,
          gender: (rowObj["gender"] || "Male").trim(),
          blood_group: (rowObj["blood_group"] || "").trim() || null,
          roll_number: (rowObj["roll_number"] || "").trim() || null,
          address: (rowObj["address"] || "").trim() || null
        };
      } else {
        const [name = "", grade = "", school_name = "", parent_name = "", contact_number = "", dob = "", gender = "Male", blood = "", roll = "", addr = ""] = cols;
        student = {
          name: name.trim(),
          grade: grade.trim(),
          school_name: school_name.trim(),
          parent_name: parent_name.trim(),
          contact_number: contact_number.trim(),
          date_of_birth: dob.trim() || null,
          gender: gender.trim() || "Male",
          blood_group: blood.trim() || null,
          roll_number: roll.trim() || null,
          address: addr.trim() || null
        };
      }
      const rowNumber = i + 1;
      const rowErrors: string[] = [];
      if (!student.name) rowErrors.push(`Row ${rowNumber}: name required`);
      if (!student.grade) rowErrors.push(`Row ${rowNumber}: grade required`);
      if (!student.contact_number) rowErrors.push(`Row ${rowNumber}: contact required`);
      if (rowErrors.length) errors.push(...rowErrors);
      else output.push(student);
    }
    // Deduplicate
    const unique: StudentInput[] = [];
    const seenContacts = new Set<string>();
    for (const s of output) {
      const key = s.contact_number || `${s.name}|${s.grade}`;
      if (!seenContacts.has(key)) {
        seenContacts.add(key);
        unique.push(s);
      } else {
        errors.push(`Duplicate in batch: ${key}`);
      }
    }
    return { rows: unique, errors };
  };

  const handleCsvFile = (file: File | null) => {
    if (!file) return;
    setParsing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCSV(text);
      const { rows, errors } = mapRowsToStudents(parsed);
      setCsvPreviewRows(rows);
      setCsvErrors(errors);
      setShowPreviewDialog(true);
      setParsing(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read CSV file");
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const handleParseMultiline = () => {
    if (!multilineText.trim()) {
      toast.error("No text to parse");
      return;
    }
    setParsing(true);
    const normalized = multilineText.replace(/\|/g, ",");
    const parsed = parseCSV(normalized);
    const { rows, errors } = mapRowsToStudents(parsed);
    setCsvPreviewRows(rows);
    setCsvErrors(errors);
    setShowPreviewDialog(true);
    setParsing(false);
  };

  const downloadTemplate = () => {
    const header = ["name", "grade", "school_name", "parent_name", "contact_number", "date_of_birth", "gender", "blood_group", "roll_number", "address"];
    const example = ["John Doe", "6", "ABC School", "Robert Doe", "9812345678", "2010-05-15", "Male", "O+", "01", "123 Street Name"];
    const csv = [header.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
  };

  const handleBulkInsertConfirm = () => {
    if (!csvPreviewRows.length) {
      toast.error("No rows to insert");
      return;
    }
    bulkInsertMutation.mutate(csvPreviewRows);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(3)) {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (student: any) => {
    setEditingId(student.id);
    setEditData({ ...student });
    setPhotoPreview(student.photo_url ? (student.photo_url.startsWith('http') ? student.photo_url : supabase.storage.from('activity-photos').getPublicUrl(student.photo_url).data.publicUrl) : null);
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (editData) updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsEditDialogOpen(false);
  };

  const handleCreateParentAccount = (student: Student) => {
    setSelectedStudentForParent(student);
    setParentUsername("");
    setParentPassword("");
    setIsCreatingParent(true);
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: "Personal" },
      { id: 2, label: "Academic" },
      { id: 3, label: "Guardian" }
    ];

    return (
      <div className="flex items-center justify-center mb-12">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center relative">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 z-10",
                currentStep >= step.id ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-muted text-muted-foreground"
              )}>
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <span className={cn(
                "absolute -bottom-7 text-[10px] font-black uppercase tracking-widest transition-colors duration-500 whitespace-nowrap",
                currentStep >= step.id ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn(
                "w-20 h-1 mx-2 rounded-full transition-colors duration-500",
                currentStep > step.id ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Faculty Nexus: Enrolment
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Onboard new students to the academic system.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="rounded-xl h-11 border-2 font-black uppercase text-[10px] tracking-widest hover:bg-card/60 shadow-soft">
            <Download className="mr-2 h-4 w-4" /> Template
          </Button>
          {hasFullAccess && (
            <>
              <input
                type="file"
                accept=".csv,text/csv"
                id="csv-upload"
                className="hidden"
                onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" size="sm" asChild className="rounded-xl h-11 border-2 cursor-pointer font-black uppercase text-[10px] tracking-widest hover:bg-card/60 shadow-soft">
                  <span>
                    <Upload className="inline-block mr-2 h-4 w-4" /> Import CSV
                  </span>
                </Button>
              </label>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="enrolment" className="space-y-8">
        <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-card/40 backdrop-blur-md border border-border/20 rounded-2xl p-1 h-14 shadow-soft">
          <TabsTrigger value="enrolment" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-soft">Enrolment</TabsTrigger>
          <TabsTrigger value="parents" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-soft">Parent Accounts</TabsTrigger>
          <TabsTrigger value="admission" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-soft">Admission Pipeline</TabsTrigger>
          <TabsTrigger value="promotion" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-soft">Promotion</TabsTrigger>
          <TabsTrigger value="alumni" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-soft">Alumni & TC</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolment" className="space-y-8 outline-none">
      {/* Single Student Form Wizard */}
      <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 group hover:shadow-xl transition-all duration-500">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:scale-110 transition-transform">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            Student Registry Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {renderStepIndicator()}

          <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
            {currentStep === 1 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", formErrors.name ? "text-destructive" : "text-slate-400")}>Full Identity *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Enter full name"
                        className={cn("h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20", formErrors.name && "ring-2 ring-destructive/20")}
                      />
                      {formErrors.name && <p className="text-[10px] font-bold text-destructive ml-1">{formErrors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dob" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", formErrors.date_of_birth ? "text-destructive" : "text-slate-400")}>Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className={cn("h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20", formErrors.date_of_birth && "ring-2 ring-destructive/20")}
                      />
                      {formErrors.date_of_birth && <p className="text-[10px] font-bold text-destructive ml-1">{formErrors.date_of_birth}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gender</Label>
                        <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                          <SelectTrigger className="h-12 rounded-2xl bg-card/50 border-none shadow-soft">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="blood_group" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Blood Group</Label>
                        <Input
                          id="blood_group"
                          value={formData.blood_group}
                          onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                          placeholder="e.g. O+"
                          className="h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative group/photo">
                      <div className="w-40 h-40 rounded-3xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden shadow-inner transition-all group-hover/photo:border-primary/40">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-16 w-16 text-slate-300" />
                        )}
                      </div>
                      <Label
                        htmlFor="photo"
                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform"
                      >
                        <Upload className="h-5 w-5" />
                        <Input
                          id="photo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                        />
                      </Label>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student Portrait</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="grade" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", formErrors.grade ? "text-destructive" : "text-slate-400")}>Grade Level *</Label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      required
                      placeholder="e.g. 5, 10, XII"
                      className={cn("h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20", formErrors.grade && "ring-2 ring-destructive/20")}
                    />
                    {formErrors.grade && <p className="text-[10px] font-bold text-destructive ml-1">{formErrors.grade}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roll_number" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Roll Number</Label>
                    <Input
                      id="roll_number"
                      value={formData.roll_number}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                      placeholder="e.g. 01"
                      className="h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="school_name" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", formErrors.school_name ? "text-destructive" : "text-slate-400")}>Academy Name *</Label>
                    <Input
                      id="school_name"
                      value={formData.school_name}
                      onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                      required
                      placeholder="Enter the name of previous/current academy"
                      className={cn("h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20", formErrors.school_name && "ring-2 ring-destructive/20")}
                    />
                    {formErrors.school_name && <p className="text-[10px] font-bold text-destructive ml-1">{formErrors.school_name}</p>}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="parent_name" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", formErrors.parent_name ? "text-destructive" : "text-slate-400")}>Guardian Name *</Label>
                    <Input
                      id="parent_name"
                      value={formData.parent_name}
                      onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                      required
                      placeholder="Enter parent or guardian full name"
                      className={cn("h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20", formErrors.parent_name && "ring-2 ring-destructive/20")}
                    />
                    {formErrors.parent_name && <p className="text-[10px] font-bold text-destructive ml-1">{formErrors.parent_name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_number" className={cn("text-[10px] font-black uppercase tracking-widest ml-1", formErrors.contact_number ? "text-destructive" : "text-slate-400")}>Telecom Protocol *</Label>
                    <Input
                      id="contact_number"
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                      required
                      placeholder="Phone number"
                      className={cn("h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20", formErrors.contact_number && "ring-2 ring-destructive/20")}
                    />
                    {formErrors.contact_number && <p className="text-[10px] font-bold text-destructive ml-1">{formErrors.contact_number}</p>}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Residential Coordinates</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter permanent residential address"
                      className="rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20 resize-none min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Actions */}
            <div className="flex justify-between items-center pt-8 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="h-12 px-8 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="h-12 px-8 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-900 text-white hover:bg-slate-800 shadow-xl"
                >
                  Continue <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                hasFullAccess && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    className="h-12 rounded-2xl px-12 font-black uppercase text-xs tracking-widest bg-gradient-to-r from-primary to-violet-600 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    {createMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>PROCESSING...</span>
                      </div>
                    ) : (
                      "FINALIZE ENROLMENT"
                    )}
                  </Button>
                )
              )}
            </div>

            {/* Link Guardian (visible in all steps as secondary action) */}
            {hasFullAccess && (
              <div className="flex justify-center pt-4">
                <Button type="button" variant="outline" onClick={() => setShowLinkChildDialog(true)} className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 shadow-soft hover:bg-card/60 px-6">
                  <Users className="h-4 w-4 mr-2" /> LINK EXISTING GUARDIAN
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-8 px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                Academic Roster
              </CardTitle>
              <div className="flex items-center gap-2 ml-14">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   {totalCount} active enrolment records
                 </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 bg-card/60 p-1.5 rounded-2xl border border-border/40 shadow-soft">
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="w-[140px] h-10 border-none bg-transparent shadow-none font-black text-[10px] uppercase tracking-widest focus:ring-0">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/90 border-none rounded-2xl shadow-strong">
                      <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest">All Grades</SelectItem>
                      {uniqueGrades.map((g) => (
                        <SelectItem key={g} value={g} className="font-black text-[10px] uppercase tracking-widest">Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="h-4 w-[1px] bg-slate-200" />
                  <div className="relative">
                    <Input
                      placeholder="SYNCHRONIZED SEARCH..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-[220px] h-10 border-none bg-transparent shadow-none font-black text-[10px] uppercase tracking-widest focus-visible:ring-0 pl-8"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5 border-b border-slate-100">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Student Identity</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Academic Level</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Academy</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Guardian</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Telecom Link</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4 text-right">Operations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></TableCell>
                  </TableRow>
                ) : students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id} className="group transition-all duration-300 hover:bg-card/60">
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
                              {(student as any).photo_url ? (
                                <img src={(student as any).photo_url.startsWith('http') ? (student as any).photo_url : supabase.storage.from('activity-photos').getPublicUrl((student as any).photo_url).data.publicUrl} alt="" className="h-8 w-8 object-cover" />
                              ) : (
                                <UserIcon className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                              )}
                           </div>
                           <p className="font-black text-slate-700 text-sm group-hover:text-primary transition-colors leading-none">{student.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="space-y-1">
                           <Badge variant="secondary" className="bg-primary/5 text-primary/70 border-none rounded-lg text-[10px] font-black uppercase tracking-tighter">Grade {student.grade}</Badge>
                           {(student as any).roll_number && <span className="ml-2 text-[10px] font-bold text-slate-400">Roll: {(student as any).roll_number}</span>}
                           {(student as any).blood_group && <p className="text-[9px] font-bold text-rose-500">{(student as any).blood_group}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-500">{student.school_name}</p>
                          {(student as any).address && <p className="text-[10px] text-slate-400 truncate max-w-[100px]">{(student as any).address}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{student.parent_name}</p>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <p className="text-xs font-black text-primary">{student.contact_number}</p>
                      </TableCell>
                      <TableCell className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasFullAccess && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/5" onClick={() => handleEdit(student)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {hasPermission(user, 'parent_portal') && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/5" onClick={() => handleCreateParentAccount(student)}>
                                  <UserPlus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl bg-white shadow-soft text-rose-500 hover:bg-rose-50"
                                onClick={() => setStudentToDelete(student)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 italic text-slate-400 font-medium">No enrolment records discovered for the current parameters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ServerPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* CSV Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl" aria-labelledby="csv-preview-title" aria-describedby="csv-preview-description">
          <DialogHeader>
            <DialogTitle id="csv-preview-title" className="text-2xl font-black tracking-tight">Bulk Import Matrix</DialogTitle>
            <DialogDescription id="csv-preview-description" className="text-[10px] font-black uppercase tracking-widest text-primary/60">
              Reviewing parsed operational data for batch enrolment
            </DialogDescription>
          </DialogHeader>
          {csvErrors.length > 0 && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-700 mb-6 text-xs font-bold">
              <p className="uppercase tracking-widest mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Syntax Protocols Violated:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {csvErrors.map((err, idx) => (
                  <li key={idx} className="font-medium">{err}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="overflow-hidden border border-slate-100 rounded-3xl">
            <div className="overflow-x-auto">
  <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Name</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Grade</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Academy</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Guardian</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Telecom</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">DOB</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Gender</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Blood</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Roll</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvPreviewRows.map((row, idx) => (
                  <TableRow key={idx} className="border-b last:border-none">
                    <TableCell className="text-xs font-bold">{row.name}</TableCell>
                    <TableCell className="text-xs font-bold"><Badge variant="outline" className="text-[9px] font-black">{row.grade}</Badge></TableCell>
                    <TableCell className="text-[10px] font-medium text-slate-500">{row.school_name}</TableCell>
                    <TableCell className="text-xs font-black uppercase text-slate-600">{row.parent_name}</TableCell>
                    <TableCell className="text-xs font-black text-primary">{row.contact_number}</TableCell>
                    <TableCell className="text-[10px]">{row.date_of_birth || '-'}</TableCell>
                    <TableCell className="text-[10px]">{row.gender || '-'}</TableCell>
                    <TableCell className="text-[10px]">{row.blood_group || '-'}</TableCell>
                    <TableCell className="text-[10px]">{row.roll_number || '-'}</TableCell>
                    <TableCell className="text-[10px] truncate max-w-[100px]">{row.address || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
</div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={() => setShowPreviewDialog(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest">
              ABORT IMPORT
            </Button>
            <Button onClick={handleBulkInsertConfirm} className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
              EXECUTE BATCH ENROLMENT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Parent Dialog */}
      <Dialog open={isCreatingParent} onOpenChange={setIsCreatingParent}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl" aria-labelledby="create-parent-title" aria-describedby="create-parent-description">
          <DialogHeader>
            <DialogTitle id="create-parent-title" className="text-2xl font-black tracking-tight">Access Protocol Setup</DialogTitle>
            <DialogDescription id="create-parent-description" className="text-[10px] font-black uppercase tracking-widest text-primary">
              Generating secure guardian link for {selectedStudentForParent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity (Username)</Label>
                 <Input
                   value={parentUsername}
                   onChange={(e) => setParentUsername(e.target.value)}
                   className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Vector (Password)</Label>
                 <Input
                   value={parentPassword}
                   type="password"
                   onChange={(e) => setParentPassword(e.target.value)}
                   className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                 />
               </div>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => createParentMutation.mutate()} className="h-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
                 ESTABLISH SECURE LINK
              </Button>
              <Button variant="ghost" onClick={() => setIsCreatingParent(false)} className="h-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                CANCEL OPERATION
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
               <div className="p-2 rounded-xl bg-primary/10">
                 <Pencil className="h-6 w-6 text-primary" />
               </div>
               Update Student Profile
            </DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">
              Modifying official records for {editData?.name}
            </DialogDescription>
          </DialogHeader>

          {editData && (
            <div className="grid gap-8 py-6">
              <div className="grid md:grid-cols-12 gap-8">
                {/* Photo Section */}
                <div className="md:col-span-4 flex flex-col items-center gap-4">
                   <div className="relative group/photo">
                      <div className="w-48 h-48 rounded-[2rem] bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden shadow-inner transition-all group-hover/photo:border-primary/40">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-20 w-20 text-slate-300" />
                        )}
                      </div>
                      <Label
                        htmlFor="edit-photo"
                        className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform"
                      >
                        <Camera className="h-6 w-6" />
                        <Input
                          id="edit-photo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                        />
                      </Label>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Identity Portrait</p>
                       <p className="text-[9px] font-medium text-slate-300 mt-1 italic">Click the camera to upload a new photo</p>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="md:col-span-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Full Name</Label>
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Roll Number</Label>
                      <Input
                        value={editData.roll_number || ""}
                        onChange={(e) => setEditData({ ...editData, roll_number: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                        placeholder="e.g. 01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Grade Level</Label>
                      <Input
                        value={editData.grade}
                        onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Date of Birth</Label>
                      <Input
                        type="date"
                        value={editData.date_of_birth || ""}
                        onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Gender</Label>
                      <Select value={editData.gender} onValueChange={(v) => setEditData({ ...editData, gender: v })}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Blood Group</Label>
                      <Input
                        value={editData.blood_group || ""}
                        onChange={(e) => setEditData({ ...editData, blood_group: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                        placeholder="e.g. O+"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Academy Name</Label>
                    <Input
                      value={editData.school_name}
                      onChange={(e) => setEditData({ ...editData, school_name: e.target.value })}
                      className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Guardian Name</Label>
                      <Input
                        value={editData.parent_name}
                        onChange={(e) => setEditData({ ...editData, parent_name: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Contact Number</Label>
                      <Input
                        value={editData.contact_number}
                        onChange={(e) => setEditData({ ...editData, contact_number: e.target.value })}
                        className="h-11 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Residential Coordinates</Label>
                    <Textarea
                      value={editData.address || ""}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      className="rounded-xl bg-slate-50 border-none shadow-inner font-bold resize-none min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest"
                >
                  ABORT CHANGES
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="rounded-xl px-10 font-black uppercase text-[10px] tracking-widest bg-slate-900 text-white shadow-lg"
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  SYNCHRONIZE PROFILE
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deletion Confirmation */}
      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Security Protocol: Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              You are about to permanently purge the record for <span className="font-black text-rose-600 underline decoration-2 underline-offset-4">{studentToDelete?.name}</span>. This action is irreversible and will remove all associated academic data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 border-2">ABORT MISSION</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (studentToDelete) {
                  deleteMutation.mutate(studentToDelete.id);
                  setStudentToDelete(null);
                }
              }}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
            >
              EXECUTE PURGE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Child to Parent Dialog */}
      <LinkChildToParent 
        open={showLinkChildDialog} 
        onOpenChange={setShowLinkChildDialog} 
      />
        </TabsContent>

        <TabsContent value="admission" className="outline-none">
          <AdmissionWorkflow centerId={user?.center_id || ""} canEdit={hasFullAccess} />
        </TabsContent>

        <TabsContent value="promotion" className="outline-none">
          <StudentPromotion centerId={user?.center_id || ""} canEdit={hasFullAccess} />
        </TabsContent>

        <TabsContent value="alumni" className="outline-none">
          <AlumniManagement centerId={user?.center_id || ""} canEdit={hasFullAccess} />
        </TabsContent>

        <TabsContent value="parents" className="outline-none">
          <ParentManagement centerId={user?.center_id || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
