import { cn } from "@/lib/utils";

export function Footer({ emergency = false }: { emergency?: boolean }) {
  return (
    <footer
      className={cn(
        "flex min-h-[7.9cqh] flex-1 items-end justify-center pb-0 text-[3.05cqw] font-normal leading-[1.3] text-[#bfbfbf]",
        emergency && "min-h-[4.35cqh] flex-none pb-[0.9cqh]",
      )}
    >
      Visit wmata.com or call 202 637 7000
    </footer>
  );
}
