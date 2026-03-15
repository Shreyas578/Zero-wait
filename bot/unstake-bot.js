require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Configuration
const RPC_URLS = [
    process.env.RPC_URL,
    "https://bsc-testnet-rpc.publicnode.com",
    "https://data-seed-prebsc-2-s1.binance.org:8545/",
    "https://data-seed-prebsc-1-s2.binance.org:8545/",
    "https://data-seed-prebsc-1-s1.binance.org:8545/",
].filter(Boolean);

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "3000"); // 3 seconds

async function createProvider() {
    for (const url of RPC_URLS) {
        try {
            const p = new ethers.providers.JsonRpcProvider(url);
            await p.getNetwork(); // test connection
            console.log("Connected to RPC:", url);
            return p;
        } catch (e) {
            console.warn("RPC failed, trying next:", url);
        }
    }
    throw new Error("All RPC endpoints failed. Check your internet connection.");
}

const PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || process.env.PRIVATE_KEY;

// Load ABIs
const stakingABI = [
    "function canUnstake(uint256 stakeId) external view returns (bool)",
    "function unstake(uint256 stakeId) external",
    "function getStake(uint256 stakeId) external view returns (tuple(address staker, uint256 amount, uint256 startTime, uint256 unlockTime, bool withdrawn))",
    "function getUserStakeIds(address user) external view returns (uint256[])",
    "event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 unlockTime)",
    "event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 unstakedAt)",
];

const walletABI = [
    "function execute(address target, bytes calldata data) external returns (bytes memory)",
    "function authorize(address delegate, bool status) external",
    "function isAuthorized(address delegate) external view returns (bool)",
];

class AutoUnstakeBot {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.stakingContract = null;
        this.walletContract = null;
        this.monitoredStakes = new Map(); // stakeId -> { staker, unlockTime, amount }
        this.isRunning = false;
    }

    async initialize() {
        console.log("=== Auto-Unstake Bot Initializing ===\n");

        // Connect to RPC with fallback
        this.provider = await createProvider();

        // Setup wallet
        if (!PRIVATE_KEY || PRIVATE_KEY === "your_private_key_here") {
            throw new Error("BOT_PRIVATE_KEY or PRIVATE_KEY not set in .env file");
        }

        this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
        console.log("Bot wallet address:", this.wallet.address);

        const balance = await this.provider.getBalance(this.wallet.address);
        console.log("Bot balance:", ethers.utils.formatEther(balance), "BNB");

        if (balance.eq(0)) {
            console.warn("⚠️  Warning: Bot wallet has no BNB for gas fees!");
        }

        // Load deployment addresses
        const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
        if (!fs.existsSync(addressesPath)) {
            throw new Error("deployed-addresses.json not found. Deploy contracts first.");
        }

        const deploymentInfo = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
        console.log("\nLoaded contracts from:", deploymentInfo.network);

        this.stakingContract = new ethers.Contract(
            deploymentInfo.contracts.ZeroWaitStaking,
            stakingABI,
            this.wallet
        );

        this.walletContract = new ethers.Contract(
            deploymentInfo.contracts.SmartAccountWallet,
            walletABI,
            this.wallet
        );

        console.log("Staking contract:", deploymentInfo.contracts.ZeroWaitStaking);
        console.log("Smart wallet:", deploymentInfo.contracts.SmartAccountWallet);

        // Check if bot is authorized
        const isAuthorized = await this.walletContract.isAuthorized(this.wallet.address);
        console.log("\nBot authorization status:", isAuthorized);

        if (!isAuthorized) {
            console.log("\n⚠️  Bot is NOT authorized to execute via SmartAccountWallet");
            console.log("The wallet owner must call:");
            console.log(`   wallet.authorize("${this.wallet.address}", true)`);
        }

        console.log("\n✓ Bot initialized successfully\n");
    }

    async monitorBlocks() {
        console.log("=== Starting Block Monitor ===");
        console.log("Checking for unlockable stakes every", POLL_INTERVAL, "ms\n");

        this.isRunning = true;

        // Listen for new stakes
        this.stakingContract.on("Staked", (user, stakeId, amount, unlockTime) => {
            console.log(`\n📍 New Stake Detected:`);
            console.log(`   Stake ID: ${stakeId}`);
            console.log(`   User: ${user}`);
            console.log(`   Amount: ${ethers.utils.formatEther(amount)} ZWTT`);
            console.log(`   Unlock: ${new Date(Number(unlockTime) * 1000).toISOString()}`);

            this.monitoredStakes.set(Number(stakeId), {
                staker: user,
                unlockTime: Number(unlockTime),
                amount: amount,
            });
        });

        // Main monitoring loop
        while (this.isRunning) {
            try {
                await this.checkAndExecuteUnstakes();
            } catch (error) {
                console.error("❌ Error in monitoring loop:", error.message);
            }

            await this.sleep(POLL_INTERVAL);
        }
    }

    async checkAndExecuteUnstakes() {
        const currentBlock = await this.provider.getBlockNumber();
        const block = await this.provider.getBlock(currentBlock);
        const currentTimestamp = block.timestamp;

        // Check each monitored stake
        for (const [stakeId, stakeInfo] of this.monitoredStakes) {
            try {
                // Check if already unstaked
                const stake = await this.stakingContract.getStake(stakeId);
                if (stake.withdrawn) {
                    this.monitoredStakes.delete(stakeId);
                    continue;
                }

                // Check if eligible to unstake
                const canUnstake = await this.stakingContract.canUnstake(stakeId);
                const timeRemaining = Math.max(0, stakeInfo.unlockTime - currentTimestamp);

                if (canUnstake && !stake.withdrawn) {
                    console.log(`\n🚀 EXECUTING INSTANT UNSTAKE`);
                    console.log(`   Stake ID: ${stakeId}`);
                    console.log(`   Block: #${currentBlock}`);
                    console.log(`   Timestamp: ${currentTimestamp}`);
                    console.log(`   Unlock Time: ${stakeInfo.unlockTime}`);
                    console.log(`   Delay: ${currentTimestamp - stakeInfo.unlockTime}s`);

                    await this.executeUnstake(stakeId, stakeInfo.staker);
                } else if (timeRemaining > 0 && timeRemaining < 60) {
                    // Show countdown for stakes unlocking soon
                    process.stdout.write(
                        `\r⏳ Block #${currentBlock} | Stake #${stakeId} unlocks in ${timeRemaining}s`
                    );
                }
            } catch (error) {
                console.error(`\n❌ Error checking stake ${stakeId}:`, error.message);
            }
        }
    }

    async executeUnstake(stakeId, staker) {
        try {
            // Prepare unstake call data
            const unstakeData = this.stakingContract.interface.encodeFunctionData("unstake", [
                stakeId,
            ]);

            // Execute via smart wallet (delegated execution)
            const tx = await this.walletContract.execute(
                this.stakingContract.address,
                unstakeData,
                {
                    gasLimit: 300000,
                    gasPrice: (await this.provider.getGasPrice()).mul(2), // 2x gas for priority
                }            );

            console.log(`   Transaction: ${tx.hash}`);
            console.log(`   Waiting for confirmation...`);

            const receipt = await tx.wait();

            console.log(`\n✅ UNSTAKE SUCCESSFUL!`);
            console.log(`   Block: #${receipt.blockNumber}`);
            console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
            console.log(`   View: https://testnet.bscscan.com/tx/${tx.hash}`);

            // Remove from monitoring
            this.monitoredStakes.delete(stakeId);
        } catch (error) {
            console.error(`\n❌ Unstake execution failed:`, error.message);

            // If execution failed, try direct unstake (if bot owns the stake)
            if (error.message.includes("Not authorized")) {
                console.log("   Trying direct unstake...");
                try {
                    const directTx = await this.stakingContract.unstake(stakeId, {
                        gasLimit: 300000,
                    });
                    const directReceipt = await directTx.wait();
                    console.log(`✅ Direct unstake successful! Tx: ${directTx.hash}`);
                    this.monitoredStakes.delete(stakeId);
                } catch (directError) {
                    console.error("   Direct unstake also failed:", directError.message);
                }
            }
        }
    }

    async loadExistingStakes(userAddress) {
        console.log(`\nLoading existing stakes for ${userAddress}...`);

        try {
            const stakeIds = await this.stakingContract.getUserStakeIds(userAddress);
            console.log(`Found ${stakeIds.length} stakes`);

            for (const stakeId of stakeIds) {
                const stake = await this.stakingContract.getStake(stakeId);

                if (!stake.withdrawn) {
                    this.monitoredStakes.set(Number(stakeId), {
                        staker: stake.staker,
                        unlockTime: Number(stake.unlockTime),
                        amount: stake.amount,
                    });

                    console.log(`   - Stake #${stakeId}: ${ethers.utils.formatEther(stake.amount)} ZWTT, unlocks at ${new Date(Number(stake.unlockTime) * 1000).toISOString()}`);
                }
            }
        } catch (error) {
            console.error("Error loading stakes:", error.message);
        }
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    stop() {
        console.log("\n\nStopping bot...");
        this.isRunning = false;
    }
}

// Main execution
async function main() {
    const bot = new AutoUnstakeBot();

    try {
        await bot.initialize();

        // Optionally load existing stakes for a specific address
        if (process.env.MONITOR_ADDRESS) {
            await bot.loadExistingStakes(process.env.MONITOR_ADDRESS);
        }

        // Handle graceful shutdown
        process.on("SIGINT", () => bot.stop());
        process.on("SIGTERM", () => bot.stop());

        await bot.monitorBlocks();
    } catch (error) {
        console.error("\n❌ Fatal error:", error);
        process.exit(1);
    }
}

main();
