import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Upload, ExternalLink, ShieldCheck, UserCheck, DollarSign, PieChart, Calendar, AlertCircle, Award, FileCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image-utils";

export default function StaffHRModule({ teacherId, teacherName, canEdit }: { teacherId: string, teacherName: string, canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const authCenterId = user?.center_id;
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAddEvaluation, setShowAddEvaluation] = useState(false);
  const [showAddPayroll, setShowAddPayroll] = useState(false);

  const [docForm, setDocForm] = useState({ name: "", type: "Contract", url: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [contractForm, setContractForm] = useState({ type: "Permanent", start: "", end: "" , salary: "" });
  const [evaluationForm, setEvaluationForm] = useState({ date: new Date().toISOString().split('T')[0], rating: "5", comments: "" });
  const [payrollForm, setPayrollForm] = useState(() => ({
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date()),
    year: new Date().getFullYear().toString(),
    basic: "",
    allowance: "0",
    deduction: "0"
  }));

  const { data: centerSettings } = useQuery({
    queryKey: ["center-settings-payroll", authCenterId],
    queryFn: async () => {
      if (!authCenterId) return null;
      const { data, error } = await supabase.from("centers").select("late_penalty_per_day").eq("id", authCenterId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!authCenterId,
  });

  const { data: taxSlabs = [] } = useQuery({
    queryKey: ["tax-slabs", authCenterId],
    queryFn: async () => {
      if (!authCenterId) return [];
      const { data, error } = await supabase.from("tax_slabs").select("*").eq("center_id", authCenterId).order("min_income");
      if (error) throw error;
      return data;
    },
    enabled: !!authCenterId,
  });

  const { data: contracts } = useQuery({
    queryKey: ["staff-contracts", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_contracts").select("*").eq("teacher_id", teacherId);
      if (error) throw error;
      return data;
    },
  });

  const { data: evaluations } = useQuery({
    queryKey: ["staff-evaluations", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase.from("performance_evaluations").select("*").eq("teacher_id", teacherId).order("evaluation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["staff-documents", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_documents").select("*").eq("teacher_id", teacherId);
      if (error) throw error;
      return data;
    },
  });

  const { data: payrollLogs } = useQuery({
    queryKey: ["payroll-logs", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_logs").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addDocMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to add staff documents.");
      const { error } = await supabase.from("staff_documents").insert({
        center_id: authCenterId,
        teacher_id: teacherId,
        document_name: docForm.name,
        document_type: docForm.type,
        document_url: docForm.url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-documents"] });
      setDocForm({ name: "", type: "Contract", url: "" });
      setShowAddDoc(false);
      toast.success("Document record added");
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authCenterId) return;

    try {
      setIsUploading(true);

      let finalFile: File | Blob = file;
      if (file.type.startsWith('image/')) {
        finalFile = await compressImage(file, 100);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${authCenterId}/${teacherId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-documents')
        .upload(filePath, finalFile);

      if (uploadError) throw uploadError;

      setDocForm({ ...docForm, url: filePath });
      toast.success("File uploaded to secure vault. Please name it and save.");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const addContractMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to add staff contracts.");
      const { error } = await supabase.from("staff_contracts").insert({
        center_id: authCenterId,
        teacher_id: teacherId,
        contract_type: contractForm.type,
        start_date: contractForm.start,
        end_date: contractForm.end || null,
        salary: parseFloat(contractForm.salary) || 0,
        status: 'Active'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-contracts"] });
      setShowAddContract(false);
      toast.success("Contract record added");
    }
  });

  const addEvaluationMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to log evaluations.");
      const { error } = await supabase.from("performance_evaluations").insert({
        center_id: authCenterId,
        teacher_id: teacherId,
        evaluation_date: evaluationForm.date,
        rating: parseInt(evaluationForm.rating),
        comments: evaluationForm.comments,
        evaluator_id: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-evaluations"] });
      setShowAddEvaluation(false);
      toast.success("Evaluation logged");
    }
  });

  const addPayrollMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to log payroll.");
      // 1. Get attendance for the selected month/year
      const monthMap: Record<string, number> = {
        January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
      };
      const monthIdx = monthMap[payrollForm.month];
      const year = parseInt(payrollForm.year);
      const startDate = new Date(year, monthIdx, 1).toISOString().split('T')[0];
      const endDate = new Date(year, monthIdx + 1, 0).toISOString().split('T')[0];

      const { data: attendance } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('date', startDate)
        .lte('date', endDate);

      const absentDays = attendance?.filter(a => a.status === 'absent').length || 0;
      const lateDays = attendance?.filter(a => a.notes?.toLowerCase().includes('late')).length || 0;

      const basic = parseFloat(payrollForm.basic) || 0;
      const allowance = parseFloat(payrollForm.allowance) || 0;

      // Calculate Deductions
      const latePenalty = (centerSettings?.late_penalty_per_day || 0) * lateDays;
      const leaveDeduction = (basic / 30) * absentDays;
      const totalDeductionBeforeTax = parseFloat(payrollForm.deduction) + latePenalty + leaveDeduction;

      const grossSalary = basic + allowance - totalDeductionBeforeTax;

      // Apply Tax Slab (Nepal)
      // Assuming monthly income x 12 for annual slab if slabs are annual,
      // but let's assume slabs are monthly for simplicity here or handle accordingly.
      let tax = 0;
      const taxableIncome = grossSalary;
      for (const slab of taxSlabs) {
        if (taxableIncome > slab.min_income) {
          const taxableAmount = slab.max_income
            ? Math.min(taxableIncome - slab.min_income, slab.max_income - slab.min_income)
            : taxableIncome - slab.min_income;
          tax += (taxableAmount * slab.tax_percent) / 100;
        }
      }

      const netPayable = grossSalary - tax;

      const { error } = await supabase.from("payroll_logs").insert({
        center_id: authCenterId,
        teacher_id: teacherId,
        month: payrollForm.month,
        year: payrollForm.year,
        basic_pay: basic,
        allowances: allowance,
        deductions: totalDeductionBeforeTax + tax,
        net_payable: netPayable,
        status: 'Paid',
        paid_at: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-logs"] });
      setShowAddPayroll(false);
      toast.success("Automated payroll calculated and logged");
    }
  });

  const { data: teacherProfile } = useQuery({
    queryKey: ["teacher-profile", teacherId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("id", teacherId).single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-slate-100 p-1 rounded-xl h-12">
          <TabsTrigger value="overview" className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest">Global Overview</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest">Extended Profile</TabsTrigger>
          <TabsTrigger value="contracts" className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest">Tenure & Salary</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest">Payroll Logs</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest">KPIs</TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest">Digital Vault</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border border-slate-100 bg-white shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Gender</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.gender || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Date of Birth</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.date_of_birth || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Employee ID</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.employee_id || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Address</span>
                  <p className="text-xs font-bold text-slate-700">{teacherProfile?.address || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-100 bg-white shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Qualifications & Skills</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {teacherProfile?.qualifications && Array.isArray(teacherProfile.qualifications) ? (
                    teacherProfile.qualifications.map((q: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-50 text-blue-700 border-none font-black text-[10px]">
                        {q}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs italic text-slate-400">No qualifications logged.</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-100 bg-white shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Bank Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Account Name</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.bank_details?.account_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Account Number</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.bank_details?.account_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Bank / Branch</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.bank_details?.bank_name || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-100 bg-white shadow-soft">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Contact Person</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.emergency_contact?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Relation</span>
                  <span className="font-bold text-slate-700">{teacherProfile?.emergency_contact?.relation || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Phone</span>
                  <span className="font-bold text-blue-600">{teacherProfile?.emergency_contact?.phone || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-none shadow-soft bg-emerald-500/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600"><ShieldCheck className="h-6 w-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 leading-none mb-1">Employement Status</p>
                  <p className="text-xl font-black text-emerald-700">{contracts?.[0]?.contract_type || (teacherProfile?.is_active ? "Active" : "Inactive")}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-soft bg-blue-500/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600"><Award className="h-6 w-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 leading-none mb-1">Performance Index</p>
                  <p className="text-xl font-black text-blue-700">
                    {evaluations && evaluations.length > 0
                      ? (evaluations.reduce((acc, curr) => acc + (curr.rating || 0), 0) / evaluations.length).toFixed(1)
                      : "0.0"}/5.0
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-soft bg-indigo-500/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600"><Calendar className="h-6 w-6" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 leading-none mb-1">Tenure</p>
                  <p className="text-xl font-black text-indigo-700">
                    {teacherProfile?.hire_date
                      ? `${(Math.abs(new Date().getTime() - new Date(teacherProfile.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)} Years`
                      : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="rounded-[2.5rem] border border-slate-100 bg-white shadow-soft">
                <CardHeader className="pb-2">
                   <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Payroll Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
                   <div className="text-center">
                      <p className="text-3xl font-black text-slate-700">NPR {payrollLogs?.reduce((acc: number, curr: any) => acc + (curr.net_payable || 0), 0).toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Disbursed (All Time)</p>
                   </div>
                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                   </div>
                   <p className="text-xs font-medium text-slate-500 text-center">Faculty payroll records are synchronized with the institutional ledger.</p>
                </CardContent>
             </Card>

             <Card className="rounded-[2.5rem] border border-slate-100 bg-white shadow-soft">
                <CardHeader className="pb-2">
                   <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Document Compliance</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                   {['Contract', 'Police Verification', 'Medical Certificate'].map((docType) => {
                      const hasDoc = documents?.some((d: any) => d.document_type === docType);
                      return (
                        <div key={docType} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                          <div className="flex items-center gap-3">
                             {hasDoc ? <FileCheck className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-amber-500" />}
                             <span className="text-xs font-bold text-slate-600">{docType}</span>
                          </div>
                          <Badge variant={hasDoc ? "success" : "warning"} className="text-[8px] font-black uppercase">
                            {hasDoc ? "Verified" : "Missing"}
                          </Badge>
                        </div>
                      );
                   })}
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="pt-6 space-y-4">
           {canEdit && (
             <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAddPayroll(!showAddPayroll)} className="h-8 rounded-lg text-[9px] font-black uppercase">
                  {showAddPayroll ? "Cancel" : "Log Disbursement"}
                </Button>
             </div>
           )}

           {showAddPayroll && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Month</Label>
                  <Input value={payrollForm.month} onChange={e => setPayrollForm({...payrollForm, month: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Year</Label>
                  <Input value={payrollForm.year} onChange={e => setPayrollForm({...payrollForm, year: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Basic</Label>
                  <Input type="number" value={payrollForm.basic} onChange={e => setPayrollForm({...payrollForm, basic: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Allow/Ded</Label>
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Allow" value={payrollForm.allowance} onChange={e => setPayrollForm({...payrollForm, allowance: e.target.value})} className="h-9 text-xs" />
                    <Input type="number" placeholder="Ded" value={payrollForm.deduction} onChange={e => setPayrollForm({...payrollForm, deduction: e.target.value})} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => addPayrollMutation.mutate()} className="w-full h-9 text-[9px] font-black uppercase">Commit</Button>
                </div>
              </div>
           )}

           <div className="border rounded-[2rem] overflow-hidden bg-white shadow-soft">
            <div className="overflow-x-auto">
  <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Month / Year</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Basic Pay</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Allowances</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Deductions</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Net Payable</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-6">Slip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollLogs && payrollLogs.length > 0 ? (
                  payrollLogs.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className={cn("h-2 w-2 rounded-full", p.status === 'Paid' ? "bg-emerald-500" : "bg-amber-500")} />
                            <span className="font-bold text-slate-700">{p.month} {p.year}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-500">NPR {p.basic_pay.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-medium text-emerald-600">+ NPR {p.allowances.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-medium text-rose-500">- NPR {p.deductions.toLocaleString()}</TableCell>
                      <TableCell className="font-black text-slate-700">NPR {p.net_payable.toLocaleString()}</TableCell>
                      <TableCell className="text-right px-6">
                         <Button variant="ghost" size="sm" className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-black text-[10px] uppercase">
                            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">No payroll logs discovered.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
</div>
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="pt-4 space-y-4">
           {canEdit && (
             <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAddContract(!showAddContract)} className="h-8 rounded-lg text-[9px] font-black uppercase">
                  {showAddContract ? "Cancel" : "Add Contract Record"}
                </Button>
             </div>
           )}

           {showAddContract && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Type</Label>
                  <Input value={contractForm.type} onChange={e => setContractForm({...contractForm, type: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Start Date</Label>
                  <Input type="date" value={contractForm.start} onChange={e => setContractForm({...contractForm, start: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">End Date</Label>
                  <Input type="date" value={contractForm.end} onChange={e => setContractForm({...contractForm, end: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Salary</Label>
                  <Input type="number" value={contractForm.salary} onChange={e => setContractForm({...contractForm, salary: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => addContractMutation.mutate()} className="w-full h-9 text-[9px] font-black uppercase">Save</Button>
                </div>
              </div>
           )}

           <div className="border rounded-2xl overflow-hidden bg-white shadow-soft">
            <div className="overflow-x-auto">
  <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Type</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Start Date</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">End Date</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Salary</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold">{c.contract_type}</TableCell>
                    <TableCell className="text-xs">{c.start_date}</TableCell>
                    <TableCell className="text-xs">{c.end_date || 'N/A'}</TableCell>
                    <TableCell className="font-bold text-slate-700">NPR {c.salary?.toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-black">{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
</div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="pt-4 space-y-4">
          {canEdit && (
            <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAddEvaluation(!showAddEvaluation)} className="h-8 rounded-lg text-[9px] font-black uppercase">
                  {showAddEvaluation ? "Cancel" : "Log Performance Index"}
                </Button>
             </div>
          )}

           {showAddEvaluation && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Date</Label>
                  <Input type="date" value={evaluationForm.date} onChange={e => setEvaluationForm({...evaluationForm, date: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Rating (1-5)</Label>
                  <Input type="number" min="1" max="5" value={evaluationForm.rating} onChange={e => setEvaluationForm({...evaluationForm, rating: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Comments</Label>
                  <Input value={evaluationForm.comments} onChange={e => setEvaluationForm({...evaluationForm, comments: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => addEvaluationMutation.mutate()} className="w-full h-9 text-[9px] font-black uppercase">Commit</Button>
                </div>
              </div>
           )}

          <div className="space-y-4">
            {evaluations?.map((e: any) => (
              <Card key={e.id} className="rounded-2xl border-none shadow-soft">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-black text-sm text-slate-700">{e.evaluation_date}</p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`h-2 w-4 rounded-full ${i < e.rating ? 'bg-amber-400' : 'bg-slate-100'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium italic">"{e.comments}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="pt-4 space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowAddDoc(!showAddDoc)} className="h-8 rounded-lg text-[9px] font-black uppercase">
                <Upload className="h-3 w-3 mr-1" /> Secure Upload
              </Button>
            </div>
          )}

          {showAddDoc && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Document Name</Label>
                  <Input placeholder="e.g. Master's Degree" value={docForm.name} onChange={(e) => setDocForm({...docForm, name: e.target.value})} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Upload File</Label>
                  <div className="flex gap-2">
                    <Input type="file" onChange={handleFileUpload} className="h-9 text-xs" disabled={isUploading} />
                  </div>
                </div>
              </div>
              <Button onClick={() => addDocMutation.mutate()} disabled={!docForm.name || !docForm.url || addDocMutation.isPending} className="w-full h-9 text-[9px] font-black uppercase">
                {addDocMutation.isPending ? "Saving..." : "Secure Record"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents?.map((d: any) => {
              const publicUrl = d.document_url.startsWith('http')
                ? d.document_url
                : supabase.storage.from('staff-documents').getPublicUrl(d.document_url).data.publicUrl;

              return (
                <a key={d.id} href={publicUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="rounded-2xl border-none shadow-soft hover:bg-slate-50 transition-colors cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors"><FileText className="h-5 w-5" /></div>
                        <div>
                          <p className="font-black text-xs text-slate-700">{d.document_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.document_type}</p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-300" />
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
