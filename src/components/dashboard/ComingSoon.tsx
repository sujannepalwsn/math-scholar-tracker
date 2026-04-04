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
        className="p-6 rounded-full bg-primary/10 text-primary mb-8"
      >
        <Rocket className="h-16 w-16 animate-pulse" />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600"
      >
        {featureName ? `${featureName} is Coming Soon` : "Coming Soon"}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground font-medium max-w-md mb-8"
      >
        We're working hard to bring this feature to life. Stay tuned for updates as we continue to enhance your EduFlow experience!
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] h-12 px-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </motion.div>
    </div>
  );
};
