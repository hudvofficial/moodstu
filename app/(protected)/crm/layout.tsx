// CRM Layout — Passthrough only
// Sub-module navigation (Leads ↔ Customers) is handled inline
// within each page's Stats Bar row (Phase 02 + 03)

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
