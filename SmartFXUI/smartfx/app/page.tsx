"use client";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { connectWallet, ensureCeloNetwork } from "../lib/wallet";
import { fetchFxRate, signQuoteInBrowser, approveAndSwap } from "../lib/fx";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER || "https://alfajores.celoscan.io";

type Quote = {
  fromToken: string;
  toToken: string;
  rate: string;
  timestamp: number;
  signature: string;
};

// Natural language error messages
function friendlyErrorMsg(e: unknown): string {
  const rawMsg = e instanceof Error ? e.message : String(e);
  const lowerMsg = rawMsg.toLowerCase();

  // Wallet connection errors
  if (lowerMsg.includes("no wallet found") || lowerMsg.includes("ethereum is not defined")) {
    return "💼 Please install MetaMask or another Web3 wallet to continue.";
  }

  // User rejection - multiple patterns
  if (
    lowerMsg.includes("user rejected") ||
    lowerMsg.includes("user denied") ||
    lowerMsg.includes("user-denied") ||
    lowerMsg.includes("ethers-user-denied") ||
    lowerMsg.includes("action_rejected") ||
    rawMsg.includes("code=ACTION_REJECTED") ||
    (lowerMsg.includes("rejected") && lowerMsg.includes("action"))
  ) {
    return "🚫 You cancelled the request. Please try again when ready.";
  }

  if (lowerMsg.includes("chain") && !lowerMsg.includes("blockchain")) {
    return "🔗 Please switch to Celo Alfajores testnet in your wallet.";
  }

  // Contract errors
  if (lowerMsg.includes("bad sig")) {
    return "🔐 Signature verification failed. Your wallet must be set as the contract's eigenSigner for demo mode.";
  }
  if (lowerMsg.includes("insufficient liquidity")) {
    return "💧 The contract doesn't have enough cREAL tokens. Please contact the team to add liquidity.";
  }
  if (lowerMsg.includes("stale quote")) {
    return "⏰ Your signed rate expired (5 min limit). Please fetch a new rate and sign again.";
  }
  if (lowerMsg.includes("quote used")) {
    return "♻️ This signature was already used. Please create a new quote.";
  }
  if (lowerMsg.includes("slippage")) {
    return "📉 Price changed too much. Try again with the latest rate.";
  }

  // Transaction errors
  if (lowerMsg.includes("insufficient funds")) {
    return "💰 Insufficient balance. You need more CELO for gas or cUSD for the swap.";
  }
  if (lowerMsg.includes("gas")) {
    return "⛽ Gas estimation failed. Check your wallet balance and try again.";
  }
  if (lowerMsg.includes("nonce")) {
    return "🔢 Transaction error. Please reset your wallet and try again.";
  }

  // Rate fetch errors
  if (lowerMsg.includes("fetch") && lowerMsg.includes("failed")) {
    return "🌐 Network error. Please check your internet connection and try again.";
  }
  if (lowerMsg.includes("network request failed")) {
    return "🌐 Network error. Please check your internet connection and try again.";
  }

  // Wallet not connected
  if (lowerMsg.includes("wallet") && lowerMsg.includes("not connected")) {
    return "💼 Please connect your wallet first.";
  }

  // Generic ethers error - extract readable part
  if (rawMsg.includes("code=") && rawMsg.includes("version=")) {
    // Extract the action if available
    const actionMatch = rawMsg.match(/action="([^"]+)"/);
    const reasonMatch = rawMsg.match(/reason="([^"]+)"/);

    if (actionMatch && reasonMatch) {
      const action = actionMatch[1];
      const reason = reasonMatch[1];

      if (reason === "rejected") {
        return "🚫 You cancelled the request. Please try again when ready.";
      }
    }

    // Fallback for ethers errors
    return "❌ Transaction failed. Please try again or check your wallet.";
  }

  // If message is too long (>200 chars), it's probably technical
  if (rawMsg.length > 200) {
    return "❌ Something went wrong. Please try again or contact support.";
  }

  // Generic fallback
  return `❌ ${rawMsg}`;
}

export default function Home() {
  const [addr, setAddr] = useState("");
  const [amt, setAmt] = useState("10");
  const [rate, setRate] = useState<number | undefined>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [flashOutput, setFlashOutput] = useState(false);
  const [inputError, setInputError] = useState("");

  // Calculate output amount
  const outputAmount = useMemo(() => {
    if (rate === undefined || !amt) return "0.00";
    const input = parseFloat(amt);
    if (isNaN(input)) return "0.00";
    return (input * rate).toFixed(4);
  }, [amt, rate]);

  // Flash animation when output changes
  useEffect(() => {
    if (rate !== undefined && amt) {
      setFlashOutput(true);
      const timer = setTimeout(() => setFlashOutput(false), 600);
      return () => clearTimeout(timer);
    }
  }, [outputAmount]);

  // Input validation
  useEffect(() => {
    if (!amt) {
      setInputError("");
      return;
    }
    const num = parseFloat(amt);
    if (isNaN(num)) {
      setInputError("Please enter a valid number");
    } else if (num <= 0) {
      setInputError("Amount must be greater than 0");
    } else if (num > 1000000) {
      setInputError("Amount is too large");
    } else {
      setInputError("");
    }
  }, [amt]);

  // Helper to clean error message
  function setCleanErr(msg: string) {
    // Remove duplicate emoji at start
    const cleaned = msg.replace(/^(❌\s*)+/, "❌ ");
    setErr(cleaned);
  }

  async function connect() {
    try {
      await ensureCeloNetwork();
      setAddr(await connectWallet());
      setErr("");
    } catch (e) {
      setCleanErr(friendlyErrorMsg(e));
    }
  }

  async function getRate() {
    setErr("");
    setLoading(true);
    try {
      const fetchedRate = await fetchFxRate();
      setRate(fetchedRate);
    } catch (e) {
      setCleanErr(friendlyErrorMsg(e));
    } finally {
      setLoading(false);
    }
  }

  async function signRate() {
    if (rate === undefined) {
      setErr("📊 Please fetch a rate first, or enter a custom rate below.");
      return;
    }
    if (inputError) {
      setErr("⚠️ Please fix the amount error before signing.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const q = await signQuoteInBrowser(rate);
      setQuote(q);
    } catch (e) {
      setCleanErr(friendlyErrorMsg(e));
    } finally {
      setLoading(false);
    }
  }

  async function swap() {
    if (!quote || rate === undefined) {
      setErr("✍️ Please sign the rate first before swapping.");
      return;
    }
    if (inputError) {
      setErr("⚠️ Please fix the amount error before swapping.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const rec = await approveAndSwap(amt, rate, quote);
      setHash(rec?.hash || "");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 8000);
    } catch (e) {
      setCleanErr(friendlyErrorMsg(e));
    } finally {
      setLoading(false);
    }
  }

  const rateText = useMemo(
    () => (rate !== undefined ? `${rate.toFixed(4)} cREAL / 1 cUSD` : "—"),
    [rate]
  );

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Success Toast */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            animation: "slide-in-top 0.3s ease-out",
            background: "var(--card-bg)",
            border: "1px solid var(--success)",
            borderRadius: 16,
            padding: "16px 24px",
            boxShadow: "0 10px 40px rgba(16, 185, 129, 0.2)",
            maxWidth: "90%",
            width: 480,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--success)", marginBottom: 4 }}>
                Swap Successful!
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                You received <strong style={{ color: "var(--celo)" }}>{outputAmount} cREAL</strong>
              </div>
              {hash && (
                <a
                  href={`${EXPLORER}/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 13,
                    color: "var(--primary)",
                    textDecoration: "none",
                    display: "inline-block",
                    marginTop: 4,
                  }}
                >
                  View on Celoscan →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "40px 20px",
          fontFamily: "Inter, system-ui",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ animation: "logo-pulse 3s ease-in-out infinite" }}>
              <Image src="/logo.png" alt="SmartFX" width={48} height={48} priority />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                SmartFX
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
                EigenLayer-verified swaps
              </p>
            </div>
          </div>

          {/* Wallet Connect Button */}
          {!addr ? (
            <button
              onClick={connect}
              className="btn-primary"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
                border: "none",
                borderRadius: 12,
                padding: "10px 20px",
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(0, 112, 243, 0.3)",
              }}
            >
              Connect Wallet
            </button>
          ) : (
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: 12,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--success)",
                  boxShadow: "0 0 8px var(--success)",
                  animation: "shimmer 2s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {addr.slice(0, 6)}…{addr.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Demo Mode Warning */}
        <div
          style={{
            background: "var(--warning-bg)",
            border: "1px solid var(--warning)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 24,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          <strong style={{ color: "var(--warning)" }}>⚠️ Demo Mode:</strong> Successful swaps require your wallet to match the contract's eigenSigner.
        </div>

        {/* Swap Card */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* From Input */}
          <div>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
              From
            </label>
            <div
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                borderRadius: 12,
                padding: 16,
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <input
                  type="text"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  placeholder="0.00"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 32,
                    fontWeight: 600,
                    color: inputError ? "var(--error)" : "var(--text-primary)",
                    width: "100%",
                  }}
                />
                <div
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontWeight: 600,
                    fontSize: 16,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  cUSD
                </div>
              </div>
              {inputError && (
                <div style={{ fontSize: 13, color: "var(--error)", marginTop: 8 }}>
                  ⚠️ {inputError}
                </div>
              )}
            </div>
          </div>

          {/* Exchange Arrow */}
          <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ↓
            </div>
          </div>

          {/* To Output */}
          <div>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
              To (estimated)
            </label>
            <div
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                borderRadius: 12,
                padding: 16,
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    color: flashOutput ? "var(--celo)" : "var(--text-primary)",
                    animation: flashOutput ? "number-flash 0.6s ease-out" : undefined,
                  }}
                >
                  {outputAmount}
                </div>
                <div
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontWeight: 600,
                    fontSize: 16,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  cREAL
                </div>
              </div>
            </div>
          </div>

          {/* Rate Display */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: "var(--input-bg)",
              borderRadius: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Exchange Rate
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              {rateText}
            </div>
          </div>

          {/* Fetch Rate Button */}
          <button
            onClick={getRate}
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 16,
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 12,
              padding: 14,
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading && <div className="spinner" style={{ width: 16, height: 16 }} />}
            {loading ? "Fetching Rate..." : "🔄 Fetch Live Rate"}
          </button>

          {/* Custom Rate Input */}
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="Or enter custom rate (e.g., 5.10)"
              onChange={(e) => setRate(Number(e.target.value))}
              style={{
                width: "100%",
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                borderRadius: 10,
                padding: 12,
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button
              onClick={signRate}
              disabled={loading || rate === undefined}
              className="btn-outline"
              style={{
                flex: 1,
                background: "var(--card-bg)",
                border: "1px solid var(--primary)",
                borderRadius: 12,
                padding: 14,
                color: "var(--primary)",
                fontWeight: 600,
                fontSize: 15,
                cursor: loading || rate === undefined ? "not-allowed" : "pointer",
                opacity: loading || rate === undefined ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
              {loading ? "Signing..." : "✍️ Sign Rate"}
            </button>

            <button
              onClick={swap}
              disabled={loading || !quote}
              className={loading || !quote ? "" : "btn-primary"}
              style={{
                flex: 1,
                background: loading || !quote
                  ? "var(--card-bg)"
                  : "linear-gradient(135deg, var(--primary), var(--primary-light))",
                border: loading || !quote ? "1px solid var(--card-border)" : "none",
                borderRadius: 12,
                padding: 14,
                color: "var(--text-primary)",
                fontWeight: 700,
                fontSize: 15,
                cursor: loading || !quote ? "not-allowed" : "pointer",
                boxShadow: loading || !quote ? undefined : "0 4px 16px rgba(0, 112, 243, 0.4)",
                animation: loading || !quote ? undefined : "pulse-glow 2s ease-in-out infinite",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
              {loading ? "Swapping..." : "⚡ Swap Now"}
            </button>
          </div>
        </div>

        {/* Proof JSON */}
        {quote && (
          <details
            style={{
              marginTop: 20,
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🔐</span>
              <span>Verified by EigenLayer</span>
              <span style={{ fontSize: 12, color: "var(--success)", marginLeft: "auto" }}>✓ Signed</span>
            </summary>
            <pre
              style={{
                background: "var(--input-bg)",
                padding: 12,
                borderRadius: 8,
                fontSize: 11,
                overflowX: "auto",
                marginTop: 12,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                fontFamily: "monospace",
              }}
            >
              {JSON.stringify(quote, null, 2)}
            </pre>
          </details>
        )}

        {/* Error Display */}
        {err && (
          <div
            style={{
              marginTop: 16,
              background: "var(--error-bg)",
              border: "1px solid var(--error)",
              borderRadius: 12,
              padding: 12,
              color: "var(--error)",
              fontSize: 14,
            }}
          >
            ❌ {err}
          </div>
        )}
      </main>
    </div>
  );
}
