import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BookOpenIcon, RotateCcwIcon, SquarePenIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { type HandbookUIMessage, dataPartSchemas, messageMetadataSchema } from "../message";
import { AssistantMessage } from "./assistant-message";
import { describeChatError } from "./chat-errors";
import { TurnTimer, type TurnState } from "./turn-timer";
import { useEscapeToStop } from "./use-escape-to-stop";
import { useHealth } from "./use-health";

const EXAMPLE_QUESTIONS = [
  "How long is parental leave?",
  "Do I need approval to take time off?",
  "How much notice do I need to give if I resign?",
  "What are PostHog's values?",
];

/** The whole chat: conversation, input, stop, retry and new chat. Messages live only in memory. */
export function Chat() {
  const health = useHealth();
  const transport = useMemo(() => new DefaultChatTransport<HandbookUIMessage>({ api: "/api/chat" }), []);
  // Client-side facts about turns that the server can't know: when they were sent, stopped or failed.
  const [sentAt, setSentAt] = useState<number>();
  const [ended, setEnded] = useState<Record<string, { at: number; state: "stopped" | "failed" }>>({});

  const { messages, sendMessage, status, stop, error, regenerate, setMessages, clearError } = useChat<HandbookUIMessage>({
    transport,
    messageMetadataSchema,
    dataPartSchemas,
    onFinish: ({ message, isAbort, isError }) => {
      if (isAbort || isError) {
        setEnded((prev) => ({ ...prev, [message.id]: { at: Date.now(), state: isAbort ? "stopped" : "failed" } }));
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const stopResponse = useCallback(() => void stop(), [stop]);
  useEscapeToStop(busy, stopResponse);

  const errorView = error ? describeChatError(error) : undefined;

  const send = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    if (error) {
      // A failed turn's partial answer isn't sent back to the model with the next question.
      setMessages((prev) => (prev.at(-1)?.role === "assistant" ? prev.slice(0, -1) : prev));
      clearError();
    }
    setSentAt(Date.now());
    void sendMessage({ text: question });
  };

  const newChat = () => {
    void stop();
    setMessages([]);
    clearError();
    setEnded({});
  };

  const retry = () => {
    setSentAt(Date.now());
    void regenerate();
  };

  if (health.status === "loading") {
    return (
      <Empty className="h-full">
        <Spinner />
      </Empty>
    );
  }
  if (health.status === "unavailable" || errorView?.kind === "unavailable") {
    return <Unavailable message={health.status === "unavailable" ? health.message : errorView!.message} />;
  }

  const last = messages.at(-1);
  const waitingForAnswer = busy && last?.role === "user";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpenIcon aria-hidden />
          <h1 className="font-heading font-semibold">Surface</h1>
          <span className="text-muted-foreground text-sm">PostHog handbook</span>
        </div>
        <Button variant="ghost" size="sm" onClick={newChat} disabled={messages.length === 0 && !error}>
          <SquarePenIcon data-icon="inline-start" />
          New chat
        </Button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <EmptyConversation onAsk={send} />
          ) : (
            messages.map((message, index) =>
              message.role === "user" ? (
                <Message key={message.id} from="user">
                  <MessageContent>
                    {message.parts.map((part, i) => (part.type === "text" ? <MessageResponse key={i}>{part.text}</MessageResponse> : null))}
                  </MessageContent>
                </Message>
              ) : (
                <AssistantMessage
                  key={message.id}
                  message={message}
                  state={turnState(message, index === messages.length - 1, status, ended)}
                  fallbackStart={index === messages.length - 1 ? sentAt : undefined}
                  endedAt={ended[message.id]?.at}
                />
              ),
            )
          )}

          {waitingForAnswer && (
            <Message from="assistant">
              <MessageContent className="gap-3">
                <Shimmer>Searching the handbook…</Shimmer>
                <TurnTimer start={sentAt} end={undefined} state="running" />
              </MessageContent>
            </Message>
          )}

          {errorView?.kind === "turn" && (
            <Alert variant="destructive">
              <AlertTitle>The answer failed</AlertTitle>
              <AlertDescription>{errorView.message}</AlertDescription>
              <AlertAction>
                <Button variant="outline" size="sm" onClick={retry}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <PromptInput onSubmit={(message: PromptInputMessage) => send(message.text)}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask about the PostHog handbook…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <span className="px-2 text-muted-foreground text-xs">
                {busy ? "Press Esc to stop" : `${health.provider.model}`}
              </span>
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stopResponse} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function turnState(
  message: HandbookUIMessage,
  isLast: boolean,
  status: ReturnType<typeof useChat>["status"],
  ended: Record<string, { state: "stopped" | "failed" }>,
): TurnState {
  const outcome = ended[message.id]?.state;
  if (outcome) return outcome;
  if (isLast && (status === "submitted" || status === "streaming")) return "running";
  if (isLast && status === "error") return "failed";
  return "done";
}

function EmptyConversation({ onAsk }: { onAsk: (question: string) => void }) {
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

function Unavailable({ message }: { message: string }) {
  return (
    <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenIcon />
        </EmptyMedia>
        <EmptyTitle>Surface can't answer right now</EmptyTitle>
        <EmptyDescription>
          <MessageResponse>{message}</MessageResponse>
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
