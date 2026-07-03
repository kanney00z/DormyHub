import { SystemSettings } from '../types';

export interface SendLineNotificationPayload {
  tokenType: 'Notify' | 'MessagingApi';
  notifyToken?: string;
  channelAccessToken?: string;
  userId?: string;
  message: string;
}

export async function sendLineNotification(settings: SystemSettings, message: string): Promise<{ success: boolean; error?: string }> {
  if (!settings.lineNotificationEnabled) {
    return { success: false, error: 'LINE notification is disabled in settings' };
  }

  const tokenType = settings.lineTokenType || 'MessagingApi';
  const payload: SendLineNotificationPayload = {
    tokenType,
    message,
  };

  if (tokenType === 'Notify') {
    if (!settings.lineNotifyToken) {
      return { success: false, error: 'LINE Notify Token is empty' };
    }
    payload.notifyToken = settings.lineNotifyToken;
  } else {
    if (!settings.lineChannelAccessToken) {
      return { success: false, error: 'LINE Channel Access Token is empty' };
    }
    payload.channelAccessToken = settings.lineChannelAccessToken;
    if (settings.lineUserId) {
      payload.userId = settings.lineUserId;
    }
  }

  try {
    const res = await fetch('/api/send-line-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errMsg = `Error (${res.status})`;
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        errMsg = `ระบบกำลังรีสตาร์ทเพื่อนำเข้าข้อมูลความปลอดภัยหรือเซิร์ฟเวอร์ยังไม่พร้อมใช้งานชั่วคราว (กรุณารอสักครู่ประมาณ 5-10 วินาทีแล้วลองใหม่อีกครั้ง)`;
      } else {
        try {
          const rawText = await res.text();
          try {
            const data = JSON.parse(rawText);
            errMsg = data.error || errMsg;
          } catch (jsonErr) {
            if (rawText && rawText.trim()) {
              errMsg = rawText.slice(0, 150);
            }
          }
        } catch (e) {}
      }
      return { success: false, error: errMsg };
    }

    let data;
    try {
      const rawText = await res.text();
      data = JSON.parse(rawText);
    } catch (e) {
      return { success: false, error: 'ได้รับข้อมูลตอบกลับในรูปแบบที่ไม่ถูกต้อง (ไม่ใช่ JSON)' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in sendLineNotification:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}

// Separate function to allow manual testing with custom options
export async function testLineNotification(payload: SendLineNotificationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/send-line-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errMsg = `Error (${res.status})`;
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        errMsg = `ระบบกำลังรีสตาร์ทเพื่อนำเข้าข้อมูลความปลอดภัยหรือเซิร์ฟเวอร์ยังไม่พร้อมใช้งานชั่วคราว (กรุณารอสักครู่ประมาณ 5-10 วินาทีแล้วลองใหม่อีกครั้ง)`;
      } else {
        try {
          const rawText = await res.text();
          try {
            const data = JSON.parse(rawText);
            errMsg = data.error || errMsg;
          } catch (jsonErr) {
            if (rawText && rawText.trim()) {
              errMsg = rawText.slice(0, 150);
            }
          }
        } catch (e) {}
      }
      return { success: false, error: errMsg };
    }

    let data;
    try {
      const rawText = await res.text();
      data = JSON.parse(rawText);
    } catch (e) {
      return { success: false, error: 'ได้รับข้อมูลตอบกลับในรูปแบบที่ไม่ถูกต้อง (ไม่ใช่ JSON)' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in testLineNotification:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}
