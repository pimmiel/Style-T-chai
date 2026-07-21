import { cn } from "@/lib/utils";

export function ScreenCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-surface rounded-[20px] border border-line shadow-screen overflow-hidden", className)}>
      {children}
    </div>
  );
}
