import React, { useEffect, useState } from "react";
import { UserRole } from "@/types/roles";
import {
  Search,
  Users,
  User,
  Settings,
  BookOpen,
  DollarSign,
  Calendar,
  ArrowRight,
  Command as CommandIcon,
  UserPlus,
  BarChart3,
  Upload,
  CheckCircle2,
  Zap,
  X
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CommandCenter() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStep, setMigrationStep] = useState<'idle' | 'dragging' | 'uploading' | 'processing' | 'complete'>('idle');
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: students = [] } = useQuery({
    queryKey: ["command-center-students", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase
        .from("students")
        .select("id, name, grade")
        .ilike("name", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: !!user && search.length >= 2,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["command-center-teachers", search],
    queryFn: async () => {
      if (search.length < 2 || user?.role !== UserRole.CENTER) return [];
      const { data } = await supabase
        .from("teachers")
        .select("id, name, subject")
        .ilike("name", `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: !!user && search.length >= 2 && user.role === UserRole.CENTER,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const openEvent = () => setOpen(true);

    document.addEventListener("keydown", down);
    window.addEventListener('open-command-center', openEvent);

    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener('open-command-center', openEvent);
    };
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const handleFileUpload = () => {
    setMigrationStep('uploading');
    setTimeout(() => {
      setMigrationStep('processing');
      setTimeout(() => {
        setMigrationStep('complete');
        setTimeout(() => {
          setMigrationStep('idle');
          setIsMigrating(false);
        }, 2000);
      }, 2000);
    }, 1500);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="relative">
        <AnimatePresence>
          {isMigrating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-50 bg-slate-950 p-8 flex flex-col items-center justify-center text-center rounded-lg"
            >
               <button
                 onClick={() => { setIsMigrating(false); setMigrationStep('idle'); }}
                 className="absolute top-4 right-4 text-slate-500 hover:text-white"
               >
                 <X className="h-5 w-5" />
               </button>

               {migrationStep === 'idle' || migrationStep === 'dragging' ? (
                 <div
                   className={cn(
                     "w-full max-w-md aspect-video rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all",
                     migrationStep === 'dragging' ? "border-primary bg-primary/5 scale-105" : "border-white/10 hover:border-primary/30"
                   )}
                   onDragOver={(e) => { e.preventDefault(); setMigrationStep('dragging'); }}
                   onDragLeave={() => setMigrationStep('idle')}
                   onDrop={(e) => { e.preventDefault(); handleFileUpload(); }}
                   onClick={handleFileUpload}
                 >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                       <Upload className="h-8 w-8" />
                    </div>
                    <h4 className="text-xl font-black uppercase text-white mb-2">One-Click Migration</h4>
                    <p className="text-sm text-slate-400 font-medium mb-6">Drag & Drop your CSV/Excel school records to begin.</p>
                    <Button className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white">Select Files</Button>
                 </div>
               ) : (
                 <div className="flex flex-col items-center">
                    <div className="relative mb-8">
                       <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                          {migrationStep === 'complete' ? (
                            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                          ) : (
                            <Zap className="h-12 w-12 text-primary animate-pulse" />
                          )}
                       </div>
                       {migrationStep !== 'complete' && (
                         <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                            <circle
                              cx="48" cy="48" r="44"
                              fill="transparent"
                              stroke="#6366f1"
                              strokeWidth="4"
                              className="transition-all duration-500"
                              strokeDasharray="276"
                              strokeDashoffset={migrationStep === 'uploading' ? "138" : "0"}
                            />
                         </svg>
                       )}
                    </div>
                    <h4 className="text-2xl font-black uppercase text-white mb-2">
                       {migrationStep === 'uploading' ? 'Uploading Records...' :
                        migrationStep === 'processing' ? 'Mapping Data Architecture...' :
                        'Migration Successful!'}
                    </h4>
                    <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">
                       {migrationStep === 'complete' ? 'System updated with 1,200+ records' : 'Institutional Data Sync in progress'}
                    </p>
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>

      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          {user?.role === UserRole.CENTER && (
             <CommandItem onSelect={() => setIsMigrating(true)}>
               <Upload className="mr-2 h-4 w-4" />
               <span>One-Click Migration (Import Data)</span>
             </CommandItem>
          )}
          <CommandItem onSelect={() => runCommand(() => navigate(user?.role === UserRole.TEACHER ? "/teacher-dashboard" : user?.role === UserRole.PARENT ? "/parent-dashboard" : "/"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Go to Dashboard</span>
          </CommandItem>
          {user?.role === UserRole.CENTER && (
            <CommandItem onSelect={() => runCommand(() => navigate("/register"))}>
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Register New Student</span>
            </CommandItem>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Modules">
          {user?.role === UserRole.CENTER && (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate("/teachers"))}>
                <Users className="mr-2 h-4 w-4" />
                <span>Staff Management</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/finance"))}>
                <DollarSign className="mr-2 h-4 w-4" />
                <span>Finance Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/academics"))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Academic Overview</span>
              </CommandItem>
            </>
          )}
          {user?.role === UserRole.TEACHER && (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate("/teacher/take-attendance"))}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Take Attendance</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/teacher/lesson-plans"))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Lesson Plans</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/teacher/homework-management"))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Homework Management</span>
              </CommandItem>
            </>
          )}
          {user?.role === UserRole.PARENT && (
            <>
              <CommandItem onSelect={() => runCommand(() => navigate("/parent-homework"))}>
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Homework Tracking</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/parent-student-report"))}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Academic Report</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/parent-finance"))}>
                <DollarSign className="mr-2 h-4 w-4" />
                <span>Fees & Payments</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>
        {(students.length > 0 || teachers.length > 0) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="People">
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  onSelect={() => runCommand(() => navigate(user?.role === UserRole.PARENT ? "/parent-student-report" : `/student-report?student_id=${student.id}`))}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{student.name} (Grade {student.grade})</span>
                </CommandItem>
              ))}
              {teachers.map((teacher) => (
                <CommandItem
                  key={teacher.id}
                  onSelect={() => runCommand(() => navigate("/teachers"))}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{teacher.name} ({teacher.subject})</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => navigate(user?.role === UserRole.TEACHER ? "/teacher/settings" : user?.role === UserRole.PARENT ? "/parent-settings" : "/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </div>
    </CommandDialog>
  );
}
