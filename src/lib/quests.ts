import { supabase } from '@/lib/supabase';

export type QuestKey = 'create_wallet' | 'receive_tokens' | 'send_tokens' | 'gas_fees';

export interface QuestDef {
  key: QuestKey;
  order: number;
  title: string;
  summary: string;
}

export const QUESTS: QuestDef[] = [
  {
    key: 'create_wallet',
    order: 1,
    title: 'Create a wallet',
    summary: 'Install a wallet and paste your public address.',
  },
  {
    key: 'receive_tokens',
    order: 2,
    title: 'Receive test tokens',
    summary: 'Get free Sepolia test tokens from a faucet.',
  },
  {
    key: 'send_tokens',
    order: 3,
    title: 'Send test tokens',
    summary: 'Send a small amount to a second account.',
  },
  {
    key: 'gas_fees',
    order: 4,
    title: 'Understand gas fees',
    summary: 'Find the gas fee of your transaction.',
  },
];

export const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export interface QuestProgressRow {
  quest_key: QuestKey;
  completed: boolean;
  details: Record<string, unknown> | null;
  completed_at: string | null;
}

export async function loadQuestProgress(
  userId: string,
): Promise<{ rows: QuestProgressRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('quest_progress')
    .select('quest_key, completed, details, completed_at')
    .eq('user_id', userId);
  if (error) return { rows: [], error: error.message };
  return { rows: (data as QuestProgressRow[]) ?? [], error: null };
}

export function findRow(rows: QuestProgressRow[], key: QuestKey): QuestProgressRow | undefined {
  return rows.find((r) => r.quest_key === key);
}

export interface QuestResult {
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export async function submitQuest(
  quest: QuestKey,
  fields: Record<string, string>,
): Promise<QuestResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, message: 'Please log in again and try once more.' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sabi-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ action: 'quest_submit', quest, ...fields }),
    });

    const text = await response.text();
    let parsed: { ok?: boolean; message?: string; data?: Record<string, unknown> } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed.message === 'string') {
      return { ok: parsed.ok === true, message: parsed.message, data: parsed.data };
    }
    return { ok: false, message: 'Something went wrong. Please try again in a moment.' };
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your internet and try again.' };
  }
}