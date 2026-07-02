import Sidebar from "@/components/layout/Sidebar";
import { assertEditorPage } from "@/lib/pageGuard";

// Admin pages read live data per-request — never statically prerender at build.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: middleware already gates these routes, but every dashboard
  // page reads all-user data with the service-role client, so re-confirm the
  // caller is at least an admin (editors included) before rendering anything.
  await assertEditorPage();

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
    </div>
  );
}
