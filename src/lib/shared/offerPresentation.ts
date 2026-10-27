export interface OfferOperation {
  id: string;
  type: string;
  amount?: string;
  [key: string]: unknown;
}

export function getOfferPresentation(operation: OfferOperation) {
  const buying = operation.buying_asset_type === 'native' ? 'XLM' : String(operation.buying_asset_code || 'Unknown asset');
  const selling = operation.selling_asset_type === 'native' ? 'XLM' : String(operation.selling_asset_code || 'Unknown asset');
  const isBuy = operation.type === 'manage_buy_offer';

  return {
    buying,
    selling,
    sellingAmount: isBuy ? '' : (operation.amount ?? '—'),
    buyingAmount: isBuy ? (operation.amount ?? '—') : '',
    amountAsset: isBuy ? buying : selling,
    priceUnit: isBuy ? `${selling} / ${buying}` : `${buying} / ${selling}`,
  };
}
