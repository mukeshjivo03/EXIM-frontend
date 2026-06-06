import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, ShipWheel, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { sendAiChatMessage } from "@/api/ai";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export default function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Ask me about stock, planning, contracts, or reports.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    inputRef.current?.focus();
  }, [open, messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const data = await sendAiChatMessage(text);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.response || "No response returned.",
        },
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to get chatbot response"));
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, I could not get a response right now.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-3 z-50 w-[calc(100vw-1.5rem)] max-w-[420px] overflow-hidden rounded-xl border bg-card shadow-2xl sm:right-5">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate">AI Assistant</p>
                  <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                    BETA
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Prototype chatbot</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="max-h-[52vh] min-h-[320px] overflow-y-auto px-3 py-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[86%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={2}
                className="min-h-[44px] max-h-28 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={sending}
              />
              <Button
                type="button"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                title="Send message"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "group fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-3 z-50 sm:right-5",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "border border-cyan-100/50 bg-[radial-gradient(circle_at_35%_25%,#f8fafc_0%,#94a3b8_18%,#334155_42%,#0f172a_100%)]",
          "text-cyan-50 shadow-[0_14px_36px_rgba(15,23,42,0.35)]",
          "ring-2 ring-cyan-200/30 transition-all duration-300",
          "hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_18px_44px_rgba(14,116,144,0.34)]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/30",
          open && "scale-105 shadow-[0_18px_44px_rgba(14,116,144,0.34)]"
        )}
        title="AI Assistant Beta"
      >
        <span className="absolute inset-1 rounded-full border border-white/20" />
        <span className="absolute inset-0 rounded-full bg-cyan-100/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="absolute -inset-1 -z-10 rounded-full bg-cyan-500/25 blur-md opacity-70 transition-opacity group-hover:opacity-100" />
        <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.95)]" />
        <ShipWheel className={cn("relative h-7 w-7 drop-shadow-sm transition-transform duration-500 group-hover:rotate-45", open ? "scale-0 rotate-90" : "scale-100 rotate-0")} />
        <X className={cn("absolute h-5 w-5 transition-transform duration-300", open ? "scale-100 rotate-0" : "scale-0 -rotate-45")} />
        <span className="absolute -right-2 -top-2 inline-flex items-center gap-0.5 rounded-full border border-amber-100 bg-amber-400 px-1.5 py-0.5 text-[9px] font-black leading-none text-slate-950 shadow-md">
          <Sparkles className="h-2.5 w-2.5" />
          BETA
        </span>
      </button>
    </>
  );
}
