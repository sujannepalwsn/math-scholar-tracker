import React, { useState } from "react";
import { Bell, Cpu, Database, Globe, Palette, Settings2, Shield, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import ThemeSelector from "@/components/ThemeSelector";

const Settings = () => {
  const queryClient = useQueryClient();
  const [developerName, setDeveloperName] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const { data: systemSettings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      if (error) throw error;
      setDeveloperName(data.developer_name);
      setContactInfo(data.contact_info);
      return data;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('system_settings')
        .update({ developer_name: developerName, contact_info: contactInfo })
        .eq('id', systemSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('System settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update system settings');
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            System Control
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Configure global institutional parameters and core protocols.</p>
          </div>
        </div>
        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black px-3 py-1 uppercase tracking-widest">v2.4.0-Stable</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="md:col-span-2 border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 overflow-hidden">
            <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                Appearance Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <ThemeSelector />
            </CardContent>
         </Card>

         <Card className="md:col-span-2 border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 overflow-hidden">
            <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Settings2 className="h-6 w-6 text-primary" />
                </div>
                White Label Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Developer Name</Label>
                  <Input
                    value={developerName}
                    onChange={(e) => setDeveloperName(e.target.value)}
                    className="rounded-xl border-muted/20 bg-white/50 focus:bg-white transition-all"
                    placeholder="e.g. AI Solutions"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Contact Info</Label>
                  <Input
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="rounded-xl border-muted/20 bg-white/50 focus:bg-white transition-all"
                    placeholder="e.g. contact@example.com"
                  />
                </div>
              </div>
              <Button
                onClick={() => updateSettingsMutation.mutate()}
                disabled={updateSettingsMutation.isPending || isLoading}
                className="w-full md:w-auto px-8 rounded-xl bg-primary hover:scale-[1.02] transition-all"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </CardContent>
         </Card>

         <div className="space-y-6">
            <Card className="border-none shadow-strong rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
              <CardContent className="p-6 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                      <Shield className="h-6 w-6" />
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[9px] font-black uppercase tracking-widest px-2">Encrypted</Badge>
                 </div>
                 <div className="space-y-1">
                    <h4 className="font-black text-lg">Core Security</h4>
                    <p className="text-slate-400 text-xs font-medium">Global authentication protocols are active and monitoring.</p>
                 </div>
                 <div className="pt-4 border-t border-border/10 space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>SSL Status</span>
                      <span className="text-emerald-500">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>Database Engine</span>
                      <span className="text-white">Supabase Cluster</span>
                    </div>
                 </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-strong rounded-3xl bg-card/80 backdrop-blur-md border border-border/20">
              <CardContent className="p-6 space-y-4">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Localization</p>
                      <p className="text-sm font-black text-slate-700">Region: Asia/Kolkata</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Notifications</p>
                      <p className="text-sm font-black text-slate-700">Service: Multi-channel</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Database className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Storage</p>
                      <p className="text-sm font-black text-slate-700">Capacity: Cloud Unlimited</p>
                    </div>
                 </div>
              </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
};

export default Settings;
