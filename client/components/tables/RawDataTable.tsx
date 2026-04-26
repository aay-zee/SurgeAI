"use client";

import { Card, CardContent } from "@/components/ui/card";

interface RawDataTableProps {
  data: any[];
  platform?: string;
  columns?: any[];
  title?: string;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  rowsPerPage?: number;
}

export function RawDataTable({ data, title }: RawDataTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No data available{title ? ` for ${title}` : ""}.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-medium">{title}</p>}
      {data.map((item, idx) => (
        <Card key={idx}>
          <CardContent className="py-3 text-sm">
            <p className="text-muted-foreground line-clamp-3">
              {item.content || item.text || JSON.stringify(item)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
