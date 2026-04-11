import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Layout, ShieldCheck, History } from "lucide-react";
import { HeaderBuilder } from "./header-builder/HeaderBuilder";
import { HeaderConfig } from "./header-builder/types";

export default function HeaderSettings({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient();

  const { data: center, isLoading } = useQuery({
    queryKey: ["center-header-settings", centerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("centers").select("id, name, logo_url, address, phone, email").eq("id", centerId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null);

  useEffect(() => {
    if (center) {
      if (center.header_config) {
        setHeaderConfig(center.header_config as unknown as HeaderConfig);
      } else {
        // Initialize with default layout
        const initialConfig: HeaderConfig = {
          width: "100%",
          height: center.header_height || "400px",
          designWidth: 1200,
          gridSize: 10,
          backgroundColor: "#ffffff",
          backgroundUrl: center.header_bg_url || "https://images.unsplash.com/photo-1523050853063-915894374ef7?q=80&w=2070&auto=format&fit=crop",
          overlayColor: center.header_overlay_color || "#000000",
          overlayOpacity: center.header_overlay_opacity ?? 90,
          elements: [
            {
              id: "default-logo",
              type: "image",
              x: 40,
              y: 40,
              width: 120,
              height: 120,
              content: center.logo_url || "https://via.placeholder.com/150",
              styles: {}
            },
            {
              id: "default-name",
              type: "text",
              x: 180,
              y: 60,
              width: 600,
              height: 80,
              content: center.name || "Institution Name",
              styles: {
                fontSize: "3rem",
                color: "#ffffff",
                fontWeight: "bold",
                fontFamily: "Inter"
              }
            },
            {
              id: "default-address",
              type: "text",
              x: 180,
              y: 140,
              width: 600,
              height: 40,
              content: center.address || "Location Address",
              styles: {
                fontSize: "1rem",
                color: "rgba(255,255,255,0.8)",
                fontWeight: "normal",
                fontFamily: "Inter"
              }
            }
          ]
        };
        setHeaderConfig(initialConfig);
      }
    }
  }, [center]);

  const updateMutation = useMutation({
    mutationFn: async (newConfig: HeaderConfig) => {
      const { error } = await supabase
        .from("centers")
        .update({ header_config: newConfig as any })
        .eq("id", centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-header-settings"] });
      queryClient.invalidateQueries({ queryKey: ["center-about"] });
      toast.success("Header configuration synchronized successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleSave = (config: HeaderConfig) => {
    updateMutation.mutate(config);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-full overflow-x-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10">
                        <Layout className="h-7 w-7 text-primary" />
                    </div>
                    Visual Identity Studio
                </h2>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-muted-foreground text-sm font-medium">Design your institutional header for reports and printable assets.</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Studio Status</span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Operational</span>
               </div>
               <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
               </div>
            </div>
        </div>

        {headerConfig && (
            <HeaderBuilder
                initialConfig={headerConfig}
                onSave={handleSave}
                isSaving={updateMutation.isPending}
                centerId={centerId}
            />
        )}

        {/* Info Card */}
        <Card className="rounded-3xl border-none shadow-strong bg-slate-900 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <History className="h-24 w-24 text-white" />
            </div>
            <CardHeader className="relative z-10">
                <CardTitle className="text-white text-lg font-black uppercase tracking-widest">Architectural Guidelines</CardTitle>
                <CardDescription className="text-white/40 font-medium">Best practices for institutional header design</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 grid md:grid-cols-3 gap-8 pb-10">
                <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Responsive Bounds</h4>
                    <p className="text-[11px] leading-relaxed text-white/60">
                        The canvas is responsive, but fixed elements use absolute positioning. Keep your primary content centered or within 800px width for best results on standard A4 prints.
                    </p>
                </div>
                <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">High Fidelity Assets</h4>
                    <p className="text-[11px] leading-relaxed text-white/60">
                        Use PNG images with transparent backgrounds for logos. Ensure background images are at least 1920px wide to prevent pixelation during printing.
                    </p>
                </div>
                <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Atmospheric Control</h4>
                    <p className="text-[11px] leading-relaxed text-white/60">
                        Use overlays to increase text contrast. A 40-60% black overlay is recommended for white text over colorful institution backgrounds.
                    </p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
