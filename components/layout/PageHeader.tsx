import { cn } from "@/lib/utils/cn";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-xs uppercase tracking-[0.18em] text-accent-sand/80 mb-2">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl sm:text-3xl md:text-display-2 font-semibold text-text-primary tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-text-muted mt-2 max-w-2xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}
