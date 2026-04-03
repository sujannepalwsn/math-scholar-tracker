import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Zap, Users, Shield, BarChart3, Clock, FileText, AlertCircle, Layers, RefreshCw, ListChecks, Info, ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACKAGE_FEATURES, PackageType, PACKAGE_HIGHLIGHTS } from "@/lib/package-presets";
import { calculateProRatedAmount } from "@/utils/package-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/integrations/supabase/finance-types";
import { addDays, differenceInDays, format } from "date-fns";
import { SYSTEM_MODULES } from "@/lib/system-modules";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SubscriptionPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  const { data: currentSub } = useQuery({
    queryKey: ["center-current-subscription", user?.center_id],
    queryFn: async () => {
      // Fetch the most recent subscription (Active, Pending, or Rejected)
      const { data, error } = await supabase
        .from("center_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("center_id", user?.center_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const { data: saasInvoices } = useQuery({
    queryKey: ["center-saas-invoices", user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_invoices")
        .select("*, subscription_plans(name)")
        .eq("center_id", user?.center_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const [requestPlan, setRequestPlan] = useState<any>(null);

  const subscribeMutation = useMutation({
    mutationFn: async ({ planId, packageType, proRatedAmount }: { planId: string, packageType: string, proRatedAmount?: number }) => {
      // Create a pending subscription request
      const { error } = await supabase.from("center_subscriptions").insert({
        center_id: user?.center_id,
        plan_id: planId,
        package_type: packageType,
        status: "Pending",
        billed_amount: proRatedAmount
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-current-subscription"] });
      setRequestPlan(null);
      toast.success("Subscription request sent to Admin for approval.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to subscribe");
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-700 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" /> Subscription Tier
        </h3>
        <p className="text-sm text-muted-foreground font-medium">Select the most suitable plan for your institutional needs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((p: any) => {
          const isCurrent = currentSub?.plan_id === p.id && currentSub?.status === 'Active';

          let proRatedPrice = p.price;
          let isProRated = false;

          if (currentSub?.status === 'Active' && !isCurrent) {
             proRatedPrice = calculateProRatedAmount(
               currentSub.billed_amount || currentSub.subscription_plans?.price || 0,
               currentSub.subscription_days || 30,
               currentSub.start_date!,
               p.price
             );
             isProRated = true;
          }

          return (
            <Card key={p.id} className={cn(
              "rounded-3xl border-none shadow-strong bg-white transition-all relative overflow-hidden group",
              isCurrent ? "ring-2 ring-primary scale-[1.02]" : "hover:scale-[1.01]"
            )}>
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active Plan
                </div>
              )}
              <CardContent className="p-8">
                <div className="flex flex-col gap-1 mb-6">
                  <Badge className="w-fit bg-slate-100 text-slate-600 border-none font-black text-[10px] uppercase tracking-widest py-1 px-3">
                    {p.name}
                  </Badge>
                  <div className="flex flex-col mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tighter">NPR {p.price}</span>
                      <span className="text-sm font-bold text-slate-400">/mo</span>
                    </div>
                    {isProRated && (
                      <p className="text-[10px] font-black text-primary uppercase mt-1">
                        Pro-rated Total: {formatCurrency(proRatedPrice)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <Users className="h-4 w-4 text-blue-500" />
                    Up to {p.limits?.max_students || 0} Students
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
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start h-10 px-0 hover:bg-transparent group/break">
                           <div className="flex items-center gap-3 text-sm font-bold text-slate-600 group-hover/break:text-primary transition-colors">
                              <ListChecks className="h-4 w-4 text-amber-500" />
                              View Module Breakdown
                              <Info className="h-3 w-3 opacity-40" />
                           </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                            {p.name} Institutional Suite
                          </DialogTitle>
                          <DialogDescription className="font-bold text-primary uppercase text-[10px] tracking-widest">
                            Comprehensive Module Inventory
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[450px] pr-4 mt-4">
                          <div className="space-y-6">
                            {SYSTEM_MODULES.map((mod) => {
                              const isIncluded = mod.feature_mapping.some(f => PACKAGE_FEATURES[(p.features?.[0] as PackageType) || 'Basic'][f]);
                              return (
                                <div key={mod.id} className={cn(
                                  "p-5 rounded-3xl border transition-all duration-300",
                                  isIncluded ? "bg-white shadow-soft border-emerald-100" : "bg-slate-50/50 border-slate-100 opacity-50 grayscale"
                                )}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                       <div className={cn("w-2 h-2 rounded-full", isIncluded ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                       <h4 className="font-black text-sm uppercase tracking-tight">{mod.name}</h4>
                                    </div>
                                    {isIncluded ? (
                                      <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black uppercase">Standard Feature</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400">Locked</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">{mod.description}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {mod.key_functionalities.map((func, i) => (
                                      <span key={i} className="text-[9px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-600 font-bold italic">
                                        {func}
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
                  </div>
                </div>

                <Button
                  onClick={() => {
                    let amount = p.price;
                    if (currentSub?.status === 'Active') {
                      amount = calculateProRatedAmount(
                        currentSub.billed_amount || currentSub.subscription_plans?.price || 0,
                        currentSub.subscription_days || 30,
                        currentSub.start_date!,
                        p.price
                      );
                    }
                    subscribeMutation.mutate({
                      planId: p.id,
                      packageType: p.features?.[0] || 'Basic',
                      proRatedAmount: amount
                    });
                  }}
                  disabled={isCurrent || (currentSub?.status === 'Pending' && currentSub?.plan_id === p.id)}
                  className={cn(
                    "w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest transition-all",
                    isCurrent ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50" : "bg-slate-900 text-white shadow-lg"
                  )}
                >
                  {isCurrent ? "Currently Active" : "Request Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currentSub && currentSub.status === 'Active' && (
        <Card className="rounded-[2.5rem] border-none shadow-strong bg-primary/5 overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Subscription Lifecycle</p>
               <h4 className="text-lg font-black text-slate-800">
                 Institutional Plan: <span className="text-primary">{currentSub.subscription_plans?.name}</span>
               </h4>
               {currentSub.start_date && (
                 <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">
                      Activated: {format(new Date(currentSub.start_date), "PPP")}
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      Expires: {format(addDays(new Date(currentSub.start_date), currentSub.subscription_days || 30), "PPP")}
                      <span className="ml-2 text-primary">
                        ({Math.max(0, differenceInDays(addDays(new Date(currentSub.start_date), currentSub.subscription_days || 30), new Date()))} days remaining)
                      </span>
                    </p>
                 </div>
               )}
            </div>
            <div className="flex items-center gap-4">
               <Button
                 onClick={() => setRequestPlan({
                    id: currentSub.plan_id,
                    name: currentSub.subscription_plans?.name,
                    package_type: currentSub.package_type,
                    price: currentSub.subscription_plans?.price,
                    isRenewal: true,
                    proRatedAmount: currentSub.subscription_plans?.price
                 })}
                 variant="outline"
                 className="rounded-xl font-black uppercase text-[10px] tracking-widest border-2 h-11 px-6 bg-white"
               >
                 <RefreshCw className="h-4 w-4 mr-2" /> Renew Plan
               </Button>
               <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-soft shrink-0">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
               </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentSub && (currentSub.status === 'Pending' || currentSub.status === 'Rejected') && (
        <Card className="rounded-[2.5rem] border-none shadow-strong bg-slate-50 overflow-hidden">
           <CardContent className="p-8 flex items-center justify-between">
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request Status</p>
                 <h4 className="text-lg font-black text-slate-800">
                   Plan Request: <span className="text-primary">{currentSub.subscription_plans?.name}</span>
                   {currentSub.status === 'Pending' && <Badge className="ml-2 bg-amber-100 text-amber-600 border-none uppercase text-[9px] font-black">Waiting for Approval</Badge>}
                   {currentSub.status === 'Rejected' && <Badge className="ml-2 bg-rose-100 text-rose-600 border-none uppercase text-[9px] font-black">Request Declined</Badge>}
                 </h4>
                 <p className="text-sm font-medium text-slate-500">Requested on {currentSub.created_at ? format(new Date(currentSub.created_at), "PPP") : 'Recently'}</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-soft">
                 {currentSub.status === 'Pending' && <Clock className="h-8 w-8 text-amber-500" />}
                 {currentSub.status === 'Rejected' && <AlertCircle className="h-8 w-8 text-rose-500" />}
              </div>
           </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-1 mt-12">
        <h3 className="text-xl font-black uppercase tracking-tight text-slate-700 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" /> SaaS Billing & Invoices
        </h3>
        <p className="text-sm text-muted-foreground font-medium">Review your subscription payments and institutional billing history.</p>
      </div>

      {/* Request Confirmation Dialog */}
      <Dialog open={!!requestPlan} onOpenChange={(open) => !open && setRequestPlan(null)}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-strong">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Confirm Plan Request</DialogTitle>
            <DialogDescription className="font-medium">Please review the details before submitting to Admin for approval.</DialogDescription>
          </DialogHeader>
          {requestPlan && (
            <div className="space-y-6 pt-4">
               <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                  <div className="flex justify-between items-center mb-4">
                     <p className="text-[10px] font-black uppercase text-slate-400">Target Plan</p>
                     <Badge className="bg-primary text-white border-none uppercase font-black text-[10px]">{requestPlan.name}</Badge>
                  </div>
                  <div className="flex justify-between items-baseline">
                     <p className="text-3xl font-black">{formatCurrency(requestPlan.proRatedAmount || requestPlan.price)}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Approval Estimate</p>
                  </div>
                  {requestPlan.proRatedAmount && requestPlan.proRatedAmount !== requestPlan.price && (
                    <p className="text-[10px] font-bold text-primary mt-2 italic">
                       * Includes pro-rated adjustments for your current billing cycle.
                    </p>
                  )}
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Automated Invoice Generation
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Feature Preset Synchronization
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    24-Hour Approval SLA
                  </div>
               </div>

               <div className="flex gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setRequestPlan(null)} className="flex-1 rounded-xl uppercase font-black text-[10px]">Cancel</Button>
                  <Button
                    onClick={() => subscribeMutation.mutate({
                      planId: requestPlan.id,
                      packageType: requestPlan.package_type,
                      proRatedAmount: requestPlan.proRatedAmount
                    })}
                    disabled={subscribeMutation.isPending}
                    className="flex-1 h-12 rounded-xl bg-slate-900 text-white uppercase font-black text-[10px]"
                  >
                    {subscribeMutation.isPending ? "Processing..." : "Submit Request"} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-8 py-4">Invoice ID</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Plan</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Amount</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Status</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest py-4">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saasInvoices?.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="px-8 font-bold text-slate-600 text-xs uppercase tracking-tighter">#{inv.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-bold">{inv.subscription_plans?.name}</TableCell>
                  <TableCell className="font-black text-primary">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "font-black text-[9px] uppercase",
                      inv.status === 'Paid' ? "bg-emerald-50 text-emerald-600 border-none" : "bg-rose-50 text-rose-600 border-none"
                    )}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {(!saasInvoices || saasInvoices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <AlertCircle className="h-8 w-8 opacity-20" />
                      <p className="italic font-medium text-sm">No institutional invoices discovered.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
