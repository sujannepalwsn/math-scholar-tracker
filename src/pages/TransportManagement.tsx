import React from "react";
import { Bus, MapPin, Shield, Route, Users, Navigation, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import TransportManagement from "@/components/center/TransportManagement";
import { hasActionPermission } from "@/utils/permissions";

export default function TransportManagementPage() {
  const { user } = useAuth();
  const centerId = user?.center_id || "";
  const canEdit = hasActionPermission(user, 'transport_tracking', 'edit');

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Bus className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Logistics Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Fleet & Route Optimization Nexus</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="rounded-[2rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-[1.5rem] bg-emerald-500/10">
              <Bus className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-2">Fleet Volume</p>
              <p className="text-3xl font-black text-slate-700">12</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-[1.5rem] bg-primary/10">
              <Route className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-2">Active Routes</p>
              <p className="text-3xl font-black text-slate-700">8</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="p-4 rounded-[1.5rem] bg-amber-500/10">
              <Shield className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none mb-2">Safety Rating</p>
              <p className="text-3xl font-black text-slate-700">98%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tracking" className="space-y-8">
        <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-white/50 border border-slate-100 p-1 rounded-2xl h-14 shadow-soft backdrop-blur-md">
          <TabsTrigger value="tracking" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">Live Tracking</TabsTrigger>
          <TabsTrigger value="management" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">Fleet & Routes</TabsTrigger>
          <TabsTrigger value="compliance" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <Card className="lg:col-span-8 rounded-[2.5rem] border-none shadow-strong bg-slate-900 overflow-hidden relative min-h-[600px]">
                <div className="absolute inset-0 opacity-20 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/0,0,1,0,0/800x600?access_token=none')] bg-cover"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                <div className="relative p-12 flex flex-col items-center justify-center h-full text-center space-y-6">
                   <div className="p-4 rounded-full bg-emerald-500/20 animate-pulse">
                      <Navigation className="h-12 w-12 text-emerald-400" />
                   </div>
                   <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Live Fleet Radar</h2>
                   <p className="text-slate-400 max-w-lg font-medium">Real-time GPS telemetry integration. All vehicles currently on established routes are being monitored for speed, location, and idle time.</p>
                </div>
             </Card>

             <div className="lg:col-span-4 space-y-6">
                <Card className="rounded-3xl border border-slate-100 bg-white shadow-soft overflow-hidden">
                   <CardHeader className="bg-slate-50 border-b py-4">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">In-Transit Status</CardTitle>
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="divide-y max-h-[500px] overflow-y-auto">
                         {[
                           { bus: "B104", route: "Morning North", status: "Delayed", color: "rose", eta: "12m" },
                           { bus: "B202", route: "Main Campus", status: "On Time", color: "emerald", eta: "4m" },
                           { bus: "B305", route: "East Loop", status: "Arrived", color: "blue", eta: "0m" },
                           { bus: "B101", route: "West Station", status: "On Time", color: "emerald", eta: "8m" },
                         ].map((v, idx) => (
                           <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className={`h-10 w-10 rounded-xl bg-${v.color}-500/10 flex items-center justify-center text-${v.color}-600`}>
                                    <Bus className="h-5 w-5" />
                                 </div>
                                 <div>
                                    <p className="font-black text-slate-700 leading-none">{v.bus}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{v.route}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <Badge className={`bg-${v.color}-500 text-white border-none text-[8px] font-black`}>{v.status}</Badge>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">ETA: {v.eta}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>
                <Button className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-strong">Broadcast to Drivers</Button>
             </div>
          </div>
        </TabsContent>

        <TabsContent value="management" className="outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Route className="h-6 w-6 text-primary" /> Transport Network Control
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <TransportManagement centerId={centerId} canEdit={canEdit} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
             <CardContent className="p-12 text-center space-y-6">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                <h3 className="text-xl font-black uppercase tracking-tight">Maintenance & Licensing</h3>
                <p className="text-muted-foreground font-medium">Track vehicle insurance, fitness certificates, pollution checks, and driver licenses. (Coming in next release)</p>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
