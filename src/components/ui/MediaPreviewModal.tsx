import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

interface MediaPreviewModalProps {
 isOpen: boolean;
 onClose: () => void;
 mediaUrl: string;
 mediaType?: "image" | "video" | "pdf" | "auto";
}

export default function MediaPreviewModal({
 isOpen,
 onClose,
 mediaUrl,
 mediaType = "auto",
}: MediaPreviewModalProps) {
 const [type, setType] = React.useState<"image" | "video" | "pdf">("image");

 React.useEffect(() => {
  if (mediaType !== "auto") {
   setType(mediaType);
   return;
  }

  const extension = mediaUrl.split("?")[0].split(".").pop()?.toLowerCase();
  if (["mp4", "webm", "ogg"].includes(extension || "")) {
   setType("video");
  } else if (extension === "pdf") {
   setType("pdf");
  } else {
   setType("image");
  }
 }, [mediaUrl, mediaType]);

 return (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
   <DialogContent className="max-w-[95vw] md:max-w-[80vw] lg:max-w-[70vw] p-0 overflow-hidden bg-black/95 border border-border rounded-2xl md:rounded-2xl h-[80vh] md:h-[90vh]">
    <VisuallyHidden>
      <DialogTitle>Media Preview</DialogTitle>
      <DialogDescription>Viewing {type} from {mediaUrl}</DialogDescription>
    </VisuallyHidden>

    <div className="relative w-full h-full flex flex-col">
     {/* Header Actions */}
     <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
      <Button
       variant="secondary"
       size="icon"
       className="rounded-full bg-white hover:bg-white text-white border border-border "
       asChild
      >
       <a href={mediaUrl} download target="_blank" rel="noopener noreferrer">
        <Download className="h-4 w-4" />
       </a>
      </Button>
      <Button
       variant="secondary"
       size="icon"
       className="rounded-full bg-white hover:bg-white text-white border border-border "
       onClick={onClose}
      >
       <X className="h-4 w-4" />
      </Button>
     </div>

     {/* Media Container */}
     <div className="flex-1 w-full h-full flex items-center justify-center p-4">
      {type === "image" && (
       <img
        src={mediaUrl}
        alt="Preview"
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
        loading="lazy"
       />
      )}

      {type === "video" && (
       <video
        src={mediaUrl}
        controls
        autoPlay
        className="max-w-full max-h-full rounded-lg shadow-2xl"
       />
      )}

      {type === "pdf" && (
       <iframe
        src={`${mediaUrl}#toolbar=0`}
        className="w-full h-full rounded-lg bg-white"
        title="PDF Preview"
       />
      )}
     </div>
    </div>
   </DialogContent>
  </Dialog>
 );
}
