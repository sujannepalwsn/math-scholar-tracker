import React, { useState } from "react";
import { AlertTriangle, Download, GraduationCap, Pencil, Save, Search, Trash2, Upload, User, User as UserIcon, UserPlus, Users, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import LinkChildToParent from "@/components/center/LinkChildToParent";
import { cn } from "@/lib/utils"

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
  center_id?: string | null;
};

export default function RegisterStudent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    school_name: "",
    parent_name: "",
    contact_number: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Student | null>(null);
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

  // Fetch students
  const { data: students, isLoading } = useQuery({
    queryKey: ["students", user?.center_id],
    queryFn: async () => {
      let query = supabase.from("students").select("*").order("created_at", { ascending: false });
      if (user?.role !== "admin" && user?.center_id) {
        query = query.eq("center_id", user.center_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    } });

  // Filter students based on grade and search
  const filteredStudents = students?.filter(s => 
    (gradeFilter === "all" || s.grade === gradeFilter) &&
    (searchFilter === "" || 
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.contact_number.includes(searchFilter))
  );

  const uniqueGrades = Array.from(new Set(students?.map(s => s.grade) || [])).sort();

  // Single student create
  const createMutation = useMutation({
    mutationFn: async (student: typeof formData) => {
      const { error } = await supabase.from("students").insert([
        {
          ...student,
          center_id: user?.center_id },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", user?.center_id] });
      setFormData({
        name: "",
        grade: "",
        school_name: "",
        parent_name: "",
        contact_number: "" });
      toast.success("Student registered successfully!");
    },
    onError: () => {
      toast.error("Failed to register student");
    } });

  // Update
  const updateMutation = useMutation({
    mutationFn: async (student: Student) => {
      const { error } = await supabase
        .from("students")
        .update({
          name: student.name,
          grade: student.grade,
          school_name: student.school_name,
          parent_name: student.parent_name,
          contact_number: student.contact_number })
        .eq("id", student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", user?.center_id] });
      setEditingId(null);
      setEditData(null);
      toast.success("Student updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update student");
    } });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", user?.center_id] });
      toast.success("Student deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete student");
    } });

  // Create parent account
  const createParentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentForParent || !user?.center_id) {
        throw new Error("Student or Center ID not found.");
      }
      const { data, error } = await supabase.functions.invoke('create-parent-account', {
        body: {
          username: parentUsername,
          password: parentPassword,
          studentId: selectedStudentForParent.id,
          centerId: user.center_id } });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create parent account via Edge Function');
      return data;
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
      if (!rows.length) return;
      const rowsWithCenter = rows.map((r) => ({
        ...r,
        center_id: user?.center_id || null }));
      const { error } = await supabase.from("students").insert(rowsWithCenter);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", user?.center_id] });
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
    const expectedFields = [
      "name",
      "grade",
      "school_name",
      "parent_name",
      "contact_number",
    ];
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
          const key = header[c];
          const val = cols[c] ?? "";
          rowObj[key] = val;
        }
        student = {
          name: (rowObj["name"] || "").trim(),
          grade: (rowObj["grade"] || "").trim(),
          school_name: (rowObj["school_name"] || rowObj["school"] || "").trim(),
          parent_name: (rowObj["parent_name"] || rowObj["parent"] || "").trim(),
          contact_number: (rowObj["contact_number"] || rowObj["contact"] || "").trim() };
      } else {
        const [name = "", grade = "", school_name = "", parent_name = "", contact_number = ""] = cols;
        student = {
          name: name.trim(),
          grade: grade.trim(),
          school_name: school_name.trim(),
          parent_name: parent_name.trim(),
          contact_number: contact_number.trim() };
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
    const header = ["name", "grade", "school_name", "parent_name", "contact_number"];
    const example = ["John Doe", "6", "ABC School", "Robert Doe", "9812345678"];
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
    createMutation.mutate(formData);
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setEditData({ ...student });
  };

  const handleSave = () => {
    if (editData) updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleCreateParentAccount = (student: Student) => {
    setSelectedStudentForParent(student);
    setParentUsername("");
    setParentPassword("");
    setIsCreatingParent(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
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
        </div>
      </div>

      {/* Single Student Form */}
      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 group hover:shadow-xl transition-all duration-500">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:scale-110 transition-transform">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            Student Registry Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Identity *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter full name"
                  className="h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Grade Level *</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  required
                  placeholder="e.g. 5, 10, XII"
                  className="h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Academy Name *</Label>
                <Input
                  id="school_name"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  required
                  placeholder="School name"
                  className="h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Guardian Name *</Label>
                <Input
                  id="parent_name"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  required
                  placeholder="Parent/Guardian"
                  className="h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telecom Protocol *</Label>
                <Input
                  id="contact_number"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  required
                  placeholder="Phone number"
                  className="h-12 rounded-2xl bg-card/50 border-none shadow-soft focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-slate-100">
              <Button type="submit" className="h-12 rounded-2xl px-8 font-black uppercase text-xs tracking-widest bg-gradient-to-r from-primary to-violet-600 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                ENROL STUDENT
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowLinkChildDialog(true)} className="h-12 rounded-2xl font-black uppercase text-xs tracking-widest border-2 shadow-soft hover:bg-card/60">
                <Users className="h-4 w-4 mr-2" /> LINK GUARDIAN
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                type="button"
                size="sm"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors"
                onClick={() => {
                  const el = document.getElementById("multiline-area");
                  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
                }}
              >
                BULK SYNTAX PASTE
              </Button>
            </div>

            {/* Multiline paste */}
            <div id="multiline-area" style={{ display: "none" }} className="mt-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syntax Format: name, grade, school_name, parent_name, contact_number</Label>
              <Textarea
                value={multilineText}
                onChange={(e) => setMultilineText(e.target.value)}
                rows={5}
                placeholder="John Doe,6,ABC School,Robert Doe,9812345678"
                className="rounded-2xl border-2 border-dashed bg-slate-50/50 focus-visible:ring-primary/20"
              />
              <div className="flex gap-3">
                <Button onClick={handleParseMultiline} disabled={parsing} variant="secondary" className="rounded-xl font-black uppercase text-[10px] tracking-widest">
                   PARSING & PREVIEW
                </Button>
                <Button variant="ghost" onClick={() => setMultilineText("")} className="rounded-xl text-xs">
                  Clear
                </Button>
              </div>
            </div>
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
                   {filteredStudents?.length || 0} active enrolment records
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
                ) : filteredStudents && filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id} className="group transition-all duration-300 hover:bg-card/60">
                      <TableCell className="px-8 py-5">
                        {editingId === student.id ? (
                          <Input
                            value={editData?.name}
                            className="h-9 rounded-xl text-xs font-bold"
                            onChange={(e) =>
                              setEditData((prev) =>
                                prev ? { ...prev, name: e.target.value } : null
                              )
                            }
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <UserIcon className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                             </div>
                             <p className="font-black text-slate-700 text-sm group-hover:text-primary transition-colors leading-none">{student.name}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        {editingId === student.id ? (
                          <Input
                            value={editData?.grade}
                            className="h-9 rounded-xl text-xs font-bold"
                            onChange={(e) =>
                              setEditData((prev) =>
                                prev ? { ...prev, grade: e.target.value } : null
                              )
                            }
                          />
                        ) : (
                          <Badge variant="secondary" className="bg-primary/5 text-primary/70 border-none rounded-lg text-[10px] font-black uppercase tracking-tighter">Grade {student.grade}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        {editingId === student.id ? (
                          <Input
                            value={editData?.school_name}
                            className="h-9 rounded-xl text-xs font-bold"
                            onChange={(e) =>
                              setEditData((prev) =>
                                prev ? { ...prev, school_name: e.target.value } : null
                              )
                            }
                          />
                        ) : (
                          <p className="text-xs font-bold text-slate-500">{student.school_name}</p>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        {editingId === student.id ? (
                          <Input
                            value={editData?.parent_name}
                            className="h-9 rounded-xl text-xs font-bold"
                            onChange={(e) =>
                              setEditData((prev) =>
                                prev ? { ...prev, parent_name: e.target.value } : null
                              )
                            }
                          />
                        ) : (
                          <p className="text-xs font-black text-slate-600 uppercase tracking-tight">{student.parent_name}</p>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        {editingId === student.id ? (
                          <Input
                            value={editData?.contact_number}
                            className="h-9 rounded-xl text-xs font-bold"
                            onChange={(e) =>
                              setEditData((prev) =>
                                prev ? { ...prev, contact_number: e.target.value } : null
                              )
                            }
                          />
                        ) : (
                          <p className="text-xs font-black text-primary">{student.contact_number}</p>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingId === student.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-100" onClick={handleSave}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100" onClick={handleCancel}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/5" onClick={() => handleEdit(student)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/5" onClick={() => handleCreateParentAccount(student)}>
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl bg-white shadow-soft text-rose-500 hover:bg-rose-50"
                                onClick={() => deleteMutation.mutate(student.id)}
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
          </div>
        </CardContent>
      </Card>

      {/* CSV Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
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
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Name</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Grade</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Academy</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Guardian</TableHead>
                  <TableHead className="font-black uppercase text-[9px] tracking-widest">Telecom</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl" aria-labelledby="create-parent-title" aria-describedby="create-parent-description">
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

      {/* Link Child to Parent Dialog */}
      <LinkChildToParent 
        open={showLinkChildDialog} 
        onOpenChange={setShowLinkChildDialog} 
      />
    </div>
  );
}
