import { TooltipProvider } from "@/components/ui/tooltip";
import { Chat } from "@/modules/chat/ui/chat";

export function App() {
  return (
    <TooltipProvider>
      <main className="h-svh bg-background text-foreground">
        <Chat />
      </main>
    </TooltipProvider>
  );
}
