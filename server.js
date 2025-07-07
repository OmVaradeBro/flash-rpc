const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory fake balance store
let balances = {};

// ✅ API to set balance
app.post("/set_balance", (req, res) => {
  const { wallet, value } = req.body;
  if (!wallet || !value) {
    return res.status(400).json({ error: "wallet and value required" });
  }
  balances[wallet.toLowerCase()] = value;
  console.log(`✅ Set balance for ${wallet.toLowerCase()} = ${value} USDT`);
  res.json({ success: true });
});

// ✅ Fake JSON-RPC endpoint for MetaMask
app.post("/", async (req, res) => {
  const { method, params, id } = req.body;

  // 🔁 Return custom chainId for MetaMask to accept it (0x539 = 1337)
  if (method === "eth_chainId") {
    return res.json({ jsonrpc: "2.0", id, result: "0x539" });
  }

  // 💰 Intercept USDT.balanceOf
  if (
    method === "eth_call" &&
    params?.[0]?.to?.toLowerCase() === "0x55d398326f99059ff775485246999027b3197955" &&
    params?.[0]?.data?.startsWith("0x70a08231")
  ) {
    const hex = params[0].data.slice(-40);
    const wallet = "0x" + hex.toLowerCase();
    const value = balances[wallet] || "0";
    try {
      const hexValue = "0x" + BigInt(value + "000000000000000000").toString(16);
      console.log(`💰 Fake USDT balance for ${wallet}: ${value} → ${hexValue}`);
      return res.json({ jsonrpc: "2.0", id, result: hexValue });
    } catch (e) {
      console.error("❌ BigInt error:", e.message);
      return res.json({ jsonrpc: "2.0", id, result: "0x0" });
    }
  }

  // 🌐 Fallback to real BSC
  try {
    const rpc = await fetch("https://bsc-dataseed.binance.org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const json = await rpc.json();
    return res.json(json);
  } catch (err) {
    console.error("❌ Forward error:", err.message);
    return res.status(500).json({ error: "Upstream RPC failed" });
  }
});

// ✅ Launch
app.listen(PORT, () => {
  console.log(`🚀 Fake RPC server running on port ${PORT}`);
});
