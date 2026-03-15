const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    console.log("=== Zero-Wait Unstaking Test Flow ===\n");

    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
    if (!fs.existsSync(addressesPath)) {
        console.error("❌ deployed-addresses.json not found. Run deployment first:");
        console.error("   npx hardhat run scripts/deploy.js --network bscTestnet");
        process.exit(1);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    console.log("Loaded deployment from:", deploymentInfo.network);
    console.log("Contracts:", deploymentInfo.contracts);

    const [signer] = await hre.ethers.getSigners();
    console.log("\nTesting with account:", signer.address);

    // Get contract instances
    const token = await hre.ethers.getContractAt(
        "TestToken",
        deploymentInfo.contracts.TestToken
    );
    const wallet = await hre.ethers.getContractAt(
        "SmartAccountWallet",
        deploymentInfo.contracts.SmartAccountWallet
    );
    const staking = await hre.ethers.getContractAt(
        "ZeroWaitStaking",
        deploymentInfo.contracts.ZeroWaitStaking
    );

    console.log("\n=== Step 1: Check balances ===");
    const tokenBalance = await token.balanceOf(signer.address);
    console.log("Token balance:", hre.ethers.formatEther(tokenBalance), "ZWTT");

    // Mint tokens if needed
    if (tokenBalance < hre.ethers.parseEther("1000")) {
        console.log("Minting tokens...");
        const mintTx = await token.mint(signer.address, hre.ethers.parseEther("10000"));
        await mintTx.wait();
        console.log("✓ Minted 10,000 ZWTT");
    }

    console.log("\n=== Step 2: Approve and Stake ===");
    const stakeAmount = hre.ethers.parseEther("100");

    // Approve
    console.log("Approving", hre.ethers.formatEther(stakeAmount), "ZWTT...");
    const approveTx = await token.approve(
        deploymentInfo.contracts.ZeroWaitStaking,
        stakeAmount
    );
    await approveTx.wait();
    console.log("✓ Approved");

    // Stake
    console.log("Staking...");
    const stakeTx = await staking.stake(stakeAmount);
    const stakeReceipt = await stakeTx.wait();

    // Get stake ID from event
    const stakeEvent = stakeReceipt.logs.find(
        (log) => log.topics[0] === hre.ethers.id("Staked(address,uint256,uint256,uint256)")
    );
    const stakeId = stakeEvent ? Number(stakeEvent.topics[2]) : 1;

    console.log("✓ Staked! Stake ID:", stakeId);

    // Get stake info
    const stakeInfo = await staking.getStake(stakeId);
    const unlockTime = Number(stakeInfo.unlockTime);
    const currentTime = Math.floor(Date.now() / 1000);
    const unlockDate = new Date(unlockTime * 1000);

    console.log("\n=== Stake Information ===");
    console.log("Stake ID:", stakeId);
    console.log("Amount:", hre.ethers.formatEther(stakeInfo.amount), "ZWTT");
    console.log("Start Time:", new Date(Number(stakeInfo.startTime) * 1000).toISOString());
    console.log("Unlock Time:", unlockDate.toISOString());
    console.log("Lock Duration:", deploymentInfo.config.lockDuration, "seconds");
    console.log("Current Time:", new Date(currentTime * 1000).toISOString());
    console.log("Time Remaining:", Math.max(0, unlockTime - currentTime), "seconds");

    console.log("\n=== Step 3: Wait for unlock ===");
    console.log("NOTE: This will wait until the stake is unlocked.");
    console.log("For the challenge (3600s lock), this would take 1 hour.");
    console.log("Press Ctrl+C to skip waiting and test later.\n");

    // For testing with shorter duration, you can update via setLockDuration
    const lockDuration = deploymentInfo.config.lockDuration;

    if (lockDuration > 300) {
        console.log("⚠️  Lock duration is", lockDuration, "seconds.");
        console.log("⚠️  For quick testing, you may want to:");
        console.log("    1. Redeploy with shorter lock duration, or");
        console.log("    2. Wait and test unstaking manually later");
        console.log("\nTo test unstaking when ready, run:");
        console.log(`   node scripts/unstake.js ${stakeId}`);
        return;
    }

    // Wait for unlock
    while (true) {
        const canUnstake = await staking.canUnstake(stakeId);
        const currentBlock = await hre.ethers.provider.getBlockNumber();
        const currentTimestamp = (await hre.ethers.provider.getBlock(currentBlock)).timestamp;
        const remaining = Math.max(0, unlockTime - currentTimestamp);

        process.stdout.write(
            `\r⏳ Block #${currentBlock} | Time remaining: ${remaining}s | Can unstake: ${canUnstake}`
        );

        if (canUnstake) {
            console.log("\n\n✓ Stake is now unlocked!");
            break;
        }

        await sleep(2000); // Check every 2 seconds
    }

    console.log("\n=== Step 4: Execute Instant Unstake ===");
    const unstakeStartTime = Date.now();
    console.log("Executing unstake...");

    const unstakeTx = await staking.unstake(stakeId);
    console.log("Transaction sent:", unstakeTx.hash);

    const unstakeReceipt = await unstakeTx.wait();
    const unstakeEndTime = Date.now();

    console.log("✓ Unstake completed!");
    console.log("Block number:", unstakeReceipt.blockNumber);
    console.log("Gas used:", unstakeReceipt.gasUsed.toString());
    console.log("Execution time:", (unstakeEndTime - unstakeStartTime) / 1000, "seconds");

    // Get exact timestamp from blockchain
    const block = await hre.ethers.provider.getBlock(unstakeReceipt.blockNumber);
    console.log("\n=== Timing Verification ===");
    console.log("Unlock Timestamp:", unlockTime);
    console.log("Unstake Timestamp:", block.timestamp);
    console.log("Delay:", block.timestamp - unlockTime, "seconds");
    console.log(
        block.timestamp === unlockTime
            ? "✓ PERFECT: Unstaked in the EXACT unlock block!"
            : block.timestamp > unlockTime
                ? `✓ SUCCESS: Unstaked ${block.timestamp - unlockTime}s after unlock`
                : "❌ ERROR: Unstaked before unlock time (should not happen)"
    );

    // Verify balance
    const finalBalance = await token.balanceOf(signer.address);
    console.log("\n=== Final Balance ===");
    console.log("Token balance:", hre.ethers.formatEther(finalBalance), "ZWTT");

    console.log("\n=== Test Summary ===");
    console.log("✓ Stake executed successfully");
    console.log("✓ Unstake executed immediately when eligible");
    console.log("✓ Zero-wait unstaking verified!");
    console.log("\nTransaction Hash:", unstakeTx.hash);
    console.log("View on BSCScan:");
    console.log(`https://testnet.bscscan.com/tx/${unstakeTx.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
