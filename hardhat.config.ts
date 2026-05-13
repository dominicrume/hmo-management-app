import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    polygonAmoy: {
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: process.env.POLYGON_WALLET_PRIVATE_KEY ? [process.env.POLYGON_WALLET_PRIVATE_KEY] : [],
    }
  }
};

export default config;
