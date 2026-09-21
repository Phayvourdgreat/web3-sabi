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

export interface QuestResult {
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
}

const STORAGE_PREFIX = 'sabi_quests_v1_';

function readRows(userId: string): QuestProgressRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuestProgressRow[]) : [];
  } catch {
    return [];
  }
}

function writeRows(userId: string, rows: QuestProgressRow[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(rows));
  } catch {
    // Browser storage can be blocked. The quest then will not stay saved.
  }
}

function markDone(userId: string, quest: QuestKey, details: Record<string, unknown>): void {
  const rows = readRows(userId).filter((r) => r.quest_key !== quest);
  rows.push({
    quest_key: quest,
    completed: true,
    details,
    completed_at: new Date().toISOString(),
  });
  writeRows(userId, rows);
}

export async function loadQuestProgress(
  userId: string,
): Promise<{ rows: QuestProgressRow[]; error: string | null }> {
  return { rows: readRows(userId), error: null };
}

export function findRow(rows: QuestProgressRow[], key: QuestKey): QuestProgressRow | undefined {
  return rows.find((r) => r.quest_key === key);
}

function savedAddress(rows: QuestProgressRow[]): string {
  const row = rows.find((r) => r.quest_key === 'create_wallet' && r.completed);
  const value = row?.details?.address;
  return typeof value === 'string' ? value : '';
}

function savedTxHash(rows: QuestProgressRow[]): string {
  const row = rows.find((r) => r.quest_key === 'send_tokens' && r.completed);
  const value = row?.details?.tx_hash;
  return typeof value === 'string' ? value : '';
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let lastCheck = 0;
function tooFast(): boolean {
  const now = Date.now();
  if (now - lastCheck < 3000) return true;
  lastCheck = now;
  return false;
}

async function callChecker(
  payload: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sabi-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    const text = await response.text();
    const parsed = JSON.parse(text);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    return item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const NETWORK_MESSAGE =
  'Could not reach the test network checker. Check your internet and try again in a moment.';

function checkerError(code: unknown): string {
  if (code === 'bad_hash') {
    return 'That is not a valid transaction hash. It starts with 0x and has 66 characters in total.';
  }
  if (code === 'tx_not_found') {
    return 'We could not find that transaction on Sepolia. Check the hash, and make sure it is from the Sepolia network.';
  }
  if (code === 'tx_pending') {
    return 'That transaction is still pending. Wait a minute and try again.';
  }
  if (code === 'bad_address') {
    return 'The address saved in Quest 1 is not valid. Please redo Quest 1.';
  }
  return 'The test network did not answer. Please try again in a minute.';
}

function isNumber(text: string): boolean {
  return text !== '' && Number.isFinite(Number(text.replace(',', '.')));
}

export async function submitQuest(
  quest: QuestKey,
  fields: Record<string, string>,
): Promise<QuestResult> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) {
    return { ok: false, message: 'Please log in again and try once more.' };
  }
  const rows = readRows(userId);

  if (quest === 'create_wallet') {
    const address = (fields.address ?? '').trim();
    if (!ADDRESS_REGEX.test(address)) {
      return {
        ok: false,
        message: 'That is not a valid address. It must start with 0x and have 42 characters in total.',
      };
    }
    markDone(userId, 'create_wallet', { address });
    return { ok: true, message: 'Wallet address saved. Quest 2 is now open.' };
  }

  const address = savedAddress(rows);
  if (!address) {
    return { ok: false, message: 'Finish Quest 1 first, so we know your wallet address.' };
  }

  if (quest === 'receive_tokens') {
    const claimed = (fields.claimed_balance ?? '').trim();
    if (!isNumber(claimed)) {
      return { ok: false, message: 'Type your balance as a number, for example 0.05.' };
    }
    if (tooFast()) {
      return { ok: false, message: 'Please wait a few seconds before trying again.' };
    }
    const res = await callChecker({ action: 'check_balance', address, claimed_balance: claimed });
    if (!res) return { ok: false, message: NETWORK_MESSAGE };
    if (res.ok !== true) return { ok: false, message: checkerError(res.error) };
    if (res.funded !== true) {
      return {
        ok: false,
        message: `No test tokens have reached ${shortAddress(address)} yet. Wait a minute after using the faucet and try again. Also check that this is the address in your wallet.`,
      };
    }
    if (res.matches !== true) {
      return {
        ok: false,
        message:
          'That balance does not match. Open your wallet on the Sepolia network, copy the balance exactly as shown, and try again.',
      };
    }
    markDone(userId, 'receive_tokens', { address, balance: res.balance_eth });
    return { ok: true, message: 'Correct. Your wallet received test tokens.' };
  }

  if (quest === 'send_tokens') {
    const hash = (fields.tx_hash ?? '').trim().toLowerCase();
    if (!TX_HASH_REGEX.test(hash)) {
      return { ok: false, message: checkerError('bad_hash') };
    }
    if (tooFast()) {
      return { ok: false, message: 'Please wait a few seconds before trying again.' };
    }
    const res = await callChecker({ action: 'check_tx', tx_hash: hash, expected_from: address });
    if (!res) return { ok: false, message: NETWORK_MESSAGE };
    if (res.ok !== true) return { ok: false, message: checkerError(res.error) };
    if (res.success !== true) {
      return { ok: false, message: 'That transaction failed on the network. Please send a new one.' };
    }
    if (res.sender_matches === false) {
      return {
        ok: false,
        message: 'This transaction was not sent from the wallet address you saved in Quest 1.',
      };
    }
    if (res.has_amount !== true) {
      return {
        ok: false,
        message: 'This transaction did not send any tokens. Send a small amount to your second account.',
      };
    }
    if (res.to_is_different !== true) {
      return { ok: false, message: 'You must send the tokens to a different account.' };
    }
    markDone(userId, 'send_tokens', {
      tx_hash: hash,
      from: res.from,
      to: res.to,
      value_eth: res.value_eth,
      fee_eth: res.fee_eth,
    });
    return {
      ok: true,
      message: `Verified. You sent ${String(res.value_eth)} test ETH to ${shortAddress(String(res.to))}.`,
    };
  }

  const txHash = savedTxHash(rows);
  if (!txHash) {
    return { ok: false, message: 'Finish Quest 3 first, so we know which transaction to use.' };
  }
  const claimedFee = (fields.claimed_fee ?? '').trim();
  if (!isNumber(claimedFee)) {
    return { ok: false, message: 'Type the fee as a number, for example 0.000021.' };
  }
  if (tooFast()) {
    return { ok: false, message: 'Please wait a few seconds before trying again.' };
  }
  const res = await callChecker({ action: 'check_tx', tx_hash: txHash, claimed_fee: claimedFee });
  if (!res) return { ok: false, message: NETWORK_MESSAGE };
  if (res.ok !== true) return { ok: false, message: checkerError(res.error) };
  if (res.fee_matches !== true) {
    return {
      ok: false,
      message:
        'That is not the fee we found. Open your Quest 3 transaction on the Sepolia block explorer, find the Transaction Fee line, and type only that number.',
    };
  }
  markDone(userId, 'gas_fees', { tx_hash: txHash, fee_eth: res.fee_eth });
  return {
    ok: true,
    message: 'Correct. You found the real gas fee of your transaction. Your certificate is ready.',
  };
}

export async function resetQuestProgress(userId: string): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_PREFIX + userId);
  } catch {
    // Browser storage can be blocked. Nothing to clear then.
  }
}