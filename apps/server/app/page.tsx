"use client";

import { useState } from "react";

type SymbolType = "BTC" | "ETH" | "SOL";

export default function HomePage() {
  const [username, setUsername] = useState("malcolm");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [buySymbol, setBuySymbol] = useState<SymbolType>("BTC");
  const [sellSymbol, setSellSymbol] = useState<SymbolType>("BTC");
  const [usdAmount, setUsdAmount] = useState("100");
  const [sellQty, setSellQty] = useState("0.001");
  const [output, setOutput] = useState("Ready");
  const [loading, setLoading] = useState(false);

  const callApi = async (path: string, options?: RequestInit) => {
    setLoading(true);
    try {
      const response = await fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options?.headers ?? {})
        }
      });
      const data = await response.json();
      setOutput(JSON.stringify({ status: response.status, data }, null, 2));
    } catch (error) {
      setOutput(String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Bland Crypto Demo (Web)</h1>

      <section style={styles.card}>
        <label style={styles.label}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />
        <label style={{ ...styles.label, marginTop: "12px" }}>Phone Number (required)</label>
        <input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1 555-123-4567"
          style={styles.input}
          required
        />

        <div style={styles.row}>
          <button style={styles.button} onClick={() => callApi("/api/health")}>Health</button>
          <button
            style={styles.button}
            onClick={() =>
              callApi("/api/users", {
                method: "POST",
                body: JSON.stringify({ username, phone_number: phoneNumber.trim() })
              })
            }
          >
            Create User
          </button>
          <button style={styles.button} onClick={() => callApi(`/api/users/${encodeURIComponent(username)}`)}>
            Lookup by Username
          </button>
          <button
            style={styles.button}
            onClick={() =>
              callApi(
                `/api/users/by-phone?phone=${encodeURIComponent(phoneNumber.trim())}`
              )
            }
          >
            Search by Phone
          </button>
          <button style={styles.button} onClick={() => callApi("/api/prices")}>Get Prices</button>
          <button
            style={styles.button}
            onClick={() => callApi(`/api/balance/${encodeURIComponent(username)}`)}
          >
            Check Balance
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Buy</h2>
        <div style={styles.row}>
          <select value={buySymbol} onChange={(e) => setBuySymbol(e.target.value as SymbolType)} style={styles.input}>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
          <input
            value={usdAmount}
            onChange={(e) => setUsdAmount(e.target.value)}
            placeholder="USD amount"
            style={styles.input}
          />
          <button
            style={styles.button}
            onClick={() =>
              callApi("/api/trade/buy", {
                method: "POST",
                body: JSON.stringify({
                  username,
                  symbol: buySymbol,
                  usd_amount: Number(usdAmount)
                })
              })
            }
          >
            Buy
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Sell</h2>
        <div style={styles.row}>
          <select value={sellSymbol} onChange={(e) => setSellSymbol(e.target.value as SymbolType)} style={styles.input}>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
          <input value={sellQty} onChange={(e) => setSellQty(e.target.value)} placeholder="Qty" style={styles.input} />
          <button
            style={styles.button}
            onClick={() =>
              callApi("/api/trade/sell", {
                method: "POST",
                body: JSON.stringify({ username, symbol: sellSymbol, qty: sellQty })
              })
            }
          >
            Sell
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Response</h2>
        <pre style={styles.pre}>{loading ? "Loading..." : output}</pre>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    fontFamily: "system-ui, sans-serif",
    padding: "24px",
    maxWidth: "1100px",
    margin: "0 auto",
    color: "#0f172a"
  },
  title: {
    marginBottom: "16px"
  },
  card: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    background: "#ffffff"
  },
  h2: {
    marginTop: 0,
    marginBottom: "10px"
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 600
  },
  row: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  input: {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #94a3b8",
    minWidth: "150px"
  },
  button: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #0f766e",
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer"
  },
  pre: {
    margin: 0,
    padding: "12px",
    borderRadius: "8px",
    background: "#0b1020",
    color: "#e2e8f0",
    overflowX: "auto"
  }
};
