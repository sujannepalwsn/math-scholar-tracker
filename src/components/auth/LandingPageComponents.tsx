import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { SystemModule } from "@/lib/system-modules";
import { PackageType, getDynamicPackageHighlights, PACKAGE_FEATURES } from "@/lib/package-presets";
import { cn } from "@/lib/utils";

// --- Dynamic Icon Helper ---
export const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.Shield;
  return <IconComponent className={className} />;
};

// --- Feature Card & Modal ---
interface FeatureCardProps {
  module: SystemModule;
  index: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ module, index }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: (index % 6) * 0.1 }}
          whileHover={{ scale: 1.05, translateY: -5 }}
          className="group cursor-pointer p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all duration-300 shadow-xl"
        >
          <div className="mb-4 p-3 rounded-2xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
            <DynamicIcon name={module.icon} className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{module.name}</h3>
          <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed">{module.description}</p>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-slate-900/95 backdrop-blur-2xl border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 rounded-2xl bg-primary/20">
               <DynamicIcon name={module.icon} className="h-8 w-8 text-primary" />
             </div>
             <div>
               <DialogTitle className="text-2xl font-black">{module.name}</DialogTitle>
               <Badge variant="outline" className="mt-1 border-emerald-500/50 text-emerald-400">
                 {module.completeness === 'Fully implemented' ? '✅ Fully implemented' : module.completeness}
               </Badge>
             </div>
          </div>
          <DialogDescription className="text-slate-300 text-base leading-relaxed">
            {module.description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          <h4 className="font-bold text-lg flex items-center gap-2">
            <Icons.Zap className="h-5 w-5 text-yellow-400" /> Key Functionalities
          </h4>
          <ul className="grid grid-cols-1 gap-2">
            {module.key_functionalities.map((func, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">
                <Icons.CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{func}</span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- Package Card & Modal ---
interface PackageCardProps {
  type: PackageType;
  index: number;
  allModules: SystemModule[];
}

export const PackageCard: React.FC<PackageCardProps> = ({ type, index, allModules }) => {
  const highlights = getDynamicPackageHighlights(type);
  const isPremium = type === 'Premium';
  const isStandard = type === 'Standard';

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_plans").select("*");
      if (error) throw error;
      return data;
    },
  });

  const plan = plans?.find((p: any) => p.features?.[0] === type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
      whileHover={{ y: -10 }}
      className={cn(
        "relative p-8 rounded-[2.5rem] overflow-hidden border transition-all duration-500 group shadow-2xl flex flex-col",
        isPremium
          ? "bg-gradient-to-br from-primary/20 via-slate-900 to-primary/5 border-primary/30"
          : "bg-white/5 backdrop-blur-xl border-white/10"
      )}
    >
      {isPremium && (
        <div className="absolute top-6 right-6">
          <Badge className="bg-primary text-white hover:bg-primary border-none px-4 py-1 rounded-full font-bold">MOST POPULAR</Badge>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-3xl font-black text-white mb-2">{type}</h3>
        <p className="text-slate-400 font-medium mb-4">
          {type === 'Basic' && 'For Small Institutions'}
          {type === 'Standard' && 'For Growing Schools'}
          {type === 'Premium' && 'Enterprise Excellence'}
        </p>
        {plan && (
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">NPR {plan.price}</span>
              <span className="text-slate-500 line-through text-sm">NPR {plan.original_price}</span>
            </div>
            {plan.discount_amount && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black uppercase">
                Save NPR {plan.discount_amount}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 mb-10 flex-1">
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Key Highlights</p>
        <ul className="space-y-3">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-center gap-3 text-slate-200">
              <div className="p-1 rounded-full bg-emerald-500/20">
                <Icons.Check className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="font-medium">{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        <Link to={`/book-plan?plan=${type}`} className="w-full">
          <Button
            className={cn(
              "w-full h-14 rounded-2xl font-black text-lg transition-all shadow-lg",
              isPremium
                ? "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                : "bg-white text-slate-900 hover:bg-slate-100 shadow-white/10"
            )}
          >
            Book Now
          </Button>
        </Link>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-10 rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-white/5"
            >
              Explore Features
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-slate-950/98 backdrop-blur-3xl border-white/10 text-white overflow-hidden flex flex-col p-0">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black flex flex-wrap items-center gap-4">
                {type} Plan
                <Badge className="bg-primary/20 text-primary border-primary/20 py-1 px-4">
                  {allModules.filter(m => m.feature_mapping.some(f => PACKAGE_FEATURES[type][f])).length} Modules Included
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-lg mt-2">
                {isPremium && "The ultimate solution for enterprise-level institutional management with zero limitations."}
                {isStandard && "Perfect for growing schools needing advanced reporting and communication tools."}
                {type === 'Basic' && "Essential features for administrative automation and digital record-keeping."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allModules.map((module) => {
                const isEnabled = module.feature_mapping.some(f => PACKAGE_FEATURES[type][f]);
                return (
                  <div
                    key={module.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center gap-4",
                      isEnabled
                        ? "bg-white/5 border-emerald-500/20"
                        : "bg-white/[0.02] border-white/5 opacity-50 grayscale-[0.5]"
                    )}
                  >
                    <div className={cn("p-2 rounded-xl", isEnabled ? "bg-emerald-500/20" : "bg-slate-700/20")}>
                      <DynamicIcon name={module.icon} className={cn("h-6 w-6", isEnabled ? "text-emerald-400" : "text-slate-500")} />
                    </div>
                    <div className="flex-1">
                      <p className={cn("font-bold text-sm", isEnabled ? "text-white" : "text-slate-500")}>{module.name}</p>
                      <p className="text-[10px] uppercase font-bold tracking-tighter opacity-70">
                        {isEnabled ? "Enabled" : "Unavailable"}
                      </p>
                    </div>
                    {isEnabled ? (
                       <Icons.CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                       <Icons.Lock className="h-5 w-5 text-slate-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Limitations Notice */}
            {!isPremium && (
              <div className="mt-8 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex gap-4">
                 <Icons.AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                 <div className="space-y-1">
                    <p className="font-bold text-amber-500">Plan Limitations</p>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Upgrade to <span className="text-white font-bold">{isStandard ? 'Premium' : 'Standard'}</span> to unlock
                      {isStandard ? ' OCR capabilities, Inventory tracking, and HR modules.' : ' Parent portal, Exams management, and Finance tools.'}
                    </p>
                 </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </motion.div>
  );
};

// --- Hero Section ---
interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  features?: { title: string, description: string, icon: string }[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ title, subtitle, features }) => {
  const displayTitle = title || "EMPOWER YOUR INSTITUTION";
  const displaySubtitle = subtitle || "A comprehensive, data-driven ecosystem designed to streamline administrative workflows and enhance the learning experience.";

  return (
    <div className="relative pt-4 pb-12 overflow-hidden">
      <div className="container mx-auto px-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center lg:text-left max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-md border border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase mb-6"
          >
            <Icons.Sparkles className="h-4 w-4" />
            <span>Next Generation Education ERP</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-8 uppercase">
            {displayTitle.split(' ').map((word, i) => (
              <span key={i} className={cn(i === displayTitle.split(' ').length - 1 ? "text-primary" : "")}>
                {word}{' '}
              </span>
            ))}
          </h1>

          <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed max-w-2xl mb-10">
            {displaySubtitle}
          </p>

          {/* Marketing Features if present */}
          {features && features.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  <div className="p-2 rounded-xl bg-primary/20">
                    <DynamicIcon name={f.icon} className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{f.title}</h4>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-1">{f.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-6 items-center justify-center lg:justify-start">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-800 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="user" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-4 border-slate-950 bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                +2k
              </div>
            </div>
            <p className="text-slate-500 font-bold text-sm tracking-tight uppercase">Trusted by <span className="text-white">2,000+</span> institutions</p>
          </div>
        </motion.div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>
    </div>
  );
};
