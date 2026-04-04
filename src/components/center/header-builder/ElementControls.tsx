import React from "react";
import { HeaderElement, HeaderConfig } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Type, Image as ImageIcon, Copy, Settings2, Upload, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import { toast } from "sonner";

interface ElementControlsProps {
 element: HeaderElement;
 onUpdate: (updatedElement: HeaderElement) => void;
 onDelete: () => void;
 onDuplicate: () => void;
 centerId?: string;
}

export const ElementControls: React.FC<ElementControlsProps> = ({
 element,
 onUpdate,
 onDelete,
 onDuplicate,
 centerId
}) => {
 const [isUploading, setIsUploading] = React.useState(false);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsUploading(true);
  try {
   let finalFile: File | Blob = file;
   if (file.type.startsWith('image/')) {
    finalFile = await compressImage(file, 800); // Compress to reasonable size for header
   }

   const fileExt = file.name.split('.').pop();
   const folder = centerId ? `${centerId}/` : "";
   const filePath = `${folder}header-assets/${Date.now()}.${fileExt}`;

   const { error: uploadError } = await supabase.storage
    .from('center-backgrounds')
    .upload(filePath, finalFile);

   if (uploadError) throw uploadError;

   const { data: { publicUrl } } = supabase.storage
    .from('center-backgrounds')
    .getPublicUrl(filePath);

   onUpdate({ ...element, content: publicUrl });
   toast.success("Image uploaded successfully");
  } catch (error: any) {
   toast.error(`Upload failed: ${error.message}`);
  } finally {
   setIsUploading(false);
  }
 };

 return (
  <Card className="h-full border border-border shadow-none bg-transparent">
   <CardHeader className="px-0 py-4">
    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
     <Settings2 className="h-4 w-4 text-primary" />
     Element Configuration
    </CardTitle>
   </CardHeader>
   <CardContent className="px-0 space-y-6">
    {/* Content Section */}
    <div className="space-y-3">
     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
      {element.type === "text" ? "Text Content" : "Image Source"}
     </Label>
     {element.type === "text" ? (
      <Textarea
       className="w-full min-h-[80px] p-3 rounded-xl border bg-white text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
       value={element.content}
       onChange={(e) => onUpdate({ ...element, content: e.target.value })}
      />
     ) : (
      <div className="space-y-4">
       <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-2xl p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
        {isUploading ? (
         <div className="flex flex-col items-center gap-2 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Uploading...</p>
         </div>
        ) : (
         <>
          <div className="flex flex-col items-center gap-2 mb-3">
           <Upload className="h-8 w-8 text-muted-foreground" />
           <p className="text-[10px] text-muted-foreground font-bold uppercase">Click to Upload</p>
          </div>
          <Input
           type="file"
           accept="image/*"
           className="text-[10px] h-8"
           onChange={handleFileUpload}
          />
         </>
        )}
       </div>

       <div className="space-y-2">
        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Fallback URL</Label>
        <Input
         value={element.content}
         onChange={(e) => onUpdate({ ...element, content: e.target.value })}
         placeholder="https://..."
         className="rounded-xl h-9 text-xs"
        />
       </div>
       <p className="text-[10px] italic text-muted-foreground leading-tight">Tip: Use high-resolution PNGs with transparent backgrounds for best results.</p>
      </div>
     )}
    </div>

    <Separator className="opacity-50" />

    {/* Style Section */}
    <div className="space-y-4">
     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Typography & Appearance</Label>

     {element.type === "text" && (
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label className="text-xs">Font Size (rem/px)</Label>
        <Input
         value={element.styles.fontSize}
         onChange={(e) => onUpdate({
          ...element,
          styles: { ...element.styles, fontSize: e.target.value }
         })}
         className="rounded-xl h-9"
        />
       </div>
       <div className="space-y-2">
        <Label className="text-xs">Font Weight</Label>
        <Select
         value={element.styles.fontWeight}
         onValueChange={(v) => onUpdate({
          ...element,
          styles: { ...element.styles, fontWeight: v }
         })}
        >
         <SelectTrigger className="rounded-xl h-9">
          <SelectValue />
         </SelectTrigger>
         <SelectContent>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="500">Medium</SelectItem>
          <SelectItem value="bold">Bold</SelectItem>
          <SelectItem value="900">Black</SelectItem>
         </SelectContent>
        </Select>
       </div>
      </div>
     )}

     {element.type === "text" && (
      <div className="space-y-2">
       <Label className="text-xs">Font Family</Label>
       <Select
        value={element.styles.fontFamily}
        onValueChange={(v) => onUpdate({
         ...element,
         styles: { ...element.styles, fontFamily: v }
        })}
       >
        <SelectTrigger className="rounded-xl h-9">
         <SelectValue />
        </SelectTrigger>
        <SelectContent>
         <SelectItem value="Inter">Modern Sans (Inter)</SelectItem>
         <SelectItem value="'Space Grotesk'">Space Grotesk</SelectItem>
         <SelectItem value="Algerian, 'Cinzel', serif">Algerian / Cinzel</SelectItem>
         <SelectItem value="'Almendra', serif">Almendra</SelectItem>
         <SelectItem value="serif">Classic Serif</SelectItem>
         <SelectItem value="cursive">Script / Cursive</SelectItem>
        </SelectContent>
       </Select>
      </div>
     )}

     <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label className="text-xs">Element Color</Label>
        <div className="flex gap-2">
         <input
          type="color"
          value={element.styles.color}
          onChange={(e) => onUpdate({
           ...element,
           styles: { ...element.styles, color: e.target.value }
          })}
          className="w-10 h-10 p-1 rounded-lg cursor-pointer border border-border/20"
         />
         <Input
          value={element.styles.color}
          onChange={(e) => onUpdate({
           ...element,
           styles: { ...element.styles, color: e.target.value }
          })}
          className="flex-1 h-10 rounded-xl font-mono text-[10px]"
         />
        </div>
       </div>

       {element.type === "text" && (
        <div className="space-y-2">
         <Label className="text-xs">Text Align</Label>
         <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-border/10">
          {["left", "center", "right"].map((align) => (
           <Button
            key={align}
            variant={element.styles.textAlign === align ? "default" : "ghost"}
            size="icon"
            className="h-8 flex-1 rounded-lg capitalize text-[10px] font-bold"
            onClick={() => onUpdate({
             ...element,
             styles: { ...element.styles, textAlign: align as any }
            })}
           >
            {align[0]}
           </Button>
          ))}
         </div>
        </div>
       )}
     </div>
    </div>

    <Separator className="opacity-50" />

    {/* Actions */}
    <div className="flex gap-2 pt-2">
     <Button variant="outline" className="flex-1 rounded-xl h-11 font-bold text-xs gap-2" onClick={onDuplicate}>
      <Copy className="h-3.5 w-3.5" /> DUPLICATE
     </Button>
     <Button variant="destructive" className="flex-1 rounded-xl h-11 font-bold text-xs gap-2" onClick={onDelete}>
      <Trash2 className="h-3.5 w-3.5" /> DELETE
     </Button>
    </div>
   </CardContent>
  </Card>
 );
};
