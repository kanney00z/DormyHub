export default async function handler(req, res) {
  // Add CORS headers to allow requests from any sub-domain of the user if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
          const data = await response.json();
          errMsg = data.message || errMsg;
        } catch (e) {}

        if (status === 401) {
          errMsg = "LINE Notify Token ไม่ถูกต้อง หรือถูกยกเลิกแล้ว (กรุณาเช็คความถูกต้องของ Token)";
        } else if (status === 400) {
          errMsg = "ข้อมูลที่ส่งไม่ถูกต้อง (เช่น ข้อความว่างเปล่า)";
        }
        
        return res.status(status).json({ error: `${status}: ${errMsg}` });
      }

      const data = await response.json();
      return res.status(200).json({ success: true, provider: "Notify", result: data });
    } else if (tokenType === "MessagingApi") {
      if (!cleanChannelAccessToken) {
        return res.status(400).json({ error: "LINE Channel Access Token is required" });
      }

      const isPush = !!cleanUserId;
      const endpoint = isPush 
        ? "https://api.line.me/v2/bot/message/push" 
        : "https://api.line.me/v2/bot/message/broadcast";

      const body = {
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
            errMsg += ` (${parsed.details.map((d) => d.message).join(", ")})`;
          }
        } catch (e) {
          if (rawError) {
            errMsg = rawError;
          }
        }

        if (status === 401) {
          errMsg = "Channel Access Token ไม่ถูกต้อง/หมดอายุ (กรุณาตรวจสอบว่าคัดลอก Token มาครบถ้วน)";
        } else if (status === 400) {
          if (isPush) {
            errMsg = "LINE User ID ไม่ถูกต้อง หรือบัญชี LINE ของคุณยังไม่ได้แอดเป็นเพื่อนกับบอทตัวนี้";
          } else {
            errMsg = "การส่งข้อความแบบ Broadcast ล้มเหลว";
          }
        } else if (status === 403) {
          errMsg = "ไม่มีสิทธิ์เข้าถึง LINE API กรุณาตรวจสอบว่าเปิดใช้คุณสมบัติ Messaging API แล้ว";
        }

        return res.status(status).json({ error: `${status}: ${errMsg}` });
      }

      const data = response.status === 204 ? { success: true } : await response.json();
      return res.status(200).json({ success: true, provider: isPush ? "MessagingApi-Push" : "MessagingApi-Broadcast", result: data });
    } else {
      return res.status(400).json({ error: "Invalid token type specified" });
    }
  } catch (err) {
    console.error("Error sending LINE notification in Vercel function:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
