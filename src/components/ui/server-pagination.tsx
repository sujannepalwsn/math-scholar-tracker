import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile as useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function ServerPagination({
  currentPage,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: ServerPaginationProps) {
  const isMobile = useMobile();

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  if (totalPages <= 1 && totalRows <= pageSize) return null;

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-8 border-t border-muted/20", className)}>
      <div className="flex items-center gap-4 order-2 sm:order-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">
          {totalRows > 0 ? (
            <>
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalRows)} - {Math.min(currentPage * pageSize, totalRows)} of {totalRows}
            </>
          ) : (
            "No results found"
          )}
        </p>

        {!isMobile && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Rows:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => onPageSizeChange(parseInt(v, 10))}
            >
              <SelectTrigger className="h-8 w-[70px] rounded-lg bg-card/50 border-none shadow-soft font-black text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-card/90 border-none rounded-xl shadow-strong">
                <SelectItem value="10" className="text-[10px] font-black">10</SelectItem>
                <SelectItem value="20" className="text-[10px] font-black">20</SelectItem>
                <SelectItem value="50" className="text-[10px] font-black">50</SelectItem>
                <SelectItem value="100" className="text-[10px] font-black">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Pagination className="justify-center sm:justify-end order-1 sm:order-2">
        <PaginationContent className="gap-1 sm:gap-2">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handlePrevious();
              }}
              className={cn(
                "h-8 rounded-lg font-black uppercase text-[9px] tracking-widest",
                currentPage <= 1 && "pointer-events-none opacity-50"
              )}
            />
          </PaginationItem>

          {!isMobile && (
            <>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(pageNum);
                      }}
                      isActive={currentPage === pageNum}
                      className="h-8 w-8 rounded-lg font-black text-[10px]"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis className="h-8 w-8" />
                </PaginationItem>
              )}
            </>
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleNext();
              }}
              className={cn(
                "h-8 rounded-lg font-black uppercase text-[9px] tracking-widest",
                currentPage >= totalPages && "pointer-events-none opacity-50"
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
