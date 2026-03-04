import os
import re

# Comprehensive list of Lucide icons
lucide_icons = [
    'Users', 'CheckCircle2', 'XCircle', 'TrendingUp', 'CalendarIcon', 'BookOpen',
    'FileText', 'DollarSign', 'Clock', 'ArrowLeft', 'Wallet', 'FileUp', 'Plus',
    'Trash2', 'Edit', 'Bot', 'SquarePen', 'ChevronDown', 'Star', 'LayoutList',
    'Video', 'MessageSquare', 'Bell', 'Shield', 'KeyRound', 'LogOut', 'Settings',
    'CalendarDays', 'Menu', 'X', 'ChevronLeft', 'ChevronRight', 'AlertTriangle',
    'Check', 'ClipboardCheck', 'User', 'UserPlus', 'UserCheck', 'Calendar', 'Loader2',
    'Camera', 'GraduationCap', 'PartyPopper', 'Eye', 'TrendingDown', 'MinusCircle',
    'Brain', 'Search', 'ArrowRight', 'Home', 'Paintbrush', 'Radio', 'ChevronUp'
]

# Shadcn UI components mapping {name: file_basename}
ui_map = {
    'Accordion': 'accordion', 'AccordionContent': 'accordion', 'AccordionItem': 'accordion', 'AccordionTrigger': 'accordion',
    'Alert': 'alert', 'AlertDescription': 'alert', 'AlertTitle': 'alert',
    'AlertDialog': 'alert-dialog', 'AlertDialogAction': 'alert-dialog', 'AlertDialogCancel': 'alert-dialog', 'AlertDialogContent': 'alert-dialog', 'AlertDialogDescription': 'alert-dialog', 'AlertDialogFooter': 'alert-dialog', 'AlertDialogHeader': 'alert-dialog', 'AlertDialogTitle': 'alert-dialog', 'AlertDialogTrigger': 'alert-dialog',
    'AspectRatio': 'aspect-ratio',
    'Avatar': 'avatar', 'AvatarFallback': 'avatar', 'AvatarImage': 'avatar',
    'Badge': 'badge',
    'Breadcrumb': 'breadcrumb', 'BreadcrumbEllipsis': 'breadcrumb', 'BreadcrumbItem': 'breadcrumb', 'BreadcrumbLink': 'breadcrumb', 'BreadcrumbList': 'breadcrumb', 'BreadcrumbPage': 'breadcrumb', 'BreadcrumbSeparator': 'breadcrumb',
    'Button': 'button',
    'Calendar': 'calendar',
    'Card': 'card', 'CardContent': 'card', 'CardDescription': 'card', 'CardFooter': 'card', 'CardHeader': 'card', 'CardTitle': 'card',
    'Carousel': 'carousel', 'CarouselContent': 'carousel', 'CarouselItem': 'carousel', 'CarouselNext': 'carousel', 'CarouselPrevious': 'carousel',
    'Checkbox': 'checkbox',
    'Collapsible': 'collapsible', 'CollapsibleContent': 'collapsible', 'CollapsibleTrigger': 'collapsible',
    'Command': 'command', 'CommandDialog': 'command', 'CommandEmpty': 'command', 'CommandGroup': 'command', 'CommandInput': 'command', 'CommandItem': 'command', 'CommandList': 'command', 'CommandSeparator': 'command', 'CommandShortcut': 'command',
    'ContextMenu': 'context-menu', 'ContextMenuCheckboxItem': 'context-menu', 'ContextMenuContent': 'context-menu', 'ContextMenuGroup': 'context-menu', 'ContextMenuItem': 'context-menu', 'ContextMenuLabel': 'context-menu', 'ContextMenuPortal': 'context-menu', 'ContextMenuRadioGroup': 'context-menu', 'ContextMenuRadioItem': 'context-menu', 'ContextMenuSeparator': 'context-menu', 'ContextMenuShortcut': 'context-menu', 'ContextMenuSub': 'context-menu', 'ContextMenuSubContent': 'context-menu', 'ContextMenuSubTrigger': 'context-menu', 'ContextMenuTrigger': 'context-menu',
    'Dialog': 'dialog', 'DialogClose': 'dialog', 'DialogContent': 'dialog', 'DialogDescription': 'dialog', 'DialogFooter': 'dialog', 'DialogHeader': 'dialog', 'DialogOverlay': 'dialog', 'DialogPortal': 'dialog', 'DialogTitle': 'dialog', 'DialogTrigger': 'dialog',
    'Drawer': 'drawer', 'DrawerClose': 'drawer', 'DrawerContent': 'drawer', 'DrawerDescription': 'drawer', 'DrawerFooter': 'drawer', 'DrawerHeader': 'drawer', 'DrawerOverlay': 'drawer', 'DrawerPortal': 'drawer', 'DrawerTitle': 'drawer', 'DrawerTrigger': 'drawer',
    'DropdownMenu': 'dropdown-menu', 'DropdownMenuCheckboxItem': 'dropdown-menu', 'DropdownMenuContent': 'dropdown-menu', 'DropdownMenuGroup': 'dropdown-menu', 'DropdownMenuItem': 'dropdown-menu', 'DropdownMenuLabel': 'dropdown-menu', 'DropdownMenuPortal': 'dropdown-menu', 'DropdownMenuRadioGroup': 'dropdown-menu', 'DropdownMenuRadioItem': 'dropdown-menu', 'DropdownMenuSeparator': 'dropdown-menu', 'DropdownMenuShortcut': 'dropdown-menu', 'DropdownMenuSub': 'dropdown-menu', 'DropdownMenuSubContent': 'dropdown-menu', 'DropdownMenuSubTrigger': 'dropdown-menu', 'DropdownMenuTrigger': 'dropdown-menu',
    'Form': 'form', 'FormControl': 'form', 'FormDescription': 'form', 'FormField': 'form', 'FormItem': 'form', 'FormLabel': 'form', 'FormMessage': 'form',
    'HoverCard': 'hover-card', 'HoverCardContent': 'hover-card', 'HoverCardTrigger': 'hover-card',
    'Input': 'input',
    'InputOTP': 'input-otp', 'InputOTPGroup': 'input-otp', 'InputOTPSeparator': 'input-otp', 'InputOTPSlot': 'input-otp',
    'Label': 'label',
    'Menubar': 'menubar', 'MenubarCheckboxItem': 'menubar', 'MenubarContent': 'menubar', 'MenubarGroup': 'menubar', 'MenubarItem': 'menubar', 'MenubarLabel': 'menubar', 'MenubarMenu': 'menubar', 'MenubarPortal': 'menubar', 'MenubarRadioGroup': 'menubar', 'MenubarRadioItem': 'menubar', 'MenubarSeparator': 'menubar', 'MenubarShortcut': 'menubar', 'MenubarSub': 'menubar', 'MenubarSubContent': 'menubar', 'MenubarSubTrigger': 'menubar', 'MenubarTrigger': 'menubar',
    'NavigationMenu': 'navigation-menu', 'NavigationMenuContent': 'navigation-menu', 'NavigationMenuIndicator': 'navigation-menu', 'NavigationMenuItem': 'navigation-menu', 'NavigationMenuLink': 'navigation-menu', 'NavigationMenuList': 'navigation-menu', 'NavigationMenuTrigger': 'navigation-menu', 'NavigationMenuViewport': 'navigation-menu',
    'Pagination': 'pagination', 'PaginationContent': 'pagination', 'PaginationEllipsis': 'pagination', 'PaginationItem': 'pagination', 'PaginationLink': 'pagination', 'PaginationNext': 'pagination', 'PaginationPrevious': 'pagination',
    'Popover': 'popover', 'PopoverContent': 'popover', 'PopoverTrigger': 'popover',
    'Progress': 'progress',
    'RadioGroup': 'radio-group', 'RadioGroupItem': 'radio-group',
    'ResizableHandle': 'resizable', 'ResizablePanel': 'resizable', 'ResizablePanelGroup': 'resizable',
    'ScrollArea': 'scroll-area', 'ScrollBar': 'scroll-area',
    'Select': 'select', 'SelectContent': 'select', 'SelectGroup': 'select', 'SelectItem': 'select', 'SelectLabel': 'select', 'SelectScrollDownButton': 'select', 'SelectScrollUpButton': 'select', 'SelectSeparator': 'select', 'SelectTrigger': 'select', 'SelectValue': 'select',
    'Separator': 'separator',
    'Sheet': 'sheet', 'SheetClose': 'sheet', 'SheetContent': 'sheet', 'SheetDescription': 'sheet', 'SheetFooter': 'sheet', 'SheetHeader': 'sheet', 'SheetOverlay': 'sheet', 'SheetPortal': 'sheet', 'SheetTitle': 'sheet', 'SheetTrigger': 'sheet',
    'Sidebar': 'sidebar', 'SidebarContent': 'sidebar', 'SidebarFooter': 'sidebar', 'SidebarGroup': 'sidebar', 'SidebarGroupAction': 'sidebar', 'SidebarGroupContent': 'sidebar', 'SidebarGroupLabel': 'sidebar', 'SidebarHeader': 'sidebar', 'SidebarInput': 'sidebar', 'SidebarInset': 'sidebar', 'SidebarMenu': 'sidebar', 'SidebarMenuAction': 'sidebar', 'SidebarMenuBadge': 'sidebar', 'SidebarMenuButton': 'sidebar', 'SidebarMenuItem': 'sidebar', 'SidebarMenuSkeleton': 'sidebar', 'SidebarMenuSub': 'sidebar', 'SidebarMenuSubButton': 'sidebar', 'SidebarMenuSubItem': 'sidebar', 'SidebarProvider': 'sidebar', 'SidebarRail': 'sidebar', 'SidebarSeparator': 'sidebar', 'SidebarTrigger': 'sidebar',
    'Skeleton': 'skeleton',
    'Slider': 'slider',
    'Switch': 'switch',
    'Table': 'table', 'TableBody': 'table', 'TableCaption': 'table', 'TableCell': 'table', 'TableFooter': 'table', 'TableHead': 'table', 'TableHeader': 'table', 'TableRow': 'table',
    'Tabs': 'tabs', 'TabsContent': 'tabs', 'TabsList': 'tabs', 'TabsTrigger': 'tabs',
    'Textarea': 'textarea',
    'Toast': 'toast', 'ToastAction': 'toast', 'ToastClose': 'toast', 'ToastDescription': 'toast', 'ToastProvider': 'toast', 'ToastTitle': 'toast', 'ToastViewport': 'toast',
    'Toaster': 'toaster',
    'Toggle': 'toggle',
    'ToggleGroup': 'toggle-group', 'ToggleGroupItem': 'toggle-group',
    'Tooltip': 'tooltip', 'TooltipContent': 'tooltip', 'TooltipProvider': 'tooltip', 'TooltipTrigger': 'tooltip',
    'VisuallyHidden': 'visually-hidden'
}

def fix_file(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # Skip files that are not TSX
    if not filepath.endswith('.tsx'):
        return

    # Special case: don't fix components/ui files
    if 'components/ui' in filepath:
        return

    # Identify "use client"
    use_client = False
    if re.match(r'^["\']use client["\'];', content):
        use_client = True

    # Find all used icons
    used_icons = set()
    for icon in lucide_icons:
        if re.search(r'\b' + icon + r'\b', content):
            # Check if it's not part of an import or string
            # This is a bit naive but works well for most cases
            used_icons.add(icon)

    # Find all used UI components
    used_ui = {} # {file: set(comps)}
    for comp, ui_file in ui_map.items():
        if re.search(r'\b' + comp + r'\b', content):
            if ui_file not in used_ui:
                used_ui[ui_file] = set()
            used_ui[ui_file].add(comp)

    # Check for cn and safeFormatDate
    utils = set()
    if re.search(r'\bcn\b', content): utils.add('cn')
    if re.search(r'\bsafeFormatDate\b', content): utils.add('safeFormatDate')

    # Remove all existing lucide-react and UI and utils imports
    # Handle multi-line imports
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']lucide-react["\'];?\s*', '', content, flags=re.DOTALL)
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']@/components/ui/[^"\']+["\'];?\s*', '', content, flags=re.DOTALL)
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']@/lib/utils["\'];?\s*', '', content, flags=re.DOTALL)
    content = re.sub(r'import\s*\{[^}]*\}\s*from\s*["\']@/lib/utils["\'];?\s*', '', content, flags=re.DOTALL) # Duplicate to be sure

    # Remove corrupted fragments from previous attempts
    # Like "import { Progress } from ..." scattered in the file
    content = re.sub(r'import\s*\{\s*\b\w+\b\s*\}\s*from\s*["\']@/components/ui/[^"\']+["\'];?\s*', '', content)

    # Reconstruct import block
    import_block = ""
    if used_icons:
        import_block += f'import {{ {", ".join(sorted(list(used_icons)))} }} from "lucide-react";\n'

    for ui_file, comps in sorted(used_ui.items()):
        # Edge case: if we are in TakeAttendance, don't import Calendar from lucide-react if it's also a UI component
        # Actually, my lucide_icons list includes 'Calendar'.
        # If both used, we need to alias one or remove from one.
        # Let's remove 'Calendar' from lucide if it's in UI.
        if ui_file == 'calendar' and 'Calendar' in used_icons:
            # We already handled collision in fix_calendar_collision.py but let's be robust
            pass

        import_block += f'import {{ {", ".join(sorted(list(comps)))} }} from "@/components/ui/{ui_file}";\n'

    if utils:
        import_block += f'import {{ {", ".join(sorted(list(utils)))} }} from "@/lib/utils";\n'

    # Check for collisions in icons vs UI
    if 'Calendar' in used_icons and 'calendar' in used_ui:
        import_block = import_block.replace(' Calendar,', '').replace(', Calendar', '').replace('{ Calendar }', '{}')
        # We assume UI Calendar is preferred, or used as component. Lucide Calendar icon should be avoided or aliased.
        # For simplicity, if both used, UI component wins in my script logic here.
        # Better: use CalendarIcon for icon.

    # Re-insert consolidated imports
    if use_client:
        content = re.sub(r'^([^;]+;)', r'\1\n' + import_block, content)
    else:
        # Remove any leading empty lines before adding imports
        content = content.lstrip()
        content = import_block + content

    with open(filepath, 'w') as f:
        f.write(content)

# Apply to all files in src
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            fix_file(os.path.join(root, file))
