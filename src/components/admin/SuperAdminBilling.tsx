import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DollarSign, Plus, FileText, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function SuperAdminBilling() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ centerId: "", amount: "", dueDate: "", description: "", number: `INV-${Date.now()}` });

  const { data: centers = [] } = useQuery({
    queryKey: ["admin-centers-billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("centers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["admin-center-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_invoices")
        .select("*, centers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { error: invoiceError } = await supabase.from("center_invoices").insert({
        center_id: form.centerId,
        amount: parseFloat(form.amount),
        due_date: form.dueDate,
        invoice_number: form.number,
        status: 'Pending'
      });
      if (invoiceError) throw invoiceError;

      if (form.description) {
        await supabase.from("centers").update({ payment_description: form.description }).eq("id", form.centerId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-center-invoices"] });
      setShowCreate(false);
      setForm({ centerId: "", amount: "", dueDate: "", description: "", number: `INV-${Date.now()}` });
      toast.success("Invoice sent to center");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-tight">Institutional Billing Control</h3>
        <Button onClick={() => setShowCreate(!showCreate)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-11 px-6">
          <Plus className="h-4 w-4 mr-2" /> {showCreate ? "Cancel" : "Generate Invoice"}
        </Button>
      </div>

      {showCreate && (
        <Card className="rounded-3xl border-none shadow-strong bg-slate-50 overflow-hidden">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Target Center</Label>
                <Select value={form.centerId} onValueChange={v => setForm({...form, centerId: v})}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-none shadow-soft">
                    <SelectValue placeholder="Select Center" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {centers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Invoice #</Label>
                <Input value={form.number} readOnly className="h-11 rounded-xl bg-white border-none shadow-soft font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Total Amount</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="h-11 rounded-xl bg-white border-none shadow-soft font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="h-11 rounded-xl bg-white border-none shadow-soft" />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Payment Description (Publicly Visible)</Label>
                <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Information for the customer about the payment..." className="h-11 rounded-xl bg-white border-none shadow-soft" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => createInvoiceMutation.mutate()} className="h-11 w-full rounded-xl bg-slate-900 text-white font-black uppercase text-[10px]">
                  <Send className="h-4 w-4 mr-2" /> GENERATE & UPDATE
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
  <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-8 py-4">Invoice Details</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Institution</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Amount</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Due Date</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-8">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv: any) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-8 py-5">
                    <p className="font-black text-slate-700 font-mono">{inv.invoice_number}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(inv.created_at).toLocaleDateString()}</p>
                  </TableCell>
                  <TableCell className="font-bold text-slate-600">{inv.centers?.name}</TableCell>
                  <TableCell className="font-black text-indigo-600">NPR {inv.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-500">{new Date(inv.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase rounded-lg",
                      inv.status === 'Paid' ? "bg-emerald-500" : inv.status === 'Overdue' ? "bg-rose-500" : "bg-amber-500"
                    )}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg text-slate-400 hover:text-primary">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-20 italic text-slate-400">No institutional invoices discovered.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
</div>
        </CardContent>
      </Card>
    </div>
  );
}
