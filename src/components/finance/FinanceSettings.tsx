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

export default function FinanceSettings({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("Stripe");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const { data: gatewaySettings } = useQuery({
    queryKey: ["payment-gateway-settings", centerId],
    queryFn: async () => {
      if (!centerId) return null;
      const { data, error } = await supabase.from("payment_gateway_settings").select("*").eq("center_id", centerId);
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
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
      <Card className="rounded-[2rem] border-none shadow-strong bg-white/50 backdrop-blur-md">
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
          <Button onClick={() => saveGatewayMutation.mutate()} className="w-full h-11 rounded-xl font-black uppercase text-xs tracking-widest mt-2">
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-none shadow-strong bg-white/50 backdrop-blur-md">
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
                <Input type="number" defaultValue="5" className="h-9 rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-tight text-blue-800">Fee Amount (Flat)</Label>
                <Input type="number" defaultValue="500" className="h-9 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
            <h4 className="font-bold text-purple-800 text-sm mb-1">Monthly Auto-Invoicing</h4>
            <p className="text-xs text-purple-600 mb-4">Generate invoices automatically on the 1st of every month.</p>
            <div className="flex items-center gap-3">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 rounded-lg text-[10px] font-black uppercase">Enable Automation</Button>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Currently Disabled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
