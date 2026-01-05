
export interface Project {
    name: string;
    url: string;
    categories: string;
    amount: string;
    award: string;
}

export async function fetchProjects(): Promise<Project[]> {
    // In a real scenario, we might fetch this from an API or database.
    // For now, we are simulating the data extracted from stellarchain.dev/projects
    return [
        {
            name: "Hoops Finance",
            url: "https://stellarchain.dev/projects/31",
            categories: "Indexing Service",
            amount: "$50,000",
            award: "Activation Award in SCF #29"
        },
        {
            name: "YEO! Your Eyes Only",
            url: "https://stellarchain.dev/projects/1",
            categories: "End-User Application",
            amount: "$50,000",
            award: "Activation Award in SCF #29"
        },
        {
            name: "SORA",
            url: "https://stellarchain.dev/projects/107",
            categories: "Other Developer Tooling",
            amount: "$99,996",
            award: "Community Award in SCF #29"
        },
        {
            name: "Peeswap",
            url: "https://stellarchain.dev/projects/40",
            categories: "DEX",
            amount: "$500,000",
            award: "Activation Award in SCF #29"
        },
        {
            name: "Stellar Aid Assist",
            url: "https://stellarchain.dev/projects/stellar-aid-assist",
            categories: "End-User Application",
            amount: "$100,000",
            award: "Community Award"
        },
        {
            name: "Beans App",
            url: "https://stellarchain.dev/projects/beans-app",
            categories: "Wallet",
            amount: "$75,000",
            award: "Activation Award"
        },
        {
            name: "LOBSTR",
            url: "https://stellarchain.dev/projects/lobstr",
            categories: "Wallet",
            amount: "N/A",
            award: "Established"
        },
        {
            name: "StellarX",
            url: "https://stellarchain.dev/projects/stellarx",
            categories: "DEX",
            amount: "N/A",
            award: "Established"
        },
        {
            name: "Dropzey",
            url: "https://stellarchain.dev/projects/dropzey",
            categories: "Decentralized Airdrop Hub",
            amount: "N/A",
            award: "Verified Project"
        },
        {
            name: "Artemezya",
            url: "https://stellarchain.dev/projects/artemezya",
            categories: "ESOP Management",
            amount: "N/A",
            award: "Verified Project"
        },
        {
            name: "Savi Protocol",
            url: "https://stellarchain.dev/projects/savi-protocol",
            categories: "Digital Ownership",
            amount: "N/A",
            award: "Verified Project"
        },
        {
            name: "BillPayment",
            url: "https://stellarchain.dev/projects/billpayment",
            categories: "DeFi & Lending",
            amount: "N/A",
            award: "Verified Project"
        }
    ];
}
