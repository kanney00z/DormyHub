import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for LINE Notifications
  app.post("/api/send-line-notification", async (req: express.Request, res: express.Response) => {
    try {
      const { tokenType, notifyToken, channelAccessToken, userId, message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (tokenType === "Notify") {
        if (!notifyToken) {
          return res.status(400).json({ error: "LINE Notify Token is required" });
        }

        const params = new URLSearchParams();
        params.append("message", message);

        const response = await fetch("https://notify-api.line.me/api/notify", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${notifyToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const data: any = await response.json();
        if (!response.ok) {
          return res.status(response.status).json({ error: data.message || "Failed to send LINE Notify" });
        }

        return res.json({ success: true, provider: "Notify", result: data });
      } else if (tokenType === "MessagingApi") {
        if (!channelAccessToken) {
          return res.status(400).json({ error: "LINE Channel Access Token is required" });
        }

        // Decide between Push and Broadcast
        const isPush = !!userId;
        const endpoint = isPush 
          ? "https://api.line.me/v2/bot/message/push" 
          : "https://api.line.me/v2/bot/message/broadcast";

        const body: any = {
          messages: [
            {
              type: "text",
              text: message
            }
          ]
        };

        if (isPush) {
          body.to = userId;
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${channelAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return res.status(response.status).json({ error: errorText || "Failed to send LINE Message" });
        }

        const data = response.status === 204 ? { success: true } : await response.json();
        return res.json({ success: true, provider: isPush ? "MessagingApi-Push" : "MessagingApi-Broadcast", result: data });
      } else {
        return res.status(400).json({ error: "Invalid token type specified" });
      }
    } catch (err: any) {
      console.error("Error sending LINE notification:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
