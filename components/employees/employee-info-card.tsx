// ═══════════════════════════════════════════
// EmployeeInfoCard — Reusable label/value card
// Supports embedded mode (no wrapper) for grouped sections
// ═══════════════════════════════════════════

interface InfoItem {
  label: string;
  value: string | null;
  href?: string;
}

interface Props {
  title: string;
  items: InfoItem[];
  embedded?: boolean;
}

export default function EmployeeInfoCard({ title, items, embedded }: Props) {
  const content = (
    <>
      <h3 className={embedded ? "text-overline mb-3" : "section-heading mb-3"}>
        {title}
      </h3>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-caption">{item.label}</span>
            {item.href && item.value ? (
              <a href={item.href} className="text-sm text-primary font-medium hover:underline">
                {item.value}
              </a>
            ) : (
              <span className="text-sm text-text font-medium">{item.value || "—"}</span>
            )}
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <div className="card-base p-4">
      {content}
    </div>
  );
}
