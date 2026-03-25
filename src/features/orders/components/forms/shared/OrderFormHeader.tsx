import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface OrderFormHeaderProps {
  onBack: () => void;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeVariant?: "default" | "secondary";
  codeLabel?: string;
}

export const OrderFormHeader: React.FC<OrderFormHeaderProps> = ({
  onBack,
  title,
  subtitle,
  badgeLabel,
  badgeVariant = "default",
  codeLabel,
}) => (
  <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-6">
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 text-slate-600 hover:text-slate-900 pr-4 border-r border-slate-200 rounded-none h-auto py-1"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Button>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          {title}
          {codeLabel && (
            <span className="text-slate-400 font-normal text-sm ml-2">{codeLabel}</span>
          )}
        </h1>
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {subtitle}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Badge variant={badgeVariant} className="px-3 py-1 font-bold tracking-wider text-xs">
        {badgeLabel}
      </Badge>
    </div>
  </div>
);
