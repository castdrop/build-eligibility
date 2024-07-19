import express from "express";
import { config } from "dotenv";
import { isAddress, type Address } from "viem";
import type { Request, Response } from "express";

config();

if (!process.env.ALCHEMY_API_KEY) {
  throw new Error("ALCHEMY_API_KEY is not set");
}

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Visit https://build.top");
});

app.get("/verify", async (req, res) => {
  const custodyAddress = req.query.address as Address | undefined;

  let verifiedAddresses = req.query.verifiedAddresses as Address[] | Address;

  if (!Array.isArray(verifiedAddresses)) {
    verifiedAddresses = [verifiedAddresses];
  }

  if (req.headers["castdrop-secret"] !== process.env.CASTDROP_SECRET) {
    res.status(403).send("Forbidden");
    return;
  }

  if (!custodyAddress) {
    res.status(400).send("Bad Request: Missing custody address");
    return;
  }

  if (!isAddress(custodyAddress)) {
    res.status(400).send("Bad Request: Invalid custody address");
    return;
  }

  let hasNominated = false;
  let eligibleAddress = null;

  for (const address of verifiedAddresses) {
    if (hasNominated) {
      break;
    }

    hasNominated = await getHasNominated(address);

    if (hasNominated) {
      eligibleAddress = address;
    }
  }

  if (hasNominated === false) {
    hasNominated = await getHasNominated(custodyAddress);
    eligibleAddress = custodyAddress;
  }

  if (hasNominated) {
    console.log(`✅ ${eligibleAddress} is eligible!`);
    return res.send({ eligible: true });
  } else {
    console.log(`❌ ${custodyAddress} is not eligible!`);
    return res.send({ eligible: false });
  }
});

app.listen(1337, () => console.log("Server ready on port 1337."));

export default app;

async function getHasNominated(address: Address) {
  const response = await fetch(`https://build.top/api/stats?wallet=${address}`);
  const data = await response.json();

  if (response.ok) {
    return data.nominations_given >= 1;
  } else {
    data.error && console.error(response.status, data.error);
    return false;
  }
}
