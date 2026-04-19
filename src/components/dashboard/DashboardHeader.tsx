import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { HeaderConfig, HeaderElement } from "../center/header-builder/types";
import { HeaderElementRenderer } from "../center/header-builder/HeaderElementRenderer";

export default function DashboardHeader() {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const { data: center, isLoading: isCenterLoading } = useQuery({
    queryKey: ["center-details", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data, error } = await supabase
        .from("centers").select("id, name, logo_url, address, phone, email")
        .eq("id", user.center_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const headerConfig = center?.header_config as unknown as HeaderConfig;

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && headerConfig?.designWidth) {
        const containerWidth = containerRef.current.offsetWidth;
        const newScale = containerWidth / headerConfig.designWidth;
        setScale(newScale);
      }
    };

    if (headerConfig) {
        handleResize();
        // Delay ensures containerRef is populated and layout settled
        const timer = setTimeout(handleResize, 100);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }
  }, [headerConfig]);

  if (isCenterLoading) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-card rounded-3xl animate-pulse">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Render Dynamic Header Builder Layout
  if (headerConfig && headerConfig.elements && headerConfig.elements.length > 0) {
    const designWidth = headerConfig.designWidth || 1200;
    const baseHeight = parseInt(headerConfig.height) || 400;

    // On mobile, we might want a slightly larger scale than strictly proportional
    // to keep text readable, but for a true canvas-like experience,
    // strictly proportional is usually what's expected for 'fixed' layouts.
    // However, we ensure a minimum height to prevent it from disappearing.
    const responsiveHeight = Math.max(baseHeight * scale, 120 * scale);

    return (
      <div
        ref={containerRef}
        className="w-full mb-8 relative overflow-hidden rounded-[2rem] md:rounded-[4rem] shadow-glass transition-all duration-500 bg-white dark:bg-slate-900 border border-white/10 group/header"
        style={{
            height: `${responsiveHeight}px`,
        }}
      >
        {/* Everything is contained in a wrapper that scales as one block */}
        <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
                transform: `scale(${scale})`,
                width: `${designWidth}px`,
                height: `${baseHeight}px`,
                backgroundColor: headerConfig.backgroundColor || "transparent",
                willChange: "transform"
            }}
        >
            {/* Background Image Layer */}
            {headerConfig.backgroundUrl && (
                <div className="absolute inset-0 z-0">
                    <img
                        src={headerConfig.backgroundUrl}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundColor: headerConfig.overlayColor || "black",
                            opacity: (headerConfig.overlayOpacity ?? 0) / 100
                        }}
                    />
                </div>
            )}

            {/* Dynamic Elements Layer */}
            <div className="absolute inset-0 z-10">
                {headerConfig.elements.map((el: HeaderElement) => (
                    <HeaderElementRenderer key={el.id} element={el} />
                ))}
            </div>
        </div>
      </div>
    );
  }

  // Fallback to Legacy Template
  return (
    <Card
      className="border-none shadow-glass overflow-hidden rounded-[2.5rem] md:rounded-[4rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl mb-8 relative group/header border border-white/20"
      style={{ minHeight: center?.header_height || 'auto' }}
    >
      <CardContent className="py-12 px-5 md:p-12 relative z-10 space-y-8 h-full flex flex-col justify-center text-center">
          <div className="flex flex-col items-center gap-6">
              <div className="h-28 w-28 md:h-36 md:w-36 rounded-full overflow-hidden flex items-center justify-center border-4 border-white/50 shadow-soft bg-white/20">
                  {center?.logo_url ? <img src={center.logo_url} className="h-full w-full object-cover" /> : <Loader2 className="h-14 w-14" />}
              </div>
              <h1 className="text-3xl md:text-5xl font-black">{center?.name || "Institution Name"}</h1>
          </div>
      </CardContent>
    </Card>
  );
}
