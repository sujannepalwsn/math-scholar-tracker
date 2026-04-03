import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Zap, BarChart3, Users, CheckCircle2, Clock, Check, X, FileText, IndianRupee, Layers, ListChecks, Info, Pencil, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { applyPackagePreset } from "@/utils/package-utils";
import { PackageType, PACKAGE_FEATURES, PACKAGE_HIGHLIGHTS } from "@/lib/package-presets";
import { formatCurrency } from "@/integrations/supabase/finance-types";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SYSTEM_MODULES } from "@/lib/system-modules";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SubscriptionManagement() {
  const queryClient = useQueryClient();
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [modifyingSub, setModifyingSub] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: "",
    originalPrice: "",
    discountAmount: "",
    students: "100",
    teachers: "10",
    packageType: "Basic" as PackageType
  });

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
      const { data, error } = await supabase.from("center_subscriptions").select("*, centers(name), subscription_plans(*)");
      if (error) throw error;
      return data;
    },
  });

  const { data: allInvoices } = useQuery({
    queryKey: ["admin-saas-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saas_invoices").select("*, centers(name), subscription_plans(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveSubscriptionMutation = useMutation({
    mutationFn: async ({ subId, centerId, planId, packageType, amount }: { subId: string, centerId: string, planId: string, packageType: string, amount: number }) => {
      console.log(`Starting approval for sub ${subId}, center ${centerId}, package ${packageType}`);

      // 1. Deactivate existing active subscriptions
      const { error: deactivateError } = await supabase
        .from('center_subscriptions')
        .update({ status: 'Inactive' })
        .eq('center_id', centerId)
        .eq('status', 'Active');

      if (deactivateError) console.error("Error deactivating old subs:", deactivateError);

      // 2. Mark subscription as active
      const { error: subError } = await supabase
        .from('center_subscriptions')
        .update({
          status: 'Active',
          start_date: new Date().toISOString(),
          billed_amount: amount
        })
        .eq('id', subId);

      if (subError) {
        console.error("Error activating sub:", subError);
        throw subError;
      }

      // 3. Apply package features - CRITICAL STEP
      const finalPackage = (packageType || 'Basic') as PackageType;
      const result = await applyPackagePreset(centerId, finalPackage);
      console.log("Package preset application result:", result);

      // 4. Generate SaaS Invoice
      const { error: invError } = await supabase
        .from('saas_invoices')
        .insert({
          center_id: centerId,
          plan_id: planId,
          amount: amount,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Unpaid'
        });

      if (invError) console.error("Error generating invoice:", invError);

      // 5. Send Notification to Center
      await supabase.from('notifications').insert({
        center_id: centerId,
        title: '🚀 Subscription Approved!',
        message: `Your request for the ${packageType} plan has been approved. All ${packageType} features are now active for your institution.`,
        type: 'subscription',
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-saas-invoices"] });
      toast.success("Subscription approved and package applied!");
    }
  });

  const rejectSubscriptionMutation = useMutation({
    mutationFn: async (subId: string) => {
      const { error } = await supabase
        .from('center_subscriptions')
        .update({ status: 'Rejected' })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-subscriptions"] });
      toast.success("Subscription request rejected.");
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ invoiceId, centerId }: { invoiceId: string, centerId: string }) => {
      const { error } = await supabase
        .from('saas_invoices')
        .update({ status: 'Paid', payment_date: new Date().toISOString() })
        .eq('id', invoiceId);
      if (error) throw error;

      await supabase.from('notifications').insert({
        center_id: centerId,
        title: '💰 Payment Received',
        message: `Your payment for the subscription invoice has been recorded. Thank you for your continued partnership!`,
        type: 'finance',
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-saas-invoices"] });
      toast.success("Invoice marked as paid.");
    }
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Subscription plan deleted.");
    },
    onError: (error: any) => {
      toast.error("Cannot delete plan. It might be in use by centers.");
    }
  });

  const addPlanMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: planForm.name,
        price: parseFloat(planForm.price),
        limits: { max_students: parseInt(planForm.students), max_teachers: parseInt(planForm.teachers) },
        features: [planForm.packageType]
      };

      // Conditionally add fields to avoid issues if they don't exist in type definition
      if (planForm.originalPrice) payload.original_price = parseFloat(planForm.originalPrice);
      if (planForm.discountAmount) payload.discount_amount = parseFloat(planForm.discountAmount);

      if (editingPlan) {
        const { error } = await supabase.from("subscription_plans").update(payload).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setPlanForm({ name: "", price: "", originalPrice: "", discountAmount: "", students: "100", teachers: "10", packageType: "Basic" });
      setShowAddPlan(false);
      setEditingPlan(null);
      toast.success(editingPlan ? "Subscription plan updated" : "Subscription plan created");
    }
  });

  const modifySubscriptionMutation = useMutation({
    mutationFn: async (values: any) => {
      const planId = values.planId || values.plan_id;
      const packageType = values.packageType || values.package_type;

      const { data: plans } = await supabase.from("subscription_plans").select("*");
      const targetPlan = plans?.find(p => p.id === planId);

      const { error } = await supabase
        .from('center_subscriptions')
        .update({
          plan_id: planId,
          status: values.status,
          package_type: packageType
        })
        .eq('id', values.id);
      if (error) throw error;

      if (values.status === 'Active') {
        // Generate SaaS Invoice if it doesn't exist for this sub's amount or if manually triggered
        if (targetPlan) {
          await supabase
            .from('saas_invoices')
            .insert({
              center_id: values.center_id,
              plan_id: planId,
              amount: targetPlan.price,
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'Unpaid'
            });
        }
        await applyPackagePreset(values.center_id, packageType as PackageType);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-subscriptions"] });
      setModifyingSub(null);
      toast.success("Subscription modified successfully");
    }
  });

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price.toString(),
      originalPrice: plan.original_price?.toString() || "",
      discountAmount: plan.discount_amount?.toString() || "",
      students: plan.limits?.max_students?.toString() || "100",
      teachers: plan.limits?.max_teachers?.toString() || "10",
      packageType: (plan.features?.[0] as PackageType) || "Basic"
    });
    setShowAddPlan(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-700 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" /> Subscription Ecosystem
        </h3>
        <Button onClick={() => {
          setShowAddPlan(!showAddPlan);
          if (showAddPlan) setEditingPlan(null);
        }} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
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
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Real Price</Label>
                  <Input value={planForm.price} onChange={(e) => setPlanForm({...planForm, price: e.target.value})} className="h-12 rounded-2xl" placeholder="99.00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Original Price (Before)</Label>
                  <Input value={planForm.originalPrice} onChange={(e) => setPlanForm({...planForm, originalPrice: e.target.value})} className="h-12 rounded-2xl" placeholder="149.00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Discount</Label>
                  <Input value={planForm.discountAmount} onChange={(e) => setPlanForm({...planForm, discountAmount: e.target.value})} className="h-12 rounded-2xl" placeholder="50.00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Limit</Label>
                  <Input type="number" value={planForm.students} onChange={(e) => setPlanForm({...planForm, students: e.target.value})} className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Package Preset</Label>
                  <Select value={planForm.packageType} onValueChange={(val) => setPlanForm({...planForm, packageType: val as PackageType})}>
                    <SelectTrigger className="h-12 rounded-2xl">
                      <SelectValue placeholder="Select Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-4 p-6 rounded-3xl bg-slate-50 border border-slate-100">
                   <div className="flex items-center gap-2 mb-3">
                      <ListChecks className="h-4 w-4 text-primary" />
                      <p className="text-[10px] font-black uppercase text-slate-500">Preset Module Preview</p>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {SYSTEM_MODULES.filter(m => m.feature_mapping.some(f => PACKAGE_FEATURES[planForm.packageType][f]))
                        .map(m => (
                          <Badge key={m.id} variant="outline" className="bg-white text-[9px] font-bold py-0.5 border-slate-200">
                             {m.name}
                          </Badge>
                        ))
                      }
                   </div>
                </div>

                <div className="flex items-end md:col-span-4 gap-4">
                   <Button onClick={() => addPlanMutation.mutate()} className="flex-1 h-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-900 text-white shadow-lg">
                     {editingPlan ? "Update Plan Configuration" : "Save Plan"}
                   </Button>
                   {editingPlan && (
                     <Button variant="ghost" onClick={() => { setEditingPlan(null); setShowAddPlan(false); }} className="h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                   )}
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
                <p className="text-3xl font-black tracking-tighter">NPR {p.price}<span className="text-sm font-bold text-slate-400">/mo</span></p>
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

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Key Features</p>
                  <div className="space-y-2">
                    {PACKAGE_HIGHLIGHTS[(p.features?.[0] as PackageType) || 'Basic'].slice(0, 5).map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                        <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{highlight}</span>
                      </div>
                    ))}
                    {PACKAGE_HIGHLIGHTS[(p.features?.[0] as PackageType) || 'Basic'].length > 5 && (
                      <p className="text-[9px] font-black text-primary uppercase pl-5">+ {PACKAGE_HIGHLIGHTS[(p.features?.[0] as PackageType) || 'Basic'].length - 5} More Modules</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEditPlan(p)}
                  className="flex-1 h-12 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest"
                >
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-slate-50">
                      <ListChecks className="h-4 w-4 mr-1 text-primary" /> Breakdown
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-[2rem]">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                        {p.name} Package Breakdown
                      </DialogTitle>
                      <DialogDescription className="font-bold text-primary uppercase text-[10px] tracking-widest">
                        Full Module Inventory & Capabilities
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-6 pt-4">
                        {SYSTEM_MODULES.map((mod) => {
                          const isIncluded = mod.feature_mapping.some(f => PACKAGE_FEATURES[(p.features?.[0] as PackageType) || 'Basic'][f]);
                          return (
                            <div key={mod.id} className={cn(
                              "p-4 rounded-2xl border transition-all",
                              isIncluded ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-100 opacity-60"
                            )}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-black text-sm uppercase">{mod.name}</h4>
                                {isIncluded ? (
                                  <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase">Included</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] font-black uppercase">Not in Tier</Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium mb-3">{mod.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {mod.key_functionalities.map((func, i) => (
                                  <span key={i} className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-slate-100 text-slate-600 font-bold italic">
                                    • {func}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePlanMutation.mutate(p.id)}
                  className="h-12 w-12 rounded-2xl text-rose-500 hover:bg-rose-50 border-2 border-transparent hover:border-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="bg-amber-50/50 border-b border-amber-100">
           <CardTitle className="text-lg font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
             <Clock className="h-5 w-5" /> Pending Approval Requests
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-8 font-black text-[10px] uppercase">Center</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Requested Plan</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Package Preset</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centerSubs?.filter((s: any) => s.status === 'Pending').map((sub: any) => (
                <TableRow key={sub.id}>
                  <TableCell className="px-8 font-bold text-slate-700">{sub.centers?.name}</TableCell>
                  <TableCell><Badge className="bg-primary/10 text-primary border-none">{sub.subscription_plans?.name}</Badge></TableCell>
                  <TableCell className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {sub.package_type}
                    <div className="text-[9px] text-primary font-black mt-1">
                      {formatCurrency(sub.billed_amount || sub.subscription_plans?.price || 0)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveSubscriptionMutation.mutate({
                          subId: sub.id,
                          centerId: sub.center_id,
                          planId: sub.plan_id,
                          packageType: sub.package_type,
                          amount: sub.billed_amount || sub.subscription_plans?.price || 0
                        })}
                        className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase"
                      >
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectSubscriptionMutation.mutate(sub.id)}
                        className="h-8 rounded-lg text-rose-600 hover:bg-rose-50 text-[10px] font-black uppercase"
                      >
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {centerSubs?.filter((s: any) => s.status === 'Pending').length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 italic">No pending requests.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              {centerSubs?.filter((s: any) => s.status === 'Active').map((sub: any) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setModifyingSub(sub)}
                      className="font-black text-[10px] uppercase text-primary"
                    >
                      Modify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {centerSubs?.filter((s: any) => s.status === 'Active').length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">No active subscriptions detected.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
</div>
        </CardContent>
      </Card>

      {/* Modification Dialog */}
      <Dialog open={!!modifyingSub} onOpenChange={(open) => !open && setModifyingSub(null)}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-strong">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Manual Override: {modifyingSub?.centers?.name}</DialogTitle>
            <DialogDescription className="font-medium">Force update institutional subscription parameters.</DialogDescription>
          </DialogHeader>
          {modifyingSub && (
            <div className="space-y-6 pt-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase">Institutional Plan</Label>
                 <Select
                   defaultValue={modifyingSub.plan_id}
                   onValueChange={(val) => setModifyingSub({...modifyingSub, planId: val})}
                 >
                   <SelectTrigger className="h-12 rounded-2xl">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {plans?.map((p: any) => (
                       <SelectItem key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase">Status Override</Label>
                 <Select
                   defaultValue={modifyingSub.status}
                   onValueChange={(val) => setModifyingSub({...modifyingSub, status: val})}
                 >
                   <SelectTrigger className="h-12 rounded-2xl">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Active">Active</SelectItem>
                     <SelectItem value="Pending">Pending</SelectItem>
                     <SelectItem value="Inactive">Inactive</SelectItem>
                     <SelectItem value="Rejected">Rejected</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase">Package Preset Force</Label>
                 <Select
                   defaultValue={modifyingSub.package_type || 'Basic'}
                   onValueChange={(val) => setModifyingSub({...modifyingSub, packageType: val})}
                 >
                   <SelectTrigger className="h-12 rounded-2xl">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Basic">Basic</SelectItem>
                     <SelectItem value="Standard">Standard</SelectItem>
                     <SelectItem value="Premium">Premium</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="flex gap-3 pt-4">
                 <Button variant="ghost" onClick={() => setModifyingSub(null)} className="flex-1 rounded-xl uppercase font-black text-[10px]">Cancel</Button>
                 <Button
                   onClick={() => modifySubscriptionMutation.mutate(modifyingSub)}
                   className="flex-1 h-12 rounded-xl bg-slate-900 text-white uppercase font-black text-[10px]"
                 >
                   Commit Overrides
                 </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-1 mt-12">
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-700 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" /> Global SaaS Invoicing
        </h3>
        <p className="text-sm text-muted-foreground font-medium">Monitor institutional billing and process incoming payments.</p>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="px-8 py-4 font-black text-[10px] uppercase">Center</TableHead>
                <TableHead className="py-4 font-black text-[10px] uppercase">Plan</TableHead>
                <TableHead className="py-4 font-black text-[10px] uppercase">Amount</TableHead>
                <TableHead className="py-4 font-black text-[10px] uppercase">Status</TableHead>
                <TableHead className="py-4 font-black text-[10px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInvoices?.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="px-8 font-bold text-slate-700">{inv.centers?.name}</TableCell>
                  <TableCell className="text-xs font-medium">{inv.subscription_plans?.name}</TableCell>
                  <TableCell className="font-black text-primary">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "font-black text-[9px] uppercase",
                      inv.status === 'Paid' ? "bg-emerald-50 text-emerald-600 border-none" : "bg-rose-50 text-rose-600 border-none"
                    )}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-4">
                    {inv.status === 'Unpaid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsPaidMutation.mutate({ invoiceId: inv.id, centerId: inv.center_id })}
                        className="h-8 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-[10px] font-black uppercase"
                      >
                        <IndianRupee className="h-3 w-3 mr-1" /> Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!allInvoices || allInvoices.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">No invoices discovered.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
