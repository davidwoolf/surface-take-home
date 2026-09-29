import { BookOpenIcon } from "lucide-react";
import { Button } from "@/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/empty";

const EXAMPLE_QUESTIONS = [
  "How long is parental leave?",
  "Do I need approval to take time off?",
  "How much notice do I need to give if I resign?",
  "What are PostHog's values?",
];

/** The start screen: what the app does, and example questions to ask. */
export function EmptyConversation({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenIcon />
        </EmptyMedia>
        <EmptyTitle>Ask the PostHog handbook</EmptyTitle>
        <EmptyDescription>Answers quote the handbook word for word and say where each quote comes from.</EmptyDescription>
      </EmptyHeader>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUESTIONS.map((question) => (
          <Button key={question} variant="outline" size="sm" onClick={() => onAsk(question)}>
            {question}
          </Button>
        ))}
      </div>
    </Empty>
  );
}
