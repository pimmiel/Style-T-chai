interface ColorSwatchProps {
  hex: string;
  size?: "sm" | "md" | "lg";
  title?: string;
  selected?: boolean;
  onClick?: () => void;
}

export function ColorSwatch({ hex, size = "md", title, selected, onClick }: ColorSwatchProps) {
  const sizes = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-16 h-16 rounded-[10px]" };
  const ring = selected ? "shadow-[0_0_0_3px_var(--color-primary),0_0_0_5px_#fff]" : "";
  return (
    <button
      type="button"
      title={title ?? hex}
      onClick={onClick}
      className={`${sizes[size]} rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line)] transition-transform hover:scale-110 ${ring}`}
      style={{ backgroundColor: hex }}
    />
  );
}
