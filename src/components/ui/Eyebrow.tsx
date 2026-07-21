export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-serif text-[13px] tracking-[3px] uppercase text-primary ${className}`}>
      {children}
    </div>
  );
}
