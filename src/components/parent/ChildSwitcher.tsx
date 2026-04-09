import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChildSwitcherProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const ChildSwitcher: React.FC<ChildSwitcherProps> = ({ selectedId, onSelect }) => {
  const { user } = useAuth();
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({});

  const linkedStudents = React.useMemo(() => {
    const raw = user?.linked_students;
    if (!Array.isArray(raw)) return [];
    return raw.map(s => typeof s === 'string' ? { id: s, name: 'Student' } : s);
  }, [user?.linked_students]);

  const { data: childrenDetails = [] } = useQuery({
    queryKey: ['children-details', linkedStudents.map(s => s.id)],
    queryFn: async () => {
      const ids = linkedStudents.map(s => s.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, grade, section, photo_url, gender')
        .in('id', ids);
      if (error) throw error;
      return data;
    },
    enabled: linkedStudents.length > 0
  });

  if (childrenDetails.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {childrenDetails.map((child) => {
        const isActive = selectedId === child.id;
        const hasError = !child.photo_url || imageErrors[child.id];
        const gender = child.gender?.toLowerCase();

        return (
          <motion.button
            key={child.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(child.id)}
            className={cn(
              "relative flex items-center gap-3 p-2 pr-4 rounded-2xl transition-all duration-300 border-2",
              isActive
                ? "bg-white border-primary shadow-medium"
                : "bg-slate-50 border-transparent hover:bg-slate-100 grayscale hover:grayscale-0"
            )}
          >
            <div className={cn(
              "h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center border transition-colors",
              hasError
                ? gender === 'female'
                  ? "bg-rose-100 border-rose-200"
                  : gender === 'male'
                    ? "bg-blue-100 border-blue-200"
                    : "bg-slate-200 border-slate-300"
                : isActive ? "border-primary/20" : "border-slate-300"
            )}>
              {child.photo_url && !imageErrors[child.id] ? (
                <img
                  src={child.photo_url}
                  alt={child.name}
                  className="h-full w-full object-cover"
                  onError={() => setImageErrors(prev => ({ ...prev, [child.id]: true }))}
                />
              ) : (
                <User className={cn(
                  "h-5 w-5",
                  gender === 'female'
                    ? "text-rose-500"
                    : gender === 'male'
                      ? "text-blue-500"
                      : "text-slate-400"
                )} />
              )}
            </div>
            <div className="text-left">
              <p className={cn(
                "text-xs font-black uppercase tracking-tight",
                isActive ? "text-slate-900" : "text-slate-500"
              )}>
                {child.name}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Grade {child.grade}
              </p>
            </div>
            {isActive && (
              <div className="ml-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
