export interface TradingPairAsset {
  code: string;
  issuer?: string;
  type: string;
}

export interface TradingPairOfferAsset {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface TradingPairOffer {
  selling: TradingPairOfferAsset;
  buying: TradingPairOfferAsset;
  price: string;
  last_modified_time?: string;
}

export interface TradingPairCandidate {
  counterAsset: TradingPairAsset;
  offerCount: number;
  referencePrice: number;
  spread: number;
  lastOfferTime?: string;
}

export interface TradingPairAggregation {
  timestamp: number | string;
  trade_count: number | string;
  base_volume: string;
  counter_volume: string;
  open: string;
  close: string;
}

export interface TradingPairAggregationSummary {
  price: number;
  baseVolume: number;
  counterVolume: number;
  tradeCount: number;
  priceChange: number;
}

interface MutableTradingPairCandidate {
  counterAsset: TradingPairAsset;
  bidPrices: number[];
  askPrices: number[];
  offerCount: number;
  lastOfferTime?: string;
}

function normalizeOfferAsset(asset: TradingPairOfferAsset): TradingPairAsset | null {
  if (asset.asset_type === 'native') {
    return { code: 'XLM', type: 'native' };
  }

  if (!asset.asset_code || !asset.asset_issuer) return null;

  return {
    code: asset.asset_code,
    issuer: asset.asset_issuer,
    type: asset.asset_type,
  };
}

function isTrackedAsset(
  asset: TradingPairOfferAsset,
  assetCode: string,
  assetIssuer?: string
): boolean {
  if (assetCode === 'XLM' && !assetIssuer) {
    return asset.asset_type === 'native';
  }

  return asset.asset_code === assetCode && asset.asset_issuer === assetIssuer;
}

export function getTradingPairAssetKey(asset: TradingPairAsset): string {
  return `${asset.type}:${asset.code}:${asset.issuer || ''}`;
}

export function collectTradingPairCandidatesFromOffers(
  assetCode: string,
  assetIssuer: string | undefined,
  offers: TradingPairOffer[]
): TradingPairCandidate[] {
  const candidates = new Map<string, MutableTradingPairCandidate>();

  for (const offer of offers) {
    const trackedAssetIsSelling = isTrackedAsset(offer.selling, assetCode, assetIssuer);
    const trackedAssetIsBuying = isTrackedAsset(offer.buying, assetCode, assetIssuer);
    if (!trackedAssetIsSelling && !trackedAssetIsBuying) continue;

    const counterAsset = normalizeOfferAsset(
      trackedAssetIsSelling ? offer.buying : offer.selling
    );
    const rawPrice = Number.parseFloat(offer.price);
    if (!counterAsset || !Number.isFinite(rawPrice) || rawPrice <= 0) continue;

    const quotePrice = trackedAssetIsSelling ? rawPrice : 1 / rawPrice;
    const key = getTradingPairAssetKey(counterAsset);
    const candidate = candidates.get(key) || {
      counterAsset,
      bidPrices: [],
      askPrices: [],
      offerCount: 0,
    };

    if (trackedAssetIsSelling) {
      candidate.askPrices.push(quotePrice);
    } else {
      candidate.bidPrices.push(quotePrice);
    }
    candidate.offerCount += 1;
    if (offer.last_modified_time && (!candidate.lastOfferTime || offer.last_modified_time > candidate.lastOfferTime)) {
      candidate.lastOfferTime = offer.last_modified_time;
    }
    candidates.set(key, candidate);
  }

  return Array.from(candidates.values())
    .map(candidate => {
      const bestBid = candidate.bidPrices.length > 0 ? Math.max(...candidate.bidPrices) : 0;
      const bestAsk = candidate.askPrices.length > 0 ? Math.min(...candidate.askPrices) : 0;
      const referencePrice = bestBid > 0 && bestAsk > 0
        ? (bestBid + bestAsk) / 2
        : bestBid || bestAsk;
      const spread = bestBid > 0 && bestAsk > 0 && referencePrice > 0
        ? ((bestAsk - bestBid) / referencePrice) * 100
        : 0;

      return {
        counterAsset: candidate.counterAsset,
        offerCount: candidate.offerCount,
        referencePrice,
        spread,
        lastOfferTime: candidate.lastOfferTime,
      };
    })
    .sort((left, right) => right.offerCount - left.offerCount);
}

export function summarizeTradingPairAggregations(
  aggregations: TradingPairAggregation[]
): TradingPairAggregationSummary {
  if (aggregations.length === 0) {
    return {
      price: 0,
      baseVolume: 0,
      counterVolume: 0,
      tradeCount: 0,
      priceChange: 0,
    };
  }

  const sorted = [...aggregations].sort(
    (left, right) => Number(left.timestamp) - Number(right.timestamp)
  );
  const firstPrice = Number.parseFloat(sorted[0].open);
  const lastPrice = Number.parseFloat(sorted[sorted.length - 1].close);
  let baseVolume = 0;
  let counterVolume = 0;
  let tradeCount = 0;

  for (const aggregation of sorted) {
    baseVolume += Number.parseFloat(aggregation.base_volume) || 0;
    counterVolume += Number.parseFloat(aggregation.counter_volume) || 0;
    tradeCount += Number(aggregation.trade_count) || 0;
  }

  return {
    price: lastPrice || 0,
    baseVolume,
    counterVolume,
    tradeCount,
    priceChange: firstPrice > 0 && lastPrice > 0
      ? ((lastPrice - firstPrice) / firstPrice) * 100
      : 0,
  };
}
