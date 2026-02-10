export const fetchStellarCoinData = async () => {
  const response = await fetch('https://api.stellarchain.dev/api/coins/stellar');

  if (!response.ok) {
    throw new Error(`Failed to fetch Stellar coin data: ${response.status}`);
  }

  return response.json();
};
