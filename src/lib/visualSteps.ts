// Visual flow steps for each lesson — icon-based arrow flows.
// Structured so real data from n8n/AI can replace this later.

import { Globe, Layers, Coins, Wallet, Send, Fuel, Landmark, ArrowRight } from 'lucide-react';
import type { ComponentType } from 'react';

export interface VisualStep {
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export const visualSteps: Record<number, VisualStep[]> = {
  1: [
    { label: 'Web1: Read Only', icon: Globe },
    { label: 'Web2: Read + Write', icon: Layers },
    { label: 'Web3: Read + Write + Own', icon: Landmark },
  ],
  2: [
    { label: 'Transaction Happens', icon: Send },
    { label: 'Written to a Block', icon: Layers },
    { label: 'Linked to Chain', icon: Globe },
    { label: 'Permanent & Verified', icon: Landmark },
  ],
  3: [
    { label: 'You Hold Digital Money', icon: Coins },
    { label: 'Send to Anyone', icon: Send },
    { label: 'Recorded on Blockchain', icon: Globe },
  ],
  4: [
    { label: 'Your Wallet', icon: Wallet },
    { label: 'Private Key (Secret)', icon: Globe },
    { label: 'Access Your Crypto', icon: Coins },
  ],
  5: [
    { label: 'You', icon: Globe },
    { label: 'Make a Transaction', icon: Send },
    { label: 'Network Verifies', icon: Layers },
    { label: 'Transaction Processed', icon: Landmark },
  ],
  6: [
    { label: 'You Send Transaction', icon: Send },
    { label: 'Pay Gas Fee', icon: Fuel },
    { label: 'Validators Process It', icon: Layers },
    { label: 'Transaction Confirmed', icon: Landmark },
  ],
  7: [
    { label: 'You Deposit Crypto', icon: Coins },
    { label: 'Smart Contract Runs', icon: Layers },
    { label: 'Earn / Borrow / Trade', icon: Landmark },
  ],
};

export const ArrowIcon = ArrowRight;
