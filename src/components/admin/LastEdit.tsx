type EditMetadata = { last_edit_by?: string | null; last_edit_at?: string | null };
export function LastEdit({ record, className = "" }: { record: EditMetadata; className?: string }) {
  const parsed = record.last_edit_at ? new Date(record.last_edit_at.replace(" ", "T") + "Z") : null;
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) : null;
  return (
    <div className={`text-xs text-muted-foreground break-words mt-1 ${className}`}>
      <span>Last edit by: <strong>{record.last_edit_by || "Unbekannt"}</strong></span>
      {date && <span className="block">{date} Uhr</span>}
    </div>
  );
}
