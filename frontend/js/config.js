// Contract addresses - UPDATE THESE AFTER DEPLOYMENT
const config = {
    // Network configuration
    chainId: 97, // BSC Testnet
    chainName: "BSC Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    blockExplorer: "https://testnet.bscscan.com",
    nativeCurrency: {
        name: "Test BNB",
        symbol: "tBNB",
        decimals: 18,
    },

    // Contract addresses - REPLACE AFTER DEPLOYMENT
    contracts: {
        testToken: "0xBAfffD85517aB3CaE6098487f5Be8ED392252afA",
        smartWallet: "0x529Bc00edA19CD0958e47F625E6111f0Eb688080",
        staking: "0x10cB8bd1101B6DFaB96a8417799073994168F734",
    },

    // Lock duration (in seconds)
    lockDuration: 3600,

    // Update interval (milliseconds)
    updateInterval: 2000,
};

// Contract ABIs
const abis = {
    testToken: [
        "function balanceOf(address account) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function mint(address to, uint256 amount)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
    ],

    smartWallet: [
        "function owner() view returns (address)",
        "function execute(address target, bytes data) returns (bytes)",
        "function authorize(address delegate, bool status)",
        "function isAuthorized(address delegate) view returns (bool)",
    ],

    staking: [
        "function stake(uint256 amount) returns (uint256)",
        "function unstake(uint256 stakeId)",
        "function canUnstake(uint256 stakeId) view returns (bool)",
        "function getStake(uint256 stakeId) view returns (tuple(address staker, uint256 amount, uint256 startTime, uint256 unlockTime, bool withdrawn))",
        "function getUserStakeIds(address user) view returns (uint256[])",
        "function getTimeRemaining(uint256 stakeId) view returns (uint256)",
        "function lockDuration() view returns (uint256)",
        "event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 unlockTime)",
        "event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 unstakedAt)",
    ],
};
