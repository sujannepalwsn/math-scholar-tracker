import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Footer = () => {
  const { data: settings } = useQuery({
    queryKey: ['system-settings-footer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('developer_name, contact_info')
        .single();
      if (error) return { developer_name: 'AI Solutions', contact_info: 'contact@example.com' };
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const devName = settings?.developer_name || 'AI Solutions';
  const contact = settings?.contact_info || 'contact@example.com';

  return (
    <footer className="mt-auto py-6 border-t border-muted/20 text-center space-y-1">
      <p className="text-xs font-medium text-muted-foreground">
        Created and Developed by <span className="font-black text-primary">{devName}</span>
      </p>
      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
        Contact: {contact}
      </p>
    </footer>
  );
};
