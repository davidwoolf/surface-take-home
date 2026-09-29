import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { CollapsibleTrigger } from "@/components/collapsible";
import { cn } from "@/lib/utils";

type ToolState = (ToolUIPart | DynamicToolUIPart)["state"];

export type ToolHeaderProps = {
  title: string;
  state: ToolState;
  className?: string;
};

const STATUS: Record<ToolState, { label: string; icon: ReactNode }> = {
  "approval-requested": { label: "Awaiting Approval", icon: <ClockIcon className="size-4 text-yellow-600" /> },
  "approval-responded": { label: "Responded", icon: <CheckCircleIcon className="size-4 text-blue-600" /> },
  "input-available": { label: "Running", icon: <ClockIcon className="size-4 animate-pulse" /> },
  "input-streaming": { label: "Pending", icon: <CircleIcon className="size-4" /> },
  "output-available": { label: "Completed", icon: <CheckCircleIcon className="size-4 text-green-600" /> },
  "output-denied": { label: "Denied", icon: <XCircleIcon className="size-4 text-orange-600" /> },
  "output-error": { label: "Error", icon: <XCircleIcon className="size-4 text-red-600" /> },
};

/** The clickable header of a tool card: title and status. */
export function ToolHeader({ className, title, state }: ToolHeaderProps) {
  return (
    <CollapsibleTrigger className={cn("flex w-full items-center justify-between gap-4 p-3", className)}>
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title}</span>
        <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
          {STATUS[state].icon}
          {STATUS[state].label}
        </Badge>
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
}
