// Application state
let provider = null;
let signer = null;
let userAddress = null;
let contracts = {};
let updateIntervalId = null;

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
    initializeEventListeners();
    checkWalletConnection();
});

// Event Listeners
function initializeEventListeners() {
    document.getElementById("connectWallet").addEventListener("click", connectWallet);
    document.getElementById("stakeBtn").addEventListener("click", stakeTokens);
    document.getElementById("maxBtn").addEventListener("click", setMaxAmount);
    document.getElementById("refreshBtn").addEventListener("click", loadUserStakes);
}

// Wallet Connection
async function checkWalletConnection() {
    if (typeof window.ethereum === "undefined") {
        showToast("Please install MetaMask to use this app", "error");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
            await connectWallet();
        }
    } catch (error) {
        console.error("Error checking wallet:", error);
    }
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === "undefined") {
            showToast("Please install MetaMask", "error");
            window.open("https://metamask.io/download/", "_blank");
            return;
        }

        showLoading("Connecting wallet...");

        // Request account access
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];

        // Setup provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Check network
        const network = await provider.getNetwork();
        if (network.chainId !== config.chainId) {
            await switchNetwork();
        }

        // Initialize contracts
        await initializeContracts();

        // Update UI
        await updateWalletUI();
        showConnectedState();

        // Start update loop
        startUpdateLoop();

        // Listen for account changes
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", () => window.location.reload());

        hideLoading();
        showToast("Wallet connected successfully!", "success");
    } catch (error) {
        hideLoading();
        console.error("Connection error:", error);
        showToast(error.message || "Failed to connect wallet", "error");
    }
}

async function switchNetwork() {
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + config.chainId.toString(16) }],
        });
    } catch (error) {
        // If network doesn't exist, add it
        if (error.code === 4902) {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: "0x" + config.chainId.toString(16),
                    chainName: config.chainName,
                    nativeCurrency: config.nativeCurrency,
                    rpcUrls: [config.rpcUrl],
                    blockExplorerUrls: [config.blockExplorer],
                }],
            });
        } else {
            throw error;
        }
    }
}

async function initializeContracts() {
    contracts.token = new ethers.Contract(config.contracts.testToken, abis.testToken, signer);
    contracts.wallet = new ethers.Contract(config.contracts.smartWallet, abis.smartWallet, signer);
    contracts.staking = new ethers.Contract(config.contracts.staking, abis.staking, signer);
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected
        location.reload();
    } else if (accounts[0] !== userAddress) {
        // User switched accounts
        location.reload();
    }
}

// UI Updates
async function updateWalletUI() {
    try {
        // Update address
        document.getElementById("userAddress").textContent =
            `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

        // Update token balance - guard individually so one failure doesn't block the rest
        try {
            const tokenBalance = await contracts.token.balanceOf(userAddress);
            const formattedBalance = parseFloat(ethers.utils.formatEther(tokenBalance)).toFixed(2);
            document.getElementById("tokenBalance").textContent = formattedBalance;
            document.getElementById("availableBalance").textContent = formattedBalance;
        } catch (e) {
            console.warn("Could not fetch token balance (RPC issue):", e.message);
        }

        // Update BNB balance
        try {
            const bnbBalance = await provider.getBalance(userAddress);
            document.getElementById("bnbBalance").textContent =
                parseFloat(ethers.utils.formatEther(bnbBalance)).toFixed(4);
        } catch (e) {
            console.warn("Could not fetch BNB balance (RPC issue):", e.message);
        }

        // Update block info
        try {
            const blockNumber = await provider.getBlockNumber();
            const block = await provider.getBlock(blockNumber);
            document.getElementById("currentBlock").textContent = blockNumber.toLocaleString();
            document.getElementById("blockTimestamp").textContent =
                new Date(block.timestamp * 1000).toLocaleTimeString();
        } catch (e) {
            console.warn("Could not fetch block info (RPC issue):", e.message);
        }

        // Load user stakes
        await loadUserStakes();
    } catch (error) {
        console.warn("Error updating UI (RPC may be rate-limited):", error.message);
    }
}

function showConnectedState() {
    document.getElementById("walletInfo").classList.remove("hidden");
    document.getElementById("stakingCard").classList.remove("hidden");
    document.getElementById("stakesCard").classList.remove("hidden");
    document.getElementById("connectWallet").textContent = "Connected";
    document.getElementById("connectWallet").classList.add("btn-success");
}

// Staking Functions
function setMaxAmount() {
    const maxBalance = document.getElementById("availableBalance").textContent;
    document.getElementById("stakeAmount").value = maxBalance;
}

async function stakeTokens() {
    try {
        const amountInput = document.getElementById("stakeAmount").value;
        if (!amountInput || parseFloat(amountInput) <= 0) {
            showToast("Please enter a valid amount", "error");
            return;
        }

        const amount = ethers.utils.parseEther(amountInput);

        showLoading("Approving tokens...");

        // Check allowance
        const allowance = await contracts.token.allowance(userAddress, config.contracts.staking);
        if (allowance.lt(amount)) {
            const approveTx = await contracts.token.approve(config.contracts.staking, amount);
            await approveTx.wait();
        }

        showLoading("Staking tokens...");

        // Stake
        const stakeTx = await contracts.staking.stake(amount);
        const receipt = await stakeTx.wait();

        hideLoading();

        // Clear input
        document.getElementById("stakeAmount").value = "";

        // Update UI
        await updateWalletUI();

        showToast(
            `Successfully staked ${amountInput} ZWTT!<br>Tx: <a href="${config.blockExplorer}/tx/${stakeTx.hash}" target="_blank" style="color: var(--primary)">View</a>`,
            "success"
        );
    } catch (error) {
        hideLoading();
        console.error("Staking error:", error);
        showToast(error.reason || error.message || "Staking failed", "error");
    }
}

async function unstakeTokens(stakeId) {
    try {
        showLoading("Unstaking tokens...");

        const unstakeTx = await contracts.staking.unstake(stakeId);
        await unstakeTx.wait();

        hideLoading();
        await updateWalletUI();

        showToast(
            `Successfully unstaked!<br>Tx: <a href="${config.blockExplorer}/tx/${unstakeTx.hash}" target="_blank" style="color: var(--primary)">View</a>`,
            "success"
        );
    } catch (error) {
        hideLoading();
        console.error("Unstaking error:", error);
        showToast(error.reason || error.message || "Unstaking failed", "error");
    }
}

// Load Stakes
async function loadUserStakes() {
    try {
        const stakeIds = await contracts.staking.getUserStakeIds(userAddress);
        const stakesList = document.getElementById("stakesList");

        if (stakeIds.length === 0) {
            stakesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No active stakes</p>
                    <small>Stake some tokens to get started!</small>
                </div>
            `;
            document.getElementById("totalStaked").textContent = "0 ZWTT";
            return;
        }

        let totalStaked = ethers.BigNumber.from(0);
        let stakesHTML = "";

        for (const stakeId of stakeIds) {
            const stake = await contracts.staking.getStake(stakeId);

            if (stake.withdrawn) continue;

            const canUnstake = await contracts.staking.canUnstake(stakeId);
            const timeRemaining = await contracts.staking.getTimeRemaining(stakeId);

            totalStaked = totalStaked.add(stake.amount);

            stakesHTML += createStakeHTML(stakeId, stake, canUnstake, Number(timeRemaining));
        }

        if (stakesHTML === "") {
            stakesHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>No active stakes</p>
                </div>
            `;
        }

        stakesList.innerHTML = stakesHTML;
        document.getElementById("totalStaked").textContent =
            parseFloat(ethers.utils.formatEther(totalStaked)).toFixed(2) + " ZWTT";

        // Attach unstake button listeners
        document.querySelectorAll(".unstake-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const stakeId = e.target.dataset.stakeId;
                unstakeTokens(stakeId);
            });
        });

        // Start countdown timers
        updateCountdowns();
    } catch (error) {
        console.error("Error loading stakes:", error);
    }
}

function createStakeHTML(stakeId, stake, canUnstake, timeRemaining) {
    const amount = parseFloat(ethers.utils.formatEther(stake.amount)).toFixed(2);
    const startDate = new Date(Number(stake.startTime) * 1000);
    const unlockDate = new Date(Number(stake.unlockTime) * 1000);

    const statusClass = canUnstake ? "unlocked" : "locked";
    const statusText = canUnstake ? "✅ Ready to Unstake" : "🔒 Locked";
    const itemClass = canUnstake ? "stake-item unlocked" : "stake-item";

    return `
        <div class="${itemClass}" data-stake-id="${stakeId}">
            <div class="stake-header">
                <div class="stake-id">Stake #${stakeId}</div>
                <div class="stake-status ${statusClass}">${statusText}</div>
            </div>
            <div class="stake-details">
                <div class="stake-detail">
                    <div class="stake-detail-label">Amount</div>
                    <div class="stake-detail-value">${amount} ZWTT</div>
                </div>
                <div class="stake-detail">
                    <div class="stake-detail-label">Started</div>
                    <div class="stake-detail-value">${startDate.toLocaleString()}</div>
                </div>
                <div class="stake-detail">
                    <div class="stake-detail-label">Unlocks</div>
                    <div class="stake-detail-value">${unlockDate.toLocaleString()}</div>
                </div>
                <div class="stake-detail">
                    <div class="stake-detail-label">${canUnstake ? "Status" : "Time Remaining"}</div>
                    <div class="stake-detail-value countdown ${canUnstake ? 'unlocked' : ''}" 
                         data-unlock-time="${stake.unlockTime}">
                        ${canUnstake ? "UNLOCKED" : formatTime(timeRemaining)}
                    </div>
                </div>
            </div>
            <button class="btn ${canUnstake ? 'btn-gradient' : 'btn-secondary'} btn-lg unstake-btn" 
                    data-stake-id="${stakeId}" 
                    ${!canUnstake ? 'disabled' : ''}>
                <span class="btn-icon">${canUnstake ? '⚡' : '🔒'}</span>
                ${canUnstake ? 'Unstake Now' : 'Locked'}
            </button>
        </div>
    `;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function updateCountdowns() {
    const countdowns = document.querySelectorAll(".countdown:not(.unlocked)");

    countdowns.forEach(countdown => {
        const unlockTime = Number(countdown.dataset.unlockTime);
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, unlockTime - now);

        if (remaining === 0) {
            // Reload stakes when one becomes unlocked
            loadUserStakes();
        } else {
            countdown.textContent = formatTime(remaining);
        }
    });
}

// Update Loop
function startUpdateLoop() {
    if (updateIntervalId) clearInterval(updateIntervalId);

    updateIntervalId = setInterval(async () => {
        if (userAddress && provider) {
            await updateWalletUI();
            updateCountdowns();
        }
    }, config.updateInterval);
}

// UI Helpers
function showLoading(text = "Processing...") {
    document.getElementById("loadingText").textContent = text;
    document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loadingOverlay").classList.add("hidden");
}

function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const title = type === "success" ? "Success" : type === "error" ? "Error" : "Info";

    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;

    document.getElementById("toastContainer").appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s ease reverse";
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
