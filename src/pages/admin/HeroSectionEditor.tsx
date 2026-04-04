import React, { useState } from 'react';
import { useHeroSlides, HeroSlide } from '@/hooks/use-hero-slides';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
 Loader2, Plus, Trash2, GripVertical, Image as ImageIcon, Video,
 Save, Eye, EyeOff, Upload, ArrowRight
} from "lucide-react";
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragEndEvent
} from '@dnd-kit/core';
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 verticalListSortingStrategy,
 useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Item Component ---
interface SortableSlideProps {
 slide: HeroSlide;
 onUpdate: (id: string, updates: Partial<HeroSlide>) => void;
 onDelete: (id: string) => void;
 onUpload: (id: string, file: File, isMobile?: boolean) => void;
 uploadingId: string | null;
}

const SortableSlide: React.FC<SortableSlideProps> = ({
 slide, onUpdate, onDelete, onUpload, uploadingId
}) => {
 const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging
 } = useSortable({ id: slide.id });

 const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  zIndex: isDragging ? 50 : 'auto',
  opacity: isDragging ? 0.5 : 1,
 };

 return (
  <div ref={setNodeRef} style={style} className="mb-6">
   <Card className="border border-border shadow-sm rounded-2xl overflow-hidden group">
    <CardHeader className="bg-muted/30 py-4 px-6 flex flex-row items-center justify-between space-y-0">
     <div className="flex items-center gap-4">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-md transition-colors">
       <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-2">
        {slide.media_type === 'video' ? <Video className="h-4 w-4 text-primary" /> : <ImageIcon className="h-4 w-4 text-primary" />}
        <span className="font-black text-sm uppercase tracking-tight">{slide.title || 'Untitled Slide'}</span>
      </div>
     </div>
     <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 mr-4">
       <Label htmlFor={`active-${slide.id}`} className="text-xs font-bold text-muted-foreground uppercase">{slide.is_active ? 'Active' : 'Hidden'}</Label>
       <Switch
        id={`active-${slide.id}`}
        checked={slide.is_active}
        onCheckedChange={(checked) => onUpdate(slide.id, { is_active: checked })}
       />
      </div>
      <Button
       variant="ghost"
       size="icon"
       onClick={() => onDelete(slide.id)}
       className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-opacity"
      >
       <Trash2 className="h-4 w-4" />
      </Button>
     </div>
    </CardHeader>
    <CardContent className="pt-6 space-y-6">
     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Media Upload Area */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Desktop Media</Label>
          <div className="relative aspect-video rounded-2xl bg-muted overflow-hidden border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center group/media">
           {slide.media_url ? (
            <>
             {slide.media_type === 'video' ? (
              <video src={slide.media_url} className="w-full h-full object-cover" />
             ) : (
              <img src={slide.media_url} className="w-full h-full object-cover" />
             )}
             <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
              <Label htmlFor={`upload-${slide.id}`} className="cursor-pointer">
               <div className="bg-primary text-white p-2 rounded-xl font-bold">
                <Upload className="h-4 w-4" />
               </div>
              </Label>
             </div>
            </>
           ) : (
            <Label htmlFor={`upload-${slide.id}`} className="cursor-pointer flex flex-col items-center gap-1">
             <Upload className="h-4 w-4 text-primary" />
             <span className="text-[10px] font-bold text-muted-foreground">Desktop</span>
            </Label>
           )}
           {uploadingId === `desktop-${slide.id}` && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
             <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
           )}
           <input
            id={`upload-${slide.id}`}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={(e) => e.target.files?.[0] && onUpload(slide.id, e.target.files[0], false)}
           />
          </div>
         </div>

         <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mobile Image (Opt.)</Label>
          <div className="relative aspect-video rounded-2xl bg-muted overflow-hidden border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center group/mobile-media">
           {slide.mobile_media_url ? (
            <>
             <img src={slide.mobile_media_url} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/mobile-media:opacity-100 transition-opacity flex items-center justify-center">
              <Label htmlFor={`upload-mobile-${slide.id}`} className="cursor-pointer">
               <div className="bg-primary text-white p-2 rounded-xl font-bold">
                <Upload className="h-4 w-4" />
               </div>
              </Label>
             </div>
            </>
           ) : (
            <Label htmlFor={`upload-mobile-${slide.id}`} className="cursor-pointer flex flex-col items-center gap-1">
             <ImageIcon className="h-4 w-4 text-primary" />
             <span className="text-[10px] font-bold text-muted-foreground">Mobile</span>
            </Label>
           )}
           {uploadingId === `mobile-${slide.id}` && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
             <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
           )}
           <input
            id={`upload-mobile-${slide.id}`}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && onUpload(slide.id, e.target.files[0], true)}
           />
          </div>
         </div>
        </div>
        <div className="flex gap-4">
         <div className="flex-1 space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Media Type</Label>
          <Select
           value={slide.media_type}
           onValueChange={(val: 'image' | 'video') => onUpdate(slide.id, { media_type: val })}
          >
           <SelectTrigger className="h-12 rounded-xl font-bold bg-muted/50 border border-border">
            <SelectValue />
           </SelectTrigger>
           <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="image" className="focus:bg-primary/20">Image</SelectItem>
            <SelectItem value="video" className="focus:bg-primary/20">Video</SelectItem>
           </SelectContent>
          </Select>
         </div>
         <div className="flex-1 space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Text Align</Label>
          <Select
           value={slide.text_align}
           onValueChange={(val: 'left' | 'center' | 'right') => onUpdate(slide.id, { text_align: val })}
          >
           <SelectTrigger className="h-12 rounded-xl font-bold bg-muted/50 border border-border">
            <SelectValue />
           </SelectTrigger>
           <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="left" className="focus:bg-primary/20">Left</SelectItem>
            <SelectItem value="center" className="focus:bg-primary/20">Center</SelectItem>
            <SelectItem value="right" className="focus:bg-primary/20">Right</SelectItem>
           </SelectContent>
          </Select>
         </div>
        </div>
      </div>

      {/* Content Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Headline</Label>
         <Input
          value={slide.title || ''}
          onChange={(e) => onUpdate(slide.id, { title: e.target.value })}
          placeholder="e.g. Empower Your Institution"
          className="h-12 rounded-xl font-bold bg-muted/50 border border-border"
         />
        </div>
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tagline</Label>
         <Textarea
          value={slide.subtitle || ''}
          onChange={(e) => onUpdate(slide.id, { subtitle: e.target.value })}
          placeholder="A comprehensive ecosystem..."
          className="rounded-xl font-medium bg-muted/50 border border-border resize-none min-h-[80px]"
         />
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CTA Text</Label>
          <Input
           value={slide.cta_text || ''}
           onChange={(e) => onUpdate(slide.id, { cta_text: e.target.value })}
           placeholder="Get Started"
           className="h-12 rounded-xl font-bold bg-muted/50 border border-border"
          />
         </div>
         <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CTA Link</Label>
          <Input
           value={slide.cta_link || ''}
           onChange={(e) => onUpdate(slide.id, { cta_link: e.target.value })}
           placeholder="/getting-started"
           className="h-12 rounded-xl font-bold bg-muted/50 border border-border"
          />
         </div>
        </div>
        <div className="space-y-4 pt-2">
         <div className="flex justify-between items-center">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Overlay Opacity</Label>
          <span className="text-xs font-black text-primary">{Math.round((slide.overlay_opacity || 0.5) * 100)}%</span>
         </div>
         <Slider
          value={[slide.overlay_opacity || 0.5]}
          min={0} max={1} step={0.05}
          onValueChange={(val) => onUpdate(slide.id, { overlay_opacity: val[0] })}
          className="py-2"
         />
        </div>
      </div>
     </div>
    </CardContent>
   </Card>
  </div>
 );
};

// --- Main Editor Component ---
const HeroSectionEditor = () => {
 const { data: slides, isLoading, refetch } = useHeroSlides(true);
 const [localSlides, setLocalSlides] = useState<HeroSlide[]>([]);
 const [loading, setLoading] = useState(false);
 const [uploadingId, setUploadingId] = useState<string | null>(null);
 const { toast } = useToast();

 React.useEffect(() => {
  if (slides) setLocalSlides(slides);
 }, [slides]);

 const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
   coordinateGetter: sortableKeyboardCoordinates,
  })
 );

 const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
   setLocalSlides((items) => {
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    return newItems.map((item, index) => ({ ...item, order_index: index }));
   });
  }
 };

 const handleUpdate = (id: string, updates: Partial<HeroSlide>) => {
  setLocalSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
 };

 const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this slide?')) return;
  try {
   const { error } = await supabase.from('hero_slides').delete().eq('id', id);
   if (error) throw error;
   setLocalSlides(prev => prev.filter(s => s.id !== id));
   toast({ title: "Success", description: "Slide deleted successfully." });
  } catch (err: any) {
   toast({ title: "Error", description: err.message, variant: "destructive" });
  }
 };

 const handleAdd = async () => {
  const newSlide = {
   title: "New Slide",
   subtitle: "Description of the slide",
   media_url: "",
   media_type: "image",
   cta_text: "Learn More",
   cta_link: "#",
   order_index: localSlides.length,
   is_active: true,
   overlay_opacity: 0.5,
   text_align: "center"
  };

  try {
   const { data, error } = await supabase.from('hero_slides').insert(newSlide).select().single();
   if (error) throw error;
   setLocalSlides([...localSlides, data]);
   toast({ title: "Success", description: "New slide added." });
  } catch (err: any) {
   toast({ title: "Error", description: err.message, variant: "destructive" });
  }
 };

 const handleUpload = async (id: string, file: File, isMobile = false) => {
  setUploadingId(isMobile ? `mobile-${id}` : `desktop-${id}`);
  try {
   const extension = file.name.split('.').pop();
   const fileName = `${id}-${isMobile ? 'mobile' : 'desktop'}-${Date.now()}.${extension}`;
   const { error: uploadError } = await supabase.storage
    .from('hero-slides')
    .upload(fileName, file);

   if (uploadError) throw uploadError;

   const { data: { publicUrl } } = supabase.storage
    .from('hero-slides')
    .getPublicUrl(fileName);

   if (isMobile) {
    handleUpdate(id, { mobile_media_url: publicUrl });
   } else {
    handleUpdate(id, { media_url: publicUrl, media_type: file.type.startsWith('video') ? 'video' : 'image' });
   }
   toast({ title: "Success", description: `${isMobile ? 'Mobile' : 'Desktop'} media uploaded.` });
  } catch (err: any) {
   toast({ title: "Error", description: err.message, variant: "destructive" });
  } finally {
   setUploadingId(null);
  }
 };

 const handleSave = async () => {
  setLoading(true);
  try {
   const { error } = await supabase.from('hero_slides').upsert(localSlides);
   if (error) throw error;
   toast({ title: "Success", description: "All changes saved successfully." });
   refetch();
  } catch (err: any) {
   toast({ title: "Error", description: err.message, variant: "destructive" });
  } finally {
   setLoading(false);
  }
 };

 if (isLoading) {
  return (
   <div className="flex items-center justify-center h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
   </div>
  );
 }

 return (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
   <div className="flex items-center justify-between">
    <div className="space-y-1">
     <h2 className="text-3xl font-black tracking-tight">Hero Slider Management</h2>
     <p className="text-muted-foreground font-medium">Create a visually stunning introduction for your institution.</p>
    </div>
    <div className="flex gap-4">
     <Button onClick={handleAdd} variant="outline" className="h-12 px-6 rounded-xl font-bold border-dashed border-2 hover:bg-muted">
      <Plus className="h-4 w-4 mr-2" /> Add New Slide
     </Button>
     <Button onClick={handleSave} disabled={loading} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">
      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
      Save All Changes
     </Button>
    </div>
   </div>

   <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handleDragEnd}
   >
    <SortableContext
     items={localSlides.map(s => s.id)}
     strategy={verticalListSortingStrategy}
    >
     {localSlides.length > 0 ? (
      localSlides.map((slide) => (
       <SortableSlide
        key={slide.id}
        slide={slide}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUpload={handleUpload}
        uploadingId={uploadingId}
       />
      ))
     ) : (
      <Card className="border-dashed border-2 bg-muted/20 rounded-2xl p-20 flex flex-col items-center justify-center text-center">
        <div className="p-6 rounded-full bg-primary/10 text-primary mb-6">
         <ImageIcon className="h-12 w-12" />
        </div>
        <h3 className="text-2xl font-black mb-2">No slides created yet</h3>
        <p className="text-muted-foreground font-medium max-w-sm mb-8">
         Add your first slide to start building your dynamic hero section.
        </p>
        <Button onClick={handleAdd} className="h-12 px-8 rounded-xl font-bold">
         Get Started
        </Button>
      </Card>
     )}
    </SortableContext>
   </DndContext>
  </div>
 );
};

export default HeroSectionEditor;
