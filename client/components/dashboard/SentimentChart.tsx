"use client";

import { SentimentSummary } from "@/types/campaign";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface SentimentChartProps {
  summary: SentimentSummary;
}

export function SentimentChart({ summary }: SentimentChartProps) {
  const data = [
    { name: 'Positive', value: summary.counts.positive, color: '#22c55e' }, // green-500
    { name: 'Neutral', value: summary.counts.neutral, color: '#94a3b8' }, // slate-400
    { name: 'Negative', value: summary.counts.negative, color: '#ef4444' }, // red-500
  ].filter(item => item.value > 0);

  if (summary.total === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No sentiment data available.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
