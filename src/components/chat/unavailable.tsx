import { BookOpenIcon } from "lucide-react";
import { MessageResponse } from "@/components/chat/message";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/empty";

/** Replaces the chat when the server can't answer: no knowledgebase or no provider. */
export function Unavailable({ message }: { message: string }) {
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
