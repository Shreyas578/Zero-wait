# Zero-Wait Unstaking System

> ⚡ Instant unstaking on BSC testnet using EIP-7702-inspired smart account architecture

A sophisticated staking system that enables users to unstake tokens **immediately** after lock expiry, with zero delay. Built for the BSC unstaking challenge.

![BSC Testnet](https://img.shields.io/badge/BSC-Testnet-yellow)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16+ and npm
- **MetaMask** browser extension
- **tBNB** for gas fees (get from [BSC Faucet](https://testnet.bnbchain.org/faucet-smart))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Zero-wait

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY
```

### Run the Project

```bash
# 1. Compile contracts
npm run compile

# 2. Deploy to BSC Testnet
npm run deploy

# 3. Update frontend with deployed addresses
node scripts/update-frontend.js

# 4. Start the frontend
npm run frontend
# Open http://localhost:8080 in browser

# 5. Optional: Start auto-unstake bot
npm run bot
```

---

## 📦 Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@openzeppelin/contracts** | ^5.0.0 | ERC20, Ownable, ReentrancyGuard base contracts |
| **dotenv** | ^16.0.0 | Environment variable management |
| **ethers** | ^5.7.0 | Ethereum/BSC blockchain interaction library |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **hardhat** | ^2.28.0 | Smart contract development framework |
| **@nomicfoundation/hardhat-toolbox** | ^2.0.2 | Hardhat plugins bundle (testing, deployment, verification) |

### Additional Tools (No Install Required)

- **http-server** (via npx) - Local web server for frontend
- **MetaMask** - Browser wallet for testing

---

## 📖 Detailed Commands

### Smart Contract Commands

#### Compile Contracts
```bash
npm run compile
```
Compiles all Solidity contracts in `contracts/` directory.

**Output**: Creates `artifacts/` and `cache/` directories with compiled contracts.

#### Deploy Contracts
```bash
npm run deploy
```
Deploys all three contracts to BSC Testnet:
- TestToken (ERC20)
- SmartAccountWallet (EIP-7702-inspired)
- ZeroWaitStaking (Main staking contract)

**Requirements**:
- `.env` file with valid `PRIVATE_KEY`
- Minimum 0.01 tBNB in deployer wallet
- BSC Testnet RPC accessible

**Output**: Creates `deployed-addresses.json` with all contract addresses.

#### Verify Contracts
```bash
npm run verify <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Examples:
npm run verify 0xYourTokenAddress
npm run verify 0xYourStakingAddress 0xTokenAddress 3600
```
Verifies contracts on BSCScan.

**Requirements**: `BSCSCAN_API_KEY` in `.env` (optional but recommended)

#### Run Tests
```bash
npm test
```
Runs Hardhat test suite (if test files exist in `test/` directory).

---

### Testing & Monitoring Commands

#### Test Complete Flow
```bash
npm run test-flow
```
Executes end-to-end staking flow:
1. Checks balances
2. Stakes tokens
3. Monitors unlock time
4. Executes unstake
5. Records timestamps

**Note**: With 3600s lock, this takes 1 hour. For quick testing, deploy with shorter lock duration.

#### Manual Unstake
```bash
npm run unstake <STAKE_ID>

# Example:
npm run unstake 1
```
Manually unstakes a specific stake by ID.

**Requirements**: Stake must be unlocked (`block.timestamp >= unlockTime`)

#### Auto-Unstake Bot
```bash
npm run bot
```
Starts the automated monitoring bot that:
- Monitors new blocks every 1-2 seconds
- Detects when stakes become eligible
- Executes unstake automatically via SmartAccountWallet
- Uses high gas priority for fast inclusion

**Configuration** (in `.env`):
```bash
BOT_PRIVATE_KEY=your_bot_private_key
POLL_INTERVAL=1000  # milliseconds
MONITOR_ADDRESS=0x...  # optional
```

---

### Frontend Commands

#### Start Frontend Server
```bash
npm run frontend
```
Starts local HTTP server on port 8080.

**Alternative methods**:
```bash
# Method 1: Using npm script (recommended)
npm run frontend

# Method 2: Direct command
cd frontend && npx http-server -p 8080

# Method 3: Using Python
cd frontend && python -m http.server 8080
```

**Access**: Open http://localhost:8080 in your browser

#### Update Frontend Config
```bash
node scripts/update-frontend.js
```
Updates `frontend/js/config.js` with deployed contract addresses from `deployed-addresses.json`.

**Run after**: Every contract deployment

---

## 🏗️ Project Structure

```
Zero-wait/
├── contracts/                  # Solidity smart contracts
│   ├── TestToken.sol          # ERC20 test token
│   ├── SmartAccountWallet.sol # EIP-7702-inspired smart account
│   └── ZeroWaitStaking.sol    # Main staking contract
├── scripts/                    # Deployment and utility scripts
│   ├── deploy.js              # Main deployment script
│   ├── test-flow.js           # E2E test flow
│   ├── unstake.js             # Manual unstake helper
│   └── update-frontend.js     # Frontend config updater
├── bot/                        # Auto-unstake bot
│   └── unstake-bot.js         # Block monitoring & auto-execution
├── frontend/                   # Web interface
│   ├── index.html             # Main page
│   ├── css/style.css          # Premium styling
│   └── js/
│       ├── config.js          # Contract addresses & ABIs
│       └── app.js             # Application logic
├── hardhat.config.js          # Hardhat configuration
├── package.json               # Dependencies & scripts
├── .env.example               # Environment template
└── README.md                  # This file
```

---

## 🔧 Configuration

### Environment Variables (`.env`)

```bash
# Required: Private key for contract deployment (64 hex characters, no 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: For contract verification on BSCScan
BSCSCAN_API_KEY=your_bscscan_api_key

# Optional: Bot configuration
BOT_PRIVATE_KEY=bot_private_key_or_same_as_above
POLL_INTERVAL=1000
MONITOR_ADDRESS=0x_specific_address_to_monitor
```

### Network Configuration

Pre-configured in `hardhat.config.js`:
- **Network**: BSC Testnet
- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Gas Price**: 3 gwei (minimal for budget deployment)

---

## 💻 Usage Guide

### 1. Deploy Contracts

```bash
# Make sure you have tBNB in your wallet
npm run deploy

# Output will show:
# ✓ TestToken deployed to: 0x...
# ✓ SmartAccountWallet deployed to: 0x...
# ✓ ZeroWaitStaking deployed to: 0x...
```

### 2. Update Frontend

```bash
node scripts/update-frontend.js

# Automatically updates frontend/js/config.js
```

### 3. Start Frontend

```bash
npm run frontend

# Open http://localhost:8080
```

### 4. Connect Wallet & Stake

1. **Connect MetaMask** - Click "Connect Wallet"
2. **Get Tokens** - You already have 10,000 ZWTT from deployment
3. **Stake** - Enter amount and click "Stake Tokens"
4. **Confirm** - Approve in MetaMask (2 transactions)
5. **Monitor** - Watch the countdown timer

### 5. Unstake

**Manual**:
- Wait for countdown to reach zero
- Click "Unstake Now" button
- Confirm in MetaMask

**Automatic**:
```bash
npm run bot
# Bot will unstake automatically when eligible
```

---

## 🧪 Testing

### Local Testing

1. **Compile contracts**:
   ```bash
   npm run compile
   ```

2. **Run test flow**:
   ```bash
   npm run test-flow
   ```

3. **Check deployed contracts on BSCScan**:
   ```
   https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS
   ```

### Frontend Testing

1. **Start frontend**:
   ```bash
   npm run frontend
   ```

2. **Open test page**:
   ```
   http://localhost:8080/test-ethers.html
   ```
   Should show: "✅ Ethers.js loaded successfully"

3. **Test wallet connection**:
   - Open `http://localhost:8080`
   - Click "Connect Wallet"
   - Verify balance displays correctly

---

## 🎯 Features

### Core Requirements ✅

- ✅ Staking + unstaking smart contract
- ✅ Test ERC20 token (ZWTT)
- ✅ 3600 second lock period
- ✅ Block-accurate eligibility (`block.timestamp >= unlockTime`)
- ✅ Immediate execution when eligible
- ✅ EIP-7702-inspired smart account
- ✅ Delegated execution
- ✅ Atomic transactions

### Bonus Features ✅

- ✅ Auto-unstake bot with block monitoring
- ✅ MEV-safe execution (high gas priority)
- ✅ One-click unstake UX
- ✅ Premium glassmorphism frontend

---

## 📱 Frontend Features

- **Modern UI**: Dark mode with glassmorphism effects
- **Real-time Updates**: Live balance and countdown timers
- **Wallet Integration**: Seamless MetaMask connection
- **Responsive Design**: Works on desktop and mobile
- **Toast Notifications**: User-friendly transaction feedback
- **BSCScan Links**: Direct links to all transactions

---

## 🔗 Important Links

### Deployed Contracts (BSC Testnet)

- **TestToken**: See `deployed-addresses.json` after deployment
- **SmartAccountWallet**: See `deployed-addresses.json` after deployment
- **ZeroWaitStaking**: See `deployed-addresses.json` after deployment

### Resources

- **BSC Testnet Explorer**: https://testnet.bscscan.com
- **BSC Faucet**: https://testnet.bnbchain.org/faucet-smart
- **Hardhat Documentation**: https://hardhat.org/docs
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts

---

## 🛠️ Troubleshooting

### "ethers is not defined" Error

**Cause**: Frontend opened via `file://` instead of HTTP server

**Solution**:
```bash
npm run frontend
# Then open http://localhost:8080
```

See `frontend/TROUBLESHOOTING.md` for more solutions.

### Insufficient Funds

**Cause**: Not enough tBNB for gas

**Solution**: Get more from faucets:
- https://testnet.bnbchain.org/faucet-smart (0.1-0.5 tBNB)
- https://faucet.quicknode.com/binance-smart-chain/bnb-testnet

### Deployment Failed

Check:
1. `.env` has valid `PRIVATE_KEY` (64 hex chars, no 0x)
2. Wallet has at least 0.01 tBNB
3. Internet connection is stable
4. BSC Testnet RPC is accessible

---

## 📝 Development

### Adding New Features

1. **Modify contracts** in `contracts/`
2. **Recompile**: `npm run compile`
3. **Redeploy**: `npm run deploy`
4. **Update frontend**: `node scripts/update-frontend.js`
5. **Test**: `npm run test-flow`

### Code Style

- Solidity: Follow OpenZeppelin style guide
- JavaScript: ES6+ with clear variable names
- Frontend: Vanilla JS (no frameworks)

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- Built for the BSC Zero-Wait Unstaking Challenge
- Uses OpenZeppelin secure contract libraries
- Inspired by EIP-7702 account abstraction proposal

---

## 📞 Support

For issues or questions:
1. Check `frontend/TROUBLESHOOTING.md`
2. Review contract code in `contracts/`
3. Check deployment logs
4. Verify BSC Testnet connectivity

---

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run compile` | Compile smart contracts |
| `npm run deploy` | Deploy to BSC Testnet |
| `npm run frontend` | Start web interface |
| `npm run bot` | Start auto-unstake bot |
| `npm run test-flow` | Run E2E test |
| `node scripts/update-frontend.js` | Update frontend config |

---

**Ready to showcase?** Run `npm run frontend` and open http://localhost:8080! 🚀
