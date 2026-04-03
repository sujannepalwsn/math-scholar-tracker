import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Zap, Shield, BarChart3, Users } from "lucide-react";
import { motion } from "framer-motion";

interface UpgradeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export const UpgradeModal = ({ isOpen, onOpenChange, featureName }: UpgradeModalProps) => {
  const valueProps = [
    { icon: BarChart3, title: "Advanced Analytics", desc: "Unlock deep insights into institutional performance and student risk scores." },
    { icon: Users, title: "Enhanced HR Suite", desc: "Automate teacher attendance, leave management, and payroll processing." },
    { icon: Shield, title: "Enterprise Security", desc: "Role-based access control with granular permissions and audit logs." },
    { icon: Zap, title: "Priority Support", desc: "24/7 dedicated support with a guaranteed 2-hour response time." },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 p-0 overflow-hidden rounded-[2.5rem]">
        <div className="relative">
          {/* Header Banner */}
          <div className="bg-primary p-12 text-center text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-20">
                <Sparkles className="h-32 w-32" />
             </div>
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-widest mb-6"
             >
               <Zap className="h-4 w-4" />
               <span>Premium Feature Locked</span>
             </motion.div>
             <h2 className="text-4xl font-black tracking-tighter uppercase leading-none mb-4">
                Upgrade to EduFlow <span className="text-slate-900">PRO</span>
             </h2>
             <p className="text-white/80 font-medium max-w-md mx-auto">
                {featureName ? `Unlock ${featureName} and take your institution to the next level.` : "Get access to our most powerful suites and automation tools."}
             </p>
          </div>

          <div className="p-12 space-y-8 bg-slate-950">
             <div className="grid md:grid-cols-2 gap-8">
                {valueProps.map((prop, i) => (
                  <div key={i} className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <prop.icon className="h-5 w-5" />
                     </div>
                     <div>
                        <h4 className="text-white font-black uppercase text-xs tracking-tight mb-1">{prop.title}</h4>
                        <p className="text-slate-500 text-[10px] font-medium leading-relaxed">{prop.desc}</p>
                     </div>
                  </div>
                ))}
             </div>

             <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                <Button
                  className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-primary/20"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.href = '/pricing';
                  }}
                >
                  View Pricing & Plans
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-sm"
                  onClick={() => onOpenChange(false)}
                >
                  Maybe Later
                </Button>
             </div>

             <p className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                Trusted by 2,000+ institutions worldwide
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
