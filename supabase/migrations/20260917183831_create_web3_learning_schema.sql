/*
# Web3 Learning App — Core Schema

## Overview
Creates the database backbone for a Duolingo-style Web3 learning app with Supabase Auth.
Supports user profiles, lesson content, and per-user lesson progress tracking.

## New Tables

### 1. profiles
- `id` (uuid, PK) — references auth.users(id), one-to-one with the Supabase Auth user
- `name` (text) — user's display name collected at signup
- `email` (text) — user's email (mirrors auth.users email)
- `xp` (integer, default 0) — total XP earned
- `streak` (integer, default 0) — current day streak count
- `last_lesson_date` (date, nullable) — date of last completed lesson
- `created_at` (timestamptz)

### 2. lessons
- `id` (uuid, PK)
- `title`, `explanation`, `analogy`, `example`, `quiz_question`, `quiz_answer` (text)
- `lesson_order` (integer) — ordering 1–7
- `created_at` (timestamptz)

### 3. lesson_progress
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid())
- `lesson_id` (uuid, NOT NULL) — references lessons
- `completed` (boolean, default false)
- `xp_earned` (integer, default 0)
- `completed_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- Unique constraint on (user_id, lesson_id)

## Security
- RLS enabled on all three tables.
- profiles: owner-scoped CRUD (authenticated, auth.uid() = id)
- lessons: read-only for authenticated (shared content)
- lesson_progress: owner-scoped CRUD (authenticated, auth.uid() = user_id)

## Seed Data
Inserts 7 lessons ordered 1–7.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  last_lesson_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============ LESSONS ============
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  explanation text NOT NULL,
  analogy text NOT NULL,
  example text NOT NULL,
  quiz_question text NOT NULL,
  quiz_answer text NOT NULL,
  lesson_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (true);

-- ============ LESSON_PROGRESS ============
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  xp_earned integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON lesson_progress;
CREATE POLICY "select_own_progress" ON lesson_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_progress" ON lesson_progress;
CREATE POLICY "insert_own_progress" ON lesson_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON lesson_progress;
CREATE POLICY "update_own_progress" ON lesson_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_progress" ON lesson_progress;
CREATE POLICY "delete_own_progress" ON lesson_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ SEED LESSONS ============
INSERT INTO lessons (title, explanation, analogy, example, quiz_question, quiz_answer, lesson_order) VALUES
(
  'What is Web3?',
  'Web3 is the next version of the internet. In Web1, you could only read information. In Web2, you could read and write — like posting on Facebook or Twitter. Web3 lets you read, write, AND own. Instead of big companies controlling your data and money, you control it yourself using blockchain technology. Think of it as an internet where you are the owner, not just a user.',
  'Think of a Lagos market. In the old days (Web1), you could only look at what sellers had. Then came supermarkets like Shoprite (Web2) — you could buy and post reviews, but Shoprite owns the building and sets the rules. Web3 is like a market owned by everyone who trades there. No single landlord. Everyone has a say, and everyone owns a piece.',
  'When you post on Web2 Instagram, Meta owns your content and can delete it. On a Web3 social app, your post lives on the blockchain — no company can take it down or ban you from your own account.',
  'What is the main difference between Web2 and Web3?',
  'Web3 lets you own your data and digital assets, not just read and write',
  1
),
(
  'What is Blockchain?',
  'A blockchain is a digital ledger — a record book — that is shared across many computers instead of kept by one person. Every time something happens (like a transaction), it is written on a "block" of information. That block is then linked to the previous block, forming a chain. Once information is added, it cannot be changed or deleted. This makes blockchain very trustworthy because nobody can secretly edit the records.',
  'Think of the way your village or family keeps records with elders. In the old days, one chief kept the important records. If the chief made a mistake or was dishonest, the records could be wrong. A blockchain is like having every elder in the village keep an identical copy of the records at the same time. If one elder tries to change their copy, the others will see it does not match and reject it. That is how blockchain stays honest.',
  'Bitcoin runs on a blockchain. When you send Bitcoin to a friend, that transaction is recorded on a block. Thousands of computers around the world verify it and add it to their copy of the chain. Nobody can reverse it.',
  'Why is blockchain considered trustworthy?',
  'Because records are copied across many computers and cannot be changed once added',
  2
),
(
  'What is Cryptocurrency?',
  'Cryptocurrency is digital money that lives on a blockchain. Unlike the Naira in your bank account, cryptocurrency is not controlled by any bank or government. You hold it in a digital wallet, and you can send it to anyone, anywhere in the world, without asking a bank for permission. Every transaction is recorded on the blockchain so it is transparent and secure.',
  'Think of the Naira you keep in your pocket versus the Naira in your bank app. The one in your pocket — you control it directly. The one in the bank — the bank controls it and can freeze it. Cryptocurrency is like having money in your pocket, but digital. No bank can block it, no government can print more of it, and you can send it to your cousin in Ghana in minutes without Western Union fees.',
  'Bitcoin is a cryptocurrency. So is Ethereum. If you own 0.01 Bitcoin, you truly hold it in your wallet — it is yours, not an IOU from a bank.',
  'What makes cryptocurrency different from regular money in a bank?',
  'Cryptocurrency is not controlled by any bank or government — you hold it directly',
  3
),
(
  'What is a Crypto Wallet?',
  'A crypto wallet is a digital tool that lets you store, send, and receive cryptocurrency. It does not actually "store" your coins — your coins always live on the blockchain. The wallet stores your private key, which is like a secret password that proves you own your coins. Without your private key, nobody can move your money. There are two main types: hot wallets (connected to the internet, like apps on your phone) and cold wallets (offline devices, like a USB stick).',
  'Think of your crypto wallet like the key to your house in Lagos. The house (your cryptocurrency) is always there on the blockchain. The wallet is the key. If you lose the key, the house is still there — but you cannot get inside. That is why you must never share your private key with anyone, just like you would not give your house key to a stranger at Mile 2.',
  'MetaMask is a popular hot wallet — it is a browser extension and phone app. Ledger is a popular cold wallet — a small physical device you plug into your computer. Both let you send and receive crypto, but the cold wallet is safer because hackers cannot reach it when it is offline.',
  'What does a crypto wallet actually store?',
  'Your private key — the secret that proves you own your cryptocurrency',
  4
),
(
  'What is a Blockchain Transaction?',
  'A blockchain transaction is a transfer of value or data recorded on the blockchain. When you send cryptocurrency to someone, that action is a transaction. It includes: who is sending (from address), who is receiving (to address), how much is being sent, and a small fee called gas. The transaction is broadcast to the network, verified by computers called nodes, packed into a block, and added to the chain. Once confirmed, it is permanent.',
  'Think of sending money through a Lagos bus system. You give the conductor your package and the destination. The conductor checks you have enough money, notes down the sender, receiver, and amount, then puts it on the bus. Once the bus reaches the destination and the package is signed for, the delivery cannot be undone. A blockchain transaction works the same way — but instead of one conductor, thousands of computers verify it.',
  'If you send 0.5 ETH from your wallet to a friend, the transaction includes your wallet address, your friend''s wallet address, the amount (0.5 ETH), and a gas fee. Within seconds to minutes, the network confirms it and the 0.5 ETH appears in your friend''s wallet.',
  'What information is included in a blockchain transaction?',
  'Sender address, receiver address, amount, and a gas fee',
  5
),
(
  'What are Gas Fees?',
  'Gas fees are small payments you make to use a blockchain network. Every action on the blockchain — sending money, running an app, creating a token — requires computing power. Gas fees pay the people (called validators or miners) who provide that computing power to process your transaction. Think of gas as the fuel that powers the blockchain engine. The busier the network, the higher the gas fee, just like surge pricing on Bolt or Uber.',
  'Think of Bolt surge pricing in Lagos. When it rains or during rush hour on the Third Mainland Bridge, Bolt prices go up because more people need rides. Gas fees work the same way. When many people are using the Ethereum blockchain at the same time, gas fees go up. When it is quiet, fees are low. You can wait for a quieter time to pay less, just like waiting for surge to end before booking a ride.',
  'If you send ETH on a quiet Sunday morning, the gas fee might be $0.50. If you send the same amount on a busy weekday when everyone is trading, the gas fee might be $5 or more. The amount you send does not change — only the network fee changes.',
  'Why do gas fees go up when the blockchain is busy?',
  'Because more people are competing for limited network processing space, like surge pricing',
  6
),
(
  'What is DeFi?',
  'DeFi stands for Decentralized Finance. It is a new financial system built on blockchain that lets you save, borrow, lend, and earn interest without a bank. Instead of walking into Access Bank or GTBank, you use smart contracts — programs on the blockchain that automatically handle your money. No bank manager, no paperwork, no approval process. Your money stays in your wallet and works for you 24/7.',
  'Think of the way you use a cooperative society (esusu) in Lagos. Everyone puts money in, and people take turns collecting the pot. The group manages it together — no bank involved. DeFi is like a digital esusu on the blockchain, but bigger and smarter. You can lend your crypto and earn interest, borrow against it, or swap one token for another — all managed by code, not by a bank manager who might ask for your father''s land documents.',
  'On a DeFi app like Aave, you can deposit your crypto and earn interest automatically. On Uniswap, you can trade one cryptocurrency for another without a central exchange. Everything runs on smart contracts that anyone can inspect.',
  'What does DeFi replace?',
  'Banks and traditional financial middlemen — using blockchain smart contracts instead',
  7
)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(lesson_order);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);
