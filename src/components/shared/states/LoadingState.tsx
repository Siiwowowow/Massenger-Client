import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  message = "Loading...",
  className,
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground",
        fullScreen && "min-h-[50vh] w-full",
        className
      )}
    >
      <Spinner className="size-6 text-primary animate-spin" />
      {message && <p className="text-sm font-medium">{message}</p>}
    </div>
  );
}
