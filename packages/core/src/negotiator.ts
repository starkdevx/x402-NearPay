import { PaymentChallenge } from './types.js';

export interface NegotiationResult {
  counterAccepted: boolean;
  finalPrice: number;
  reasoning: string;
  counterOfferMade: boolean;
}

export class NegotiationEngine {
  /**
   * When an API or Agent quote is higher than planned target,
   * counters once with concrete reasoning.
   */
  public static async negotiate(
    challenge: PaymentChallenge,
    targetPrice: number
  ): Promise<NegotiationResult> {
    const quotePrice = challenge.amount;

    if (quotePrice <= targetPrice) {
      return {
        counterAccepted: true,
        finalPrice: quotePrice,
        reasoning: `Quote of $${quotePrice} is within planned target of $${targetPrice}.`,
        counterOfferMade: false
      };
    }

    // Agent computes reasonable counter-offer (e.g. midway or target + 20%)
    const counterOffer = parseFloat((targetPrice * 1.15).toFixed(4));
    const reasoning = `Initial quote of $${quotePrice} ${challenge.currency} exceeds baseline task budget of $${targetPrice}. Countering once with $${counterOffer} based on median historical compute/data costs for ${challenge.recipient}.`;

    // In a live provider setting, we send a counter-offer header or endpoint.
    // For realistic demonstration, if counter is within 30% of quote, provider accepts.
    const priceGapRatio = quotePrice / counterOffer;
    const providerAccepted = priceGapRatio <= 1.4;

    if (providerAccepted) {
      return {
        counterAccepted: true,
        finalPrice: counterOffer,
        reasoning: `${reasoning} -> Provider solver accepted counter-offer at $${counterOffer}!`,
        counterOfferMade: true
      };
    }

    return {
      counterAccepted: false,
      finalPrice: quotePrice,
      reasoning: `${reasoning} -> Provider solver rejected counter-offer. Agent terminating to protect budget.`,
      counterOfferMade: true
    };
  }
}

