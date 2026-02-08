import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, targetEmail, targetName, stopImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="font-semibold text-sm">
          Impersonation Active — Viewing as {targetName || targetEmail}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium bg-black/20 px-2 py-0.5 rounded">
          Destructive actions blocked
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 bg-black/20 border-black/30 text-black hover:bg-black/30 hover:text-black"
          onClick={stopImpersonation}
        >
          <X className="h-3 w-3 mr-1" />
          Exit
        </Button>
      </div>
    </div>
  );
}
