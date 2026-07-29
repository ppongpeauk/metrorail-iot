import { MetroLogo } from "@/components/layout/metro-logo";
import { cn } from "@/lib/utils";

type HeaderProps = {
  title: string;
  emergency?: boolean;
  alert?: boolean;
};

export function Header({
  title,
  emergency = false,
  alert = false,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "grid h-[6.7%] flex-none grid-cols-[var(--content-after-header-icon)_minmax(0,1fr)] items-center rounded-[var(--radius-panel)] px-[var(--header-padding-inline-end)] pl-[var(--header-icon-inline-start)] text-[var(--white)]",
        emergency ? "bg-[var(--emergency)]" : "bg-[var(--header)]",
      )}
    >
      {emergency ? (
        <span className="inline-flex size-[8.4cqw] items-center justify-center rounded-full bg-white text-[6.1cqw] font-bold leading-none text-[var(--emergency)]" aria-hidden="true">
          !
        </span>
      ) : (
        <MetroLogo />
      )}
      <h1
        className={cn(
          "m-0 min-w-0 overflow-hidden text-ellipsis text-[6.9cqw] font-bold leading-[1.14] whitespace-nowrap text-[var(--white)]",
          alert && "text-[6.1cqw]",
          emergency && "text-[7.2cqw]",
        )}
      >
        {title}
      </h1>
    </header>
  );
}
