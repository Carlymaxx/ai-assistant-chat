import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface Conversation {
  id: string;
  title: string;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: "default", title: "New conversation" },
  ]);
  const [activeId, setActiveId] = useState("default");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeMessages = messages[activeId] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text, id: generateId() };
    const assistantId = generateId();
    const assistantMsg: Message = { role: "assistant", content: "", id: assistantId };

    setMessages((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), userMsg, assistantMsg],
    }));

    if ((messages[activeId] ?? []).length === 0) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? { ...c, title: text.slice(0, 40) + (text.length > 40 ? "…" : "") }
            : c
        )
      );
    }

    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.content) {
              setMessages((prev) => {
                const list = [...(prev[activeId] ?? [])];
                const idx = list.findIndex((m) => m.id === assistantId);
                if (idx !== -1) {
                  list[idx] = { ...list[idx], content: list[idx].content + ev.content };
                }
                return { ...prev, [activeId]: list };
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const list = [...(prev[activeId] ?? [])];
        const idx = list.findIndex((m) => m.id === assistantId);
        if (idx !== -1) {
          list[idx] = { ...list[idx], content: "Sorry, something went wrong. Please try again." };
        }
        return { ...prev, [activeId]: list };
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, activeId, messages]);

  const newConversation = () => {
    const id = generateId();
    setConversations((prev) => [{ id, title: "New conversation" }, ...prev]);
    setActiveId(id);
  };

  const deleteConversation = (id: string) => {
    if (conversations.length === 1) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeId === id) {
      setActiveId(conversations.find((c) => c.id !== id)?.id ?? "");
    }
    fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <button className="icon-btn toggle-btn" onClick={() => setSidebarOpen((o) => !o)} title="Toggle sidebar">
            <MenuIcon />
          </button>
          {sidebarOpen && (
            <button className="new-chat-btn" onClick={newConversation}>
              <PlusIcon /> New chat
            </button>
          )}
        </div>
        {sidebarOpen && (
          <div className="conv-list">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conv-item ${c.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(c.id)}
              >
                <span className="conv-title">{c.title}</span>
                {conversations.length > 1 && (
                  <button
                    className="icon-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(c.id);
                    }}
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          {!sidebarOpen && (
            <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar">
              <MenuIcon />
            </button>
          )}
          <span className="chat-title">
            {conversations.find((c) => c.id === activeId)?.title ?? "maxx-XMD AI"}
          </span>
        </header>

        <div className="messages">
          {activeMessages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <SparkleIcon />
              </div>
              <h2>Welcome to maxx-XMD AI</h2>
              <p>Ask me anything — I&rsquo;m here to assist.</p>
            </div>
          )}
          {activeMessages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? <UserIcon /> : <BotIcon />}
              </div>
              <div className="message-content">
                {msg.content || (msg.role === "assistant" && streaming ? (
                  <span className="typing-indicator">
                    <span /><span /><span />
                  </span>
                ) : "")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-box">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message maxx-XMD AI..."
              disabled={streaming}
            />
            <button
              className={`send-btn ${(!input.trim() || streaming) ? "disabled" : ""}`}
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              title="Send"
            >
              <SendIcon />
            </button>
          </div>
          <p className="disclaimer">AI can make mistakes. Verify important info.</p>
        </div>
      </main>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3,6 5,6 21,6" /><path d="M19,6l-1,14H6L5,6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function BotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M12 11V6" /><circle cx="12" cy="4" r="2" /><line x1="8" y1="15" x2="8" y2="15" strokeWidth="3" /><line x1="16" y1="15" x2="16" y2="15" strokeWidth="3" />
    </svg>
  );
}
