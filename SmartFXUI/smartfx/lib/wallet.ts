export const CELO_PARAMS = {
  chainId: "0x" + Number(process.env.NEXT_PUBLIC_CHAIN_ID || 44787).toString(16),
  chainName: Number(process.env.NEXT_PUBLIC_CHAIN_ID) === 42220 ? "Celo Mainnet" : "Celo Alfajores",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || "https://alfajores-forno.celo-testnet.org"],
  blockExplorerUrls: [process.env.NEXT_PUBLIC_EXPLORER || "https://alfajores.celoscan.io"]
};

export async function connectWallet(): Promise<string> {
  const { ethereum } = window as any;
  if (!ethereum) throw new Error("No wallet found. Install MetaMask / MiniPay.");
  const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

export async function ensureCeloNetwork() {
  const { ethereum } = window as any;
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CELO_PARAMS.chainId }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await ethereum.request({ method: "wallet_addEthereumChain", params: [CELO_PARAMS] });
    } else {
      throw e;
    }
  }
}
