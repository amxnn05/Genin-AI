import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Trash2,
  Paperclip,
  Mic,
  ArrowUp,
  Sparkles,
  User as UserIcon,
  Bot,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BACKEND_URL } from "../../config";

const supabase = createClient();

const SUGGESTIONS = [
  "What is the weather in San Francisco?",
  "Explain step-by-step how to solve this math problem: If x² + 6x + 9 = 25, what is x?",
  "Design a simple algorithm to find the longest palindrome in a string.",
];

interface Message {
  role: "User" | "Assistant";
  content: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getInfo() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
      }
    }
    getInfo();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (queryOverride?: string) => {
    const query = queryOverride || input;
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { role: "User", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${BACKEND_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          conversationId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const serverConvId = response.headers.get("X-Conversation-Id");
      if (serverConvId) setConversationId(serverConvId);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "Assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Backend sends <SOURCES> at the end, we might want to strip it or handle it
        if (chunk.includes("<SOURCES>")) {
          const [text, sources] = chunk.split("<SOURCES>");
          assistantContent += text;
          // Optional: handle sources logic here
          break;
        }

        assistantContent += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantContent;
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <h1 className="text-2xl font-bold mb-4">Welcome to Genin AI</h1>
        <Button onClick={() => navigate("/auth")}>
          Sign in to start chatting
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center py-4 px-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            supabase.auth.signOut();
            setUser(null);
          }}
        >
          Logout ({user.email?.split("@")[0]})
        </Button>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={clearChat}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-full max-w-4xl flex-1 flex flex-col items-center relative overflow-hidden">
        {messages.length === 0 ? (
          /* Suggestions View */
          <div className="flex flex-col items-center gap-8 w-full mt-24">
            <h2 className="text-3xl font-semibold flex items-center gap-2">
              Try these prompts{" "}
              <Sparkles className="h-6 w-6 text-yellow-400 fill-yellow-400" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full px-4">
              {SUGGESTIONS.map((suggestion, index) => (
                <Card
                  key={index}
                  className="p-6 bg-secondary/10 border-border/40 hover:bg-secondary/20 cursor-pointer transition-colors min-h-[140px] flex items-center"
                  onClick={() => handleSend(suggestion)}
                >
                  <p className="text-sm leading-relaxed text-center w-full">
                    {suggestion}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Messages View */
          <div
            ref={scrollRef}
            className="w-full flex-1 overflow-y-auto px-4 py-8 space-y-6 scrollbar-hide"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${msg.role === "User" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "Assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === "User"
                      ? "bg-foreground text-background"
                      : "bg-secondary/20 text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
                {msg.role === "User" && (
                  <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                    <UserIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 justify-start animate-pulse">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-secondary/10">
                  <div className="h-4 w-24 bg-secondary/20 rounded" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Input */}
        <div className="w-full mt-auto py-8 px-4">
          <div className="relative group">
            <div className="flex items-end gap-2 p-4 bg-secondary/10 border border-border/40 rounded-2xl focus-within:border-foreground/20 transition-all shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask AI..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-1 min-h-[40px] max-h-[200px] text-sm"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
                  disabled={!input.trim() || isLoading}
                  onClick={() => handleSend()}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
