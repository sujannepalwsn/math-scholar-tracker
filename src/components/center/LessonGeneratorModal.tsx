import React, { useState } from "react";
import { X, Minimize2, Maximize2, Move, ExternalLink } from "lucide-react";
import { Rnd } from "react-rnd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LessonGeneratorModal({ isOpen, onClose }: LessonGeneratorModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const url = "https://lessonpg.vercel.app/";

  if (isMinimized) {
    return (
      <Rnd
        default={{
          x: window.innerWidth - 320,
          y: window.innerHeight - 80,
          width: 300,
          height: 60,
        }}
        minWidth={200}
        minHeight={60}
        bounds="window"
        className="z-[9999] shadow-2xl rounded-2xl border-2 border-primary bg-white/90 backdrop-blur-md overflow-hidden group"
        dragHandleClassName="handle"
      >
        <div className="flex items-center justify-between p-3 h-full">
          <div className="flex items-center gap-2 handle cursor-move flex-1">
            <Move className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest truncate">AI Generator</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setIsMinimized(false)}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Rnd>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4 md:p-8 pointer-events-auto">
      <div className="w-full h-full max-w-7xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/20 rounded-xl">
               <ExternalLink className="h-5 w-5 text-primary" />
             </div>
             <div>
               <h3 className="text-sm font-black uppercase tracking-tight">Lesson Design Suite</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">External Pedagogical Engine</p>
             </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="rounded-xl text-slate-400 hover:text-white hover:bg-white/10 font-bold gap-2" onClick={() => setIsMinimized(true)}>
              <Minimize2 className="h-4 w-4" /> MINIMIZE
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white hover:bg-rose-500/20" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 bg-slate-50 relative">
          <iframe
            src={url}
            className="w-full h-full border-none"
            title="Lesson Plan Generator"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
}
