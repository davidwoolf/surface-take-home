import { TooltipProvider } from "@/components/tooltip";
import { Chat } from "@/components/chat/chat";

export function App() {
  return (
    <TooltipProvider>
      <main className="h-svh bg-background text-foreground">
        <Chat />
      </main>
    </TooltipProvider>
  );
}
