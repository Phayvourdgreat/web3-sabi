export type SabiAction = 'ask_tutor' | 'generate_image' | 'generate_audio';

export interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface SabiRequest {
  action: SabiAction;
  lesson_id: string;
  lesson_title: string;
  lesson_content: string;
  session_id: string;
  question?: string;
  history?: HistoryItem[];
}

export interface SabiResponse {
  text: string | null;
  image: string | null;
  audio: string | null;
  raw: unknown;
  debug: string;
}

const FALLBACK_URL = 'https://eyggo70s.rpcld.net/webhook/ai-tutor';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const PROXY_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/sabi-proxy` : FALLBACK_URL;

function urlForAction(_action: SabiAction): string {
  return PROXY_URL;
}

const SESSION_KEY = 'sabi_session_id';

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sabi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
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

// Orbio image replies may nest the image inside choices[0].message
function findOrbioImage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const choices = record['choices'];
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | undefined;
    if (first && typeof first === 'object') {
      const message = first['message'] as Record<string, unknown> | undefined;
      if (message && typeof message === 'object') {
        const found =
          findString(message, ['image', 'image_url', 'url', 'content']) ??
          findNestedString(message, [['image', 'url'], ['image_url']]);
        if (found) return found;
      }
    }
  }
  return null;
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

function normalizeAudio(val: string | null): string | null {
  if (!val) return null;
  if (val.startsWith('data:audio')) return val;
  if (val.startsWith('http')) return val;
  if (val.startsWith('blob:')) return val;
  const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(val) && val.length > 100;
  if (looksBase64) return `data:audio/mp3;base64,${val.replace(/\s/g, '')}`;
  return val;
}

export async function sabiRequest(req: SabiRequest): Promise<SabiResponse> {
  const url = urlForAction(req.action);
  const body: Record<string, unknown> = {
    action: req.action,
    lesson_id: req.lesson_id,
    lesson_title: req.lesson_title,
    lesson_content: req.lesson_content,
    session_id: req.session_id,
  };
  if (req.question) body.question = req.question;
  if (req.history && req.history.length > 0) body.history = req.history;

  let response: Response;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SUPABASE_URL) {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      headers['apikey'] = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Sabi API] Fetch failed for', req.action, 'URL:', url, 'Error:', msg);
    throw new Error(`Network error: could not reach the AI service. | URL: ${url} | Error: ${msg}`);
  }

  const contentType = response.headers.get('content-type') || '';
  console.log('[Sabi API] Response for', req.action, '- status:', response.status, '- content-type:', contentType);

  if (!response.ok) {
    let errBody = '';
    try { errBody = await response.text(); } catch { /* ignore */ }
    console.error('[Sabi API] HTTP error', response.status, 'for', req.action, '- body:', errBody);
    throw new Error(`The AI service returned status ${response.status}. | URL: ${url} | Body: ${errBody.slice(0, 200)}`);
  }

  // Binary audio or image response, create object URL
  if (contentType.startsWith('audio/') || contentType.startsWith('image/')) {
    try {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      console.log('[Sabi API] Binary response for', req.action, '- blob URL created');
      if (contentType.startsWith('audio/')) {
        return { text: null, image: null, audio: objectUrl, raw: `[binary audio ${contentType}]`, debug: `URL: ${url} | Status: ${response.status} | Type: ${contentType}` };
      }
      return { text: null, image: objectUrl, audio: null, raw: `[binary image ${contentType}]`, debug: `URL: ${url} | Status: ${response.status} | Type: ${contentType}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read binary response. | URL: ${url} | Error: ${msg}`);
    }
  }

  // Read text first, never call .json() directly
  let responseText: string;
  try {
    responseText = await response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read response body. | URL: ${url} | Error: ${msg}`);
  }

  if (!responseText || !responseText.trim()) {
    console.warn('[Sabi API] Empty response body for', req.action);
    throw new Error(`n8n returned an empty response. | URL: ${url} | Status: ${response.status}`);
  }

  console.log('[Sabi API] Raw response text for', req.action, ':', responseText.slice(0, 500));

  // Parse JSON if content-type says so or text looks like JSON
  let parsed: unknown = null;
  const looksLikeJson = responseText.trim().startsWith('{') || responseText.trim().startsWith('[');
  if (contentType.includes('application/json') || looksLikeJson) {
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Sabi API] JSON parse failed for', req.action, '- text:', responseText.slice(0, 300));
      // If it is a plain text tutor reply, use it directly
      if (req.action === 'ask_tutor') {
        return {
          text: responseText.trim(),
          image: null,
          audio: null,
          raw: responseText,
          debug: `URL: ${url} | Status: ${response.status} | JSON parse failed: ${msg}`,
        };
      }
      throw new Error(`Failed to parse response as JSON. | URL: ${url} | Error: ${msg} | Body: ${responseText.slice(0, 200)}`);
    }
  } else {
    // Plain text response
    if (req.action === 'ask_tutor') {
      return {
        text: responseText.trim(),
        image: null,
        audio: null,
        raw: responseText,
        debug: `URL: ${url} | Status: ${response.status} | Type: text/plain`,
      };
    }
    // For image or audio actions with non JSON, non binary responses, treat as base64
    if (req.action === 'generate_image') {
      const img = normalizeImage(responseText.trim());
      if (img) return { text: null, image: img, audio: null, raw: responseText.slice(0, 100), debug: `URL: ${url} | Status: ${response.status} | Type: text` };
    }
    if (req.action === 'generate_audio') {
      const aud = normalizeAudio(responseText.trim());
      if (aud) return { text: null, image: null, audio: aud, raw: responseText.slice(0, 100), debug: `URL: ${url} | Status: ${response.status} | Type: text` };
    }
    throw new Error(`Unexpected text response for ${req.action}. | URL: ${url} | Body: ${responseText.slice(0, 200)}`);
  }

  const data =
    Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object'
      ? parsed[0]
      : parsed;

  // Handle proxy binary response { binary: true, data_url }
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    if (record['binary'] === true && typeof record['data_url'] === 'string') {
      const dataUrl = record['data_url'] as string;
      console.log('[Sabi API] Binary proxy response for', req.action, '- data_url length:', dataUrl.length);
      if (dataUrl.startsWith('data:audio')) {
        return { text: null, image: null, audio: dataUrl, raw: parsed, debug: `URL: ${url} | Status: ${response.status} | Binary audio via proxy` };
      }
      if (dataUrl.startsWith('data:image')) {
        return { text: null, image: dataUrl, audio: null, raw: parsed, debug: `URL: ${url} | Status: ${response.status} | Binary image via proxy` };
      }
    }
  }

  const text =
    findString(data, ['text', 'response', 'answer', 'message', 'output', 'result', 'reply']) ??
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
    (typeof parsed === 'string' ? parsed.trim() : null);

  let imageRaw =
    findString(data, ['image', 'image_url', 'imageUrl', 'image_data', 'imageData', 'picture', 'photo', 'diagram', 'url']) ??
    findNestedString(data, [
      ['output', 'image'],
      ['output', 'image_url'],
      ['output', 'url'],
      ['data', 'image'],
      ['data', 'image_url'],
      ['data', 'url'],
      ['json', 'image'],
      ['json', 'image_url'],
      ['result', 'image'],
      ['result', 'image_url'],
    ]) ??
    findOrbioImage(data);

  let audioRaw =
    findString(data, ['audio', 'audio_url', 'audioUrl', 'audio_data', 'audioData', 'voice', 'speech', 'url']) ??
    findNestedString(data, [
      ['output', 'audio'],
      ['output', 'audio_url'],
      ['output', 'url'],
      ['data', 'audio'],
      ['data', 'audio_url'],
      ['data', 'url'],
      ['json', 'audio'],
      ['json', 'audio_url'],
      ['result', 'audio'],
      ['result', 'audio_url'],
    ]);

  // For generate_image, check generic url, link or src as fallback
  if (!imageRaw && req.action === 'generate_image') {
    const genericUrl =
      findString(data, ['url', 'link', 'src']) ??
      findNestedString(data, [['output', 'url'], ['data', 'url'], ['json', 'url']]);
    if (genericUrl && (genericUrl.startsWith('http') || genericUrl.startsWith('data:image') || genericUrl.length > 100)) {
      imageRaw = genericUrl;
    }
  }

  // For generate_audio, check generic url, link or src as fallback
  if (!audioRaw && req.action === 'generate_audio') {
    const genericUrl =
      findString(data, ['url', 'link', 'src']) ??
      findNestedString(data, [['output', 'url'], ['data', 'url'], ['json', 'url']]);
    if (genericUrl && (genericUrl.startsWith('http') || genericUrl.startsWith('data:audio') || genericUrl.length > 100)) {
      audioRaw = genericUrl;
    }
  }

  const debug = `URL: ${url} | Status: ${response.status} | Type: ${contentType || 'json'}`;

  return {
    text: text ?? null,
    image: normalizeImage(imageRaw),
    audio: normalizeAudio(audioRaw),
    raw: parsed,
    debug,
  };
}