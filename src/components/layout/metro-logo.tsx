import { cn } from "@/lib/utils";

export function MetroLogo({ className }: { className?: string } = {}) {
  return (
    // The official artwork is a fixed local asset and does not need optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn("h-[7.2cqw] w-[5.2cqw] flex-none object-contain", className)}
      src="/metro-logo.png"
      alt="Metro"
    />
  );
}
