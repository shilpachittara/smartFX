# Token origin hackathon
🌍 SmartFX — Stablecoin Cross-Currency Swaps with EigenLayer Proofs

SmartFX is a proof-verified stablecoin FX swap dApp, built for the Celo blockchain.
It enables trust-minimized swaps between stablecoins (e.g., cUSD ↔ cREAL) using off-chain FX rates signed by a trusted oracle/signer, verified on-chain by smart contracts.

The app is fully frontend-only (no backend server required), using MetaMask or MiniPay for signing and execution.

---

## ⚠️ **IMPORTANT: Demo Mode Notice**

This is a **Proof-of-Concept** demonstrating the EigenLayer integration architecture.

**🎯 Current Status:**
- ✅ **UI/UX & Smart Contract**: Fully functional with production-grade security
- ✅ **Architecture Demonstration**: Complete proof-of-concept for EigenLayer AVS integration
- ⚠️ **Demo Constraint**: Only the deployer's wallet can execute swaps on-chain (by design)

**Why This Limitation?**

This demonstrates the **trust model** for production:
- **Demo Mode** (current): Single authorized wallet acts as EigenSigner for hackathon demo
- **Production Mode** (roadmap): Decentralized EigenLayer AVS with multiple validators

**For Judges/Testers:**
1. **Best Option**: Let the team demo with their authorized wallet
2. **Alternative**: Contact team to set your wallet as `eigenSigner` temporarily
3. **Verification**: Check [transaction history on Celoscan](https://alfajores.celoscan.io/address/0xA127C6aECb272935466B679234Ece1BFdF1953b7)

📖 See [full demo limitations](#️-important-demo-mode-limitations) below for technical details.

⸻

✨ Features
	•	Cross-currency stablecoin swaps
Swap between Celo-native stablecoins (cUSD, cREAL, cEUR) at FX rates verified by cryptographic proofs.
	•	EigenLayer-verified rates
Uses an EigenLayer signer (configurable address) to sign rate proofs off-chain.
	•	Demo: Your own MetaMask wallet can act as _eigenSigner for signing in the browser.
	•	Production: A dedicated EigenLayer AVS (Actively Validated Service) or oracle can act as the signer.
	•	Vault-settled design
The contract holds liquidity in a vault. Incoming token is swapped for outgoing token, secured by proof-verified FX rate.
	•	Frontend-only flow
	•	Browser fetches FX rate (USD/BRL or manual input).
	•	User wallet signs the quote hash (same as _eigenSigner).
	•	Contract verifies the proof and executes the swap.
	•	Security measures
	•	Non-replayable quotes (quoteHash).
	•	Slippage protection (minAmountOut).
	•	Expiry windows (maxQuoteAge).
	•	Owner controls signer and vault balances.
	•	Modern DeFi UI with Web3 aesthetics
	•	Cyber-blue color scheme with Celo green accents
	•	Real-time output calculation with animated feedback
	•	Loading spinners and user-friendly error messages
	•	Glowing buttons with hover effects and pulse animations
	•	Success notifications with transaction links
	•	Input validation with immediate feedback
	•	Mobile-responsive design

⸻

🛠️ Tech Stack
	•	Smart Contract: Solidity (OpenZeppelin, Hardhat)
	•	Frontend: Next.js (App Router, React, ethers v6)
	•	Wallets: MetaMask, MiniPay (Celo-compatible)
	•	Network: Celo Alfajores (testnet) / Celo Mainnet
	•	EigenLayer Integration: ECDSA signatures from EigenSigner (off-chain oracle or MetaMask demo)

⸻

🚀 Getting Started

Prerequisites
	•	Node.js 18+ (LTS recommended)
	•	MetaMask browser extension
	•	Celo wallet funded with testnet cUSD / cREAL (use Celo Alfajores Faucet)

1. Clone and install
git clone https://github.com/shilpachittara/smartFX
cd smartFX/SmartFXUI/smartfx
npm install

2. Configure environment

Create a file named `.env.local` in the `SmartFXUI/smartfx/` directory:

```bash
# SmartFX Contract Address (Alfajores Testnet)
NEXT_PUBLIC_CELOFX_ADDRESS=0xA127C6aECb272935466B679234Ece1BFdF1953b7

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=44787
NEXT_PUBLIC_RPC_URL=https://alfajores-forno.celo-testnet.org
NEXT_PUBLIC_EXPLORER=https://alfajores.celoscan.io

# Token Addresses (Celo Alfajores Testnet)
NEXT_PUBLIC_FROM_TOKEN=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1   # cUSD
NEXT_PUBLIC_TO_TOKEN=0x7D00cd74FF385c955EA3d79e47BF06bD7386387D     # cREAL
```

Or use this command to create it automatically:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_CELOFX_ADDRESS=0xA127C6aECb272935466B679234Ece1BFdF1953b7
NEXT_PUBLIC_CHAIN_ID=44787
NEXT_PUBLIC_RPC_URL=https://alfajores-forno.celo-testnet.org
NEXT_PUBLIC_EXPLORER=https://alfajores.celoscan.io
NEXT_PUBLIC_FROM_TOKEN=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
NEXT_PUBLIC_TO_TOKEN=0x7D00cd74FF385c955EA3d79e47BF06bD7386387D
EOF
```

3. Run locally
npm run dev
# open http://localhost:3000

**Note:** The UI will work for anyone, but successful on-chain swaps require your wallet to be set as the contract's `eigenSigner`. See the "Demo Mode Limitations" section below for details.

---

### 🚀 Deploying to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set **Root Directory** to `SmartFXUI/smartfx`
4. Add the following **Environment Variables** in Vercel dashboard:

```
NEXT_PUBLIC_CELOFX_ADDRESS=0xA127C6aECb272935466B679234Ece1BFdF1953b7
NEXT_PUBLIC_CHAIN_ID=44787
NEXT_PUBLIC_RPC_URL=https://alfajores-forno.celo-testnet.org
NEXT_PUBLIC_EXPLORER=https://alfajores.celoscan.io
NEXT_PUBLIC_FROM_TOKEN=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
NEXT_PUBLIC_TO_TOKEN=0x7D00cd74FF385c955EA3d79e47BF06bD7386387D
```

5. Deploy! Vercel will automatically rebuild on every push to main branch.


🔗 Smart Contract
	•	Contract: SmartFX.sol
	•	Key methods:
	•	swapWithProof(...) — executes swap with ECDSA proof verification.
	•	quoteHash(...) — deterministic hash used for signing.
	•	setEigenSigner(address) — owner sets trusted signer.
	•	rescue(...) — owner withdraws vault tokens for rebalancing.


📖 How EigenLayer is used
	•	SmartFX integrates EigenLayer by requiring all FX rates to be signed by an EigenSigner.
	•	The EigenSigner can be:
	1.	Demo — your MetaMask address (frontend signs in-browser).
	2.	Production — an EigenLayer AVS or oracle service, where multiple EigenLayer-secured nodes produce signed rates.
	•	The smart contract verifies these signatures with ECDSA.recover.
	•	This ensures that only EigenLayer-verified FX rates are accepted for swaps.


🧭 Future Roadmap
	•	Multi-pair support
Add cUSD ↔ cEUR, cUSD ↔ cKES, and more Celo stable pairs.
	•	Advanced oracle integration
Replace demo MetaMask signing with a real EigenLayer AVS providing rate feeds.
	•	Liquidity incentives
Vault staking and yield distribution for liquidity providers.
	•	MiniApp Integration
Wrap into a Celo MiniPay MiniApp for instant mobile UX.
	•	Cross-chain stablecoin FX
Extend to Ethereum / L2 stablecoins using Axelar or LayerZero bridging.
	•	AI x DeFi Agents
Add AI agents to auto-rebalance vaults, monitor arbitrage, or auto-swap at best rates.


🎨 UI/UX Features

**Visual Design:**
- **Cyber-blue theme** with electric blue (#0070F3) primary color
- **Celo green accents** (#FBCC5C) for brand recognition
- **Glowing logo** with pulsing animation (3s cycle)
- **Dark background** (#0A0F1E) for modern DeFi aesthetic

**Interactive Elements:**
- **Glowing buttons** with gradient backgrounds and pulse animations
- **Enhanced hover effects** with color transitions and floating animations
- **Loading spinners** on all async operations
- **Real-time output calculation** with number flash animations
- **Success toast notifications** that slide in from top
- **Input validation** with immediate error feedback

**User Experience:**
- **Friendly error messages** with emoji icons and clear solutions
- **Connected wallet indicator** with animated status light
- **EigenLayer proof viewer** with expandable JSON display
- **Transaction links** to Celoscan block explorer
- **Mobile-responsive** design with touch-friendly buttons

📸 Demo Flow (1 min)
	1.	Connect wallet on Celo (animated gradient button).
	2.	Enter amount in cUSD (real-time validation).
	3.	Fetch live USD→BRL rate or type manually (loading spinner).
	4.	Sign the quote (MetaMask → "Sign Message", spinner during signing).
	5.	Call swapWithProof on-chain (glowing swap button).
	6.	Success! Toast notification appears with transaction link.


⚠️ Important: Demo Mode Limitations

**Current Implementation Status:**

This is a **Proof-of-Concept** demonstrating the EigenLayer integration architecture. In the current deployment:

**✅ What Works:**
- UI/UX flow (wallet connection, rate fetching, signing interface)
- Smart contract with full security measures (signature verification, replay protection, slippage guards)
- Real FX rate fetching from multiple providers
- Complete on-chain transaction execution

**⚠️ Demo Constraint:**

The deployed contract's `eigenSigner` is set to a **specific wallet address** (the deployer's wallet). This means:

- ✅ **Anyone can view** the UI and interact with the interface
- ✅ **Anyone can fetch** live FX rates
- ✅ **Anyone can sign** quotes with their MetaMask
- ❌ **Only the authorized signer's wallet** can successfully execute swaps on-chain

**Why This Design?**

This demonstrates the **trust model** of the full system:
1. **Demo Mode** (current): Single MetaMask wallet acts as the EigenSigner to prove the concept
2. **Production Mode** (roadmap): A decentralized EigenLayer AVS (Actively Validated Service) with multiple validators replaces the single signer

**For Hackathon Judges/Testers:**

To experience a successful swap transaction:
1. **Option A**: Watch the deployer demonstrate with their authorized wallet
2. **Option B**: Contact the team to temporarily set your wallet as the `eigenSigner` via the `setEigenSigner()` function
3. **Option C**: Review the [contract on Celoscan](https://alfajores.celoscan.io/address/0xA127C6aECb272935466B679234Ece1BFdF1953b7) to verify transaction history

**Pre-Demo Checklist:**

Before presenting, ensure:
- [ ] Wallet has Alfajores testnet CELO (for gas)
- [ ] Wallet has testnet cUSD (get from [Celo Faucet](https://faucet.celo.org/alfajores))
- [ ] Contract has sufficient cREAL liquidity
- [ ] Your wallet address matches the contract's `eigenSigner` setting
- [ ] Network is set to Celo Alfajores (Chain ID: 44787)

**Common Errors (with friendly messages):**

The UI now shows user-friendly error messages instead of technical errors:

| Technical Error | User-Friendly Message |
|-----------------|----------------------|
| "bad sig" | 🔐 Signature verification failed. Your wallet must be set as the contract's eigenSigner for demo mode. |
| "insufficient liquidity" | 💧 The contract doesn't have enough cREAL tokens. Please contact the team to add liquidity. |
| "stale quote" | ⏰ Your signed rate expired (5 min limit). Please fetch a new rate and sign again. |
| "quote used" | ♻️ This signature was already used. Please create a new quote. |
| "user rejected action" | 🚫 You cancelled the request. Please try again when ready. |
| "insufficient funds" | 💰 Insufficient balance. You need more CELO for gas or cUSD for the swap. |


⚠️ Disclaimer

This is a hackathon prototype. Not audited. Use only with testnet funds.

⸻

