import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FinanceSettings({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
 const queryClient = useQueryClient();
 const [provider, setProvider] = useState("Stripe");
 const [apiKey, setApiKey] = useState("");
 const [apiSecret, setApiSecret] = useState("");

 const { data: center } = useQuery({
  queryKey: ["center-automation-settings", centerId],
  queryFn: async () => {
   // Use raw SQL select via maybeSingle to avoid type errors if columns are newly added
   const { data, error } = await supabase.from("centers").select("*").eq("id", centerId).maybeSingle();
   if (error) throw error;
   return data;
  },
  enabled: !!centerId,
 });

 const { data: gatewaySettings } = useQuery({
  queryKey: ["payment-gateway-settings", centerId],
  queryFn: async () => {
   const { data, error } = await supabase.from("payment_gateway_settings").select("*").eq("center_id", centerId);
   if (error) throw error;
   return data;
  },
 });

 const toggleAutomationMutation = useMutation({
  mutationFn: async (enabled: boolean) => {
   const { error } = await supabase
    .from("centers")
    .update({ automation_enabled: enabled } as any)
    .eq("id", centerId);
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["center-automation-settings"] });
   toast.success("Automation setting updated");
  },
  onError: (error: any) => toast.error(error.message),
 });

 const updateAutomationSettingsMutation = useMutation({
  mutationFn: async (settings: any) => {
   const { error } = await supabase
    .from("centers")
    .update({ automation_settings: settings } as any)
    .eq("id", centerId);
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["center-automation-settings"] });
   toast.success("Automation rules saved");
  },
  onError: (error: any) => toast.error(error.message),
 });

 const saveGatewayMutation = useMutation({
  mutationFn: async () => {
   const { error } = await supabase.from("payment_gateway_settings").upsert({
    center_id: centerId,
    provider,
    api_key: apiKey,
    api_secret: apiSecret,
    is_active: true
   }, { onConflict: 'center_id,provider' });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["payment-gateway-settings"] });
   toast.success("Payment gateway settings saved");
  }
 });

 return (
  <div className="grid md:grid-cols-2 gap-6">
   <Card className="rounded-2xl border border-border shadow-sm bg-white ">
    <CardHeader>
     <CardTitle className="flex items-center gap-2">
      <CreditCard className="h-5 w-5 text-primary" />
      Payment Gateway Framework
     </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
     <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</Label>
      <select
       value={provider}
       onChange={(e) => setProvider(e.target.value)}
       className="w-full h-11 px-3 border rounded-xl bg-white"
      >
       <option value="Stripe">Stripe</option>
       <option value="Razorpay">Razorpay</option>
       <option value="Khalti">Khalti (Local)</option>
       <option value="eSewa">eSewa (Local)</option>
      </select>
     </div>
     <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Public API Key</Label>
      <Input
       type="password"
       value={apiKey}
       onChange={(e) => setApiKey(e.target.value)}
       placeholder="pk_test_..."
       className="h-11 rounded-xl"
      />
     </div>
     <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secret Key</Label>
      <Input
       type="password"
       value={apiSecret}
       onChange={(e) => setApiSecret(e.target.value)}
       placeholder="sk_test_..."
       className="h-11 rounded-xl"
      />
     </div>
     {canEdit && (
      <Button onClick={() => saveGatewayMutation.mutate()} className="w-full h-11 rounded-xl font-black uppercase text-xs tracking-widest mt-2">
       Save Configuration
      </Button>
     )}
    </CardContent>
   </Card>

   <Card className="rounded-2xl border border-border shadow-sm bg-white ">
    <CardHeader>
     <CardTitle className="flex items-center gap-2">
      <Settings className="h-5 w-5 text-primary" />
      Automation Rules
     </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
     <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
      <h4 className="font-bold text-blue-800 text-sm mb-1">Late Fee Calculation</h4>
      <p className="text-xs text-blue-600 mb-4">Automatically apply late fees to overdue invoices.</p>
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-1">
        <Label className="text-[9px] font-black uppercase tracking-tight text-blue-800">Grace Period (Days)</Label>
        <Input
         type="number"
         value={(center?.automation_settings as any)?.grace_period || 5}
         onChange={(e) => updateAutomationSettingsMutation.mutate({
          ...(center?.automation_settings as any || {}),
          grace_period: parseInt(e.target.value)
         })}
         className="h-9 rounded-lg"
        />
       </div>
       <div className="space-y-1">
        <Label className="text-[9px] font-black uppercase tracking-tight text-blue-800">Fee Amount (Flat)</Label>
        <Input
         type="number"
         value={(center?.automation_settings as any)?.late_fee || 500}
         onChange={(e) => updateAutomationSettingsMutation.mutate({
          ...(center?.automation_settings as any || {}),
          late_fee: parseInt(e.target.value)
         })}
         className="h-9 rounded-lg"
        />
       </div>
      </div>
     </div>

     <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
      <h4 className="font-bold text-purple-800 text-sm mb-1">Monthly Auto-Invoicing</h4>
      <p className="text-xs text-purple-600 mb-4">Generate invoices automatically on the 1st of every month.</p>
      <div className="flex items-center gap-3">
       {canEdit && (
        <Button
         size="sm"
         onClick={() => toggleAutomationMutation.mutate(!center?.automation_enabled)}
         className={cn(
          "rounded-lg text-[10px] font-black uppercase",
          center?.automation_enabled ? "bg-rose-600 hover:bg-rose-700" : "bg-purple-600 hover:bg-purple-700"
         )}
        >
         {center?.automation_enabled ? "Disable Automation" : "Enable Automation"}
        </Button>
       )}
       <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
        {center?.automation_enabled ? "Currently Active" : "Currently Disabled"}
       </span>
      </div>
     </div>
    </CardContent>
   </Card>
  </div>
 );
}
