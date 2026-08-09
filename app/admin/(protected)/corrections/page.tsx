import { CorrectionsPageClient } from "@/components/admin/CorrectionsPageClient";

export default function AdminCorrectionsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
        Stock corrections
      </h1>
      <p className="text-sm text-slate-500">
        Adjust live stock with a signed quantity and keep an audit trail of who
        changed what.
      </p>
      <div className="pt-4">
        <CorrectionsPageClient />
      </div>
    </div>
  );
}
