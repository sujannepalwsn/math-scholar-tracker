import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Plus, Trash2, Search, Filter, MinusCircle, Info, Printer, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConsumablesManagement({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showDistribute, setShowDistribute] = useState<string | null>(null);
  const [distForm, setDistForm] = useState({ amount: "1", recipientType: "student", recipientId: "", notes: "" });
  const [form, setForm] = useState({ name: "", category: "Stationery", unit: "Packs", stock: "0", min: "5", price: "0" });

  const { data: students } = useQuery({
    queryKey: ["active-students-inventory-dropdown", centerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, name, grade").eq("center_id", centerId).eq("is_active", true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["active-teachers-inventory-dropdown", centerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("id, name").eq("center_id", centerId).eq("is_active", true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: consumables, isLoading } = useQuery({
    queryKey: ["consumables", centerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("consumables").select("*").eq("center_id", centerId);
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["consumable-logs", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consumable_logs")
        .select("*, students(name, grade), teachers(name), consumables(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const distributeMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to distribute consumables.");
      if (!showDistribute) return;
      const amount = parseFloat(distForm.amount);

      // Single atomic RPC call to handle stock, log, and invoice
      const { error } = await supabase.rpc('distribute_consumable_securely', {
        p_center_id: centerId,
        p_consumable_id: showDistribute,
        p_recipient_type: distForm.recipientType,
        p_recipient_id: distForm.recipientId,
        p_amount: amount,
        p_notes: distForm.notes
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumables"] });
      setShowDistribute(null);
      setDistForm({ amount: "1", recipientType: "student", recipientId: "", notes: "" });
      toast.success("Items distributed and stock updated");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, amount, type }: { id: string, amount: number, type: 'consume' | 'dispose' }) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to adjust inventory stock.");

      const { error } = await supabase.rpc('decrement_consumable_stock', {
        item_id: id,
        amount: amount
      });
      if (error) throw error;

      // Record disposition log
      if (type === 'dispose') {
        const { error: logError } = await supabase.from('consumable_logs').insert({
          center_id: centerId,
          consumable_id: id,
          quantity: amount,
          action_type: 'disposed',
          notes: 'Routine inventory disposal'
        });
        if (logError) throw logError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumables"] });
      toast.success("Inventory stock adjusted successfully");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to add consumables.");
      const { error } = await supabase.from("consumables").insert({
        center_id: centerId,
        name: form.name,
        category: form.category,
        unit: form.unit,
        current_stock: parseFloat(form.stock),
        min_stock_level: parseFloat(form.min),
        unit_price: parseFloat(form.price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumables"] });
      setForm({ name: "", category: "Stationery", unit: "Packs", stock: "0", min: "5", price: "0" });
      setShowAdd(false);
      toast.success("Consumable added");
    }
  });

  const filtered = consumables?.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()));

  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportHtml = `
      <html>
        <head>
          <title>Consumables Consumption Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { color: #4f46e5; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; }
            .date { font-size: 10px; color: #64748b; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .distributed { background-color: #dcfce7; color: #166534; }
            .disposed { background-color: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <h1>Consumables Consumption Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Recipient</th>
                <th>Qty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${logs?.map((log: any) => `
                <tr>
                  <td class="date">${new Date(log.created_at).toLocaleString()}</td>
                  <td><b>${log.consumables?.name}</b></td>
                  <td>${log.students ? `${log.students.name} (Student)` : log.teachers ? `${log.teachers.name} (Teacher)` : 'Internal'}</td>
                  <td>${log.quantity}</td>
                  <td><span class="badge ${log.action_type}">${log.action_type}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="inventory">
        <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-slate-100 p-1 rounded-xl h-12">
          <TabsTrigger value="inventory" className="rounded-lg px-6 font-bold text-xs uppercase tracking-widest">Live Inventory</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg px-6 font-bold text-xs uppercase tracking-widest">Distribution History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="pt-4">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className={cn("flex-1 space-y-6", selectedItem ? "lg:w-1/2" : "w-full")}>
              <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search consumables..."
                    className="pl-10 rounded-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {canEdit && (
                  <Button onClick={() => setShowAdd(!showAdd)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest ml-4">
                    {showAdd ? "Cancel" : "Add Item"}
                  </Button>
                )}
              </div>

              {showAdd && (
                <Card className="rounded-3xl border-none shadow-strong bg-slate-50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Name</Label>
                        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                        <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Unit</Label>
                        <Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Stock</Label>
                        <Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Min Level</Label>
                        <Input type="number" value={form.min} onChange={e => setForm({...form, min: e.target.value})} className="h-10 rounded-lg" />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={() => addMutation.mutate()} className="w-full h-10 rounded-lg font-black uppercase text-[10px]">Save Item</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="border rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-md shadow-soft">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow>
                        <TableHead className="px-6">Item</TableHead>
                        <TableHead>Stock Level</TableHead>
                        {!selectedItem && <TableHead>Category</TableHead>}
                        <TableHead className="text-right px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={selectedItem ? 3 : 4} className="text-center py-12">Loading...</TableCell></TableRow>
                      ) : filtered?.map((c: any) => (
                        <TableRow
                          key={c.id}
                          className={cn(
                            "group/row cursor-pointer transition-all",
                            selectedItem?.id === c.id ? "bg-primary/5" : "hover:bg-primary/5"
                          )}
                          onClick={() => setSelectedItem(c)}
                        >
                          <TableCell className="px-6 py-4 font-black text-slate-700">{c.name}</TableCell>
                          <TableCell>
                            <Badge variant={c.current_stock <= c.min_stock_level ? "destructive" : "pulse"}>
                              {c.current_stock} {c.unit}
                            </Badge>
                          </TableCell>
                          {!selectedItem && <TableCell><Badge variant="secondary" className="text-[9px] uppercase font-black">{c.category}</Badge></TableCell>}
                          <TableCell className="text-right px-6">
                             <Button variant="ghost" size="icon" className="opacity-0 group-hover/row:opacity-100 transition-all"><Info className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {selectedItem && (
              <div className="lg:w-1/2 animate-in slide-in-from-right-8 duration-500">
                <Card className="rounded-[2.5rem] border-none shadow-strong bg-white overflow-hidden sticky top-8">
                  <CardHeader className="bg-primary/5 border-b border-border/10 p-8 flex flex-row justify-between items-start">
                    <div>
                      <Badge className="mb-4 bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-lg">Inventory Status</Badge>
                      <CardTitle className="text-3xl font-black tracking-tight text-slate-800">{selectedItem.name}</CardTitle>
                      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1">{selectedItem.category}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)} className="rounded-full hover:bg-rose-50 text-rose-500">
                      <Plus className="h-5 w-5 rotate-45" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="label-caps">Current Stock</p>
                        <p className={cn("text-2xl font-black", selectedItem.current_stock <= selectedItem.min_stock_level ? "text-rose-600" : "text-slate-900")}>
                          {selectedItem.current_stock} {selectedItem.unit}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="label-caps">Minimum Threshold</p>
                        <p className="text-2xl font-black text-slate-700">{selectedItem.min_stock_level} {selectedItem.unit}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="label-caps">Unit Price</p>
                        <p className="text-2xl font-black text-slate-700">NPR {selectedItem.unit_price}</p>
                      </div>
                    </div>

                    <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 space-y-4">
                       <p className="label-caps text-indigo-700">Distribution Protocol</p>
                       <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase text-indigo-700/60">Recipient Type</Label>
                              <select
                                value={distForm.recipientType}
                                onChange={e => setDistForm({...distForm, recipientType: e.target.value, recipientId: ""})}
                                className="w-full h-10 rounded-xl bg-white border-none shadow-soft text-sm px-3"
                              >
                                <option value="student">Student</option>
                                <option value="teacher">Staff/Teacher</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase text-indigo-700/60">Quantity</Label>
                              <Input type="number" value={distForm.amount} onChange={e => setDistForm({...distForm, amount: e.target.value})} className="h-10 rounded-xl bg-white border-none shadow-soft" placeholder="Qty" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-indigo-700/60">Select {distForm.recipientType === 'student' ? 'Student' : 'Teacher'}</Label>
                            <select
                              value={distForm.recipientId}
                              onChange={e => setDistForm({...distForm, recipientId: e.target.value})}
                              className="w-full h-10 rounded-xl bg-white border-none shadow-soft text-sm px-3"
                            >
                              <option value="">Choose {distForm.recipientType === 'student' ? 'Student' : 'Teacher'}...</option>
                              {distForm.recipientType === 'student' ?
                                students?.map((s: any) => (
                                  <option key={s.id} value={s.id}>{s.name} (Grade {s.grade})</option>
                                )) :
                                teachers?.map((t: any) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))
                              }
                            </select>
                          </div>

                          <Button
                            className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 shadow-lg shadow-indigo-200"
                            disabled={!distForm.recipientId || !distForm.amount || distributeMutation.isPending}
                            onClick={() => {
                                setShowDistribute(selectedItem.id);
                                distributeMutation.mutate();
                            }}
                          >
                             {distributeMutation.isPending ? "PROCESSING..." : "CONFIRM DISTRIBUTION"}
                          </Button>
                       </div>
                    </div>

                    {canEdit && (
                       <div className="flex gap-3">
                          <Button variant="outline" className="flex-1 h-12 rounded-xl font-black uppercase text-[10px]">Adjustment</Button>
                          <Button variant="destructive" className="h-12 w-12 rounded-xl p-0"><Trash2 className="h-5 w-5" /></Button>
                       </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Consumption Ledger
            </h3>
            <Button variant="outline" size="sm" onClick={handlePrintReport} className="rounded-xl font-bold gap-2">
              <Printer className="h-4 w-4" /> GENERATE REPORT
            </Button>
          </div>
          <div className="border rounded-2xl overflow-hidden bg-white shadow-soft">
            <div className="overflow-x-auto">
  <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Date</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Item</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Recipient</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Qty</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-xs">Loading logs...</TableCell></TableRow>
                ) : logs?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic text-xs">No distribution records discovered.</TableCell></TableRow>
                ) : logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-bold">{log.consumables?.name}</TableCell>
                    <TableCell>
                      {log.students ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-indigo-600 text-xs">{log.students.name}</span>
                          <span className="text-[8px] uppercase font-black text-slate-400">Student (Grade {log.students.grade})</span>
                        </div>
                      ) : log.teachers ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-emerald-600 text-xs">{log.teachers.name}</span>
                          <span className="text-[8px] uppercase font-black text-slate-400">Teacher</span>
                        </div>
                      ) : <span className="text-slate-400 italic text-xs">Internal / Disposal</span>}
                    </TableCell>
                    <TableCell className="font-black text-xs">{log.quantity}</TableCell>
                    <TableCell className="text-right px-6">
                      <Badge variant="outline" className="text-[9px] uppercase font-black border-slate-200">
                        {log.action_type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
