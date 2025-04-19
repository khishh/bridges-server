import { BridgeAdapter, PartialContractEventParams } from "../../helpers/bridgeAdapter.type";
import { getTxDataFromEVMEventLogs } from "../../helpers/processTransactions";

export const bridgesAddress = {
  optimism: "0x6Aca7B9a3700B19CB5909208704A4e71B30e7840",
  arbitrum: "0x3B5357D73fC65487449Cd68550adB9F46A0b8068",
  scroll: "0x4e44f012B66C839A9904d128B93F80Dd5e3a1b21",
  // zkSync: "",
  base: "0xDce25728E076ee5BCD146fD9F5FB5360ad18bCa0",
  linea: "0x505cf4BB10bD1320f2F07d445bBe06A721B6CF53",
  taiko: "0x04e28F7244980d3280F3b485D9cDA4b58F6C99B5",
  // mode: "",
  // xlayer: "",
  morph: "0xbD45fC4826Fd0981F1A3d8330cf75309fBC9ce33",
} as const;

type SupportedBridgeChains = keyof typeof bridgesAddress;

export const cctpBridgeAddress = {
  ethereum: "0x847885c4a883A42dbC58c9f318df3106306c2467",
  optimism: "0x9dD4a939D6646028d3a35Eb45737f18Ee047D480",
  arbitrum: "0x268d153690F07E46dFbfC57cB74d5fb6BF5994fA",
  base: "0xA3ed5F8D0Df3C1225E084ce6879DFBFE91Ae567d",
} as const;

type SupportedCctpBridgeChains = keyof typeof cctpBridgeAddress;

export const swapsAddress = {
  arbitrum: "0xfC9C6B6e0D02EaDE37aC8b6c59e7181726075696",
  taiko: "0xfC9C6B6e0D02EaDE37aC8b6c59e7181726075696",
} as const;

type SupportedSwapChains = keyof typeof swapsAddress;

const bridgeDepositParams = (chain: SupportedBridgeChains) => {
  const bridgeAddress = bridgesAddress[chain];

  return {
    target: bridgeAddress,
    topic: "NewTrade(address,uint256,address,uint256,address)",
    abi: ["event NewTrade(address indexed userAddress, uint256 index, address to, uint256 amount, address token)"],
    isDeposit: true,
    logKeys: {
      blockNumber: "blockNumber",
      txHash: "transactionHash",
    },
    argKeys: {
      token: "token",
      from: "userAddress",
      to: "to",
      amount: "amount",
    },
  };
};

const bridgeWithdrawParams = (chain: SupportedBridgeChains): PartialContractEventParams => {
  const bridgeAddress = bridgesAddress[chain];

  return {
    target: bridgeAddress,
    topic: "Accept(address,uint256,address,uint256,address)",
    abi: [
      "event Accept(address indexed userAddress, bytes32 indexed txHash, uint256 index,address to,uint256 amount,address token)",
    ],
    isDeposit: false,
    logKeys: {
      blockNumber: "blockNumber",
      txHash: "transactionHash",
    },
    argKeys: {
      token: "token",
      from: "userAddress",
      to: "to",
      amount: "amount",
    },
  };
};

const swapDepositParams = (chain: SupportedSwapChains): PartialContractEventParams => {
  const swapAddress = swapsAddress[chain];

  return {
    target: swapAddress,
    topic: "SwapNewTrade(address,address,(string,uint16,address,address,uint256,uint256,uint256))",
    abi: [
      "event SwapNewTrade(address indexed userAddress, address indexed token, tuple(string toChainId, uint16 swapToolIndex, address toolContract, address toToken, uint256 amount, uint256 relayerFee, uint256 timestamp) trade)",
    ],
    isDeposit: true,
    logKeys: {
      blockNumber: "blockNumber",
      txHash: "transactionHash",
    },
    argKeys: {
      token: "token",
      from: "userAddress",
      to: "trade.toolContract",
      amount: "trade.amount",
    },
  };
};

const swapWithdrawParams = (chain: SupportedSwapChains): PartialContractEventParams => {
  const swapAddress = swapsAddress[chain];

  return {
    target: swapAddress,
    topic: "SwapWithdrawTrade(address,address,bytes32,uint256,bytes)",
    abi: [
      "event SwapWithdrawTrade(address indexed userAddress, address indexed token, bytes32 tradeHash, uint256 amount, bytes data)",
    ],
    isDeposit: false,
    logKeys: {
      blockNumber: "blockNumber",
      txHash: "transactionHash",
    },
    argKeys: {
      token: "token",
      to: "userAddress",
      amount: "amount",
    },
    fixedEventData: {
      from: swapAddress
    },
  };
};

const constructParams = (chain: string) => {
  //   const eventParams = [bridgeDepositParams(chain), bridgeWithdrawParams(chain)];
  const eventParams: PartialContractEventParams[] = [];

  if (chain in bridgesAddress) {
    eventParams.push(
      bridgeDepositParams(chain as SupportedBridgeChains),
      bridgeWithdrawParams(chain as SupportedBridgeChains)
    );
  }

  if (chain in swapsAddress) {
    eventParams.push(
      swapDepositParams(chain as SupportedSwapChains),
      swapWithdrawParams(chain as SupportedSwapChains)
    );
  }

  return async (fromBlock: number, toBlock: number) =>
    getTxDataFromEVMEventLogs("pheasant-network", chain, fromBlock, toBlock, eventParams);
};

const adapter: BridgeAdapter = {
  optimism: constructParams("optimism"),
  arbitrum: constructParams("arbitrum"),
  scroll: constructParams("scroll"),
  base: constructParams("base"),
  linea: constructParams("linea"),
  taiko: constructParams("taiko"),
  morph: constructParams("morph"),
};

export default adapter;
