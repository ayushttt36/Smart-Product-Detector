import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";

const SUGGESTIONS = [
  "How do I verify a product?",
  "What does 'not verified' mean?",
  "How do I register a product as a dealer?",
];

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    void sendMessage({ text: value });
    setInput("");
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="btn btn-primary fixed bottom-5 right-5 z-50 !size-14 !rounded-full !p-0 shadow-lg"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {open && (
        <div className="panel fixed bottom-24 right-5 z-50 flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Bot className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Product Assistant</p>
              <p className="text-xs text-muted-foreground">Ask about scanning & verification</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Hi! I can help you verify products or get started as a dealer.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              if (!text) return null;
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-secondary text-foreground"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Thinking…
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">
                The assistant is unavailable right now. Please try again.
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary !px-3">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
