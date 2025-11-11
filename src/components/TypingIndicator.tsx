"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <span className="inline-block w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.2s]"></span>
      <span className="inline-block w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:-0.1s]"></span>
      <span className="inline-block w-2 h-2 rounded-full bg-foreground/50 animate-bounce"></span>
      <span className="sr-only">AI is typing</span>
    </div>
  );
}

