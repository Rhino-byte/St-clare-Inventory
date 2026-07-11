import { AlertsPanel } from "@/components/admin/AlertsPanel";

export default function AdminAlertsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Alerts</h1>
      <p className="text-sm text-slate-500">
        Test SMTP notifications and review current low-stock items.
      </p>
      <div className="pt-4">
        <AlertsPanel />
      </div>
    </div>
  );
}
