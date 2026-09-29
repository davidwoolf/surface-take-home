import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BookOpenIcon, RotateCcwIcon, SquarePenIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Message, MessageContent, MessageResponse } from "@/components/chat/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/chat/prompt-input";
import { Shimmer } from "@/components/shimmer";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/alert";
import { Button } from "@/components/button";
import { Empty } from "@/components/empty";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/chat/message-scroller";
import { Spinner } from "@/components/spinner";
import { useEscapeToStop } from "@/hooks/use-escape-to-stop";
import { useHealth } from "@/hooks/use-health";
import { describeChatError } from "@/modules/chat/chat-errors";
import { type HandbookUIMessage, dataPartSchemas, messageMetadataSchema } from "@/modules/chat/message";
import { AssistantMessage } from "./assistant-message";
import { EmptyConversation } from "./empty-conversation";
import { TurnTimer, type TurnState } from "./turn-timer";
import { Unavailable } from "./unavailable";

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
    <MessageScrollerProvider autoScroll>
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

        {messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto">
            <EmptyConversation onAsk={send} />
          </div>
        ) : (
          <MessageScroller className="flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent aria-busy={busy} className="mx-auto w-full max-w-3xl p-4">
                {messages.map((message, index) => (
                  <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === "user"}>
                    {message.role === "user" ? (
                      <Message from="user">
                        <MessageContent>
                          {message.parts.map((part, i) =>
                            part.type === "text" ? <MessageResponse key={i}>{part.text}</MessageResponse> : null,
                          )}
                        </MessageContent>
                      </Message>
                    ) : (
                      <AssistantMessage
                        message={message}
                        state={turnState(message, index === messages.length - 1, status, ended)}
                        fallbackStart={index === messages.length - 1 ? sentAt : undefined}
                        endedAt={ended[message.id]?.at}
                      />
                    )}
                  </MessageScrollerItem>
                ))}

                {waitingForAnswer && (
                  <MessageScrollerItem>
                    <Message from="assistant">
                      <MessageContent className="gap-3">
                        <Shimmer>Searching the handbook…</Shimmer>
                        <TurnTimer start={sentAt} end={undefined} state="running" />
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}

                {errorView?.kind === "turn" && (
                  <MessageScrollerItem>
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
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        )}

        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <PromptInput onSubmit={(message: PromptInputMessage) => send(message.text)}>
            <PromptInputTextarea placeholder="Ask about the PostHog handbook…" />
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
    </MessageScrollerProvider>
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
