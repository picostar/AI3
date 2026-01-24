# AI3 Demo - Autonomys Network Dashboard

A web application demonstrating the Autonomys Network (AI3) capabilities including:
- **Network Statistics** - Real-time blockchain metrics
- **File Storage** - Permanent decentralized storage via Auto Drive
- **Wallet Integration** - Connect MetaMask/Coinbase Wallet
- **File Explorer** - Browse all files stored on the network

**Live Demo**: https://picostar.github.io/AI3/

## Primary Developer Hub

**Main Documentation**: https://develop.autonomys.xyz/

### Core Resources
- **Auto EVM Guides**: MetaMask, Remix, Foundry, Hardhat
- **Auto SDK Documentation**: Complete SDK reference
- **Auto Agents Framework**: Build autonomous agents
- **Faucet Instructions**: Get test tokens
- **Bridge Documentation**: Cross-chain transfers

## Quick Links

| Resource | URL |
|----------|-----|
| **Auto Drive Dashboard** | https://ai3.storage/ |
| **Developer Docs** | https://develop.autonomys.xyz/ |
| **Auto SDK** | https://develop.autonomys.xyz/sdk |
| **Auto EVM Intro** | https://develop.autonomys.xyz/evm/introduction |
| **Auto Agents Framework** | https://develop.autonomys.xyz/auto_agents_framework/introduction |
| **Faucet (tAI3)** | https://autonomysfaucet.xyz/ or Discord #faucet |
| **Chronos Testnet Bridge** | https://bridge.chronos.autonomys.xyz/ |
| **Block Explorer (EVM)** | https://explorer.auto-evm.chronos.autonomys.xyz/ |
| **Block Explorer (Consensus)** | https://autonomys.subscan.io/ |
| **GitHub** | https://github.com/autonomys |
| **LLM-Friendly Docs** | https://develop.autonomys.xyz/llm_friendly_docs |

## Network Configuration (Chronos Testnet)

| Setting | Value |
|---------|-------|
| **Network Name** | Autonomys EVM |
| **RPC URL** | https://auto-evm.chronos.autonomys.xyz/ws |
| **Chain ID** | 8700 |
| **Currency** | tAI3 |

> **Note**: Taurus testnet is deprecated. Use Chronos for all testnet development.

### Adding to a Wallet (MetaMask or Coinbase Wallet)

Add a custom network using the values above, then switch to it.

## Getting Test Tokens (tAI3)

1. Visit the faucet: https://autonomysfaucet.xyz/
2. Or join Discord and request tokens in the #faucet channel

If you do not see tAI3 in the Coinbase web dashboard, that is usually expected for custom networks. The Coinbase Wallet browser extension (and the Autonomys EVM explorer) are the reliable ways to confirm your tAI3 balance and transactions.

## Community and Support

| Channel | URL |
|---------|-----|
| **Discord** | https://autonomys.xyz/discord |
| **Forum** | https://forum.autonomys.xyz/ |
| **Telegram** | https://t.me/subspace_network |

## This Demo Project

This project includes three pages:

### Home Page (index.html)
- **Wallet Connection** - Connect MetaMask or Coinbase Wallet to Autonomys EVM
- **File Upload** - Upload files to Auto Drive permanent storage
- **QR Code Generation** - Share files with QR codes
- **My Files** - View your uploaded files with QR codes for each
- **Credits Display** - Track your Auto Drive storage usage

### Network Stats (stats.html)
- **Network Health** - Real-time status of blockchain services
- **Block & Transaction Stats** - Live data from Blockscout Explorer
- **Storage Metrics** - Archived history and farmer storage from Subscan
- **Auto Drive Stats** - File counts and upload trends
- **Storage Cost Calculator** - Compare costs with Arweave, ICP, etc.
- **Mainnet/Testnet Toggle** - Switch between networks

### File Explorer (explore.html)
- **Browse All Files** - View files stored on the network
- **Search & Filter** - Find files by name, CID, or type
- **Pagination** - Navigate through thousands of files
- **Mainnet/Testnet Toggle** - Switch between networks

### Auto Drive Integration

This app uses the Auto Drive SDK to store files permanently on the Autonomys network.

**How it works:**
1. Get an API key from https://ai3.storage/ (100MB/month free tier)
2. Upload a file - it gets stored on the Autonomys network and returns a CID
3. Share the link or QR code - anyone can download via the Auto Drive gateway
4. Files are stored permanently and can be accessed at: `https://gateway.autonomys.xyz/file/{cid}`

**Packages used:**
- `@autonomys/auto-drive` - File upload/download SDK
- `@autonomys/auto-utils` - Utility functions and network IDs

### Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open http://localhost:5173/ in your browser and connect your wallet.

Note: Vite typically runs on http://localhost:5173/ unless you changed its port.

## Next Steps

1. **Set up your wallet** with the Autonomys EVM network
2. **Get test tokens** from the faucet
3. **Explore the SDK**: https://develop.autonomys.xyz/sdk
4. **Build an Agent**: https://develop.autonomys.xyz/auto_agents_framework/introduction
5. **Deploy a Contract**: Use Remix, Hardhat, or Foundry

## Network Stats Page

The stats page (`stats.html`) displays real-time network metrics from the Autonomys blockchain.

### Stats Explained

| Stat | Description |
|------|-------------|
| **Latest Block** | Current block height on the EVM domain |
| **Block Time** | Average seconds between blocks (~6s target) |
| **AI3 Price** | Live token price from Blockscout API |
| **Transactions Today** | EVM transactions in the last 24 hours |
| **Active Addresses** | Total unique addresses on the network |
| **Gas Price** | Current transaction fee in Gwei |
| **Archived History** | Real data from Subscan (blockChainHistorySize) |
| **Farmer Storage** | Real data from Subscan (consensusSpace) |
| **Auto Drive Files** | Total files stored on permanent storage |

### Storage Cost Calculation

Auto Drive storage costs are calculated directly from the blockchain's `transactionByteFee`:

```
Blockchain byte fee: 312,497,241,916 shannon/byte
Cost per GB = (byte_fee × 1,073,741,824 bytes) / 10^18
           = 335.54 AI3 per GB

USD Cost = 335.54 AI3 × current_AI3_price
         ≈ $5.34/GB (at $0.0159/AI3)
```

**Comparison with other permanent storage:**

| Platform | Cost/GB | Type |
|----------|---------|------|
| Auto Drive | ~$5.34 | Permanent, on-chain |
| ICP | ~$5.35/yr | Annual renewal |
| Arweave | ~$13 | Permanent, on-chain |

*Note: Prices vary with token market conditions.*

## Additional Resources

- Read the full documentation at https://develop.autonomys.xyz/
- Check out example projects on GitHub
- Join the community for support and collaboration

---

**Happy Building on Autonomys!**
