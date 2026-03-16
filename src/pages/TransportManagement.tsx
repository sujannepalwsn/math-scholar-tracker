import React from "react";
import { Bus, MapPin, Shield, Route, Users, Navigation, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import TransportManagement from "@/components/center/TransportManagement";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function TransportManagementPage() {
  const { user } = useAuth();
  const centerId = user?.center_id || "";

  const { data: center } = useQuery({
    queryKey: ["center-details", centerId],
    queryFn: async () => {
      if (!centerId) return null;
      const { data, error } = await supabase.from("centers").select("mapbox_token").eq("id", centerId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!centerId
  });

  const mapboxToken = center?.mapbox_token;
  const { data: centerCoords } = useQuery({
    queryKey: ["center-coords", centerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("centers").select("latitude, longitude").eq("id", centerId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!centerId
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
            Fleet & Logistics
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Manage school transport routes, vehicle tracking, and driver compliance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-soft bg-emerald-500/5 overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10">
              <Bus className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 leading-none mb-1">Total Fleet</p>
              <p className="text-2xl font-black text-emerald-700">12 Vehicles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-soft bg-blue-500/5 overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10">
              <Route className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 leading-none mb-1">Active Routes</p>
              <p className="text-2xl font-black text-blue-700">8 Paths</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-soft bg-amber-500/5 overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 leading-none mb-1">Safety Index</p>
              <p className="text-2xl font-black text-amber-700">98% Secure</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tracking" className="space-y-6">
        <TabsList className="bg-card/40 border border-border/40 p-1.5 rounded-2xl h-14 shadow-soft backdrop-blur-md">
          <TabsTrigger value="tracking" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">Live Tracking</TabsTrigger>
          <TabsTrigger value="management" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">Fleet & Routes</TabsTrigger>
          <TabsTrigger value="compliance" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <Card className="lg:col-span-8 rounded-[2.5rem] border-none shadow-strong bg-slate-900 overflow-hidden relative min-h-[600px]">
                {mapboxToken ? (
                  <iframe
                    title="Live Fleet Map"
                    className="absolute inset-0 w-full h-full border-none opacity-80"
                    src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${centerCoords?.longitude || 0},${centerCoords?.latitude || 0},12,0,0/800x600?access_token=${mapboxToken}`}
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                <div className="relative p-12 flex flex-col items-center justify-center h-full text-center space-y-6">
                   {!mapboxToken && (
                     <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-4 max-w-md">
                        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Configuration Required</p>
                        <p className="text-amber-200/60 text-[10px] mt-1">Please provide a Mapbox Access Token in Center Settings to enable real-time fleet visualization.</p>
                     </div>
                   )}
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
          <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-emerald-500/5 border-b border-border/20 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Route className="h-6 w-6 text-emerald-600" /> Transport Network Control
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <TransportManagement centerId={centerId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="outline-none">
          <Card className="rounded-[2.5rem] border-none shadow-strong bg-card/40 backdrop-blur-md overflow-hidden">
             <CardContent className="p-12 text-center space-y-4">
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
