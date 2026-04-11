import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { UserRole } from "@/types/roles";
import { getDashboardPath } from "@/utils/permissions";

interface SchoolBrandingProps {
  className?: string;
  isMobileCompact?: boolean;
}

export default function SchoolBranding({ className, isMobileCompact }: SchoolBrandingProps) {
  const { user } = useAuth();

  const { data: center } = useQuery({
    queryKey: ["center-branding", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data, error } = await supabase
        .from("centers").select("id, name, logo_url, address, phone, email")
        .eq("id", user.center_id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.center_id,
    staleTime: 1000 * 60 * 5,
  });

  if (!center && !user?.center_name) return null;

  const header_title_visible = center?.header_title_visible !== false;
  const header_address_visible = center?.header_address_visible !== false;

  return (
    <Link
      to={getDashboardPath(user?.role)}
      className={cn("flex items-center justify-center gap-2 px-2 py-1 rounded-xl relative overflow-hidden transition-all duration-300 hover:bg-primary/5", className)}
    >
      {/* Optional Header Background Mini-Overlay if needed */}
      {center?.header_bg_url && (
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: `url(${center.header_bg_url})` }}
        />
      )}

      <div className={cn("rounded-full overflow-hidden bg-white/80 backdrop-blur-sm flex items-center justify-center border border-primary/10 shrink-0 shadow-sm relative z-10", isMobileCompact ? "h-6 w-6" : "h-8 w-8")}>
        {center?.logo_url ? (
          <img
            src={center.logo_url}
            alt="Logo"
            className="h-full w-full object-contain"
          />
        ) : (
          <Building className={cn("text-primary", isMobileCompact ? "h-3 w-3" : "h-4 w-4")} />
        )}
      </div>

      <div className="flex flex-col items-start min-w-0 relative z-10">
        {header_title_visible && (
          <h2
            className={cn(
              "font-black truncate leading-none whitespace-nowrap",
              isMobileCompact ? "max-w-[140px] text-[10px]" : "max-w-[220px] md:max-w-[350px] text-xs md:text-sm"
            )}
            style={{
              fontFamily: center?.header_font_family || 'inherit',
              color: center?.header_font_color || 'inherit',
              textTransform: (center?.header_text_transform as "none" | "uppercase" | "lowercase" | "capitalize") || 'none',
              fontSize: isMobileCompact ? '10px' : (center?.header_font_size === 'large' ? '1rem' : center?.header_font_size === 'small' ? '0.75rem' : '0.875rem')
            }}
          >
            {center?.name || user?.center_name}
          </h2>
        )}
        {header_address_visible && center?.address && !isMobileCompact && (
          <div className="flex items-center gap-1 opacity-70">
            <MapPin className="h-2 w-2 shrink-0" />
            <p
              className="text-[8px] font-bold truncate max-w-[180px] md:max-w-[250px]"
              style={{ color: center?.header_font_color || 'inherit' }}
            >
              {center.address}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
