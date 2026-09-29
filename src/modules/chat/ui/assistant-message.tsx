import { Fragment } from "react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import type { HandbookUIMessage } from "../message";
import { splitAnswer } from "../quote-format";
import { QuoteCard, type QuoteStatus } from "./quote-card";
import { isHandbookToolPart, ToolStep } from "./tool-step";
import { TurnTimer, type TurnState } from "./turn-timer";

type Props = {
  message: HandbookUIMessage;
  state: TurnState;
  /** When the turn started, for the timer if the server hasn't sent its own start time yet. */
  fallbackStart?: number;
  /** When the client saw a stopped or failed turn end. */
  endedAt?: number;
};

/** An answer: reasoning, tool steps, markdown and quote cards in the order they streamed, plus the timer. */
export function AssistantMessage({ message, state, fallbackStart, endedAt }: Props) {
  const checks = message.parts.find((part) => part.type === "data-quote-verification")?.data.quotes;
  let quoteIndex = 0;

  const quoteStatus = (index: number): QuoteStatus => {
    const check = checks?.[index];
    if (check) return check;
    return state === "running" ? "checking" : "not-checked";
  };

  const lastIndex = message.parts.length - 1;

  return (
    <Message from="assistant">
      <MessageContent className="w-full gap-3">
        {message.parts.map((part, index) => {
          const key = `${message.id}-${index}`;
          if (part.type === "reasoning") {
            if (!part.text.trim()) return null;
            return (
              <Reasoning key={key} isStreaming={state === "running" && index === lastIndex}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          }
          if (isHandbookToolPart(part)) return <ToolStep key={key} part={part} />;
          if (part.type !== "text") return null;

          return (
            <Fragment key={key}>
              {splitAnswer(part.text).map((segment, i) =>
                segment.kind === "markdown" ? (
                  <MessageResponse key={i} isAnimating={state === "running" && index === lastIndex}>
                    {segment.text}
                  </MessageResponse>
                ) : (
                  <QuoteCard key={i} text={segment.text} source={segment.source} status={quoteStatus(quoteIndex++)} />
                ),
              )}
            </Fragment>
          );
        })}
        <TurnTimer
          start={message.metadata?.startedAt ?? fallbackStart}
          end={message.metadata?.finishedAt ?? endedAt}
          state={state}
        />
      </MessageContent>
    </Message>
  );
}
