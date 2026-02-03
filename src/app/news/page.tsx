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

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Stellar Foundation Announces Major Protocol Upgrade for 2026',
    date: '2026-01-29',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
    description: 'The Stellar Development Foundation has announced a comprehensive protocol upgrade scheduled for Q2 2026, featuring enhanced smart contract capabilities and improved cross-chain interoperability.',
  },
  {
    id: '2',
    title: 'Bitcoin Surges Past $150K as Institutional Adoption Accelerates',
    date: '2026-01-29',
    source: 'CoinDesk',
    url: 'https://coindesk.com',
    category: 'crypto',
    description: 'Bitcoin has reached a new all-time high as major financial institutions continue to allocate significant portions of their portfolios to digital assets.',
  },
  {
    id: '3',
    title: 'MoneyGram Expands Stellar-Based Remittance Services to 50 New Countries',
    date: '2026-01-28',
    source: 'The Block',
    url: 'https://theblock.co',
    category: 'stellar',
    description: 'MoneyGram has announced a significant expansion of its Stellar-powered remittance services, bringing fast and affordable cross-border payments to 50 additional countries.',
  },
  {
    id: '4',
    title: 'SEC Approves First Spot Ethereum ETF Options Trading',
    date: '2026-01-28',
    source: 'Bloomberg',
    url: 'https://bloomberg.com',
    category: 'regulation',
    description: 'The U.S. Securities and Exchange Commission has approved options trading on spot Ethereum ETFs, marking another milestone in cryptocurrency market maturation.',
  },
  {
    id: '5',
    title: 'Soroban Smart Contracts See 500% Growth in Developer Activity',
    date: '2026-01-27',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
    description: 'Developer activity on Stellar\'s Soroban smart contract platform has exploded, with the number of deployed contracts and active developers reaching record highs.',
  },
  {
    id: '6',
    title: 'DeFi Total Value Locked Reaches New All-Time High of $500B',
    date: '2026-01-27',
    source: 'DeFi Pulse',
    url: 'https://defipulse.com',
    category: 'defi',
    description: 'The total value locked in decentralized finance protocols has reached an unprecedented $500 billion, driven by institutional adoption and new yield opportunities.',
  },
  {
    id: '7',
    title: 'Circle Launches USDC on Stellar with Native Support',
    date: '2026-01-26',
    source: 'Circle Blog',
    url: 'https://circle.com/blog',
    category: 'stellar',
    description: 'Circle has announced native USDC support on the Stellar network, enabling faster and cheaper stablecoin transactions for global payments.',
  },
  {
    id: '8',
    title: 'EU Finalizes MiCA Implementation Guidelines for 2026',
    date: '2026-01-26',
    source: 'Reuters',
    url: 'https://reuters.com',
    category: 'regulation',
    description: 'The European Union has released final implementation guidelines for the Markets in Crypto-Assets (MiCA) regulation, providing clarity for crypto businesses operating in Europe.',
  },
  {
    id: '9',
    title: 'Stellar Anchor Directory Adds 20 New Licensed Partners',
    date: '2026-01-25',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
    description: 'The Stellar network continues to expand its anchor ecosystem with 20 new licensed partners across Africa, Asia, and Latin America.',
  },
  {
    id: '10',
    title: 'Cross-Border Payments Market to Reach $250T by 2030',
    date: '2026-01-25',
    source: 'Forbes',
    url: 'https://forbes.com',
    category: 'crypto',
    description: 'A new report projects the global cross-border payments market will reach $250 trillion by 2030, with blockchain-based solutions capturing an increasing share.',
  },
  {
    id: '11',
    title: 'Ethereum Layer 2 Networks Process More Transactions Than Mainnet',
    date: '2026-01-24',
    source: 'The Block',
    url: 'https://theblock.co',
    category: 'defi',
    description: 'Layer 2 scaling solutions on Ethereum now process more daily transactions than the Ethereum mainnet, highlighting the success of the scaling roadmap.',
  },
  {
    id: '12',
    title: 'SDF Grants Program Awards $10M to Ecosystem Projects',
    date: '2026-01-24',
    source: 'Stellar Blog',
    url: 'https://stellar.org/blog',
    category: 'stellar',
    description: 'The Stellar Development Foundation has distributed $10 million in grants to innovative projects building on the Stellar network in Q4 2025.',
  },
];

export default function NewsPage() {
  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <NewsMobileView news={mockNews} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <NewsDesktopView news={mockNews} />
      </div>
    </>
  );
}
