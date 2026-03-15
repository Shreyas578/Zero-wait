const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const stakeId = process.argv[2];

    if (!stakeId) {
        console.error("Usage: node scripts/unstake.js <stakeId>");
        process.exit(1);
    }

    console.log(`=== Manual Unstake - Stake #${stakeId} ===\n`);

    // Load deployment info
    const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
    if (!fs.existsSync(addressesPath)) {
        console.error("❌ deployed-addresses.json not found");
        process.exit(1);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    const [signer] = await hre.ethers.getSigners();

    const staking = await hre.ethers.getContractAt(
        "ZeroWaitStaking",
        deploymentInfo.contracts.ZeroWaitStaking
    );

    // Check stake info
    console.log("Checking stake information...");
    const stake = await staking.getStake(stakeId);

    console.log("\nStake Details:");
    console.log("  Owner:", stake.staker);
    console.log("  Amount:", hre.ethers.formatEther(stake.amount), "ZWTT");
    console.log("  Unlock Time:", new Date(Number(stake.unlockTime) * 1000).toISOString());
    console.log("  Withdrawn:", stake.withdrawn);

    if (stake.withdrawn) {
        console.log("\n❌ This stake has already been withdrawn");
        return;
    }

    if (stake.staker !== signer.address) {
        console.log("\n❌ You are not the owner of this stake");
        console.log("   Stake owner:", stake.staker);
        console.log("   Your address:", signer.address);
        return;
    }

    // Check eligibility
    const canUnstake = await staking.canUnstake(stakeId);
    const timeRemaining = await staking.getTimeRemaining(stakeId);

    console.log("\nEligibility:");
    console.log("  Can Unstake:", canUnstake ? "✅ YES" : "❌ NO");
    console.log("  Time Remaining:", Number(timeRemaining), "seconds");

    if (!canUnstake) {
        console.log("\n⏳ Stake is still locked. Please wait", timeRemaining, "more seconds.");
        return;
    }

    // Execute unstake
    console.log("\n🚀 Executing unstake...");
    const tx = await staking.unstake(stakeId);
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("\n✅ Unstake successful!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("\nView on BSCScan:");
    console.log(`https://testnet.bscscan.com/tx/${tx.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
