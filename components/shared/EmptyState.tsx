import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border-strong bg-bg-elevated/50 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-bg-elevated-2 text-text-muted">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-muted">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        <div className="mt-5">
          {actionHref ? (
            <Button href={actionHref} size="sm">
              {actionLabel}
            </Button>
          ) : (
            <Button onClick={onAction} size="sm">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
