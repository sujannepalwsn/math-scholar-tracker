import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Save, Calculator, Percent } from "lucide-react";

export default function PayrollSettings({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const [newSlab, setNewSlab] = useState({ min: "", max: "", percent: "" });
  const [latePenalty, setLatePenalty] = useState("");

  const { data: taxSlabs = [] } = useQuery({
    queryKey: ["tax-slabs", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_slabs")
        .select("*")
        .eq("center_id", centerId)
        .order("min_income");
      if (error) throw error;
      return data;
    },
  });

  const { data: centerSettings } = useQuery({
    queryKey: ["center-settings-payroll", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centers")
        .select("late_penalty_per_day")
        .eq("id", centerId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (centerSettings) {
      setLatePenalty(centerSettings.late_penalty_per_day?.toString() || "0");
    }
  }, [centerSettings]);

  const addSlabMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to add tax slabs.");
      const { error } = await supabase.from("tax_slabs").insert({
        center_id: centerId,
        min_income: parseFloat(newSlab.min),
        max_income: newSlab.max ? parseFloat(newSlab.max) : null,
        tax_percent: parseFloat(newSlab.percent),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-slabs"] });
      setNewSlab({ min: "", max: "", percent: "" });
      toast.success("Tax slab added");
    },
  });

  const deleteSlabMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to delete tax slabs.");
      const { error } = await supabase.from("tax_slabs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-slabs"] });
      toast.success("Tax slab removed");
    },
  });

  const updatePenaltyMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to update penalty settings.");
      const { error } = await supabase
        .from("centers")
        .update({ late_penalty_per_day: parseFloat(latePenalty) })
        .eq("id", centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Late penalty updated");
    },
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-3xl border shadow-soft bg-white/50 backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Percent className="h-4 w-4" /> Nepal Tax Slabs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Min Income</Label>
                <Input type="number" value={newSlab.min} onChange={e => setNewSlab({...newSlab, min: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Max (Opt)</Label>
                <Input type="number" value={newSlab.max} onChange={e => setNewSlab({...newSlab, max: e.target.value})} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase">Tax %</Label>
                <div className="flex gap-2">
                  <Input type="number" value={newSlab.percent} onChange={e => setNewSlab({...newSlab, percent: e.target.value})} className="h-9" />
                  {canEdit && (
                    <Button size="sm" onClick={() => addSlabMutation.mutate()} className="h-9 px-3 rounded-lg">
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
  <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Range</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Tax %</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxSlabs.map((slab: any) => (
                    <TableRow key={slab.id}>
                      <TableCell className="text-xs font-bold">
                        NPR {slab.min_income.toLocaleString()} - {slab.max_income ? `NPR ${slab.max_income.toLocaleString()}` : '∞'}
                      </TableCell>
                      <TableCell className="text-xs font-black text-primary">{slab.tax_percent}%</TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => deleteSlabMutation.mutate(slab.id)} className="h-7 w-7 text-rose-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {taxSlabs.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-xs italic text-slate-400">No tax slabs defined.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border shadow-soft bg-white/50 backdrop-blur-md overflow-hidden h-fit">
          <CardHeader className="bg-slate-50 border-b py-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Late Penalty Config
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Penalty Amount (per late day)</Label>
              <div className="flex gap-3">
                <Input type="number" value={latePenalty} onChange={e => setLatePenalty(e.target.value)} className="h-11 rounded-xl font-bold" />
                {canEdit && (
                  <Button onClick={() => updatePenaltyMutation.mutate()} className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest">
                    <Save className="h-4 w-4 mr-2" /> Save
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 italic">This amount will be automatically deducted during payroll calculation for each late attendance record.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
