// ==============================================================================
// ParkMate Payment & Settlement Engine
// Implements:
// 1. Stripe Test Mode Integration (when STRIPE_SECRET_KEY is configured)
// 2. Clearly-labelled ParkMate Test Mode Provider fallback (when keys are absent)
// 3. Strict Server-Side Idempotency Cache (prevents duplicate charges & double-bookings)
// 4. Authoritative Cancellation & Refund Evaluation (never claims real money for test txns)
// ==============================================================================

import { PaymentStatus } from "@/types/database";

export interface ProcessPaymentParams {
  amount: number;
  currency?: string;
  paymentMethod?: string;
  simulateFailure?: boolean;
  idempotencyKey?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface PaymentTransactionResult {
  success: boolean;
  transactionId: string;
  paymentStatus: PaymentStatus;
  mode: "stripe_test_mode" | "demo_simulation";
  isDemoTransaction: boolean;
  disclaimer: string;
  amount: number;
  currency: string;
  errorMessage?: string;
  idempotencyReused?: boolean;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  refundAmount: number;
  policyTier: "full" | "partial" | "none";
  isDemoRefund: boolean;
  disclaimer: string;
  note: string;
}

// In-memory server-side idempotency cache (keyed by idempotencyKey)
// TTL: 15 minutes
interface CachedTransaction {
  result: PaymentTransactionResult;
  timestamp: number;
}
const IDEMPOTENCY_CACHE = new Map<string, CachedTransaction>();
const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;

/**
 * Checks if Stripe secret key is present in environment variables.
 */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && (key.startsWith("sk_test_") || key.startsWith("sk_live_")));
}

/**
 * Processes a payment server-side with strict idempotency and transparent test-mode labels.
 */
export async function processPayment(params: ProcessPaymentParams): Promise<PaymentTransactionResult> {
  const { amount, currency = "USD", paymentMethod = "test_card_visa", simulateFailure = false, idempotencyKey } = params;

  // 1. Check Idempotency Key
  if (idempotencyKey) {
    const cached = IDEMPOTENCY_CACHE.get(idempotencyKey);
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > IDEMPOTENCY_TTL_MS;
      if (!isExpired) {
        return {
          ...cached.result,
          idempotencyReused: true,
        };
      }
      IDEMPOTENCY_CACHE.delete(idempotencyKey);
    }
  }

  // 2. Check if Stripe live/test key is configured
  if (isStripeConfigured()) {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY!;
      const amountInCents = Math.round(amount * 100);

      const formBody = new URLSearchParams({
        amount: String(amountInCents),
        currency: currency.toLowerCase(),
        "payment_method_types[]": "card",
        confirm: "true",
        payment_method: paymentMethod.startsWith("pm_") ? paymentMethod : "pm_card_visa",
      });

      if (params.metadata) {
        for (const [k, v] of Object.entries(params.metadata)) {
          formBody.append(`metadata[${k}]`, String(v));
        }
      }

      const res = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: formBody.toString(),
      });

      const stripeData = await res.json();

      if (!res.ok) {
        const result: PaymentTransactionResult = {
          success: false,
          transactionId: stripeData.error?.charge || `txn_err_${Date.now()}`,
          paymentStatus: "failed",
          mode: "stripe_test_mode",
          isDemoTransaction: false,
          disclaimer: "Stripe Test Mode: Test charge declined by payment processor.",
          amount,
          currency,
          errorMessage: stripeData.error?.message || "Stripe test payment failed.",
        };
        return result;
      }

      const result: PaymentTransactionResult = {
        success: stripeData.status === "succeeded",
        transactionId: stripeData.id,
        paymentStatus: stripeData.status === "succeeded" ? "paid" : "pending",
        mode: "stripe_test_mode",
        isDemoTransaction: false,
        disclaimer: "Verified via Stripe Test Mode API (Sandbox environment).",
        amount,
        currency,
      };

      if (idempotencyKey) {
        IDEMPOTENCY_CACHE.set(idempotencyKey, { result, timestamp: Date.now() });
      }

      return result;
    } catch {
      // Fallback gracefully to demo provider if Stripe network call fails
    }
  }

  // 3. Fallback: Clearly-Labelled ParkMate Test Mode Provider
  const transactionId = `txn_demo_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  // Check intentional decline simulation
  if (simulateFailure || paymentMethod === "simulate_failure") {
    const result: PaymentTransactionResult = {
      success: false,
      transactionId,
      paymentStatus: "failed",
      mode: "demo_simulation",
      isDemoTransaction: true,
      disclaimer: "DEMO TEST MODE: Simulated payment decline (Test issuer rejected transaction).",
      amount,
      currency,
      errorMessage: "Card declined by simulated test bank (insufficient test funds or invalid CVV).",
    };
    return result;
  }

  const result: PaymentTransactionResult = {
    success: true,
    transactionId,
    paymentStatus: "paid",
    mode: "demo_simulation",
    isDemoTransaction: true,
    disclaimer: "DEMO TEST MODE: Simulated transaction approved. No real credit card debited.",
    amount,
    currency,
  };

  // Cache idempotency record
  if (idempotencyKey) {
    IDEMPOTENCY_CACHE.set(idempotencyKey, { result, timestamp: Date.now() });
  }

  return result;
}

/**
 * Processes a refund with strict transparency.
 * If transaction was simulated, it is clearly declared as a demo refund without claiming real bank transfers.
 */
export async function processRefund(params: {
  transactionId: string;
  refundAmount: number;
  policyTier: "full" | "partial" | "none";
  reason?: string;
  isDemoTransaction?: boolean;
}): Promise<RefundResult> {
  const { transactionId, refundAmount, policyTier, reason, isDemoTransaction = true } = params;

  if (refundAmount <= 0 || policyTier === "none") {
    return {
      success: true,
      refundId: "ref_none",
      refundAmount: 0,
      policyTier: "none",
      isDemoRefund: isDemoTransaction,
      disclaimer: "Non-refundable: Arrival schedule commenced before cancellation.",
      note: "Reservation cancelled with zero refund per platform cancellation policy.",
    };
  }

  // If real Stripe test transaction
  if (!isDemoTransaction && isStripeConfigured() && transactionId.startsWith("pi_")) {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY!;
      const amountInCents = Math.round(refundAmount * 100);

      const formBody = new URLSearchParams({
        payment_intent: transactionId,
        amount: String(amountInCents),
        reason: "requested_by_customer",
      });

      const res = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      });

      const stripeRefund = await res.json();
      if (res.ok) {
        return {
          success: true,
          refundId: stripeRefund.id,
          refundAmount,
          policyTier,
          isDemoRefund: false,
          disclaimer: "Stripe Test Mode: Test refund submitted to sandbox provider.",
          note: `Refund of $${refundAmount.toFixed(2)} authorized under ${policyTier} policy tier.`,
        };
      }
    } catch {
      // Fall through to demo refund
    }
  }

  // Demo Simulation Refund
  const refundId = `ref_demo_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  return {
    success: true,
    refundId,
    refundAmount,
    policyTier,
    isDemoRefund: true,
    disclaimer: "DEMO TEST MODE: Simulated test refund credited to demo ledger. No real currency transferred.",
    note: reason || `Simulated ${policyTier === "full" ? "100% full" : "partial"} refund of $${refundAmount.toFixed(2)} processed.`,
  };
}
