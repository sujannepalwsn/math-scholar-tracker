import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { HeaderConfig, HeaderElement, ElementType } from "./types";
import { DraggableElement } from "./DraggableElement";
import { GridBackground } from "./GridBackground";
import { ElementControls } from "./ElementControls";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Type, Image as ImageIcon, Layout, Move, Save, Trash2, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, MousePointer2, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import { HeaderElementRenderer } from "./HeaderElementRenderer";

interface HeaderBuilderProps {
 initialConfig?: HeaderConfig;
 onSave: (config: HeaderConfig) => void;
 isSaving?: boolean;
 centerId?: string;
}

const DEFAULT_CONFIG: HeaderConfig = {
 width: "100%",
 height: "400px",
 gridSize: 10,
 elements: [],
 backgroundColor: "#ffffff",
 overlayColor: "#000000",
 overlayOpacity: 0
};

export const HeaderBuilder: React.FC<HeaderBuilderProps> = ({
 initialConfig,
 onSave,
 isSaving,
 centerId
}) => {
 const [config, setConfig] = useState<HeaderConfig>(initialConfig || DEFAULT_CONFIG);
 const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
 const [isPreview, setIsPreview] = useState(false);
 const [isUploadingBg, setIsUploadingBg] = useState(false);
 const canvasRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  const updateDesignWidth = () => {
    if (canvasRef.current) {
      const currentWidth = canvasRef.current.offsetWidth;
      if (currentWidth > 0 && currentWidth !== config.designWidth) {
        setConfig(prev => ({ ...prev, designWidth: currentWidth }));
      }
    }
  };

  updateDesignWidth();
  window.addEventListener('resize', updateDesignWidth);

  // Also check after a brief delay for any layout transitions
  const timer = setTimeout(updateDesignWidth, 500);

  return () => {
    window.removeEventListener('resize', updateDesignWidth);
    clearTimeout(timer);
  };
 }, [config.designWidth]);

 const selectedElement = useMemo(
  () => config.elements.find((el) => el.id === selectedElementId) || null,
  [config.elements, selectedElementId]
 );

 const addElement = useCallback((type: ElementType) => {
  const newElement: HeaderElement = {
   id: uuidv4(),
   type,
   x: 50,
   y: 50,
   width: type === "text" ? 200 : 100,
   height: type === "text" ? 50 : 100,
   content: type === "text" ? "New Text Element" : "https://via.placeholder.com/150",
   styles: {
    fontSize: "1rem",
    color: "#000000",
    fontWeight: "normal",
    textAlign: "left",
    fontFamily: "Inter"
   }
  };

  setConfig((prev) => ({
   ...prev,
   elements: [...prev.elements, newElement]
  }));
  setSelectedElementId(newElement.id);
 }, []);

 const updateElement = useCallback((updatedElement: HeaderElement) => {
  setConfig((prev) => ({
   ...prev,
   elements: prev.elements.map((el) => (el.id === updatedElement.id ? updatedElement : el))
  }));
 }, []);

 const deleteElement = useCallback((id: string) => {
  setConfig((prev) => ({
   ...prev,
   elements: prev.elements.filter((el) => el.id !== id)
  }));
  if (selectedElementId === id) setSelectedElementId(null);
 }, [selectedElementId]);

 const duplicateElement = useCallback((element: HeaderElement) => {
  const duplicated: HeaderElement = {
   ...element,
   id: uuidv4(),
   x: element.x + 20,
   y: element.y + 20
  };
  setConfig((prev) => ({
   ...prev,
   elements: [...prev.elements, duplicated]
  }));
  setSelectedElementId(duplicated.id);
 }, []);

 const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploadingBg(true);
  try {
   let finalFile: File | Blob = file;
   if (file.type.startsWith('image/')) {
    finalFile = await compressImage(file, 1920); // High res for background
   }

   const fileExt = file.name.split('.').pop();
   const folder = centerId ? `${centerId}/` : "";
   const filePath = `${folder}header-backgrounds/${Date.now()}.${fileExt}`;

   const { error: uploadError } = await supabase.storage
    .from('center-backgrounds')
    .upload(filePath, finalFile);

   if (uploadError) throw uploadError;

   const { data: { publicUrl } } = supabase.storage
    .from('center-backgrounds')
    .getPublicUrl(filePath);

   setConfig(prev => ({ ...prev, backgroundUrl: publicUrl }));
   toast.success("Background image updated");
  } catch (error: any) {
   toast.error(`Upload failed: ${error.message}`);
  } finally {
   setIsUploadingBg(false);
  }
 };

 const handleSave = () => {
  const currentDesignWidth = canvasRef.current?.offsetWidth || config.designWidth || 1200;
  const finalConfig = {
    ...config,
    designWidth: currentDesignWidth
  };
  onSave(finalConfig);
 };

 return (
  <div className="flex flex-col h-full space-y-6">
   {/* Toolbar */}
   <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-white/20 shadow-sm">
    <div className="flex items-center gap-2">
      <Button
      variant="outline"
      size="sm"
      className="rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest gap-2 bg-white hover:bg-primary hover:text-white transition-all border border-border"
      onClick={() => addElement("text")}
     >
      <Type className="h-4 w-4" /> Add Text
     </Button>
     <Button
      variant="outline"
      size="sm"
      className="rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest gap-2 bg-white hover:bg-primary hover:text-white transition-all border border-border"
      onClick={() => addElement("image")}
     >
      <ImageIcon className="h-4 w-4" /> Add Image
     </Button>
    </div>

    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-border/10">
       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Header Height</Label>
       <Input
        type="text"
        value={config.height}
        onChange={(e) => setConfig({ ...config, height: e.target.value })}
        className="w-20 h-8 text-xs font-mono rounded-lg border border-border bg-transparent"
       />
      </div>

      <Separator orientation="vertical" className="h-8 opacity-20" />

      <Button
      variant={isPreview ? "default" : "outline"}
      size="sm"
      className="rounded-xl h-10 px-4 font-bold text-[10px] uppercase tracking-widest gap-2 border border-border transition-all shadow-sm"
      onClick={() => {
        setIsPreview(!isPreview);
        setSelectedElementId(null);
      }}
     >
      {isPreview ? <><EyeOff className="h-4 w-4" /> Exit Preview</> : <><Eye className="h-4 w-4" /> Preview Mode</>}
     </Button>

     <Button
      size="sm"
      className="rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-[0.2em] bg-gradient-to-r from-primary to-violet-600 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
      onClick={handleSave}
      disabled={isSaving}
     >
      {isSaving ? <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> SAVING...</div> : <><Save className="h-4 w-4" /> Synchronize Profile</>}
     </Button>
    </div>
   </div>

   <div className="flex flex-col lg:flex-row gap-6 items-start h-full min-h-[600px]">
    {/* Editor Canvas */}
    <div className="flex-1 w-full flex flex-col gap-4">
      <div
        ref={canvasRef}
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all shadow-sm border border-border/20 group",
          !isPreview && "bg-white"
        )}
        style={{
          height: config.height,
          width: config.width,
          backgroundColor: config.backgroundColor
        }}
        onClick={() => setSelectedElementId(null)}
      >
        {/* Background Layer */}
        {config.backgroundUrl && (
          <div className="absolute inset-0 z-0">
            <img
              src={config.backgroundUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: config.overlayColor,
                opacity: (config.overlayOpacity ?? 0) / 100
              }}
            />
          </div>
        )}

        {/* Grid Overlay */}
        {!isPreview && <GridBackground gridSize={config.gridSize} height={config.height} />}

        {/* Elements Layer */}
        <div className="absolute inset-0 z-10">
          {config.elements.map((el) => (
            isPreview ? (
              <HeaderElementRenderer key={el.id} element={el} />
            ) : (
              <DraggableElement
                key={el.id}
                element={el}
                config={config}
                isSelected={selectedElementId === el.id}
                onSelect={() => setSelectedElementId(el.id)}
                onUpdate={updateElement}
                onDelete={() => deleteElement(el.id)}
                onDuplicate={() => duplicateElement(el)}
                isEditor={true}
              />
            )
          ))}
        </div>

        {!isPreview && (
          <div className="absolute bottom-4 left-4 z-50 px-3 py-1.5 bg-black/80 border border-white/10 rounded-xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-4">
           <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
             <Maximize className="h-3 w-3 text-white/40" />
             <span className="text-[10px] font-mono text-white font-bold">{config.height}</span>
           </div>
           <div className="flex items-center gap-1.5">
             <MousePointer2 className="h-3 w-3 text-white/40" />
             <span className="text-[10px] font-mono text-white/60">SNAP TO {config.gridSize}PX</span>
           </div>
          </div>
        )}
      </div>

      {/* Atmosphere Controls (Only in Editor) */}
      {!isPreview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white rounded-2xl border border-border/10 shadow-sm">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Canvas Background</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                className="w-10 h-10 p-1 rounded-xl cursor-pointer border border-border bg-white shadow-inner"
              />
              <Input
                value={config.backgroundColor}
                onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                className="h-10 rounded-xl font-mono text-[10px] border border-border bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Background Image</Label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1 rounded-xl font-bold text-[10px] uppercase gap-2 bg-white border border-border"
                  onClick={() => document.getElementById('bg-upload-input')?.click()}
                  disabled={isUploadingBg}
                >
                  {isUploadingBg ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {isUploadingBg ? 'Uploading...' : 'Replace BG'}
                </Button>
                {config.backgroundUrl && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-red-50 text-red-600 border border-border"
                    onClick={() => setConfig({ ...config, backgroundUrl: "" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                id="bg-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
              <Input
                value={config.backgroundUrl || ""}
                onChange={(e) => setConfig({ ...config, backgroundUrl: e.target.value })}
                placeholder="Or enter URL..."
                className="h-8 rounded-lg border border-border bg-white text-[9px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overlay Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.overlayColor}
                onChange={(e) => setConfig({ ...config, overlayColor: e.target.value })}
                className="w-10 h-10 p-1 rounded-xl cursor-pointer border border-border bg-white shadow-inner"
              />
              <Input
                value={config.overlayColor}
                onChange={(e) => setConfig({ ...config, overlayColor: e.target.value })}
                className="h-10 rounded-xl font-mono text-[10px] border border-border bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Overlay Opacity ({config.overlayOpacity}%)</Label>
            </div>
            <Slider
              value={[config.overlayOpacity || 0]}
              onValueChange={(v) => setConfig({ ...config, overlayOpacity: v[0] })}
              max={100}
              step={1}
              className="pt-2"
            />
          </div>
        </div>
      )}
    </div>

    {/* Property Inspector (Only in Editor) */}
    {!isPreview && (
      <div className="w-full lg:w-80 h-fit bg-white rounded-2xl border border-border/10 shadow-sm p-6">
       {selectedElement ? (
        <ElementControls
         element={selectedElement}
         onUpdate={updateElement}
         onDelete={() => deleteElement(selectedElement.id)}
         onDuplicate={() => duplicateElement(selectedElement)}
         centerId={centerId}
        />
       ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10">
           <Layout className="h-8 w-8 text-primary opacity-40" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 leading-relaxed">
           Select an element to configure its appearance protocols
          </p>
        </div>
       )}
      </div>
    )}
   </div>
  </div>
 );
};
