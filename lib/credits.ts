export const creditPolicy = {
  freeRenderCredits: 3,
  renderCreditCost: 1,
  briefCreditCost: 0,
  briefRevisionCreditCost: 0,
  qualifyingPurchaseRewardCredits: 1,
  purchaseRewardCapPerOrder: 1,
} as const;

export type CreditEventType =
  | 'signup_grant'
  | 'credit_pack_purchase'
  | 'render_spend'
  | 'render_refund'
  | 'qualifying_purchase_reward'
  | 'manual_adjustment';

export type CreditLedgerEntry = {
  id: string;
  userId: string;
  type: CreditEventType;
  amount: number;
  roomId?: string;
  orderId?: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

/**
 * Stage 7/10 enforcement notes:
 * - Stage 7 now enforces a server-side wallet + immutable ledger.
 * - Grant the 3 free render credits once, after account/email verification.
 * - Private/local testing can temporarily enable development wallets with RENDER_ALLOW_DEVELOPMENT_WALLETS=true.
 * - Public deployments must keep development wallets disabled until Stage 10 account verification is connected.
 * - A successful generation or regeneration costs 1 credit.
 * - Provider/technical failures are logged and automatically refunded.
 * - Written brief creation and revisions cost 0 credits.
 * - Never award purchase credits on a retailer click alone.
 * - Award purchase rewards only after a confirmed qualifying conversion/order.
 */
