import { useState } from 'react';
import { ArrowLeft, Award, CheckCircle2, Download, ExternalLink } from 'lucide-react';
import { submitQuest } from '@/lib/quests';
import type { QuestKey, QuestProgressRow } from '@/lib/quests';
import { sabiRequest, getSessionId } from '@/lib/sabiApi';

interface StepDef {
  title: string;
  body: string[];
  links?: { label: string; href: string }[];
}

interface QuestConfig {
  title: string;
  steps: StepDef[];
  inputTitle: string;
  inputBody: string;
  field: string;
  placeholder: string;
  button: string;
}

const EXPLORER = 'https://sepolia.etherscan.io';

const CONFIGS: Record<string, QuestConfig> = {
  receive_tokens: {
    title: 'Quest 2: Receive test tokens',
    steps: [
      {
        title: 'Switch to the Sepolia network',
        body: [
          'Open your wallet, open the network menu at the top, and turn on Show test networks. Then choose Sepolia.',
          'Sepolia is a practice network. Its tokens are free and have no real value.',
        ],
      },
      {
        title: 'Get free test tokens',
        body: [
          'Open a public Sepolia faucet, paste your public address, and ask for tokens. Some faucets ask you to sign in or solve a check. If one does not work, search for another Sepolia faucet.',
        ],
        links: [
          {
            label: 'Open a Sepolia faucet',
            href: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
          },
        ],
      },
      {
        title: 'Wait, then read your balance',
        body: ['Tokens can take a minute to arrive. When they show in your wallet on the Sepolia network, read the balance.'],
      },
    ],
    inputTitle: 'Type your balance',
    inputBody: 'Type the Sepolia balance you see in your wallet, as a number, for example 0.05. We will compare it with the real balance on the network.',
    field: 'claimed_balance',
    placeholder: '0.05',
    button: 'Check my balance',
  },
  send_tokens: {
    title: 'Quest 3: Send test tokens',
    steps: [
      {
        title: 'Prepare a second account',
        body: ['In your wallet, create a second account, or ask a friend for their public address. You will send a small amount to it.'],
      },
      {
        title: 'Send a small amount',
        body: ['On the Sepolia network, tap Send, paste the second address, and send a tiny amount like 0.001. Confirm the transaction and wait for it to finish.'],
      },
      {
        title: 'Copy the transaction hash',
        body: ['Open the transaction in your wallet activity and choose View on block explorer. Copy the transaction hash. It starts with 0x and has 66 characters.'],
        links: [{ label: 'Sepolia block explorer', href: EXPLORER }],
      },
    ],
    inputTitle: 'Paste the transaction hash',
    inputBody: 'We will check the network to confirm that the transaction is real, that it came from your wallet, and that it went to a different account.',
    field: 'tx_hash',
    placeholder: '0x...',
    button: 'Verify my transaction',
  },
  gas_fees: {
    title: 'Quest 4: Understand gas fees',
    steps: [
      {
        title: 'What is gas?',
        body: [
          'Gas is the fee you pay the network to process your transaction. Think of an okada fare. The road, the traffic and the distance change the price of the trip. On a blockchain, the busy network and the size of the transaction change the gas fee.',
        ],
      },
      {
        title: 'Find the fee of your transaction',
        body: ['Open your Quest 3 transaction on the Sepolia block explorer. Find the line called Transaction Fee. It is a very small number of ETH.'],
        links: [{ label: 'Sepolia block explorer', href: EXPLORER }],
      },
    ],
    inputTitle: 'Type the fee',
    inputBody: 'Type only the number from the Transaction Fee line, for example 0.000021. We will compare it with the real fee.',
    field: 'claimed_fee',
    placeholder: '0.000021',
    button: 'Check my fee',
  },
};

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="bg-gradient-to-b from-ink-900 to-ink-950 px-5 pt-10 pb-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-white text-balance leading-tight">{title}</h1>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-lime-500">{number}</span>
        </div>
        <h3 className="text-base font-bold text-white">{title}</h3>
      </div>
      <div className="text-sm text-gray-400 space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}

export function InputQuest({
  questKey,
  row,
  onBack,
  onDone,
  onCertificate,
}: {
  questKey: QuestKey;
  row: QuestProgressRow | undefined;
  onBack: () => void;
  onDone: () => void;
  onCertificate: () => void;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const config = CONFIGS[questKey];
  if (!config) return null;

  async function handleSubmit() {
    const text = value.trim();
    if (!text) return;
    setBusy(true);
    setFeedback(null);
    const result = await submitQuest(questKey, { [config.field]: text });
    setBusy(false);
    setFeedback({ ok: result.ok, message: result.message });
    if (result.ok) onDone();
  }

  return (
    <div className="pb-24 animate-fade-in">
      <PageHeader title={config.title} onBack={onBack} />
      <div className="px-5 mt-2 space-y-3">
        {config.steps.map((step, i) => (
          <Step key={step.title} number={i + 1} title={step.title}>
            {step.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {step.links && (
              <div className="flex flex-wrap gap-2 pt-1">
                {step.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-lime-500 text-ink-950 text-xs font-bold px-4 py-2 rounded-lg hover:bg-lime-400 transition-colors"
                  >
                    {link.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            )}
          </Step>
        ))}

        <Step number={config.steps.length + 1} title={config.inputTitle}>
          <p>{config.inputBody}</p>
          {row?.completed ? (
            <div className="space-y-3 pt-2">
              <div className="bg-lime-500/10 border border-lime-500/40 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-lime-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-white">Quest complete</p>
              </div>
              {questKey === 'gas_fees' && (
                <button
                  onClick={onCertificate}
                  className="w-full bg-lime-500 text-ink-950 font-bold rounded-xl py-3 text-sm hover:bg-lime-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  Get my certificate
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setFeedback(null);
                }}
                placeholder={config.placeholder}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lime-500/60 font-mono"
              />
              <button
                onClick={handleSubmit}
                disabled={busy || value.trim() === ''}
                className="w-full bg-lime-500 text-ink-950 font-bold rounded-xl py-3 text-sm hover:bg-lime-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Checking...' : config.button}
              </button>
              {feedback && (
                <p className={`text-sm leading-relaxed ${feedback.ok ? 'text-lime-500' : 'text-orange-400'}`}>
                  {feedback.message}
                </p>
              )}
            </div>
          )}
        </Step>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function CertificateScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function build() {
    const learner = name.trim();
    if (learner.length < 2) {
      setNote('Type your name first.');
      return;
    }
    setBusy(true);
    setNote(null);
    let art: HTMLImageElement | null = null;
    try {
      const res = await sabiRequest({
        action: 'generate_image',
        lesson_id: 'certificate',
        lesson_title: 'Web3 Sabi certificate artwork',
        lesson_content:
          'A colourful modern Lagos street scene with an okada and a market stall, glowing blockchain blocks in the sky, flat illustration, no text, no letters, no words',
        session_id: getSessionId(),
      });
      if (res.image) art = await loadImage(res.image);
    } catch {
      art = null;
    }

    const W = 1200;
    const H = 850;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setBusy(false);
      setNote('Your browser could not draw the certificate.');
      return;
    }
    ctx.fillStyle = '#0a0f0b';
    ctx.fillRect(0, 0, W, H);
    if (art) {
      const s = Math.max(W / art.width, H / art.height);
      const dw = art.width * s;
      const dh = art.height * s;
      ctx.drawImage(art, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
    ctx.fillStyle = art ? 'rgba(8,12,9,0.8)' : 'rgba(132,204,22,0.06)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#84cc16';
    ctx.lineWidth = 8;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.textAlign = 'center';

    const line = (text: string, y: number, size: number, color: string, bold: boolean) => {
      ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, y);
    };

    line('WEB3 SABI', 150, 34, '#84cc16', true);
    line('Certificate of Completion', 260, 66, '#ffffff', true);
    line('This certifies that', 350, 30, '#d1d5db', false);

    let size = 84;
    ctx.font = `bold ${size}px sans-serif`;
    while (ctx.measureText(learner).width > 980 && size > 30) {
      size -= 4;
      ctx.font = `bold ${size}px sans-serif`;
    }
    line(learner, 470, size, '#ffffff', true);

    line('has completed all four Web3 quests on the Sepolia test network:', 560, 30, '#d1d5db', false);
    line('wallet, test tokens, sending and gas fees', 610, 28, '#9ca3af', false);
    line(
      new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      690,
      30,
      '#ffffff',
      false,
    );
    line('Mock certificate for learning. Not recorded on a blockchain.', 770, 22, '#9ca3af', false);

    try {
      setPng(canvas.toDataURL('image/png'));
    } catch {
      setNote('Could not create the certificate image. Please try again.');
    }
    setBusy(false);
  }

  return (
    <div className="pb-24 animate-fade-in">
      <PageHeader title="Your certificate" onBack={onBack} />
      <div className="px-5 mt-2 space-y-3">
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5 space-y-3">
          <p className="text-sm text-gray-400 leading-relaxed">
            You finished all four quests. Type your name exactly as you want it to appear, then create your certificate.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNote(null);
            }}
            placeholder="Your full name"
            maxLength={60}
            className="w-full bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-lime-500/60"
          />
          <button
            onClick={build}
            disabled={busy}
            className="w-full bg-lime-500 text-ink-950 font-bold rounded-xl py-3 text-sm hover:bg-lime-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Creating your certificate...' : 'Create my certificate'}
          </button>
          {note && <p className="text-sm text-orange-400">{note}</p>}
        </div>

        {png && (
          <div className="bg-ink-850 border border-ink-700 rounded-2xl p-4 space-y-3">
            <img src={png} alt="Web3 Sabi certificate" className="w-full rounded-xl border border-ink-700" />
            <a
              href={png}
              download="web3_sabi_certificate.png"
              className="w-full bg-lime-500 text-ink-950 font-bold rounded-xl py-3 text-sm hover:bg-lime-400 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download certificate
            </a>
            <p className="text-xs text-gray-500 text-center">
              This is a mock certificate for learning. It is not recorded on a blockchain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}