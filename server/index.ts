import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

const conversations = new Map<string, Message[]>();

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/conversations/:id/messages", (req, res) => {
  const msgs = conversations.get(req.params.id) ?? [];
  res.json(msgs);
});

app.post("/api/conversations/:id/messages", async (req, res) => {
  const { content } = req.body as { content: string };
  const id = req.params.id;

  if (!content?.trim()) {
    return res.status(400).json({ error: "Content is required" });
  }

  const history: Message[] = conversations.get(id) ?? [];
  history.push({ role: "user", content });
  conversations.set(id, history);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: "You are maxx-XMD AI, a helpful and knowledgeable assistant. Be concise, clear, and friendly.",
        },
        ...history,
      ],
      stream: true,
      max_completion_tokens: 8192,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    history.push({ role: "assistant", content: fullResponse });
    conversations.set(id, history);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("OpenAI error:", err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "AI request failed" });
    }
  }
});

app.delete("/api/conversations/:id", (req, res) => {
  conversations.delete(req.params.id);
  res.status(204).send();
});

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
