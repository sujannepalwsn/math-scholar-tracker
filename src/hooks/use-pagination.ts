import { useState, useEffect } from "react";

const PAGE_SIZE_KEY = "global_page_size";
const DEFAULT_PAGE_SIZE = 20;

export function usePagination(initialPageSize?: number, initialPage = 1) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(() => {
    if (initialPageSize) return initialPageSize;
    const saved = localStorage.getItem(PAGE_SIZE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_PAGE_SIZE;
  });

  const updatePageSize = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when page size changes
    if (!initialPageSize) {
      localStorage.setItem(PAGE_SIZE_KEY, newSize.toString());
    }
  };

  return {
    page,
    setPage,
    pageSize,
    setPageSize: updatePageSize,
  };
}
