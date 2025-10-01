import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv"; dotenv.config();

const celo = {
  url: process.env.CELO_RPC || "https://forno.celo.org",
  accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
  chainId: 42220,
};
const alfajores = {
  url: process.env.ALFAJORES_RPC || "https://alfajores-forno.celo-testnet.org",
  accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
  chainId: 44787,
};

export default {
  solidity: "0.8.20",
  networks: { celo, alfajores },
  etherscan: {
    apiKey: { celo: process.env.CELOSCAN_API_KEY || "" },
    customChains: [
      { network: "celo", chainId: 42220,
        urls: { apiURL: "https://api.celoscan.io/api", browserURL: "https://celoscan.io" } },
      { network: "alfajores", chainId: 44787,
        urls: { apiURL: "https://api-alfajores.celoscan.io/api", browserURL: "https://alfajores.celoscan.io" } },
    ],
  },
};
