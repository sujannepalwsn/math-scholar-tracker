import React from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ComingSoonProps {
 featureName?: string;
}

export const ComingSoon = ({ featureName }: ComingSoonProps) => {
 const navigate = useNavigate();

 return (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
   <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="p-6 rounded-2xl bg-primary-light text-primary mb-8 border border-primary/10"
   >
    <Rocket className="h-16 w-16" />
   </motion.div>

   <motion.h1
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.2 }}
    className="text-4xl font-black tracking-tight mb-4 text-slate-950"
   >
    {featureName ? `${featureName} is under construction` : "Feature Coming Soon"}
   </motion.h1>

   <motion.p
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3 }}
    className="text-slate-600 font-medium max-w-md mb-12 leading-relaxed"
   >
    We're building a world-class experience for {featureName || "this module"}. In the meantime, explore our other fully functional features.
   </motion.p>

   {/* Feature Preview Mockup */}
   <motion.div
    initial={{ y: 40, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.4 }}
    className="w-full max-w-2xl bg-white border border-border rounded-2xl shadow-xl p-8 mb-12 relative overflow-hidden"
   >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.05),transparent)]" />
    <div className="relative z-10 flex flex-col items-center gap-6">
      <div className="w-full h-8 bg-slate-50 rounded-xl border border-border flex items-center px-4">
       <div className="flex gap-1.5">
         <div className="w-2 h-2 rounded-full bg-slate-200" />
         <div className="w-2 h-2 rounded-full bg-slate-200" />
         <div className="w-2 h-2 rounded-full bg-slate-200" />
       </div>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full">
       <div className="h-24 bg-slate-50 rounded-2xl border border-border animate-pulse" />
       <div className="h-24 bg-slate-50 rounded-2xl border border-border animate-pulse delay-75" />
       <div className="h-24 bg-slate-50 rounded-2xl border border-border animate-pulse delay-150" />
      </div>
      <div className="w-full h-40 bg-slate-50 rounded-2xl border border-border animate-pulse delay-300" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center bg-white ">
      <div className="px-6 py-2 bg-slate-900 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl">
       PREVIEW ONLY
      </div>
    </div>
   </motion.div>

   <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.5 }}
   >
    <Button
     onClick={() => navigate(-1)}
     variant="secondary"
     className="rounded-xl font-black uppercase tracking-widest text-[10px] h-12 px-10"
    >
     <ArrowLeft className="mr-2 h-4 w-4" />
     Go Back
    </Button>
   </motion.div>
  </div>
 );
};
