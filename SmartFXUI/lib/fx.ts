import { BrowserProvider, Contract, AbiCoder, keccak256, toUtf8Bytes, parseUnits } from "ethers";
import ABI from "../abi/SmartFX.json";

const CELOFX = process.env.NEXT_PUBLIC_CELOFX_ADDRESS!;
const FROM = process.env.NEXT_PUBLIC_FROM_TOKEN!;
const TO   = process.env.NEXT_PUBLIC_TO_TOKEN!;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 44787);

function toFixed8(n: number){ return BigInt(Math.round(n * 1e8)); }

// keccak256(abi.encode( keccak256("CELOFX_RATE_V1"), chainId, contract, from, to, rate, ts ))
function buildQuoteHash(fromToken: string, toToken: string, rateFixed8: bigint, timestamp: number){
  const coder = new AbiCoder();
  const sentinel = keccak256(toUtf8Bytes("CELOFX_RATE_V1"));
  const encoded = coder.encode(
    ["bytes32","uint256","address","address","address","uint256","uint256"],
    [sentinel, BigInt(CHAIN_ID), CELOFX, fromToken, toToken, rateFixed8, BigInt(timestamp)]
  );
  return keccak256(encoded); // 0x...
}

// Public FX API; you can also type a custom rate in the UI.
export async function fetchFxRate(): Promise<number> {
  const url = "https://api.exchangerate.host/latest?base=USD&symbols=BRL";
  const r = await fetch(url, { cache: "no-cache" });
  const j = await r.json();
  const sym = Object.keys(j.rates)[0];
  return Number(j.rates[sym]); // BRL per USD (cUSD->cREAL demo)
}

// Sign a quote in the browser with MetaMask (MUST be the eigenSigner address)
export async function signQuoteInBrowser(rateNumber: number) {
  const rate = toFixed8(rateNumber);
  const timestamp = Math.floor(Date.now()/1000);

  const { ethereum } = window as any;
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  const qh = buildQuoteHash(FROM, TO, rate, timestamp);
  const sig = await signer.signMessage(Buffer.from(qh.slice(2), "hex")); // EIP-191 prefix

  return { fromToken: FROM, toToken: TO, rate: rate.toString(), timestamp, signature: sig };
}

export function calcMinOut(amountInStr: string, rateNumber: number, slippageBps = 50): bigint {
  // minOut = amountIn * rate * (1 - slippageBps/10_000)
  const amountIn18 = parseUnits(amountInStr || "0", 18);
  const rateFixed8 = toFixed8(rateNumber);
  // (amountIn18 * rateFixed8 / 1e8) * (1 - s)
  const out18 = (amountIn18 * rateFixed8) / 100000000n;
  const outAfterSlippage = (out18 * BigInt(10000 - slippageBps)) / 10000n;
  return outAfterSlippage;
}

export async function approveAndSwap(amountStr: string, rateNumber: number, quote:any) {
  const { ethereum } = window as any;
  const provider = new BrowserProvider(ethereum);
  const signer = await provider.getSigner();

  // 1) approve FROM token (cUSD)
  const erc20 = new Contract(FROM, ["function approve(address,uint256) returns (bool)"], signer);
  const amountIn = parseUnits(amountStr || "0", 18);
  await (await erc20.approve(CELOFX, amountIn)).wait();

  // 2) swap with slippage guard (0.5% default)
  const fx = new Contract(CELOFX, ABI as any, signer);
  const minOut = calcMinOut(amountStr, rateNumber, 50);
  const tx = await fx.swapWithProof(
    FROM,
    TO,
    amountIn,
    minOut,
    BigInt(quote.rate),
    BigInt(quote.timestamp),
    quote.signature,
    await signer.getAddress()
  );
  return tx.wait();
}
