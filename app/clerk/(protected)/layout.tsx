import { ClerkAuthGuard } from "@/components/clerk/ClerkAuthGuard";
import { ClerkNav } from "@/components/clerk/ClerkNav";

export default function ClerkProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkAuthGuard>
      <ClerkNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </ClerkAuthGuard>
  );
}
