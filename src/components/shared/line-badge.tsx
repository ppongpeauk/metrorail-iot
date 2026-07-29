import type { Line } from "@/lib/display-data";
import { cn } from "@/lib/utils";

const lineNames: Record<Line, string> = {
  RD: "Red",
  YL: "Yellow",
  GR: "Green",
  BL: "Blue",
  OR: "Orange",
  SV: "Silver",
};

const lineClassNames: Record<Line, string> = {
  RD: "bg-[var(--red)] text-white",
  YL: "bg-[var(--yellow)] text-[#111]",
  GR: "bg-[var(--green)] text-white",
  BL: "bg-[var(--blue)] text-white",
  OR: "bg-[var(--orange)] text-[#111]",
  SV: "bg-[var(--silver)] text-[#111]",
};

export function LineBadge({
  line,
  mini = false,
  className,
}: {
  line: Line;
  mini?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label={`${lineNames[line]} Line`}
      className={cn(
        "inline-flex size-[7cqw] items-center justify-center rounded-full text-[3.3cqw] font-bold leading-none",
        lineClassNames[line],
        mini && "size-[3.75cqw] text-[1.6cqw]",
        className,
      )}
    >
      {line}
    </span>
  );
}
