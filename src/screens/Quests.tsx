import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProgressBar } from '@/components/ui';
import { InputQuest, CertificateScreen } from '@/screens/QuestExtras';
import {
  QUESTS,
  ADDRESS_REGEX,
  findRow,
  loadQuestProgress,
  shortAddress,
  submitQuest,
} from '@/lib/quests';
import type { QuestKey, QuestProgressRow } from '@/lib/quests';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Lock,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

interface QuestsProps {
  onBack: () => void;
}

function Header({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="bg-gradient-to-b from-ink-900 to-ink-950 px-5 pt-10 pb-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-white text-balance leading-tight">
        {title}
      </h1>
    </div>
  );
}

function looksLikeSecret(value: string): boolean {
  const v = value.trim();

  if (/^(0x)?[a-fA-F0-9]{64}$/.test(v)) return true;

  const words = v.split(/\s+/).filter(Boolean);

  return words.length >= 6;
}

function StepCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-lime-500">
            {number}
          </span>
        </div>

        <h3 className="text-base font-bold text-white">
          {title}
        </h3>
      </div>

      <div className="text-sm text-gray-400 space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function CreateWalletQuest({
  row,
  onBack,
  onDone,
}: {
  row: QuestProgressRow | undefined;
  onBack: () => void;
  onDone: () => void;
}) {
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const trimmed = address.trim();
  const validFormat = ADDRESS_REGEX.test(trimmed);

  const savedAddress =
    row &&
    row.details &&
    typeof row.details.address === 'string'
      ? (row.details.address as string)
      : '';

  async function handleSubmit() {
    setFeedback(null);

    if (looksLikeSecret(trimmed)) {
      setFeedback({
        ok: false,
        message:
          'That looks like a private key or a seed phrase. Never type those anywhere. Clear the box and paste only your public address, the one that starts with 0x and has 42 characters.',
      });

      return;
    }

    if (!validFormat) {
      setFeedback({
        ok: false,
        message:
          'That is not a valid address yet. It must start with 0x and have 42 characters in total.',
      });

      return;
    }

    setSubmitting(true);

    const result = await submitQuest('create_wallet', {
      address: trimmed,
    });

    setSubmitting(false);

    setFeedback({
      ok: result.ok,
      message: result.message,
    });

    if (result.ok) onDone();
  }

  return (
    <div className="pb-24 animate-fade-in">
      <Header
        title="Quest 1: Create a wallet"
        onBack={onBack}
      />

      <div className="px-5 mt-2 space-y-3">
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />

          <p className="text-sm text-red-200 leading-relaxed">
            <span className="font-bold">Safety rule:</span>{' '}
            Web3 Sabi will never ask for your seed phrase or your
            private key. We do not accept them and we do not store
            them. If any website, app or person asks you for them,
            it is a scam.
          </p>
        </div>

        <StepCard number={1} title="Install a wallet">
          <p>
            A wallet is an app that holds your Web3 account. MetaMask
            is the main guide. Bitget Wallet also works if you prefer
            it.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="https://metamask.io/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-lime-500 text-ink-950 text-xs font-bold px-4 py-2 rounded-lg hover:bg-lime-400 transition-colors"
            >
              Get MetaMask
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://web3.bitget.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-ink-800 border border-ink-700 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:border-ink-600 transition-colors"
            >
              Bitget Wallet
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </StepCard>

        <StepCard number={2} title="Create your wallet">
          <p>
            Open the wallet and choose Create a new wallet. Set a
            strong password. The wallet will then show you a Secret
            Recovery Phrase, which is a list of 12 words.
          </p>

          <p>
            Write those words on paper and keep the paper safe. Do
            not take a screenshot. Do not save it in your phone
            notes or your email.
          </p>
        </StepCard>

        <StepCard number={3} title="Know the difference">
          <p>
            <span className="text-white font-semibold">
              Public address:
            </span>{' '}
            like your account number. It is safe to share so people
            can send you tokens.
          </p>

          <p>
            <span className="text-white font-semibold">
              Private key and seed phrase:
            </span>{' '}
            like your ATM card and your PIN together. Whoever has
            them controls your wallet forever, and there is no
            reset. Keep them secret, always.
          </p>
        </StepCard>

        <StepCard number={4} title="Paste your public address">
          <p>
            In the wallet, tap the copy button under your account
            name. Your public address starts with 0x and has 42
            characters. Paste only that address below.
          </p>

          {row?.completed ? (
            <div className="bg-lime-500/10 border border-lime-500/40 rounded-xl p-4 flex items-center gap-3 mt-2">
              <CheckCircle2 className="w-5 h-5 text-lime-500 flex-shrink-0" />

              <div>
                <p className="text-sm font-semibold text-white">
                  Quest complete
                </p>

                {savedAddress && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {shortAddress(savedAddress)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setFeedback(null);
                }}
                placeholder="0x..."
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lime-500/60 font-mono"
              />

              {trimmed !== '' &&
                !looksLikeSecret(trimmed) && (
                  <p
                    className={`text-xs ${
                      validFormat
                        ? 'text-lime-500'
                        : 'text-orange-400'
                    }`}
                  >
                    {validFormat
                      ? 'The format looks good.'
                      : 'Not a valid address yet. It must start with 0x and have 42 characters in total.'}
                  </p>
                )}

              <button
                onClick={handleSubmit}
                disabled={
                  submitting || trimmed === ''
                }
                className="w-full bg-lime-500 text-ink-950 font-bold rounded-xl py-3 text-sm hover:bg-lime-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Checking...'
                  : 'Submit my address'}
              </button>

              {feedback && (
                <p
                  className={`text-sm leading-relaxed ${
                    feedback.ok
                      ? 'text-lime-500'
                      : 'text-orange-400'
                  }`}
                >
                  {feedback.message}
                </p>
              )}
            </div>
          )}
        </StepCard>
      </div>
    </div>
  );
}

export default function Quests({
  onBack,
}: QuestsProps) {
  const { user } = useAuth();

  const [rows, setRows] = useState<QuestProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [active, setActive] = useState<
    QuestKey | 'certificate' | null
  >(null);

  const refresh = useCallback(async () => {
    if (!user) return;

    const result = await loadQuestProgress(user.id);

    setRows(result.rows);
    setLoadError(result.error);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (active === 'create_wallet') {
    return (
      <CreateWalletQuest
        row={findRow(rows, 'create_wallet')}
        onBack={() => setActive(null)}
        onDone={refresh}
      />
    );
  }

  if (active === 'certificate') {
    return (
      <CertificateScreen
        onBack={() => setActive(null)}
      />
    );
  }

  if (active) {
    return (
      <InputQuest
        questKey={active}
        row={findRow(rows, active)}
        onBack={() => setActive(null)}
        onDone={refresh}
        onCertificate={() =>
          setActive('certificate')
        }
      />
    );
  }

  const completedCount = QUESTS.filter(
    (q) => findRow(rows, q.key)?.completed
  ).length;

  const percent = Math.round(
    (completedCount / QUESTS.length) * 100
  );

  return (
    <div className="pb-24 animate-fade-in">
      <Header
        title="Learn by doing"
        onBack={onBack}
      />

      <div className="px-5 space-y-4">
        <p className="text-sm text-gray-400">
          Finish real Web3 quests on a test network. No real
          money is used.
        </p>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">
              Quest progress
            </span>

            <span className="text-xs font-semibold text-white">
              {completedCount} of {QUESTS.length}
            </span>
          </div>

          <ProgressBar value={percent} />
        </div>

        {loadError && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
            <p className="text-xs text-orange-300">
              Your quest progress could not load right now. You
              can still read the steps.
            </p>
          </div>
        )}

        <div className="space-y-2.5">
          {QUESTS.map((quest, index) => {
            const done =
              findRow(rows, quest.key)?.completed === true;

            const unlocked =
              index === 0 ||
              findRow(
                rows,
                QUESTS[index - 1].key
              )?.completed === true;

            const locked = !done && !unlocked;

            return (
              <button
                key={quest.key}
                onClick={() =>
                  !locked &&
                  setActive(quest.key)
                }
                disabled={locked}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                  done
                    ? 'bg-ink-850 border-lime-500/30'
                    : unlocked
                      ? 'bg-ink-850 border-lime-500/50 hover:border-lime-500'
                      : 'bg-ink-900 border-ink-700 opacity-60 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    done
                      ? 'bg-lime-500/20 border border-lime-500/40'
                      : unlocked
                        ? 'bg-lime-500/10 border border-lime-500/30'
                        : 'bg-ink-800 border border-ink-700'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                  ) : locked ? (
                    <Lock className="w-4 h-4 text-gray-600" />
                  ) : index === 0 ? (
                    <Wallet className="w-5 h-5 text-lime-500" />
                  ) : (
                    <span className="text-xs font-bold text-lime-500">
                      {quest.order}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {quest.title}
                  </p>

                  <p className="text-xs text-gray-500 mt-0.5">
                    {done
                      ? 'Completed'
                      : locked
                        ? 'Finish the quest before this one'
                        : quest.summary}
                  </p>
                </div>

                {!locked && (
                  <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}