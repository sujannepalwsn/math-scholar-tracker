import React, { useRef, useState } from "react";
import { UserRole } from "@/types/roles";
import { Download, Printer, Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, safeFormatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

export default function StudentIdCard() {
  const { user } = useAuth();
  const centerId = user?.center_id;
  const printRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [cardConfig, setCardConfig] = useState({
    primaryColor: "#2563eb",
    showQR: true,
    showLogo: true,
  });

  const { data: center } = useQuery({
    queryKey: ["center-idcard", centerId],
    queryFn: async () => {
      if (!centerId) return null;
      const { data } = await supabase.from("centers").select("*").eq("id", centerId).maybeSingle();
      return data;
    },
    enabled: !!centerId,
  });

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  const { data: students = [] } = useQuery({
    queryKey: ["students-idcard", centerId, isRestricted, user?.teacher_id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase.from("students").select("*").eq("center_id", centerId).eq("is_active", true);

      if (isRestricted) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user?.teacher_id);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user?.teacher_id);
        const myGrades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        if (myGrades.length > 0) {
          query = query.in('grade', myGrades);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const grades = [...new Set(students.map((s: any) => s.grade).filter(Boolean))].sort();

  const filteredStudents = students.filter((s: any) => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.student_id_number || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchGrade = gradeFilter === "all" || s.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const selectedStudent = students.find((s: any) => s.id === selectedStudentId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .printable-content, .printable-content * { visibility: visible; }
            .printable-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0 !important;
              margin: 0 !important;
            }
            .id-card-print-grid {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 20px !important;
              justify-items: center !important;
            }
            .no-print { display: none !important; }
            @page { size: A4; margin: 10mm; }
          }
        `}
      </style>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <User className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Identity Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Scholar Credentials & ID Generation</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="no-print rounded-3xl border-none shadow-strong p-6 bg-card/40 backdrop-blur-md border border-white/20">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-2 flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card Theme Color</label>
            <div className="flex gap-2">
              {["#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706"].map(color => (
                <button
                  key={color}
                  className={cn("h-8 w-8 rounded-full border-2", cardConfig.primaryColor === color ? "border-slate-900" : "border-transparent")}
                  style={{ backgroundColor: color }}
                  onClick={() => setCardConfig({...cardConfig, primaryColor: color})}
                />
              ))}
              <Input type="color" className="h-8 w-12 p-1 rounded-md" value={cardConfig.primaryColor} onChange={(e) => setCardConfig({...cardConfig, primaryColor: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-2 mb-1">
            <Button variant={isBulkMode ? "default" : "outline"} onClick={() => setIsBulkMode(!isBulkMode)} className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest">
               {isBulkMode ? "Individual Mode" : "Bulk Print Mode"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="no-print relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
            <div className="relative flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Search Scholar</label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Name or Student ID..." className="pl-9 h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="w-full sm:w-[200px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Cohort Filter</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl mt-2">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl font-bold">
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="printable-content">
      {!selectedStudentId && !isBulkMode ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((s: any) => (
            <Card
              key={s.id}
              className="border-none shadow-medium bg-card/40 backdrop-blur-md rounded-3xl cursor-pointer hover:shadow-strong hover:scale-[1.02] transition-all duration-300 border border-white/20 group"
              onClick={() => setSelectedStudentId(s.id)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-110 transition-transform duration-500">
                  {s.photo_url ? (
                    <img src={s.photo_url.startsWith('http') ? s.photo_url : supabase.storage.from('activity-photos').getPublicUrl(s.photo_url).data.publicUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-black text-slate-700 leading-none group-hover:text-primary transition-colors">{s.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5">Grade {s.grade} • {s.student_id_number || "PENDING ID"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isBulkMode ? (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Bulk Print ({filteredStudents.length})</Button>
            <Button variant="outline" onClick={() => setIsBulkMode(false)}>Back to List</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center id-card-print-grid" ref={printRef}>
            {filteredStudents.map((s: any) => (
              <div key={s.id} className="id-card w-[340px] border-2 rounded-xl overflow-hidden shadow-lg bg-white page-break" style={{ borderColor: cardConfig.primaryColor }}>
                <div className="text-white p-4 text-center" style={{ backgroundColor: cardConfig.primaryColor }}>
                  {cardConfig.showLogo && center?.logo_url && <img src={center.logo_url} alt="" className="h-8 mx-auto mb-1" />}
                  <h2 className="font-bold text-base">{center?.name || "School Name"}</h2>
                  <p className="text-xs opacity-90">{center?.address || ""}</p>
                </div>
                <div className="p-5">
                  <div className="h-20 w-20 rounded-full border-[3px] mx-auto mb-3 flex items-center justify-center bg-muted overflow-hidden" style={{ borderColor: cardConfig.primaryColor }}>
                    {s.photo_url ? <img src={s.photo_url.startsWith('http') ? s.photo_url : supabase.storage.from('activity-photos').getPublicUrl(s.photo_url).data.publicUrl} alt="" className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <p className="text-center font-bold text-lg text-slate-800 mb-3">{s.name}</p>
                  <div className="space-y-1.5 text-sm">
                    {[
                      ["Grade / Section", `${s.grade || "-"} ${s.section ? `/ ${s.section}` : ""}`],
                      ["Student ID", s.student_id_number || "-"],
                      ["Roll Number", s.roll_number || "-"],
                      ["Date of Birth", safeFormatDate(s.date_of_birth, "MMM dd, yyyy")],
                      ["Guardian", s.parent_name || "-"],
                      ["Contact", s.contact_number || s.parent_phone || "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-border pb-1">
                        <span className="text-muted-foreground text-xs">{label}</span>
                        <span className="font-semibold text-slate-800 text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 text-center text-[10px] text-muted-foreground flex flex-col gap-1">
                  {center?.phone && <span>Contact: {center.phone}</span>}
                  {cardConfig.showQR && (
                    <div className="flex justify-center mt-1">
                      <div className="bg-white p-1 border">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${s.student_id_number}`}
                          alt="QR Code"
                          className="h-8 w-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : selectedStudent && (
        <>
          <div className="no-print flex gap-2 justify-end">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={handlePrint}><Download className="h-4 w-4 mr-2" /> Download</Button>
            <Button variant="outline" onClick={() => setSelectedStudentId(null)}>Back to List</Button>
          </div>

          <div className="flex justify-center">
            <div ref={printRef}>
              <div className="id-card w-[340px] border-2 rounded-xl overflow-hidden shadow-lg bg-white" style={{ borderColor: cardConfig.primaryColor }}>
                {/* Header */}
                <div className="text-white p-4 text-center" style={{ backgroundColor: cardConfig.primaryColor }}>
                  {cardConfig.showLogo && center?.logo_url && <img src={center.logo_url} alt="" className="h-8 mx-auto mb-1" />}
                  <h2 className="font-bold text-base">{center?.name || "School Name"}</h2>
                  <p className="text-xs opacity-90">{center?.address || ""}</p>
                </div>

                {/* Body */}
                <div className="p-5 bg-card">
                  <div className="h-20 w-20 rounded-full border-[3px] mx-auto mb-3 flex items-center justify-center bg-muted overflow-hidden" style={{ borderColor: cardConfig.primaryColor }}>
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url.startsWith('http') ? selectedStudent.photo_url : supabase.storage.from('activity-photos').getPublicUrl(selectedStudent.photo_url).data.publicUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>

                  <p className="text-center font-bold text-lg text-foreground mb-3">{selectedStudent.name}</p>

                  <div className="space-y-1.5 text-sm">
                    {[
                      ["Grade / Section", `${selectedStudent.grade || "-"} ${selectedStudent.section ? `/ ${selectedStudent.section}` : ""}`],
                      ["Student ID", selectedStudent.student_id_number || "-"],
                      ["Roll Number", selectedStudent.roll_number || "-"],
                      ["Date of Birth", safeFormatDate(selectedStudent.date_of_birth, "MMM dd, yyyy")],
                      ["Blood Group", selectedStudent.blood_group || "-"],
                      ["Guardian", selectedStudent.parent_name || "-"],
                      ["Contact", selectedStudent.contact_number || selectedStudent.parent_phone || "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-border pb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-muted p-2 text-center text-[10px] text-muted-foreground flex flex-col gap-1">
                  {center?.phone && <span>Contact: {center.phone}</span>}
                  {center?.email && <span> • {center.email}</span>}
                  {cardConfig.showQR && (
                    <div className="flex justify-center mt-1">
                      <div className="bg-white p-1 border">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${selectedStudent.student_id_number}`}
                          alt="QR Code"
                          className="h-8 w-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
