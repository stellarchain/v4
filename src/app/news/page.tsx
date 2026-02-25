'use client';

import { useEffect, useState } from 'react';
import NewsMobileView from '@/components/mobile/NewsMobileView';
import NewsDesktopView from '@/components/desktop/NewsDesktopView';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string;
  category: 'stellar' | 'crypto' | 'defi' | 'regulation';
  description?: string;
}

const news: NewsItem[] = [
  {
    id: '1',
    title: 'Stellar (XLM) Self Reported Market Cap Hits $4.98 Billion',
    date: '2026-02-13',
    source: 'Daily Political',
    url: 'https://www.dailypolitical.com/2026/02/13/stellar-xlm-self-reported-market-cap-hits-4-98-billion.html',
    category: 'crypto',
    description: 'Stellar reaches $4.98 billion market capitalization with $114.83 million in 24-hour trading volume.',
  },
  {
    id: '2',
    title: 'Chainalysis Upgrades Support for Stellar with Automatic Token Support',
    date: '2026-02-11',
    source: 'Chainalysis',
    url: 'https://www.chainalysis.com/blog/stellar-automatic-token-support-february-2026/',
    category: 'stellar',
    description: 'Chainalysis extends support beyond the native XLM token to include automatic coverage for new fungible and non-fungible tokens deployed to the Stellar chain.',
  },
  {
    id: '3',
    title: 'CME Group Launches Stellar (XLM) Futures Contracts',
    date: '2026-02-10',
    source: 'CME Group',
    url: 'https://www.cmegroup.com/',
    category: 'regulation',
    description: 'CME Group launches futures contracts for Stellar (XLM) in both standard and micro sizes, expanding institutional-grade crypto offerings.',
  },
  {
    id: '4',
    title: 'Rails Launches Institutional-Grade Vault on Stellar Network',
    date: '2026-02-05',
    source: 'Rails',
    url: 'https://stellar.org/press',
    category: 'stellar',
    description: 'Rails launches an institutional-grade vault on the Stellar network, strengthening enterprise infrastructure for digital asset custody.',
  },
  {
    id: '5',
    title: 'Stellar Ranks 4th in Real-World Asset Development Activity',
    date: '2026-02-03',
    source: 'Santiment',
    url: 'https://coinmarketcap.com/cmc-ai/stellar/latest-updates/',
    category: 'stellar',
    description: 'Analytics firm Santiment ranks Stellar 4th in real-world asset (RWA) sector development activity over the past 30 days, signaling consistent high-quality GitHub activity.',
  },
  {
    id: '6',
    title: 'Sushi V3 AMM Goes Live on Stellar Mainnet',
    date: '2026-02-01',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'defi',
    description: 'Sushi\'s V3 Automated Market Maker is now live on the Stellar Mainnet, integrating Sushi\'s decentralized finance expertise allowing users to trade and provide liquidity directly on Stellar.',
  },
  {
    id: '7',
    title: 'Stellar Launches Protocol X-Ray: Zero-Knowledge Cryptography for Privacy',
    date: '2026-01-22',
    source: 'DailyCoin',
    url: 'https://dailycoin.com/stellar-launches-x-ray-xlms-bounce-to-0-50-on-cards',
    category: 'stellar',
    description: 'Protocol X-Ray introduces native zero-knowledge cryptography for privacy-enabled, compliance-ready applications. Developers can integrate ZK proofs within Stellar smart contracts for private transactions.',
  },
  {
    id: '8',
    title: 'JavaScript SDK v12.0.0 Released with New Watcher API',
    date: '2026-01-15',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
    description: 'JavaScript SDK v12.0.0 streamlines contract interactions with a new watcher API and improved transaction lifecycle handling for Soroban smart contracts.',
  },
  {
    id: '9',
    title: 'U.S. Bancorp Selects Stellar for Institutional Stablecoin Testing',
    date: '2025-11-26',
    source: 'CoinDesk',
    url: 'https://www.coindesk.com/markets/2025/11/26/xlm-edges-higher-2-6-to-usd0-25-as-u-s-bank-tests-stablecoin-pilot',
    category: 'regulation',
    description: 'U.S. Bancorp, the fifth-largest U.S. bank by assets, selects Stellar\'s blockchain for institutional stablecoin testing, pushing XLM higher.',
  },
  {
    id: '10',
    title: 'Stellar Network Reports 40% YoY Increase in Non-XLM Asset Transactions',
    date: '2025-10-15',
    source: 'Stellar Development Foundation',
    url: 'https://stellar.org/press',
    category: 'stellar',
    description: 'Q4 report from the Stellar Development Foundation highlights a 40% year-over-year increase in transaction volume related to non-XLM assets, suggesting expanding use as a settlement layer.',
  },
];

export default function NewsPage() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile === null) return null;

  return (
    <>
      {isMobile ? (
        <NewsMobileView news={news} />
      ) : (
        <NewsDesktopView news={news} />
      )}
    </>
  );
}
