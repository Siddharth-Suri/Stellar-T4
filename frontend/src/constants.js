// src/constants.js
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "";
export const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";
export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL ||
  "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
export const POLL_QUESTION =
  import.meta.env.VITE_POLL_QUESTION ||
  "Should Stellar adopt a universal basic income protocol?";

export const POLL_OPTIONS = {
  YES: "YES",
  NO: "NO",
};

export const TX_STATUS = {
  IDLE: null,
  PENDING: "pending",
  SUCCESS: "success",
  FAIL: "fail",
};

export const ERROR_TYPES = {
  WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
  USER_REJECTED: "USER_REJECTED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  ALREADY_VOTED: "ALREADY_VOTED",
  UNKNOWN: "UNKNOWN",
};

export const ERROR_MESSAGES = {
  WALLET_NOT_FOUND: "Wallet not found. Install Freighter or LOBSTR.",
  USER_REJECTED: "Cancelled.",
  INSUFFICIENT_BALANCE:
    "Not enough XLM. Get testnet funds from Friendbot.",
  ALREADY_VOTED: "You have already voted! One vote per account.",
  UNKNOWN: "Something went wrong. Please try again.",
};

export const STELLAR_EXPERT_BASE = "https://stellar.expert/explorer/testnet/tx";
export const FRIENDBOT_URL = "https://laboratory.stellar.org/#account-creator";
