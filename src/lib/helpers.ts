import { getXLMHolders as getXLMHoldersLib, getRichList as getRichListLib, RichListAccount } from '@/lib/stellar';

export async function getXLMHoldersAction(limit: number = 20, cursor?: string) {
  return await getXLMHoldersLib(limit, cursor);
}

export async function getRichListAction(page: number = 1, limit: number = 50) {
  return await getRichListLib(page, limit);
}
