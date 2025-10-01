"use client";
import { useMemo, useState } from "react";
import { connectWallet, ensureCeloNetwork } from "../lib/wallet";
import { fetchFxRate, signQuoteInBrowser, approveAndSwap } from "../lib/fx";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER || "https://alfajores.celoscan.io";

export default function Home(){
  const [addr,setAddr] = useState("");
  const [amt,setAmt] = useState("10");
  const [rate,setRate] = useState<number|undefined>();
  const [quote,setQuote] = useState<any>(null);
  const [hash,setHash] = useState("");
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");

  async function connect(){
    try { await ensureCeloNetwork(); setAddr(await connectWallet()); }
    catch(e:any){ setErr(e?.message||String(e)); }
  }

  async function getRate(){
    setErr(""); setLoading(true);
    try { setRate(await fetchFxRate()); }
    catch(e:any){ setErr("Rate fetch failed: "+(e?.message||String(e))); }
    finally { setLoading(false); }
  }

  async function signRate(){
    if(rate===undefined){ setErr("Fetch or enter a rate first"); return; }
    setErr(""); setLoading(true);
    try { setQuote(await signQuoteInBrowser(rate)); }
    catch(e:any){ setErr("Sign failed: "+(e?.message||String(e))); }
    finally { setLoading(false); }
  }

  async function swap(){
    if(!quote || rate===undefined){ setErr("Sign a quote first"); return; }
    setErr(""); setLoading(true);
    try { const rec = await approveAndSwap(amt, rate, quote); setHash(rec?.hash || ""); }
    catch(e:any){ setErr("Swap failed: "+(e?.message||String(e))); }
    finally { setLoading(false); }
  }

  const rateText = useMemo(()=> rate!==undefined ? `${rate.toFixed(4)} cREAL / 1 cUSD` : "-", [rate]);
  const btn = (label:string, onClick:any, disabled:boolean=false) => (
    <button onClick={onClick} disabled={disabled}
      style={{padding:"10px 14px", borderRadius:12, border:"1px solid #ddd", background:"#111", color:"#fff", marginRight:8}}>
      {label}
    </button>
  );

  return (
    <main style={{maxWidth:620, margin:"40px auto", padding:24, fontFamily:"Inter, system-ui"}}>
      <h1 style={{fontSize:26, fontWeight:800}}>CeloFX — frontend-only demo</h1>
      <p style={{opacity:.75, marginTop:6}}>Your wallet signs the rate. Contract verifies it on-chain.</p>

      <div style={{marginTop:16}}>
        {!addr ? btn("Connect Wallet (Celo)", connect) : <div>Connected: <b>{addr.slice(0,6)}…{addr.slice(-4)}</b></div>}
      </div>

      <div style={{marginTop:18}}>
        <label>Amount (cUSD)</label>
        <input value={amt} onChange={e=>setAmt(e.target.value)}
          style={{display:"block", width:"100%", marginTop:6, padding:12, borderRadius:12, border:"1px solid #e5e5e5"}} />
      </div>

      <div style={{marginTop:14}}>
        {btn(loading ? "Fetching…" : "Get Rate (USD→BRL)", getRate, loading)}
        <span>Rate: <b>{rateText}</b></span>
      </div>

      <div style={{marginTop:10}}>
        <small style={{opacity:.7}}>Or type a custom rate:</small>
        <input placeholder="e.g. 5.10" onChange={(e)=>setRate(Number(e.target.value))}
          style={{display:"block", width:"100%", marginTop:6, padding:10, borderRadius:10, border:"1px solid #eee"}} />
      </div>

      <div style={{marginTop:14}}>
        {btn(loading ? "Signing…" : "Sign Verified Rate", signRate, loading || rate===undefined)}
        {btn(loading ? "Swapping…" : "Swap at Verified Rate", swap, loading || !quote)}
      </div>

      {quote && <details style={{marginTop:12}}><summary>Show proof</summary>
        <pre style={{background:"#fafafa", padding:12, borderRadius:10, fontSize:12}}>
{JSON.stringify(quote,null,2)}
        </pre>
      </details>}

      {hash && <p style={{marginTop:12}}>Tx: <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">{hash.slice(0,12)}…</a></p>}
      {err && <p style={{marginTop:12, color:"#c00"}}>{err}</p>}
    </main>
  );
}
