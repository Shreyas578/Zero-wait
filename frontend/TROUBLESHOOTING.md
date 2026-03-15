# Frontend Troubleshooting Guide

## Issue: "ethers is not defined"

If you're seeing this error when trying to connect your wallet, follow these steps:

### Solution 1: Test Ethers.js Loading

1. Open `test-ethers.html` in your browser:
```
file:///d:/Projects/Zero-wait/frontend/test-ethers.html
```

2. If you see ✅ Success, the library is loading correctly
3. If you see ❌ Error, try the solutions below

### Solution 2: Check Internet Connection

The ethers.js library loads from a CDN (Content Delivery Network), so you need an active internet connection.

1. Verify you're connected to the internet
2. Refresh the page (Ctrl+R or Cmd+R)
3. Check browser console for network errors (F12)

### Solution 3: Use Local HTTP Server

Browsers may block CDN resources when opening files directly. Use a local server instead:

```bash
# Option 1: Using npm (recommended)
cd frontend
npm install -g http-server  # Only needed first time
http-server -p 8080

# Option 2: Using Python
python -m http.server 8080

# Option 3: Using Node.js npx (no install)
npx http-server -p 8080
```

Then open: `http://localhost:8080`

### Solution 4: Download Ethers.js Locally

If CDNs are blocked by your network/firewall:

1. Download ethers.js:
   - Visit: https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js
   - Save as: `frontend/js/ethers.min.js`

2. Update `index.html` line 151:
```html
<!-- Change from: -->
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>

<!-- To: -->
<script src="js/ethers.min.js"></script>
```

### Solution 5: Check Browser Console

1. Press F12 to open Developer Tools
2. Go to the Console tab
3. Look for errors related to:
   - Failed to load script
   - CORS errors
   - Network errors

Common errors and fixes:
- **CORS error**: Use a local server (Solution 3)
- **ERR_BLOCKED_BY_CLIENT**: Disable ad blocker temporarily
- **net::ERR_INTERNET_DISCONNECTED**: Check internet connection

### Solution 6: Clear Browser Cache

Sometimes old cached files cause issues:

1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
2. Clear cached images and files
3. Refresh the page

### Verify Setup

After trying a solution, test the wallet connection:

1. Open the frontend (via http://localhost:8080)
2. Open browser console (F12)
3. Type: `typeof ethers`
4. Should return: `"object"` (not "undefined")
5. Click "Connect Wallet" button
6. MetaMask should pop up asking to connect

### Still Having Issues?

Check these requirements:
- [ ] MetaMask extension installed
- [ ] Internet connection active
- [ ] Using a modern browser (Chrome, Firefox, Brave, Edge)
- [ ] JavaScript enabled in browser
- [ ] Running via HTTP server (not file://)

### Contract Address Configuration

Once wallet connects, you need deployed contract addresses:

1. Deploy contracts first (when you have tBNB):
```bash
npm run deploy
```

2. Update `frontend/js/config.js` with the deployed addresses from `deployed-addresses.json`

3. Refresh the frontend page

---

## Quick Checklist

Before using the frontend:

1. ✅ Contracts deployed to BSC testnet
2. ✅ `frontend/js/config.js` updated with real addresses
3. ✅ MetaMask installed and set to BSC Testnet
4. ✅ Running frontend via HTTP server
5. ✅ Internet connection active
6. ✅ Console shows no errors

If all checks pass, wallet connection should work!
