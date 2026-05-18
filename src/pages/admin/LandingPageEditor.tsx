import React, { useState, useEffect } from "react";
import { Shield, Save, Loader2, Plus, Trash2, Globe, Sparkles, MessageSquare, Phone, MapPin, Mail, Github, Twitter, Linkedin, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLoginSettings } from "@/hooks/use-login-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DynamicIcon } from "@/components/auth/LandingPageComponents";
import HeroSectionEditor from "./HeroSectionEditor";

const COMMON_ICONS = [
  "Shield", "LayoutDashboard", "Users", "Briefcase", "BookOpen",
  "ClipboardCheck", "GraduationCap", "Target", "Pencil", "AlertTriangle",
  "DollarSign", "UserCheck", "Package", "Bus", "MessageSquare",
  "Bell", "Calendar", "Settings", "Bug", "UserPlus",
  "Palette", "BarChart", "Database", "PieChart", "School",
  "FileText", "Sliders", "History", "Zap", "Star",
  "Heart", "Globe", "Cloud", "Lock", "Unlock", "CheckCircle2"
];

const LandingPageEditor = () => {
  const [activeTab, setActiveTab] = useState('center');
  const { data: settings, refetch, isLoading } = useLoginSettings(activeTab as any);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<any>({
    marketing_title: "",
    marketing_subtitle: "",
    title: "",
    subtitle: "",
    primary_color: "#4f46e5",
    button_text: "",
    features: [],
    developer_info: { name: "", website: "", copyright: "" },
    help_info: { text: "", link: "" },
    footer_links: [],
    section_toggles: { show_features: true, show_packages: true, show_stats: true, show_footer: true }
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        marketing_title: settings.marketing_title || "",
        marketing_subtitle: settings.marketing_subtitle || "",
        title: settings.title || "",
        subtitle: settings.subtitle || "",
        primary_color: settings.primary_color || "#4f46e5",
        button_text: settings.button_text || "",
        features: Array.isArray(settings.features) ? settings.features : [],
        developer_info: (settings.developer_info as any) || { name: "", website: "", copyright: "" },
        help_info: (settings.help_info as any) || { text: "", link: "" },
        footer_links: Array.isArray(settings.footer_links) ? settings.footer_links : [],
        section_toggles: (settings.section_toggles as any) || { show_features: true, show_packages: true, show_stats: true, show_footer: true }
      });
    } else {
        // Reset to defaults if no settings found for this page type
        setFormData({
            marketing_title: "",
            marketing_subtitle: "",
            title: "",
            subtitle: "",
            primary_color: "#4f46e5",
            button_text: "",
            features: [],
            developer_info: { name: "", website: "", copyright: "" },
            help_info: { text: "", link: "" },
            footer_links: [],
            section_toggles: { show_features: true, show_packages: true, show_stats: true, show_footer: true }
          });
    }
  }, [settings, activeTab]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('login_page_settings')
        .update({
          marketing_title: formData.marketing_title,
          marketing_subtitle: formData.marketing_subtitle,
          title: formData.title,
          subtitle: formData.subtitle,
          primary_color: formData.primary_color,
          button_text: formData.button_text,
          features: formData.features,
          developer_info: formData.developer_info,
          help_info: formData.help_info,
          footer_links: formData.footer_links,
          section_toggles: formData.section_toggles,
          updated_at: new Date().toISOString()
        })
        .eq('page_type', activeTab);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${activeTab === 'center' ? 'Landing page' : 'Contact Sales'} settings updated successfully.`
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { title: "New Feature", description: "Description", icon: "Shield" }]
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_: any, i: number) => i !== index)
    });
  };

  const updateFeature = (index: number, field: string, value: string) => {
    setFormData({
      ...formData,
      features: formData.features.map((f: any, i: number) =>
        i === index ? { ...f, [field]: value } : f
      )
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-4">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">Page Editor</h1>
          <div className="flex bg-muted/50 p-1 rounded-xl w-fit">
            <Button
              variant={activeTab === 'center' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('center')}
              className="rounded-lg px-6 font-bold"
            >
              Landing Page
            </Button>
            <Button
              variant={activeTab === 'contact-sales' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('contact-sales')}
              className="rounded-lg px-6 font-bold"
            >
              Contact Sales
            </Button>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">
          {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-14 mb-8">
          <TabsTrigger value="hero" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">Hero & Login</TabsTrigger>
          {activeTab === 'center' && (
            <TabsTrigger value="slider" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">Hero Slider</TabsTrigger>
          )}
          {activeTab === 'center' && (
            <>
              <TabsTrigger value="features" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">Marketing Features</TabsTrigger>
              <TabsTrigger value="footer" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">Footer & Links</TabsTrigger>
              <TabsTrigger value="sections" className="rounded-lg px-8 font-bold data-[state=active]:bg-background">Sections & Toggles</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="slider" className="space-y-6">
          <HeroSectionEditor />
        </TabsContent>

        <TabsContent value="hero" className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-8">
              <CardTitle className="text-2xl font-black tracking-tight">Main Section</CardTitle>
              <CardDescription className="font-medium text-muted-foreground">The main headline and tagline seen on load.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Main Headline</Label>
                  <Input
                    value={formData.marketing_title}
                    onChange={(e) => setFormData({...formData, marketing_title: e.target.value})}
                    placeholder="e.g. Empower Your Institution"
                    className="h-12 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Tagline / Subtitle</Label>
                  <Textarea
                    value={formData.marketing_subtitle}
                    onChange={(e) => setFormData({...formData, marketing_subtitle: e.target.value})}
                    placeholder="Briefly describe what your platform does."
                    className="min-h-[100px] rounded-xl font-medium resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-8">
              <CardTitle className="text-2xl font-black tracking-tight">{activeTab === 'center' ? 'Login Card' : 'Form Configuration'}</CardTitle>
              <CardDescription className="font-medium text-muted-foreground">Configure the appearance and behavior of the main interaction component.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{activeTab === 'center' ? 'Login Title' : 'Form Title'}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="h-12 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Theme Color (Primary)</Label>
                  <div className="flex gap-4">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="h-12 w-12 p-1 rounded-lg cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="h-12 rounded-xl font-medium flex-1 uppercase"
                    />
                  </div>
                </div>
                {activeTab === 'contact-sales' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Form Submit Button Text</Label>
                    <Input
                      value={formData.button_text}
                      onChange={(e) => setFormData({...formData, button_text: e.target.value})}
                      placeholder="Schedule My Demo"
                      className="h-12 rounded-xl font-medium"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
           <div className="flex justify-between items-center mb-4">
             <div>
               <h3 className="text-xl font-black tracking-tight">Marketing Feature Cards</h3>
               <p className="text-muted-foreground text-sm font-medium">Add or remove the small marketing cards shown in the Hero section.</p>
             </div>
             <Button onClick={addFeature} variant="outline" className="rounded-xl border-dashed border-2 hover:bg-muted h-12 px-6">
               <Plus className="h-4 w-4 mr-2" /> Add Feature
             </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {formData.features.map((feature: any, idx: number) => (
               <Card key={idx} className="border-none shadow-sm rounded-3xl group overflow-hidden relative">
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => removeFeature(idx)}
                   className="absolute top-4 right-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <Trash2 className="h-4 w-4" />
                 </Button>
                 <CardContent className="pt-8 space-y-4">
                    <div className="grid grid-cols-[80px_1fr] gap-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Icon</Label>
                          <Select
                            value={feature.icon}
                            onValueChange={(val) => updateFeature(idx, 'icon', val)}
                          >
                            <SelectTrigger className="h-14 rounded-xl border-none bg-muted/50 font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-80 bg-slate-900 border-white/10 text-white">
                              {COMMON_ICONS.map(iconName => (
                                <SelectItem key={iconName} value={iconName} className="focus:bg-primary/20 focus:text-white cursor-pointer py-2 px-3 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <DynamicIcon name={iconName} className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{iconName}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</Label>
                          <Input
                            value={feature.title}
                            onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                            className="h-14 rounded-xl font-bold bg-muted/50 border-none"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
                       <Textarea
                         value={feature.description}
                         onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                         className="rounded-xl font-medium bg-muted/50 border-none resize-none min-h-[80px]"
                       />
                    </div>
                 </CardContent>
               </Card>
             ))}
           </div>
        </TabsContent>

        <TabsContent value="sections" className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30 pb-8">
              <CardTitle className="text-2xl font-black tracking-tight">Section Visibility</CardTitle>
              <CardDescription className="font-medium text-muted-foreground">Toggle landing page sections on or off.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-4">
              {Object.keys(formData.section_toggles).map((key) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <Label className="text-sm font-bold capitalize">{key.replace('show_', '').replace('_', ' ')}</Label>
                  <Button
                    variant={formData.section_toggles[key] ? "default" : "outline"}
                    onClick={() => setFormData({
                      ...formData,
                      section_toggles: { ...formData.section_toggles, [key]: !formData.section_toggles[key] }
                    })}
                    className="rounded-full px-6 h-10 font-bold"
                  >
                    {formData.section_toggles[key] ? "Visible" : "Hidden"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
               <CardHeader className="bg-muted/30 pb-8">
                 <CardTitle className="text-2xl font-black tracking-tight">Developer Info</CardTitle>
               </CardHeader>
               <CardContent className="pt-8 space-y-6">
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Company Name</Label>
                     <Input
                        value={formData.developer_info.name}
                        onChange={(e) => setFormData({...formData, developer_info: {...formData.developer_info, name: e.target.value}})}
                        className="h-12 rounded-xl font-medium"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Website URL</Label>
                     <Input
                        value={formData.developer_info.website}
                        onChange={(e) => setFormData({...formData, developer_info: {...formData.developer_info, website: e.target.value}})}
                        className="h-12 rounded-xl font-medium"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Copyright Text</Label>
                     <Input
                        value={formData.developer_info.copyright}
                        onChange={(e) => setFormData({...formData, developer_info: {...formData.developer_info, copyright: e.target.value}})}
                        className="h-12 rounded-xl font-medium"
                     />
                   </div>
                 </div>
               </CardContent>
             </Card>

             <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
               <CardHeader className="bg-muted/30 pb-8">
                 <CardTitle className="text-2xl font-black tracking-tight">Help & Documentation</CardTitle>
               </CardHeader>
               <CardContent className="pt-8 space-y-6">
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Link Text</Label>
                     <Input
                        value={formData.help_info.text}
                        onChange={(e) => setFormData({...formData, help_info: {...formData.help_info, text: e.target.value}})}
                        className="h-12 rounded-xl font-medium"
                        placeholder="e.g. Need help?"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Link URL</Label>
                     <Input
                        value={formData.help_info.link}
                        onChange={(e) => setFormData({...formData, help_info: {...formData.help_info, link: e.target.value}})}
                        className="h-12 rounded-xl font-medium"
                        placeholder="e.g. https://docs.school.com"
                     />
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>

           <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight">Footer Link Columns</h3>
                <Button
                  onClick={() => setFormData({...formData, footer_links: [...formData.footer_links, { title: "New Column", links: [] }]})}
                  variant="outline"
                  className="rounded-xl h-10 px-6 border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Column
                </Button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {formData.footer_links.map((column: any, colIdx: number) => (
                 <Card key={colIdx} className="border-none shadow-sm rounded-3xl bg-muted/20 relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          footer_links: formData.footer_links.filter((_: any, i: number) => i !== colIdx)
                        });
                      }}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardHeader>
                      <Input
                        value={column.title}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            footer_links: formData.footer_links.map((col: any, i: number) =>
                              i === colIdx ? { ...col, title: e.target.value } : col
                            )
                          });
                        }}
                        className="font-black uppercase tracking-widest border-none bg-transparent focus-visible:ring-0 p-0 h-auto text-sm"
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {column.links.map((link: any, linkIdx: number) => (
                        <div key={linkIdx} className="grid grid-cols-2 gap-2">
                           <Input
                             value={link.label}
                             onChange={(e) => {
                               setFormData({
                                 ...formData,
                                 footer_links: formData.footer_links.map((col: any, i: number) =>
                                   i === colIdx ? {
                                     ...col,
                                     links: col.links.map((l: any, j: number) =>
                                       j === linkIdx ? { ...l, label: e.target.value } : l
                                     )
                                   } : col
                                 )
                               });
                             }}
                             placeholder="Label"
                             className="h-9 rounded-lg text-xs"
                           />
                           <div className="flex gap-1">
                              <Input
                                value={link.href}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    footer_links: formData.footer_links.map((col: any, i: number) =>
                                      i === colIdx ? {
                                        ...col,
                                        links: col.links.map((l: any, j: number) =>
                                          j === linkIdx ? { ...l, href: e.target.value } : l
                                        )
                                      } : col
                                    )
                                  });
                                }}
                                placeholder="Href"
                                className="h-9 rounded-lg text-xs flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    footer_links: formData.footer_links.map((col: any, i: number) =>
                                      i === colIdx ? {
                                        ...col,
                                        links: col.links.filter((_: any, j: number) => j !== linkIdx)
                                      } : col
                                    )
                                  });
                                }}
                                className="h-9 w-9 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                           </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            footer_links: formData.footer_links.map((col: any, i: number) =>
                              i === colIdx ? {
                                ...col,
                                links: [...col.links, { label: "New Link", href: "#" }]
                              } : col
                            )
                          });
                        }}
                        className="w-full h-9 rounded-lg text-xs font-bold border border-dashed hover:bg-white/10"
                      >
                        <Plus className="h-3 w-3 mr-2" /> Add Link
                      </Button>
                    </CardContent>
                 </Card>
               ))}
             </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandingPageEditor;
