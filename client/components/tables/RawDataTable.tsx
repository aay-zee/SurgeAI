import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface RawDataTableProps {
  data: any[];
  columns: Column[];
  title?: string;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  rowsPerPage?: number;
}

type SortDirection = "asc" | "desc" | null;

export function RawDataTable({
  data,
  columns,
  title = "Data Table",
  searchable = true,
  sortable = true,
  pagination = true,
  rowsPerPage = 20,
}: RawDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((row) =>
      Object.values(row).some(
        (value) =>
          value &&
          value
            .toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData;

    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || "").toLowerCase();
      const bStr = String(bVal || "").toLowerCase();

      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [filteredData, sortKey, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, rowsPerPage, pagination]);

  const handleSort = (key: string) => {
    if (!sortable) return;

    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
      setCurrentPage(1);
    }
  };

  const getSentimentBadge = (sentiment: string | number) => {
    if (typeof sentiment === "string") {
      const s = sentiment.toLowerCase();
      if (s === "positive") return "bg-green-100 text-green-900";
      if (s === "negative") return "bg-red-100 text-red-900";
      return "bg-gray-100 text-gray-900";
    }
    return "bg-gray-100 text-gray-900";
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="space-y-4">
          <CardTitle>{title}</CardTitle>

          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {searchable && (
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            )}

            {/* Rows per page selector */}
            {pagination && (
              <Select
                value={String(rowsPerPage)}
                onValueChange={(val) => {
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {Math.min(rowsPerPage, sortedData.length)} of{" "}
            {sortedData.length} results
            {searchTerm && ` (filtered from ${data.length})`}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Table */}
        {paginatedData.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`cursor-pointer hover:bg-muted transition-colors ${
                        col.width ? col.width : ""
                      } ${col.sortable !== false && sortable ? "cursor-pointer" : ""}`}
                      onClick={() =>
                        col.sortable !== false &&
                        sortable &&
                        handleSort(col.key)
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span>{col.label}</span>
                        {sortable && sortKey === col.key && (
                          <span className="text-xs">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, idx) => (
                  <TableRow
                    key={idx}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {columns.map((col) => (
                      <TableCell key={`${idx}-${col.key}`} className="py-3">
                        {col.render ? (
                          col.render(row[col.key], row)
                        ) : col.key === "sentiment" ||
                          col.key === "sentiment_label" ? (
                          <Badge
                            className={getSentimentBadge(row[col.key])}
                            variant="outline"
                          >
                            {row[col.key]}
                          </Badge>
                        ) : col.key.includes("url") ||
                          col.key.includes("link") ? (
                          <a
                            href={row[col.key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate max-w-xs"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-sm truncate max-w-xs">
                            {String(row[col.key] || "-")}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum =
                    currentPage <= 3
                      ? i + 1
                      : currentPage >= totalPages - 2
                        ? totalPages - 4 + i
                        : currentPage - 2 + i;

                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
