import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
