import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Zap, BarChart3, Users, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionManagement() {
  const queryClient = useQueryClient();
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", price: "", students: "100", teachers: "10" });

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  const { data: centerSubs } = useQuery({
    queryKey: ["center-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("center_subscriptions").select("*, centers(name), subscription_plans(name)");
      if (error) throw error;
      return data;
    },
  });

  const addPlanMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subscription_plans").insert({
        name: planForm.name,
        price: parseFloat(planForm.price),
        limits: { max_students: parseInt(planForm.students), max_teachers: parseInt(planForm.teachers) }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setPlanForm({ name: "", price: "", students: "100", teachers: "10" });
      setShowAddPlan(false);
      toast.success("Subscription plan created");
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-700 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" /> Subscription Ecosystem
        </h3>
        <Button onClick={() => setShowAddPlan(!showAddPlan)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
          {showAddPlan ? "Cancel" : "Create Plan"}
        </Button>
      </div>

      {showAddPlan && (
        <Card className="rounded-3xl border-none shadow-strong bg-white/50 backdrop-blur-md">
          <CardContent className="p-8">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Name</Label>
                  <Input value={planForm.name} onChange={(e) => setPlanForm({...planForm, name: e.target.value})} className="h-12 rounded-2xl" placeholder="e.g. Premium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Price</Label>
                  <Input value={planForm.price} onChange={(e) => setPlanForm({...planForm, price: e.target.value})} className="h-12 rounded-2xl" placeholder="99.00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Limit</Label>
                  <Input type="number" value={planForm.students} onChange={(e) => setPlanForm({...planForm, students: e.target.value})} className="h-12 rounded-2xl" />
                </div>
                <div className="flex items-end">
                   <Button onClick={() => addPlanMutation.mutate()} className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-900 text-white shadow-lg">Save Plan</Button>
                </div>
             </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((p: any) => (
          <Card key={p.id} className="rounded-3xl border-none shadow-strong bg-white group hover:scale-[1.02] transition-all">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[10px] uppercase tracking-widest py-1 px-3">
                  Tier: {p.name}
                </Badge>
                <p className="text-3xl font-black tracking-tighter">Rs. {p.price}<span className="text-sm font-bold text-slate-400">/mo</span></p>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <Users className="h-4 w-4 text-blue-500" />
                  Up to {p.limits?.max_students} Students
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Advanced RLS Security
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  Institutional Analytics
                </div>
              </div>
              <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest">Manage Features</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
           <CardTitle className="text-lg font-black uppercase tracking-widest text-slate-700">Active Tenant Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
  <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Center Entity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Active Plan</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Expiry</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centerSubs?.map((sub: any) => (
                <TableRow key={sub.id} className="hover:bg-white/50 transition-colors">
                  <TableCell className="px-8 font-bold text-slate-700">{sub.centers?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="font-black text-[9px] uppercase">{sub.subscription_plans?.name}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600">
                       <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                       Active
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-500">{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Lifetime'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase text-primary">Upgrade</Button>
                  </TableCell>
                </TableRow>
              ))}
              {centerSubs?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">No active subscriptions detected.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
</div>
        </CardContent>
      </Card>
    </div>
  );
}
