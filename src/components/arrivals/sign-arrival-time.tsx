import { cn } from "@/lib/utils";

export function SignArrivalTime({
  className,
  value,
}: {
  className: string;
  value: string;
}) {
  const minutes = value.match(/^(\d+)\s+min$/i);

  return (
    <strong className={cn("inline-flex items-baseline gap-[0.6cqw]", className)}>
      {minutes ? (
        <>
          <span>{minutes[1]}</span>
          <span className="text-[2.2cqw]">min</span>
        </>
      ) : (
        value
      )}
    </strong>
  );
}
