"use client";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full text-[13px] px-4 py-2 transition-colors ${
        active
          ? "bg-ink text-surface"
          : "border border-line-2 text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
