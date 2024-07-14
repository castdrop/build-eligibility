import express from "express";
import { config } from "dotenv";
import { base } from "viem/chains";
import {
  http,
  erc20Abi,
  isAddress,
  getContract,
  createPublicClient,
  type Address,
} from "viem";
import type { Request, Response } from "express";

config();

if (!process.env.ALCHEMY_API_KEY) {
  throw new Error("ALCHEMY_API_KEY is not set");
}

// CONSTANTS
const BUILD_AIRDROP_CONTRACT = "0x556e182ad2b72f5934C2215d6A56cFC19936FdB7";
const BUILD_ERC20_CONTRACT = "0x3C281A39944a2319aA653D81Cfd93Ca10983D234";
const RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "donator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Donated",
    type: "event",
  },
];

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Visit https://build.top");
});

const contract = getContract({
  abi: erc20Abi,
  client: publicClient,
  address: BUILD_ERC20_CONTRACT,
});

app.get("/verify", async (req, res) => {
  const donator = req.query.address as Address | undefined;

  let verifiedAddresses = req.query.verifiedAddresses as Address[] | Address;

  if (!Array.isArray(verifiedAddresses)) {
    verifiedAddresses = [verifiedAddresses];
  }

  if (req.headers["castdrop-secret"] !== process.env.CASTDROP_SECRET) {
    res.status(403).send("Forbidden");
    return;
  }

  if (!donator) {
    res.status(400).send("Bad Request: Missing address");
    return;
  }

  if (!isAddress(donator)) {
    res.status(400).send("Bad Request: Invalid address");
    return;
  }

  const START_BLOCK = 15568849n; // BUILD airdrop contract deployed at this block
  const END_BLOCK = await publicClient.getBlockNumber();

  const addresses = [donator, ...verifiedAddresses];

  const hasDonated = await getHasDonated({
    addresses,
    fromBlock: START_BLOCK,
    toBlock: END_BLOCK,
  });

  const hasBuild = await getHasBuild(addresses);

  if (hasDonated) {
    console.log(`✅ ${donator} donated!`);
    return res.send({ eligible: true });
  }

  if (hasBuild) {
    console.log(`✅ ${donator} 10M $BUILD!`);
    return res.send({ eligible: true });
  }

  console.log(`❌ ${donator} is not eligible!`);
  res.send({ eligible: false });
});

app.listen(1337, () => console.log("Server ready on port 1337."));

async function getHasDonated({
  addresses,
  fromBlock,
  toBlock,
}: {
  addresses: Address[];
  fromBlock: bigint;
  toBlock: bigint;
}) {
  try {
    const donations = await Promise.allSettled(
      addresses.map((address) =>
        publicClient.getContractEvents({
          abi: ABI,
          args: { donator: address },
          eventName: "Donated",
          fromBlock,
          toBlock,
          address: BUILD_AIRDROP_CONTRACT,
        })
      )
    );
    for (const result of donations) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
}

const MINIMUM_BUILD = 10000000000000000000000000n; // 10M $BUILD

async function getHasBuild(addresses: Address[]) {
  try {
    const balances = await Promise.allSettled(
      addresses.map((address) => contract.read.balanceOf([address]))
    );
    for (const result of balances) {
      if (result.status === "fulfilled" && result.value >= MINIMUM_BUILD) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export default app;
