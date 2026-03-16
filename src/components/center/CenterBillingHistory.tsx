import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, safeFormatDate } from "@/lib/utils";
import { CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CenterBillingHistory({ centerId }: { centerId: string }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["center-invoices", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_invoices")
        .select("*")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  if (isLoading) return <div className="p-8 text-center">Loading invoices...</div>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 border-b">
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Invoice #</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Period</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Amount</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Due Date</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Status</TableHead>
            <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4 text-right">Operations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-20 italic text-slate-400">No institutional invoices discovered.</TableCell>
            </TableRow>
          ) : (
            invoices.map((inv) => (
              <TableRow key={inv.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-8 py-5 font-black text-xs text-slate-700">{inv.invoice_number}</TableCell>
                <TableCell className="px-8 py-5 text-xs font-medium text-slate-500">
                  {inv.billing_period_start ? `${safeFormatDate(inv.billing_period_start, "MMM d")} - ${safeFormatDate(inv.billing_period_end, "MMM d, yyyy")}` : "-"}
                </TableCell>
                <TableCell className="px-8 py-5 font-black text-sm text-slate-800">{formatCurrency(Number(inv.amount))}</TableCell>
                <TableCell className="px-8 py-5 text-xs font-bold text-rose-500">{safeFormatDate(inv.due_date, "MMM dd, yyyy")}</TableCell>
                <TableCell className="px-8 py-5">
                  <Badge className={inv.status === 'Paid' ? "bg-emerald-500" : inv.status === 'Overdue' ? "bg-rose-500" : "bg-amber-500"}>
                    {inv.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft"><FileText className="h-4 w-4 text-primary" /></Button>
                    {inv.status !== 'Paid' && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-primary/10 text-primary"><CreditCard className="h-4 w-4" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
