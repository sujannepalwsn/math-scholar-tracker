import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Zap, Users, Shield, BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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
      const { data, error } = await supabase
        .from("center_subscriptions")
        .select("*, subscription_plans(*)")
        .eq("center_id", user?.center_id)
        .eq("status", "Active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      // For now, we just insert/update the subscription.
      // In a real app, this would redirect to a payment gateway.

      // Deactivate old subscriptions if any
      if (currentSub) {
        const { error: deactivateError } = await supabase
          .from("center_subscriptions")
          .update({ status: "Inactive" })
          .eq("center_id", user?.center_id);
        if (deactivateError) throw deactivateError;
      }

      const { error } = await supabase.from("center_subscriptions").insert({
        center_id: user?.center_id,
        plan_id: planId,
        status: "Active",
        start_date: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-current-subscription"] });
      toast.success("Successfully subscribed to the plan!");
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
          const isCurrent = currentSub?.plan_id === p.id;
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
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black tracking-tighter">Rs. {p.price}</span>
                    <span className="text-sm font-bold text-slate-400">/mo</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <Users className="h-4 w-4 text-blue-500" />
                    Up to {p.limits?.max_students || 0} Students
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Security & Permissions
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Full Reports Access
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <Clock className="h-4 w-4 text-amber-500" />
                    24/7 Priority Support
                  </div>
                </div>

                <Button
                  onClick={() => subscribeMutation.mutate(p.id)}
                  disabled={isCurrent || subscribeMutation.isPending}
                  className={cn(
                    "w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest transition-all",
                    isCurrent ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50" : "bg-slate-900 text-white shadow-lg"
                  )}
                >
                  {isCurrent ? "Currently Active" : "Subscribe Now"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currentSub && (
        <Card className="rounded-[2.5rem] border-none shadow-strong bg-primary/5 overflow-hidden">
          <CardContent className="p-8 flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Subscription Context</p>
               <h4 className="text-lg font-black text-slate-800">Your institution is currently on the <span className="text-primary">{currentSub.subscription_plans?.name}</span> plan.</h4>
               <p className="text-sm font-medium text-slate-500">Subscription started on {new Date(currentSub.start_date).toLocaleDateString()}. Next billing cycle will renew automatically.</p>
            </div>
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-soft">
               <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
