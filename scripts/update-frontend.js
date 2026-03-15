const fs = require('fs');
const path = require('path');

// Read deployment addresses
const deployment = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
const contracts = deployment.contracts;

console.log('\n=== Deployed Contract Addresses ===\n');
console.log('TestToken:', contracts.TestToken);
console.log('SmartAccountWallet:', contracts.SmartAccountWallet);
console.log('ZeroWaitStaking:', contracts.ZeroWaitStaking);
console.log('\nBSCScan Links:');
console.log('TestToken: https://testnet.bscscan.com/address/' + contracts.TestToken);
console.log('SmartWallet: https://testnet.bscscan.com/address/' + contracts.SmartAccountWallet);
console.log('Staking: https://testnet.bscscan.com/address/' + contracts.ZeroWaitStaking);

// Update frontend config
const configPath = path.join(__dirname, '..', 'frontend', 'js', 'config.js');
const config = fs.readFileSync(configPath, 'utf8');

const updatedConfig = config.replace(
    /contracts: \{[\s\S]*?\},/,
    `contracts: {
        testToken: "${contracts.TestToken}",
        smartWallet: "${contracts.SmartAccountWallet}",
        staking: "${contracts.ZeroWaitStaking}",
    },`
);

fs.writeFileSync(configPath, updatedConfig);
console.log('\n✓ Frontend config updated!');
console.log('\nTo run frontend:');
console.log('  cd frontend');
console.log('  npx http-server -p 8080');
console.log('\nThen open: http://localhost:8080');
