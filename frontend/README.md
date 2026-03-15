# Zero-Wait Unstaking Frontend

Premium web interface for the zero-wait unstaking system on BSC testnet.

## Quick Start

### ⚠️ Important: Use HTTP Server

**Do NOT open `index.html` directly** (via `file://`). This will cause "ethers is not defined" errors.

Instead, run a local HTTP server:

```bash
# Option 1: Using npx (recommended, no install needed)
npx http-server -p 8080

# Option 2: Using npm http-server
npm install -g http-server
http-server -p 8080

# Option 3: Using Python
python -m http.server 8080
```

Then open: **http://localhost:8080**

## Configuration

Before using the frontend, you MUST deploy contracts and update the configuration:

1. **Deploy contracts** (from project root):
```bash
npm run deploy
```

2. **Update contract addresses** in `js/config.js`:
```javascript
contracts: {
    testToken: "0x...",      // From deployed-addresses.json
    smartWallet: "0x...",    // From deployed-addresses.json  
    staking: "0x...",        // From deployed-addresses.json
}
```

## Requirements

- MetaMask browser extension
- Internet connection (for ethers.js CDN)
- Modern web browser
- BSC Testnet configured in MetaMask

## Features

- 🔗 **Wallet Connection**: Connect MetaMask to BSC testnet
- 💰 **Real-time Balances**: See ZWTT and BNB balances
- 📊 **Stake Management**: View all active stakes
- ⏱️ **Countdown Timers**: Live countdown to unlock time
- ⚡ **Instant Unstake**: One-click unstaking when eligible
- 🎨 **Premium UI**: Modern glassmorphism dark mode design

## Troubleshooting

If you see **"ethers is not defined"**:

1. Make sure you're using HTTP server (see Quick Start above)
2. Check internet connection
3. Open `test-ethers.html` to verify ethers.js loads
4. See `TROUBLESHOOTING.md` for detailed solutions

## File Structure

```
frontend/
├── index.html              # Main application page
├── test-ethers.html        # Ethers.js test page
├── css/
│   └── style.css          # Premium styling
├── js/
│   ├── config.js          # Contract addresses & ABIs
│   └── app.js             # Application logic
├── TROUBLESHOOTING.md     # Detailed troubleshooting
└── README.md              # This file
```

## Testing

1. **Test ethers.js loading**:
   - Open `test-ethers.html`
   - Should show ✅ Success

2. **Connect wallet**:
   - Open `index.html` (via HTTP server)
   - Click "Connect Wallet"
   - Approve in MetaMask

3. **Stake tokens**:
   - Enter amount
   - Click "Stake Tokens"
   - Confirm in MetaMask (2 transactions: approve + stake)

4. **Watch countdown**:
   - Stakes appear with countdown timer
   - Timer updates in real-time

5. **Unstake**:
   - "Unstake Now" button enables when ready
   - Click to unstake instantly
   - Tokens returned to wallet

## Network Configuration

The frontend is configured for BSC Testnet:

- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer**: https://testnet.bscscan.com

If MetaMask isn't on BSC Testnet, the app will prompt to switch networks automatically.

## Development

To modify the frontend:

1. Edit HTML/CSS/JS files
2. Refresh browser to see changes
3. Check console (F12) for errors

No build step required - it's vanilla HTML/CSS/JS!

## Support

- See `TROUBLESHOOTING.md` for common issues
- Check browser console for error messages
- Ensure contracts are deployed before testing
- Verify contract addresses in `config.js`
