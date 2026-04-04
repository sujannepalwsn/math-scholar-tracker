import React, { useState } from "react";
import { Loader2, Upload, Scan, X, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

interface LessonPlanOCRProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onExtracted: (data: any) => void;
}

type OCRStep = "idle" | "compressing" | "uploading" | "analyzing" | "complete" | "error";

export default function LessonPlanOCR({ open, onOpenChange, onExtracted }: LessonPlanOCRProps) {
 const [file, setFile] = useState<File | null>(null);
 const [preview, setPreview] = useState<string | null>(null);
 const [step, setStep] = useState<OCRStep>("idle");
 const [errorMessage, setErrorMessage] = useState<string | null>(null);

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
   const selectedFile = e.target.files[0];
   setFile(selectedFile);
   setStep("idle");
   setErrorMessage(null);

   const reader = new FileReader();
   reader.onloadend = () => {
    setPreview(reader.result as string);
   };
   reader.readAsDataURL(selectedFile);
  }
 };

 const handleProcess = async () => {
  if (!file) {
   toast.error("Please select a lesson plan image");
   return;
  }

  try {
   // 1. Compression Phase
   setStep("compressing");
   const compressedBlob = await compressImage(file, 300); // 300KB for better detail

   const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressedBlob);
   });

   // 2. Network/Invocation Phase
   setStep("analyzing");
   logger.debug("Invoking lesson-plan-ocr Edge Function...");

   const { data, error } = await supabase.functions.invoke("lesson-plan-ocr", {
    body: { image: base64 }
   });

   if (error) {
    logger.error("Supabase function invocation error:", error);
    throw error;
   }

   if (!data || data.error) {
    throw new Error(data?.error || "AI service failed to extract data");
   }

   // 3. Success Phase
   setStep("complete");
   toast.success("Handwritten data extracted successfully!");

   // Delay slightly for visual feedback
   setTimeout(() => {
    onExtracted(data);
    handleClose();
   }, 800);

  } catch (error: any) {
   logger.error("OCR Processing Error:", error);
   setStep("error");

   let friendlyMessage = "Failed to process image with AI";
   if (error.message?.includes("CORS") || error.message?.includes("fetch")) {
    friendlyMessage = "Connection error. Please ensure the server is reachable.";
   } else if (error.message) {
    friendlyMessage = error.message;
   }

   setErrorMessage(friendlyMessage);
   toast.error(friendlyMessage);
  }
 };

 const handleClose = () => {
  setFile(null);
  setPreview(null);
  setStep("idle");
  setErrorMessage(null);
  onOpenChange(false);
 };

 const getStepUI = () => {
  switch (step) {
   case "compressing":
    return { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: "Optimizing Image Detail...", color: "text-blue-500" };
   case "analyzing":
    return { icon: <Sparkles className="h-5 w-5 animate-pulse" />, text: "AI analyzing handwriting...", color: "text-violet-500" };
   case "complete":
    return { icon: <CheckCircle2 className="h-5 w-5" />, text: "Data extraction successful!", color: "text-emerald-500" };
   case "error":
    return { icon: <AlertCircle className="h-5 w-5" />, text: "Extraction failed", color: "text-rose-500" };
   default:
    return null;
  }
 };

 const stepUI = getStepUI();

 return (
  <Dialog open={open} onOpenChange={onOpenChange}>
   <DialogContent className="w-[95vw] sm:max-w-xl max-h-[98vh] overflow-y-auto rounded-t-none sm:rounded-2xl border border-border shadow-2xl p-0 custom-scrollbar">
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative">
     <div className="absolute top-4 right-4">
       <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full text-slate-400 hover:text-white hover:bg-white">
        <X className="h-5 w-5" />
       </Button>
     </div>

     <DialogHeader className="space-y-4">
      <div className="flex items-center gap-3">
       <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30">
        <Scan className="h-6 w-6 text-primary" />
       </div>
       <div>
        <DialogTitle className="text-2xl font-black tracking-tight">AI Plan Scanner</DialogTitle>
        <div className="flex items-center gap-2 mt-1">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Handwriting Extraction Engine</p>
        </div>
       </div>
      </div>
      <DialogDescription className="text-slate-300 font-medium text-sm leading-relaxed max-w-sm">
       Upload a clear photo of your lesson plan. Our Vision AI will automatically transcribe and map your notes.
      </DialogDescription>
     </DialogHeader>
    </div>

    <div className="p-8 space-y-6">
     {!preview ? (
      <div className="group border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4 hover:border-primary/50 transition-all bg-slate-50/50 cursor-pointer relative">
       <input
        type="file"
        accept="image/*"
        capture="environment"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={handleFileChange}
       />
       <div className="p-5 bg-white rounded-full w-fit mx-auto shadow-sm group-hover:scale-110 transition-transform">
        <Upload className="h-10 w-10 text-slate-400 group-hover:text-primary" />
       </div>
       <div className="space-y-1">
        <p className="text-base font-black text-slate-700">Drop or Capture Image</p>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">PNG, JPG • UP TO 10MB</p>
       </div>
      </div>
     ) : (
      <div className="space-y-6">
       <div className="relative group aspect-[4/3] max-h-[350px] mx-auto rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-100">
        <img src={preview} alt="Lesson Plan Preview" className="w-full h-full object-contain" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
          variant="destructive"
          size="sm"
          className="rounded-full font-black uppercase text-[10px] tracking-widest gap-2"
          onClick={() => { setFile(null); setPreview(null); setStep("idle"); }}
         >
          <X className="h-4 w-4" /> REMOVE PHOTO
         </Button>
        </div>
       </div>

       {stepUI && (
        <div className={cn("flex items-center justify-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 animate-in slide-in-from-top-2", stepUI.color)}>
         {stepUI.icon}
         <span className="text-sm font-black uppercase tracking-widest">{stepUI.text}</span>
        </div>
       )}

       {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 space-y-2">
         <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-widest">Error Detail</span>
         </div>
         <p className="text-xs font-medium leading-relaxed">{errorMessage}</p>
        </div>
       )}

       <Button
        onClick={handleProcess}
        disabled={step !== "idle" && step !== "error"}
        className={cn(
         "w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden",
         step === "complete" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-gradient-to-r from-primary to-violet-600 shadow-xl hover:shadow-primary/20 hover:scale-[1.02]"
        )}
       >
        {step === "idle" || step === "error" ? (
         <span className="flex items-center gap-2">
          <Scan className="h-5 w-5" /> BEGIN EXTRACTION
         </span>
        ) : (
         <Loader2 className="h-6 w-6 animate-spin" />
        )}
       </Button>

       {(step === "error" || step === "idle") && (
        <Button variant="ghost" onClick={handleClose} className="w-full text-slate-400 font-bold hover:bg-transparent">
         ENTER MANUALLY INSTEAD
        </Button>
       )}
      </div>
     )}
    </div>
   </DialogContent>
  </Dialog>
 );
}
