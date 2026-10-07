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
 * - Grant the 3 free render credits once, after account/email verification.
 * - A generation or regeneration costs 1 credit.
 * - Written brief creation and revisions cost 0 credits.
 * - Never award purchase credits on a retailer click alone.
 * - Award purchase rewards only after a confirmed qualifying conversion/order.
 * - Ledger entries are immutable; balance is derived from the ledger.
 */
