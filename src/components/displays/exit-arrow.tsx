import type { CSSProperties } from "react";
import rightArrow from "@/assets/symbols/right-arrow.png";

export function ExitArrow({
  direction = "left",
  className,
}: {
  direction?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`grid aspect-square w-[calc(100%+12cqw)] -ml-[12cqw] place-items-center rounded-full bg-white ${className ?? ""}`}
      style={
        {
          "--exit-arrow": `url(${rightArrow.src})`,
        } as CSSProperties
      }
    >
      <span
        className="h-[64%] w-[78%] bg-[var(--emergency)] [mask:var(--exit-arrow)_center/contain_no-repeat]"
        style={{
          transform: direction === "left" ? "rotate(180deg)" : undefined,
        }}
      />
    </div>
  );
}
