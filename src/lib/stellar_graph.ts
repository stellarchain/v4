import { getTransactions } from './stellar';

// Graph Visualization Types and Functions

const HORIZON_MAINNET = 'https://horizon.stellar.org';

// Helper to fetch JSON
async function fetchJSON<T>(url: string): Promise<T> {
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export interface GraphNode {
    id: string; // address
    label: string; // shortened address or known name
    type: 'source' | 'intermediate' | 'destination';
    balance?: number;
    transactionCount: number;
    val?: number; // node size for force graph
}

export interface GraphEdge {
    source: string; // from address
    target: string; // to address
    amount: number; // Total aggregated XLM amount
    count: number; // Number of aggregated transactions
    transactionHash: string; // Latest transaction hash
    timestamp: number; // Latest timestamp
    type: 'payment' | 'path_payment' | 'create_account';
}

export interface AddressGraph {
    nodes: GraphNode[];
    links: GraphEdge[];
    center: string;
}

// Build graph using Breadth-First Search to ensure Source is central
export async function buildAddressGraph(
    startAddress: string,
    maxDepth: number = 2,
    fetchLimit: number = 50 // Tx per account
): Promise<AddressGraph> {
    console.log(`[buildAddressGraph] BFS Starting for ${startAddress}`);

    const nodes = new Map<string, GraphNode>();
    const edgeMap = new Map<string, GraphEdge>();
    const queue: { address: string; depth: number }[] = [{ address: startAddress, depth: 0 }];
    const visitedToProcess = new Set<string>(); // Addresses we have fetched or are queued to fetch
    const MAX_TOTAL_NODES = 80; // Keep it manageable for view

    // Init Source Node
    nodes.set(startAddress, {
        id: startAddress,
        label: shortenAddress(startAddress),
        type: 'source',
        transactionCount: 0,
        val: 30,
    });
    visitedToProcess.add(startAddress);

    // BFS Loop
    while (queue.length > 0 && nodes.size < MAX_TOTAL_NODES) {
        const { address: currentAddress, depth: currentDepth } = queue.shift()!;

        // Stop if we reached max depth (edges only, no new node expansion)
        if (currentDepth >= maxDepth) continue;

        try {
            const txUrl = `${HORIZON_MAINNET}/accounts/${currentAddress}/transactions?order=desc&limit=${fetchLimit}`;
            const txData: any = await fetchJSON(txUrl);
            const transactions = txData._embedded?.records || [];

            for (const tx of transactions) {
                if (nodes.size >= MAX_TOTAL_NODES) break;

                const opsUrl = `${HORIZON_MAINNET}/transactions/${tx.hash}/operations`;
                const opsData: any = await fetchJSON(opsUrl);
                const operations = opsData._embedded?.records || [];

                for (const op of operations) {
                    if (nodes.size >= MAX_TOTAL_NODES) break;

                    if (op.type === 'payment' || op.type === 'create_account') {
                        const from = op.from || op.funder;
                        const to = op.to || op.account;
                        const amount = parseFloat(op.amount || op.starting_balance || '0');

                        if (!from || !to) continue;

                        // We are interested if this link connects to our current processed node
                        // (Which it inherently does since we fetched currentAddress's txs)

                        const isFromCurrent = from === currentAddress;
                        const otherNode = isFromCurrent ? to : from;

                        // Add 'other' node if new
                        if (!nodes.has(otherNode)) {
                            nodes.set(otherNode, {
                                id: otherNode,
                                label: shortenAddress(otherNode),
                                type: 'destination', // Default to dest, logic can refine
                                transactionCount: 0,
                                val: 10,
                            });

                            // Add to queue if we have depth left
                            if (!visitedToProcess.has(otherNode) && currentDepth + 1 < maxDepth) {
                                visitedToProcess.add(otherNode);
                                queue.push({ address: otherNode, depth: currentDepth + 1 });
                            }
                        }

                        // Update counts ONLY if nodes exist (might have been skipped due to limit)
                        const fromNode = nodes.get(from);
                        const toNode = nodes.get(to);

                        if (fromNode && toNode) {
                            fromNode.transactionCount++;
                            toNode.transactionCount++;

                            // Aggregate Edge
                            const edgeKey = `${from}-${to}`;
                            if (edgeMap.has(edgeKey)) {
                                const existing = edgeMap.get(edgeKey)!;
                                existing.amount += amount;
                                existing.count += 1;
                                if (new Date(tx.created_at).getTime() > existing.timestamp) {
                                    existing.timestamp = new Date(tx.created_at).getTime();
                                    existing.transactionHash = tx.hash;
                                }
                            } else {
                                edgeMap.set(edgeKey, {
                                    source: from,
                                    target: to,
                                    amount: amount,
                                    count: 1,
                                    transactionHash: tx.hash,
                                    timestamp: new Date(tx.created_at).getTime(),
                                    type: op.type as 'payment' | 'create_account',
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error processing ${currentAddress}:`, error);
        }
    }

    // Filter links to ensure valid connectivity within the fetched graph subset
    const validLinks = Array.from(edgeMap.values()).filter(link =>
        nodes.has(link.source) && nodes.has(link.target)
    );

    console.log(`[buildAddressGraph] BFS Completed. Nodes: ${nodes.size}, Links: ${validLinks.length}`);

    return {
        nodes: Array.from(nodes.values()),
        links: validLinks,
        center: startAddress,
    };
}

function shortenAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
