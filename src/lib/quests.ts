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

// Progress is saved in this browser, one bucket per learner
const STORAGE_PREFIX = 'sabi_quests_';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function readRows(userId: string): QuestProgressRow[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuestProgressRow[]) : [];
  } catch {
    return [];
  }
}

function writeRows(userId: string, rows: QuestProgressRow[]): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

export async function loadQuestProgress(
  userId: string,
): Promise<{ rows: QuestProgressRow[]; error: string | null }> {
  return { rows: readRows(userId), error: null };
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

function detailString(rows: QuestProgressRow[], key: QuestKey, field: string): string {
  const row = findRow(rows, key);
  const value = row && row.details ? row.details[field] : undefined;
  return typeof value === 'string' ? value : '';
}

function saveCompleted(userId: string, quest: QuestKey, details: Record<string, unknown>): boolean {
  const rows = readRows(userId).filter((r) => r.quest_key !== quest);
  rows.push({
    quest_key: quest,
    completed: true,
    details,
    completed_at: new Date().toISOString(),
  });
  return writeRows(userId, rows);
}

async function callProxy(
  body: Record<string, unknown>,
  token: string,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sabi-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    let parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) parsed = parsed[0];
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cleanNumber(value: string | undefined): string | null {
  const v = (value ?? '').trim().replace(',', '.');
  return /^\d*\.?\d+$/.test(v) ? v : null;
}

const SAVE_FAILED: QuestResult = {
  ok: false,
  message:
    'Your answer is correct, but this browser could not save your progress. Turn off private browsing and try again.',
};

const SERVER_FAILED: QuestResult = {
  ok: false,
  message: 'Could not reach the checking service. Check your internet and try again in a moment.',
};

export async function submitQuest(
  quest: QuestKey,
  fields: Record<string, string>,
): Promise<QuestResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, message: 'Please log in again and try once more.' };
  }
  const token = session?.access_token || ANON_KEY;

  const rows = readRows(userId);
  const walletAddress = detailString(rows, 'create_wallet', 'address');
  const savedTxHash = detailString(rows, 'send_tokens', 'tx_hash');

  // Quest 1: format check only, saved in this browser
  if (quest === 'create_wallet') {
    const address = (fields.address ?? '').trim();
    if (!ADDRESS_REGEX.test(address)) {
      return {
        ok: false,
        message: 'That is not a valid address. It must start with 0x and have 42 characters in total.',
      };
    }
    if (!saveCompleted(userId, quest, { address })) return SAVE_FAILED;
    return { ok: true, message: 'Well done. Your wallet address is saved. Quest 1 is complete.' };
  }

  // Quest 2: compare the typed balance with the Sepolia balance
  if (quest === 'receive_tokens') {
    if (!walletAddress) {
      return { ok: false, message: 'Finish Quest 1 first, so we know your wallet address.' };
    }
    const claimed = cleanNumber(fields.claimed_balance);
    if (!claimed) {
      return { ok: false, message: 'Type the balance as a number, for example 0.05.' };
    }
    const result = await callProxy(
      { action: 'check_balance', address: walletAddress, claimed_balance: claimed },
      token,
    );
    if (!result) return SERVER_FAILED;
    if (result.ok !== true) {
      if (result.error === 'rpc_error') {
        return {
          ok: false,
          message: 'The Sepolia test network did not answer. Wait a minute and try again.',
        };
      }
      return { ok: false, message: 'We could not check that address. Please try again.' };
    }
    if (result.funded !== true) {
      return {
        ok: false,
        message:
          'Your wallet has no Sepolia tokens yet. Use a faucet, wait for the tokens to arrive, then try again.',
      };
    }
    if (result.matches !== true) {
      return {
        ok: false,
        message:
          'That does not match the balance on the Sepolia network. Open your wallet, switch to the Sepolia network, and type the balance you see.',
      };
    }
    if (!saveCompleted(userId, quest, { claimed_balance: claimed, balance_eth: String(result.balance_eth) })) {
      return SAVE_FAILED;
    }
    return { ok: true, message: 'Correct. Your wallet holds Sepolia test tokens. Quest 2 is complete.' };
  }

  // Quest 3: verify the transaction on Sepolia
  if (quest === 'send_tokens') {
    if (!walletAddress) {
      return { ok: false, message: 'Finish Quest 1 first, so we know your wallet address.' };
    }
    const hash = (fields.tx_hash ?? '').trim();
    if (!TX_HASH_REGEX.test(hash)) {
      return {
        ok: false,
        message: 'A transaction hash starts with 0x and has 66 characters in total.',
      };
    }
    const result = await callProxy(
      { action: 'check_tx', tx_hash: hash, expected_from: walletAddress },
      token,
    );
    if (!result) return SERVER_FAILED;
    if (result.ok !== true) {
      if (result.error === 'tx_pending') {
        return { ok: false, message: 'That transaction is still pending. Wait a minute and try again.' };
      }
      if (result.error === 'tx_not_found') {
        return {
          ok: false,
          message:
            'We could not find that transaction on Sepolia. Check that you copied the full hash and that you sent it on the Sepolia network.',
        };
      }
      return { ok: false, message: 'That transaction hash is not valid. Copy it again and retry.' };
    }
    if (result.success !== true) {
      return { ok: false, message: 'That transaction did not succeed on the network.' };
    }
    if (result.sender_matches === false) {
      return {
        ok: false,
        message: 'That transaction was not sent from the wallet address you saved in Quest 1.',
      };
    }
    if (result.to_is_different !== true) {
      return { ok: false, message: 'Send the tokens to a different account, not to yourself.' };
    }
    if (result.has_amount !== true) {
      return {
        ok: false,
        message: 'That transaction did not move any test tokens. Send a small amount and try again.',
      };
    }
    if (
      !saveCompleted(userId, quest, {
        tx_hash: hash,
        value_eth: String(result.value_eth),
        fee_eth: String(result.fee_eth),
      })
    ) {
      return SAVE_FAILED;
    }
    return { ok: true, message: 'Transaction verified. Quest 3 is complete.' };
  }

  // Quest 4: compare the typed fee with the real fee of the Quest 3 transaction
  if (quest === 'gas_fees') {
    if (!savedTxHash) {
      return { ok: false, message: 'Finish Quest 3 first, so we know which transaction to use.' };
    }
    const claimedFee = cleanNumber(fields.claimed_fee);
    if (!claimedFee) {
      return { ok: false, message: 'Type the fee as a number, for example 0.00002.' };
    }
    const result = await callProxy(
      { action: 'check_tx', tx_hash: savedTxHash, claimed_fee: claimedFee },
      token,
    );
    if (!result) return SERVER_FAILED;
    if (result.ok !== true) {
      return { ok: false, message: 'We could not read your transaction right now. Please try again.' };
    }
    if (result.fee_has_claim !== true) {
      return { ok: false, message: 'Type the fee as a number, for example 0.00002.' };
    }
    if (result.fee_matches !== true) {
      return {
        ok: false,
        message:
          'That does not match the fee of your transaction. Look at the Transaction Fee on the block explorer and try again.',
      };
    }
    if (!saveCompleted(userId, quest, { claimed_fee: claimedFee, fee_eth: String(result.fee_eth) })) {
      return SAVE_FAILED;
    }
    return { ok: true, message: 'Correct. You found the gas fee. Quest 4 is complete.' };
  }

  return { ok: false, message: 'This quest is not available yet.' };
}