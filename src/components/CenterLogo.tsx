import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building } from "lucide-react";

interface CenterLogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export default function CenterLogo({ size = "md", showName = true }: CenterLogoProps) {
  const { user } = useAuth();

  const { data: center } = useQuery({
    queryKey: ["center-logo", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data, error } = await supabase
        .from("centers")
        .select("name, logo_url")
        .eq("id", user.center_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.center_id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex items-center gap-2">
      {center?.logo_url ? (
        <img
          src={center.logo_url}
          alt={`${center.name} logo`}
          className={`${sizeClasses[size]} object-contain rounded`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={`${sizeClasses[size]} items-center justify-center rounded bg-primary/10 ${center?.logo_url ? 'hidden' : 'flex'}`}>
        <Building className="h-4 w-4 text-primary" />
      </div>
      {showName && center?.name && (
        <span className={`font-semibold ${textSizeClasses[size]} truncate max-w-[150px]`}>
          {center.name}
        </span>
      )}
    </div>
  );
}