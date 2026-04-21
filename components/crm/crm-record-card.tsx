import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CrmRecordCardProps {
  avatar: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  bottom?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function CrmRecordCard({
  avatar,
  title,
  subtitle,
  headerRight,
  bottom,
  onClick,
  className,
}: CrmRecordCardProps) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
          {avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="min-w-0">{title}</div>
              {subtitle ? <div className="mt-0.5">{subtitle}</div> : null}
            </div>
            {headerRight ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {headerRight}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {bottom ? <div className="mt-2 pl-[52px]">{bottom}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <Button
        unstyled
        type="button"
        onClick={onClick}
        className={cn(
          "card-base w-full p-4 text-left transition-all hover-lift cursor-pointer",
          className,
        )}
      >
        {content}
      </Button>
    );
  }

  return <div className={cn("card-base w-full p-4", className)}>{content}</div>;
}
