# Token origin hackathon
🌍 SmartFX — Stablecoin Cross-Currency Swaps with EigenLayer Proofs

SmartFX is a proof-verified stablecoin FX swap dApp, built for the Celo blockchain.
It enables trust-minimized swaps between stablecoins (e.g., cUSD ↔ cREAL) using off-chain FX rates signed by a trusted oracle/signer, verified on-chain by smart contracts.

The app is fully frontend-only (no backend server required), using MetaMask or MiniPay for signing and execution.

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
	•	Cute minimal UI
	•	Connect wallet (MetaMask / MiniPay).
	•	Enter amount → Fetch rate → Sign proof → Swap.
	•	Shows proof JSON and on-chain tx link.

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
cd smartfx
npm install

2. Configure environment

Create .env.local:

NEXT_PUBLIC_CELOFX_ADDRESS=0xA127C6aECb272935466B679234Ece1BFdF1953b7
NEXT_PUBLIC_CHAIN_ID=44787
NEXT_PUBLIC_RPC_URL=https://alfajores-forno.celo-testnet.org
NEXT_PUBLIC_EXPLORER=https://alfajores.celoscan.io
NEXT_PUBLIC_FROM_TOKEN=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1   # cUSD
NEXT_PUBLIC_TO_TOKEN=0x7D00cd74FF385c955EA3d79e47BF06bD7386387D     # cREAL

3. Run locally
npm run dev
# open http://localhost:3000


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


📸 Demo Flow (1 min)
	1.	Connect wallet on Celo.
	2.	Enter amount in cUSD.
	3.	Fetch live USD→BRL rate or type manually.
	4.	Sign the quote (MetaMask → “Sign Message”).
	5.	Call swapWithProof on-chain.
	6.	Vault releases cREAL at the verified rate.


⚠️ Disclaimer

This is a hackathon prototype. Not audited. Use only with testnet funds.

⸻

