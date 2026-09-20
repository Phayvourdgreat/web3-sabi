const WEBHOOK_URL = 'https://eyggo70s.rpcld.net/webhook/ai-tutor';

export interface TutorResponse {
  text: string;
  audio: string | null;
  image: string | null;
}

function findString(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

function findNestedString(obj: unknown, keyPaths: string[][]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const path of keyPaths) {
    let current: unknown = obj;
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === 'string' && current.trim()) return current.trim();
  }
  return null;
}

function normalizeAudio(val: string | null): string | null {
  if (!val) return null;
  if (val.startsWith('data:audio')) return val;
  if (val.startsWith('http')) return val;
  if (val.startsWith('blob:')) return val;
  const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(val) && val.length > 100;
  if (looksBase64) return `data:audio/mp3;base64,${val.replace(/\s/g, '')}`;
  return val;
}

function normalizeImage(val: string | null): string | null {
  if (!val) return null;
  if (val.startsWith('data:image')) return val;
  if (val.startsWith('http')) return val;
  if (val.startsWith('blob:')) return val;
  const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(val) && val.length > 100;
  if (looksBase64) return `data:image/png;base64,${val.replace(/\s/g, '')}`;
  return val;
}

// Posts a question to the n8n AI tutor webhook and returns the structured response.
// Always includes text. Audio and image are present only when the webhook returns them.
export async function askTutor(
  question: string,
  userId: string
): Promise<TutorResponse> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    const raw = await response.json();

    // n8n webhooks often return an array; unwrap to the first object
    const data =
      Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object'
        ? raw[0]
        : raw;

    const text =
      findString(data, ['text', 'response', 'answer', 'message', 'output', 'result']) ??
      findNestedString(data, [
        ['output', 'text'],
        ['output', 'response'],
        ['data', 'text'],
        ['data', 'response'],
        ['result', 'text'],
        ['json', 'text'],
        ['json', 'response'],
      ]) ??
      (typeof data === 'string' ? data.trim() : null) ??
      (typeof raw === 'string' ? raw.trim() : null);

    if (!text || typeof text !== 'string') {
      return {
        text: JSON.stringify(data, null, 2),
        audio: null,
        image: null,
      };
    }

    const audioRaw =
      findString(data, ['audio', 'audio_url', 'audioUrl', 'audio_data', 'audioData', 'voice', 'speech']) ??
      findNestedString(data, [
        ['output', 'audio'],
        ['output', 'audio_url'],
        ['data', 'audio'],
        ['data', 'audio_url'],
        ['json', 'audio'],
        ['json', 'audio_url'],
      ]);

    const imageRaw =
      findString(data, ['image', 'image_url', 'imageUrl', 'image_data', 'imageData', 'picture', 'photo', 'diagram']) ??
      findNestedString(data, [
        ['output', 'image'],
        ['output', 'image_url'],
        ['data', 'image'],
        ['data', 'image_url'],
        ['json', 'image'],
        ['json', 'image_url'],
      ]);

    return {
      text,
      audio: normalizeAudio(audioRaw),
      image: normalizeImage(imageRaw),
    };
  } catch {
    return {
      text: 'Sorry, I could not reach the AI tutor right now. Please check your connection and try again in a moment.',
      audio: null,
      image: null,
    };
  }
}
