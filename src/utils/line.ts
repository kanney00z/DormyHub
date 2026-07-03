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

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to send notification' };
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

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to send test notification' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error in testLineNotification:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}
