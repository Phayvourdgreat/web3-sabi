/*
# Add quiz wrong answers and alternative explanation columns to lessons

## Overview
Currently the app hardcodes quiz wrong answers and alternative explanations in the frontend.
This migration adds two columns to the `lessons` table so these can be managed directly
in Supabase and fetched dynamically — no more generic/hardcoded answers.

## Changes to existing tables

### lessons (modified)
- `quiz_wrong_answers` (text[], nullable) — array of 3 plausible wrong answers for the quiz
- `alternative_explanation` (text, nullable) — a different explanation shown when the user
  clicks "I still don't understand"

## Data
Populates the new columns for all 7 existing lessons with the current values used by the app,
so you can edit them directly in Supabase without losing any content.

## Security
No policy changes — lessons already has a SELECT policy for authenticated users.
*/

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS quiz_wrong_answers text[];
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS alternative_explanation text;

-- Seed the new columns for all 7 lessons
UPDATE lessons SET quiz_wrong_answers = ARRAY[
  'Web3 is faster than Web2 because it uses newer servers',
  'Web3 lets you post longer messages and bigger videos',
  'Web3 removes the need for the internet entirely'
], alternative_explanation = 'Let us look at it differently. Think about owning land in Lagos. In Web2, you rent a shop in a mall — the mall owner can increase your rent or kick you out. In Web3, you own the land itself. Nobody can raise your rent or evict you. You have the deed (your wallet), and it is recorded where everyone can see it. Web3 is simply the internet version of owning instead of renting.'
WHERE lesson_order = 1;

UPDATE lessons SET quiz_wrong_answers = ARRAY[
  'Because it uses very expensive computers that never break',
  'Because a single company audits all records every night',
  'Because blockchain encrypts data so nobody can see it'
], alternative_explanation = 'Another way to see it: imagine a group chat where every message, once sent, can never be deleted or edited. Everyone in the group has the same chat history. If someone tries to change a message on their phone, it will not match what everyone else has — so the group ignores it. That is blockchain: a group chat for transactions that nobody can edit after the fact.'
WHERE lesson_order = 2;

UPDATE lessons SET quiz_wrong_answers = ARRAY[
  'Cryptocurrency is physical money printed on plastic instead of paper',
  'Cryptocurrency can only be used inside one country at a time',
  'Cryptocurrency is a loan from the government that you pay back'
], alternative_explanation = 'Think of it this way: regular money in the bank is like keeping your money in someone else''s safe. They hold it, and they can lock the safe or charge you fees. Cryptocurrency is like having your own personal safe with a key only you hold. No middleman, no permission needed. You can open it anytime, send money to anyone, and nobody can lock you out.'
WHERE lesson_order = 3;

UPDATE lessons SET quiz_wrong_answers = ARRAY[
  'Your bank account number and PIN for transfers',
  'A backup of all your contacts and messages',
  'The internet address of the blockchain server'
], alternative_explanation = 'Imagine your crypto wallet is like your phone''s password manager. The passwords (your private keys) are not the apps themselves — they are what proves you can access your accounts. Similarly, your wallet does not hold coins inside it. It holds the keys that prove the coins on the blockchain belong to you. Lose the keys, and the coins are locked forever.'
WHERE lesson_order = 4;

UPDATE lessons SET quiz_wrong_answers = ARRAY[
  'Only the amount and the time of day',
  'Your password, email, and profile picture',
  'The country, currency exchange rate, and tax ID'
], alternative_explanation = 'Think of it like sending a package via DHL. You write the sender address, receiver address, and contents on the waybill. DHL checks everything, puts it on a truck, and delivers it. Once signed for, it is done. A blockchain transaction is the same — but instead of one DHL, there are thousands of independent verifiers checking the waybill, so nobody can fake a delivery.'
WHERE lesson_order = 5;

UPDATE lessons SET quiz_wrong_answers = ARRAY[
  'Because the blockchain charges extra for sending larger amounts',
  'Because gas fees are set by the government each month',
  'Because hackers are attacking the network at peak times'
], alternative_explanation = 'Another angle: gas fees are like the toll you pay on Lekki-Epe Expressway. The toll pays for the road to be maintained and kept smooth. Without the toll, the road would break down. Similarly, gas fees pay the people who keep the blockchain network running. When the road is busy (traffic jam), the toll might go up. When it is clear, the toll is cheaper.'
WHERE lesson_order = 6;

UPDATE lessons SET quiz_wrong_answers = ARRAY[
  'Physical bank branches and ATMs — but online',
  'Stock exchanges and trading bots',
  'Insurance companies and pension funds'
], alternative_explanation = 'Think of DeFi like this: instead of putting your money in a bank where the bank lends it out and keeps most of the profit, you lend it directly to others through a smart contract. The contract automatically pays you interest — no bank manager, no minimum balance, no paperwork. It is like contributing to an esusu where the rules are written in code, so everyone is treated fairly and automatically.'
WHERE lesson_order = 7;
