const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

// store fake balances
let balances = {};

app.use(bodyParser.json());

// ✅ Handle balance injection
app.post("/set_balance", (req, res) => {
  const { wallet, value } = req.body;
  if (!wallet || !value) {
    return res.status(400).json({ error: "wallet and value are required" });
  }
  balances[wallet.toLowerCase()] = value;
  console.log(`Set balance: ${wallet} => ${value} USDT`);
  return res.json({ success: true });
});

// ✅ Intercept eth_call for USDT balance
app.post("/", async (req, res) => {
  const { method, params } = req.body;

  // USDT token on BNB
  const USDT = "0x55d398326f99059ff775485246999027b3197955";

  if (
    method === "eth_call" &&
    params?.[0]?.to?.toLowerCase() === USDT.toLowerCase() &&
    params?.[0]?.data?.startsWith("0x70a08231")
  ) {
    const hexWallet = params[0].data.slice(-40);
    const wallet = "0x" + hexWallet.toLowerCase();
    const fakeBalance = balances[wallet] || "0";
    const balanceHex = "0x" + BigInt(fakeBalance + "000000000000000000").toString(16);
    return res.json({ result: balanceHex });
  }

  // Forward all other requests to real BSC
  try {
    const forward = await fetch("https://bsc-dataseed.binance.org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await forward.json();
    return res.json(data);
  } catch (err) {
    console.error("RPC error", err);
    return res.status(500).json({ error: "RPC forward failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Fake RPC running at http://localhost:${PORT}`);
});
