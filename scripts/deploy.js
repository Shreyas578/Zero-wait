const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("=== Minimal Gas Deployment (0.01 tBNB Budget) ===\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    const balanceInBnb = hre.ethers.utils.formatEther(balance);
    console.log("Account balance:", balanceInBnb, "BNB");

    if (parseFloat(balanceInBnb) < 0.008) {
        console.error("\n❌ Insufficient balance! Need at least 0.008 BNB");
        console.error("   Get more from: https://testnet.bnbchain.org/faucet-smart");
        process.exit(1);
    }

    console.log("\n⚠️  Using minimal gas (3 gwei) - transactions will be slower");
    console.log("    This may take several minutes. Please be patient...\n");

    const deployedContracts = {};

    try {
        // 1. Deploy TestToken (cheapest, ~0.003 BNB)
        console.log("1. Deploying TestToken...");
        const TestToken = await hre.ethers.getContractFactory("TestToken");
        const testToken = await TestToken.deploy();
        await testToken.deployed();
        deployedContracts.TestToken = testToken.address;
        console.log("✓ TestToken deployed to:", testToken.address);

        const balanceAfterToken = await hre.ethers.provider.getBalance(deployer.address);
        console.log("  Balance remaining:", hre.ethers.utils.formatEther(balanceAfterToken), "BNB\n");

        // 2. Deploy SmartAccountWallet (~0.002 BNB)
        console.log("2. Deploying SmartAccountWallet...");
        const SmartAccountWallet = await hre.ethers.getContractFactory("SmartAccountWallet");
        const smartWallet = await SmartAccountWallet.deploy();
        await smartWallet.deployed();
        deployedContracts.SmartAccountWallet = smartWallet.address;
        console.log("✓ SmartAccountWallet deployed to:", smartWallet.address);

        const balanceAfterWallet = await hre.ethers.provider.getBalance(deployer.address);
        console.log("  Balance remaining:", hre.ethers.utils.formatEther(balanceAfterWallet), "BNB\n");

        // 3. Deploy ZeroWaitStaking (~0.003 BNB)
        const remainingBalance = await hre.ethers.provider.getBalance(deployer.address);
        if (parseFloat(hre.ethers.utils.formatEther(remainingBalance)) < 0.0025) {
            console.warn("⚠️  Low balance! Staking contract deployment may fail");
            console.warn("   You can deploy it later when you have more tBNB\n");
        }

        console.log("3. Deploying ZeroWaitStaking...");
        const lockDuration = 3600; // 3600 seconds = 1 hour
        const ZeroWaitStaking = await hre.ethers.getContractFactory("ZeroWaitStaking");
        const staking = await ZeroWaitStaking.deploy(testToken.address, lockDuration);
        await staking.deployed();
        deployedContracts.ZeroWaitStaking = staking.address;
        console.log("✓ ZeroWaitStaking deployed to:", staking.address);
        console.log("  Lock duration:", lockDuration, "seconds\n");

        // 4. Mint initial tokens (very cheap, ~0.0001 BNB)
        console.log("4. Minting initial tokens...");
        const mintTx = await testToken.mint(deployer.address, hre.ethers.utils.parseEther("10000"));
        await mintTx.wait();
        console.log("✓ Minted 10,000 ZWTT to deployer\n");

    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);

        if (deployedContracts.TestToken) {
            console.log("\n✓ Partial deployment successful:");
            console.log("  TestToken:", deployedContracts.TestToken);
            if (deployedContracts.SmartAccountWallet) {
                console.log("  SmartAccountWallet:", deployedContracts.SmartAccountWallet);
            }

            // Save partial deployment
            const partialInfo = {
                network: "bscTestnet",
                chainId: "97",
                deployer: deployer.address,
                deployedAt: new Date().toISOString(),
                status: "partial",
                contracts: deployedContracts,
            };

            const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
            fs.writeFileSync(outputPath, JSON.stringify(partialInfo, null, 2));
            console.log("\n✓ Partial deployment saved to deployed-addresses.json");
            console.log("\nℹ️  Get more tBNB and run deployment again to complete");
        }

        process.exit(1);
    }

    // 5. Save deployment info
    const deploymentInfo = {
        network: "bscTestnet",
        chainId: "97",
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        status: "complete",
        contracts: deployedContracts,
        config: {
            lockDuration: 3600,
            tokenName: "Zero Wait Test Token",
            tokenSymbol: "ZWTT",
            gasPrice: "3 gwei (minimal)",
        },
    };

    const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("✓ Deployment addresses saved to:", outputPath);

    const finalBalance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("\n=== Deployment Complete ===");
    console.log("Final balance:", hre.ethers.utils.formatEther(finalBalance), "BNB");
    console.log("\nContract Addresses:");
    console.log("  TestToken:", deployedContracts.TestToken);
    console.log("  SmartAccountWallet:", deployedContracts.SmartAccountWallet);
    console.log("  ZeroWaitStaking:", deployedContracts.ZeroWaitStaking);

    console.log("\nNext Steps:");
    console.log("1. Verify contracts on BSCScan");
    console.log("2. Update frontend/js/config.js with addresses");
    console.log("3. Run: npm run test-flow");
    console.log("4. Start bot: npm run bot");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
