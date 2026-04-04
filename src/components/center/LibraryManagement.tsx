import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Book, Plus, Trash2, Search, BookOpen, RotateCcw, History, Printer } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LibraryManagement({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
 const queryClient = useQueryClient();
 const [bookSearch, setBookSearch] = useState("");
 const [showAddBook, setShowAddBook] = useState(false);
 const [showIssueForm, setShowIssueForm] = useState(false);
 const [bookForm, setBookForm] = useState({ title: "", author: "", isbn: "", category: "", copies: "1" });
 const [issueForm, setIssueForm] = useState({ bookId: "", studentId: "", dueDate: "" });

 const { data: students } = useQuery({
  queryKey: ["active-students-library-dropdown", centerId],
  queryFn: async () => {
   const { data, error } = await supabase.from("students").select("id, name, grade").eq("center_id", centerId).eq("is_active", true).order('name');
   if (error) throw error;
   return data;
  },
 });

 const { data: books, isLoading: booksLoading } = useQuery({
  queryKey: ["library-books", centerId],
  queryFn: async () => {
   const { data, error } = await supabase.from("books").select("*").eq("center_id", centerId);
   if (error) throw error;
   return data;
  },
 });

 const { data: loans, isLoading: loansLoading } = useQuery({
  queryKey: ["book-loans", centerId],
  queryFn: async () => {
   // Joining with books, users and students
   const { data, error } = await supabase
    .from("book_loans")
    .select(`
     *,
     books:books!book_id(title),
     users:users!user_id(username),
     students:students!student_id(name)
    `)
    .eq("center_id", centerId)
    .order("issue_date", { ascending: false });
   if (error) throw error;
   return data;
  },
 });

 const issueBookMutation = useMutation({
  mutationFn: async () => {
   if (!canEdit) throw new Error("Access Denied: You do not have permission to issue books.");

   // Single atomic RPC call to handle book copy decrement and loan record
   const { error } = await supabase.rpc('issue_book_securely', {
    p_center_id: centerId,
    p_book_id: issueForm.bookId,
    p_student_id: issueForm.studentId,
    p_due_date: issueForm.dueDate
   });

   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["book-loans"] });
   queryClient.invalidateQueries({ queryKey: ["library-books"] });
   setIssueForm({ bookId: "", studentId: "", dueDate: "" });
   setShowIssueForm(false);
   toast.success("Book issued successfully");
  },
  onError: (error: any) => toast.error(error.message)
 });

 const addBookMutation = useMutation({
  mutationFn: async () => {
   if (!canEdit) throw new Error("Access Denied: You do not have permission to add books to the catalog.");
   const { error } = await supabase.from("books").insert({
    center_id: centerId,
    title: bookForm.title,
    author: bookForm.author,
    isbn: bookForm.isbn,
    category: bookForm.category,
    total_copies: parseInt(bookForm.copies),
    available_copies: parseInt(bookForm.copies),
   });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["library-books"] });
   setBookForm({ title: "", author: "", isbn: "", category: "", copies: "1" });
   setShowAddBook(false);
   toast.success("Book added to catalog");
  }
 });

 const returnBookMutation = useMutation({
  mutationFn: async (loanId: string) => {
   if (!canEdit) throw new Error("Access Denied: You do not have permission to process book returns.");
   const { data: loan } = await supabase.from("book_loans").select("book_id").eq("id", loanId).single();
   const { error } = await supabase.from("book_loans").update({
    return_date: new Date().toISOString().split('T')[0],
    status: 'Returned'
   }).eq("id", loanId);
   if (error) throw error;

   // Increment available copies
   if (loan) {
    await supabase.rpc('increment_available_copies', { row_id: loan.book_id });
   }
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["book-loans"] });
   queryClient.invalidateQueries({ queryKey: ["library-books"] });
   toast.success("Book returned successfully");
  }
 });

 const [selectedBook, setSelectedBook] = useState<any>(null);

 const handlePrintHistory = () => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const historyHtml = `
   <html>
    <head>
     <title>Library Issue/Return History</title>
     <style>
      body { font-family: sans-serif; padding: 20px; color: #333; }
      h1 { color: #4f46e5; text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
      th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; }
      .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
      .issued { background-color: #dbeafe; color: #1e40af; }
      .returned { background-color: #f1f5f9; color: #475569; }
     </style>
    </head>
    <body>
     <h1>Library Issue/Return History</h1>
     <p>Generated on: ${new Date().toLocaleString()}</p>
     <table>
      <thead>
       <tr>
        <th>Book</th>
        <th>Issued To</th>
        <th>Issue Date</th>
        <th>Return Date</th>
        <th>Status</th>
       </tr>
      </thead>
      <tbody>
       ${loans?.map((l: any) => `
        <tr>
         <td><b>${l.books?.title}</b></td>
         <td>${l.students?.name || l.users?.username || 'N/A'}</td>
         <td>${l.issue_date}</td>
         <td>${l.return_date || '-'}</td>
         <td><span class="badge ${l.status.toLowerCase()}">${l.status}</span></td>
        </tr>
       `).join('')}
      </tbody>
     </table>
    </body>
   </html>
  `;

  printWindow.document.write(historyHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
   printWindow.print();
   printWindow.close();
  }, 500);
 };

 return (
  <div className="space-y-6">
   <Tabs defaultValue="catalog">
    <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-slate-100 p-1 rounded-xl h-12">
     <TabsTrigger value="catalog" className="rounded-lg px-6 font-bold text-xs uppercase tracking-widest">Book Catalog</TabsTrigger>
     <TabsTrigger value="loans" className="rounded-lg px-6 font-bold text-xs uppercase tracking-widest">Issue / Return</TabsTrigger>
    </TabsList>

    <TabsContent value="catalog" className="pt-4">
     <div className="flex flex-col lg:flex-row gap-8">
      <div className={cn("flex-1 space-y-4", selectedBook ? "lg:w-1/2" : "w-full")}>
       <div className="flex justify-between gap-4">
        <div className="relative flex-1">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
         <Input
          placeholder="Search books..."
          className="pl-10 rounded-xl"
          value={bookSearch}
          onChange={(e) => setBookSearch(e.target.value)}
         />
        </div>
        {canEdit && (
         <Button onClick={() => setShowAddBook(!showAddBook)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
          {showAddBook ? "Cancel" : "Add Book"}
         </Button>
        )}
       </div>

       {showAddBook && (
        <Card className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
         <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Book Title</Label>
            <Input value={bookForm.title} onChange={(e) => setBookForm({...bookForm, title: e.target.value})} className="h-10 rounded-lg" />
           </div>
           <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Author</Label>
            <Input value={bookForm.author} onChange={(e) => setBookForm({...bookForm, author: e.target.value})} className="h-10 rounded-lg" />
           </div>
           <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">ISBN</Label>
            <Input value={bookForm.isbn} onChange={(e) => setBookForm({...bookForm, isbn: e.target.value})} className="h-10 rounded-lg" />
           </div>
           <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Category</Label>
            <Input value={bookForm.category} onChange={(e) => setBookForm({...bookForm, category: e.target.value})} className="h-10 rounded-lg" />
           </div>
           <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Copies</Label>
            <Input type="number" value={bookForm.copies} onChange={(e) => setBookForm({...bookForm, copies: e.target.value})} className="h-10 rounded-lg" />
           </div>
           <div className="flex items-end">
            <Button onClick={() => addBookMutation.mutate()} className="w-full h-10 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Save Book</Button>
           </div>
          </div>
         </CardContent>
        </Card>
       )}

       <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
         <Table>
          <TableHeader className="bg-primary/5">
           <TableRow>
            <TableHead className="px-6">Title</TableHead>
            {!selectedBook && <TableHead>Author</TableHead>}
            <TableHead>Availability</TableHead>
            <TableHead className="text-right px-6">Actions</TableHead>
           </TableRow>
          </TableHeader>
          <TableBody>
           {books?.map((b: any) => (
            <TableRow
             key={b.id}
             className={cn(
              "group/row cursor-pointer transition-all",
              selectedBook?.id === b.id ? "bg-primary/5" : "hover:bg-primary/5"
             )}
             onClick={() => setSelectedBook(b)}
            >
             <TableCell className="px-6 py-4 font-black text-slate-700">{b.title}</TableCell>
             {!selectedBook && <TableCell className="text-sm">{b.author}</TableCell>}
             <TableCell>
              <Badge variant={b.available_copies > 0 ? "pulse" : "destructive"}>
               {b.available_copies} / {b.total_copies}
              </Badge>
             </TableCell>
             <TableCell className="text-right px-6">
              <Button variant="ghost" size="icon" className="opacity-0 group-hover/row:opacity-100 transition-all"><BookOpen className="h-4 w-4" /></Button>
             </TableCell>
            </TableRow>
           ))}
          </TableBody>
         </Table>
        </div>
       </div>
      </div>

      {selectedBook && (
       <div className="lg:w-1/2 animate-in slide-in-from-right-8 duration-500">
        <Card className="rounded-2xl border border-border shadow-sm bg-white overflow-hidden sticky top-8">
         <CardHeader className="bg-primary/5 border-b border-border/10 p-8 flex flex-row justify-between items-start">
          <div>
           <Badge className="mb-4 bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-lg">Catalog Index</Badge>
           <CardTitle className="text-3xl font-black tracking-tight text-slate-800">{selectedBook.title}</CardTitle>
           <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-1">By {selectedBook.author}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSelectedBook(null)} className="rounded-full hover:bg-rose-50 text-rose-500">
           <Plus className="h-5 w-5 rotate-45" />
          </Button>
         </CardHeader>
         <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
           <div className="space-y-1">
            <p className="label-caps">ISBN Reference</p>
            <p className="text-lg font-black text-slate-700">{selectedBook.isbn || 'N/A'}</p>
           </div>
           <div className="space-y-1">
            <p className="label-caps">Category</p>
            <p className="text-lg font-black text-slate-700">{selectedBook.category || 'General'}</p>
           </div>
           <div className="space-y-1">
            <p className="label-caps">Total Inventory</p>
            <p className="text-lg font-black text-slate-700">{selectedBook.total_copies} Units</p>
           </div>
           <div className="space-y-1">
            <p className="label-caps">Currently Available</p>
            <p className="text-lg font-black text-emerald-600">{selectedBook.available_copies} Units</p>
           </div>
          </div>

          <div className="pt-8 border-t">
           <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
             Modify Catalog Entry
           </Button>
          </div>
         </CardContent>
        </Card>
       </div>
      )}
     </div>
    </TabsContent>

    <TabsContent value="loans" className="space-y-4 pt-4">
     <div className="flex justify-between items-center">
      <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
       <History className="h-5 w-5 text-primary" /> Circulation Log
      </h3>
      <div className="flex gap-2">
       <Button variant="outline" size="sm" onClick={handlePrintHistory} className="rounded-xl font-bold gap-2">
        <Printer className="h-4 w-4" /> PRINT LOG
       </Button>
       {canEdit && (
        <Button onClick={() => setShowIssueForm(!showIssueForm)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
         {showIssueForm ? "Cancel" : "New Issue"}
        </Button>
       )}
      </div>
     </div>

     {showIssueForm && (
      <Card className="rounded-2xl border border-border shadow-sm bg-emerald-50">
       <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-emerald-800/60">Book</Label>
          <select
           value={issueForm.bookId}
           onChange={e => setIssueForm({...issueForm, bookId: e.target.value})}
           className="w-full h-10 rounded-lg border bg-white px-3 py-2 text-sm"
          >
           <option value="">Select Book</option>
           {books?.filter((b: any) => b.available_copies > 0).map((b: any) => (
            <option key={b.id} value={b.id}>{b.title}</option>
           ))}
          </select>
         </div>
         <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-emerald-800/60">Student</Label>
          <select
           value={issueForm.studentId}
           onChange={e => setIssueForm({...issueForm, studentId: e.target.value})}
           className="w-full h-10 rounded-lg border bg-white px-3 py-2 text-sm"
          >
           <option value="">Select Student</option>
           {students?.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name} (Grade {s.grade})</option>
           ))}
          </select>
         </div>
         <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-emerald-800/60">Due Date</Label>
          <Input type="date" value={issueForm.dueDate} onChange={e => setIssueForm({...issueForm, dueDate: e.target.value})} className="h-10 rounded-lg" />
         </div>
         <div className="flex items-end">
          <Button onClick={() => issueBookMutation.mutate()} className="w-full h-10 rounded-lg font-black uppercase text-[10px] bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">Confirm Issue</Button>
         </div>
        </div>
       </CardContent>
      </Card>
     )}

     <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
 <Table>
       <TableHeader className="bg-slate-50">
        <TableRow>
         <TableHead className="font-black text-[10px] uppercase tracking-widest">Book</TableHead>
         <TableHead className="font-black text-[10px] uppercase tracking-widest">Issued To</TableHead>
         <TableHead className="font-black text-[10px] uppercase tracking-widest">Issue Date</TableHead>
         <TableHead className="font-black text-[10px] uppercase tracking-widest">Due Date</TableHead>
         <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
         <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {loans?.map((l: any) => (
         <TableRow key={l.id}>
          <TableCell className="font-bold">{l.books?.title}</TableCell>
          <TableCell className="text-sm">{l.students?.name || l.users?.username || 'N/A'}</TableCell>
          <TableCell className="text-xs">{l.issue_date}</TableCell>
          <TableCell className="text-xs">{l.due_date}</TableCell>
          <TableCell>
           <Badge variant={l.status === 'Returned' ? 'secondary' : 'default'} className="text-[9px] font-black uppercase">
            {l.status}
           </Badge>
          </TableCell>
          <TableCell className="text-right">
           {canEdit && l.status === 'Issued' && (
            <Button variant="outline" size="sm" onClick={() => returnBookMutation.mutate(l.id)} className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest">
             <RotateCcw className="h-3 w-3 mr-1" /> Return
            </Button>
           )}
          </TableCell>
         </TableRow>
        ))}
       </TableBody>
      </Table>
</div>
     </div>
    </TabsContent>
   </Tabs>
  </div>
 );
}
