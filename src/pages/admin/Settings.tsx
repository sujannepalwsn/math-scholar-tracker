import { Bell, Cpu, Database, Globe, Palette, Settings2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ThemeSelector from "@/components/ThemeSelector";

const Settings = () => (
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
              Environment Logic
            </CardTitle>
          </CardHeader>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative p-6 bg-white shadow-soft rounded-[2.5rem] text-primary">
                  <Cpu className="h-12 w-12 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground/90 tracking-tight">Kernel Under Synthesis</h3>
                <p className="text-muted-foreground max-w-sm text-sm font-medium leading-relaxed">
                  We are currently architecting granular institutional controls. Advanced configuration matrices will be deployed in the next cycle.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-slate-200" />
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-2 w-2 rounded-full bg-slate-200" />
              </div>
            </div>
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

export default Settings;
