import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_INVOICES, INITIAL_TICKETS, DEFAULT_SETTINGS } from "./src/data.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // CORS middleware for cross-origin access (e.g. from Vercel or external mobile web)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Ensure data directory exists for persistent DB storage
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbFilePath = path.join(dataDir, "db.json");

  // In-memory DB cache for 100% thread-safe atomic updates
  let inMemoryDb: any = null;

  function loadDbState() {
    if (inMemoryDb) return inMemoryDb;
    try {
      if (fs.existsSync(dbFilePath)) {
        const raw = fs.readFileSync(dbFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
          inMemoryDb = parsed;
          return inMemoryDb;
        }
      }
    } catch (err) {
      console.error("Error reading db.json, resetting to initial state:", err);
    }
    inMemoryDb = {
      rooms: INITIAL_ROOMS,
      bookings: INITIAL_BOOKINGS,
      invoices: INITIAL_INVOICES,
      tickets: INITIAL_TICKETS,
      settings: DEFAULT_SETTINGS,
      lastUpdated: Date.now(),
    };
    persistDbToDiskSync();
    return inMemoryDb;
  }

  function persistDbToDiskSync() {
    try {
      if (inMemoryDb) {
        fs.writeFileSync(dbFilePath, JSON.stringify(inMemoryDb, null, 2), "utf-8");
      }
    } catch (err) {
      console.error("Error writing db.json:", err);
    }
  }

  let saveTimer: NodeJS.Timeout | null = null;
  function queuePersistDbToDisk() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistDbToDiskSync();
    }, 100);
  }

  // Ensure DB initialized on server boot
  loadDbState();

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const startTime = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} (${duration}ms)\n`;
      try {
        fs.appendFileSync('server.log', logMsg);
      } catch (e) {}
    });
    next();
  });

  // GET /api/db - Returns shared server state for multi-device sync
  app.get("/api/db", (req: express.Request, res: express.Response) => {
    const state = loadDbState();
    return res.json(state);
  });

  // POST /api/db - Saves complete or partial shared state atomically in memory
  app.post("/api/db", (req: express.Request, res: express.Response) => {
    try {
      const db = loadDbState();
      const { rooms, bookings, invoices, tickets, settings } = req.body;

      if (rooms !== undefined) db.rooms = rooms;
      if (bookings !== undefined) db.bookings = bookings;
      if (invoices !== undefined) db.invoices = invoices;
      if (tickets !== undefined) db.tickets = tickets;
      if (settings !== undefined) db.settings = settings;
      
      const now = Date.now();
      db.lastUpdated = Math.max(now, (db.lastUpdated || 0) + 1);

      queuePersistDbToDisk();
      return res.json({ success: true, lastUpdated: db.lastUpdated, state: db });
    } catch (err: any) {
      console.error("Error syncing DB state:", err);
      return res.status(500).json({ error: err.message || "Failed to update DB" });
    }
  });

  // POST /api/db/reset - Reset DB back to initial default state
  app.post("/api/db/reset", (req: express.Request, res: express.Response) => {
    try {
      const now = Date.now();
      inMemoryDb = {
        rooms: INITIAL_ROOMS,
        bookings: INITIAL_BOOKINGS,
        invoices: INITIAL_INVOICES,
        tickets: INITIAL_TICKETS,
        settings: DEFAULT_SETTINGS,
        lastUpdated: Math.max(now, (inMemoryDb?.lastUpdated || 0) + 1),
      };
      persistDbToDiskSync();
      return res.json({ success: true, lastUpdated: inMemoryDb.lastUpdated, state: inMemoryDb });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to reset DB" });
    }
  });

  // POST /api/db/booking - Atomically add or update a booking and sync across all connected clients
  app.post("/api/db/booking", (req: express.Request, res: express.Response) => {
    try {
      const db = loadDbState();
      const newBooking = req.body.booking;
      const updatedRooms = req.body.rooms;

      if (!newBooking) {
        return res.status(400).json({ error: "Booking object required" });
      }

      // Check if booking already exists
      const existingIdx = db.bookings.findIndex((b: any) => b.id === newBooking.id);
      if (existingIdx >= 0) {
        db.bookings[existingIdx] = newBooking;
      } else {
        db.bookings.unshift(newBooking);
      }

      if (updatedRooms) {
        db.rooms = updatedRooms;
      }

      const now = Date.now();
      db.lastUpdated = Math.max(now, (db.lastUpdated || 0) + 1);
      queuePersistDbToDisk();
      return res.json({ success: true, lastUpdated: db.lastUpdated, state: db });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to add booking" });
    }
  });

  // API Route for LINE Notifications
  app.post("/api/send-line-notification", async (req: express.Request, res: express.Response) => {
    try {
      const { tokenType, notifyToken, channelAccessToken, userId, message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const cleanNotifyToken = notifyToken ? String(notifyToken).trim() : "";
      const cleanChannelAccessToken = channelAccessToken ? String(channelAccessToken).trim() : "";
      const cleanUserId = userId ? String(userId).trim() : "";

      if (tokenType === "Notify") {
        if (!cleanNotifyToken) {
          return res.status(400).json({ error: "LINE Notify Token is required" });
        }

        const params = new URLSearchParams();
        params.append("message", message);

        const response = await fetch("https://notify-api.line.me/api/notify", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cleanNotifyToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const status = response.status;
          let errMsg = "Failed to send LINE Notify";
          try {
            const data: any = await response.json();
            errMsg = data.message || errMsg;
          } catch (e) {
            // Ignore if not JSON
          }

          if (status === 401) {
            errMsg = "LINE Notify Token ไม่ถูกต้อง หรือถูกยกเลิกแล้ว (กรุณาเช็คความถูกต้องของ Token)";
          } else if (status === 400) {
            errMsg = "ข้อมูลที่ส่งไม่ถูกต้อง (เช่น ข้อความว่างเปล่า)";
          }
          
          return res.status(status).json({ error: `${status}: ${errMsg}` });
        }

        const data: any = await response.json();
        return res.json({ success: true, provider: "Notify", result: data });
      } else if (tokenType === "MessagingApi") {
        if (!cleanChannelAccessToken) {
          return res.status(400).json({ error: "LINE Channel Access Token is required" });
        }

        // Decide between Push and Broadcast
        const isPush = !!cleanUserId;
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
          body.to = cleanUserId;
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cleanChannelAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const status = response.status;
          let rawError = "";
          try {
            rawError = await response.text();
          } catch (e) {}

          let errMsg = "ส่งข้อความทาง LINE Bot ล้มเหลว";
          try {
            const parsed = JSON.parse(rawError);
            errMsg = parsed.message || errMsg;
            if (parsed.details && parsed.details.length > 0) {
              errMsg += ` (${parsed.details.map((d: any) => d.message).join(", ")})`;
            }
          } catch (e) {
            if (rawError) {
              errMsg = rawError;
            }
          }

          if (status === 401) {
            errMsg = "Channel Access Token ไม่ถูกต้อง/หมดอายุ (กรุณาตรวจสอบว่าคัดลอก Token มาครบถ้วน และไม่มีเว้นวรรค/อักขระส่วนเกิน)";
          } else if (status === 400) {
            if (isPush) {
              errMsg = "LINE User ID ไม่ถูกต้อง หรือบัญชี LINE ของคุณยังไม่ได้แอดเป็นเพื่อนกับบอทตัวนี้ (กรุณาตรวจสอบรูปแบบรหัส เช่น ขึ้นต้นด้วยตัว U และตามด้วยตัวเลข/อักขระยาว 33 ตัว)";
            } else {
              errMsg = "การส่งข้อความแบบ Broadcast ล้มเหลว (คุณอาจยังไม่ได้เปิดสิทธิ์ หรือติดขัดเรื่องโควต้าส่งของแผนบริการฟรีในบัญชี LINE Official Account ของคุณ)";
            }
          } else if (status === 403) {
            errMsg = "ไม่มีสิทธิ์เข้าถึง LINE API กรุณาตรวจสอบว่าเปิดใช้คุณสมบัติ Messaging API ใน LINE Developers Console แล้ว และได้กดยืนยันการใช้งานเรียบร้อยแล้ว";
          }

          return res.status(status).json({ error: `${status}: ${errMsg}` });
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
