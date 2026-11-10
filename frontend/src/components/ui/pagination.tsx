import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as TPagination } from "@/lib/types";
import { Button } from "./button";

export function Pagination({
  pagination,
  onPage,
}: {
  pagination?: TPagination | null;
  onPage: (page: number) => void;
}) {
  if (!pagination || pagination.totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3 text-[13px] text-fg-3">
      <span className="tabular">
        {pagination.totalItems} {pagination.totalItems === 1 ? "record" : "records"}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular">
          Page {pagination.currentPage} of {pagination.totalPages}
        </span>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Previous page"
          disabled={!pagination.previousPage}
          onClick={() => pagination.previousPage && onPage(pagination.previousPage)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label="Next page"
          disabled={!pagination.nextPage}
          onClick={() => pagination.nextPage && onPage(pagination.nextPage)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
