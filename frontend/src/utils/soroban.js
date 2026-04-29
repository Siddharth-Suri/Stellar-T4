// src/utils/soroban.js
// @stellar/stellar-sdk v13 — uses `rpc` namespace (not SorobanRpc)
import {
  rpc,
  TransactionBuilder,
  Account,
  Contract,
  nativeToScVal,
  xdr,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import {
  CONTRACT_ID,
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
  ERROR_TYPES,
} from "../constants.js";

const server = new rpc.Server(SOROBAN_RPC_URL);

// Stellar Friendbot account — 56-char valid StrKey, always funded on testnet.
// Used ONLY as the transaction source for read-only simulation (never submitted).
const DUMMY_KEY = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function classifyError(err) {
  const msg = (err?.message || "").toLowerCase();
  const codes = JSON.stringify(err?.response?.data || "").toLowerCase();
  const code = err?.code;

  if (msg.includes("not found") || msg.includes("install") || msg.includes("extension")) {
    return ERROR_TYPES.WALLET_NOT_FOUND;
  }
  if (
    msg.includes("reject") ||
    msg.includes("cancel") ||
    msg.includes("denied") ||
    msg.includes("closed the modal") ||
    msg.includes("user declined") ||
    code === -1
  ) {
    return ERROR_TYPES.USER_REJECTED;
  }
  if (
    codes.includes("op_insufficient_balance") ||
    codes.includes("insufficient_balance") ||
    msg.includes("insufficient")
  ) {
    return ERROR_TYPES.INSUFFICIENT_BALANCE;
  }
  if (msg.includes("already_voted") || codes.includes("already_voted")) {
    return ERROR_TYPES.ALREADY_VOTED;
  }
  if (msg.includes("poll_closed") || codes.includes("poll_closed")) {
    return { ...ERROR_TYPES.UNKNOWN, message: "This poll is closed." };
  }
  if (msg.includes("not_creator") || codes.includes("not_creator")) {
    return { ...ERROR_TYPES.UNKNOWN, message: "Only the creator can close this poll." };
  }
  return ERROR_TYPES.UNKNOWN;
}

/** Generic transaction submitter for all modifier calls */
async function submitTransaction(operation, publicKey, signTransaction) {
  if (!CONTRACT_ID) throw new Error("Contract ID not set. Add VITE_CONTRACT_ID to .env");
  
  try {
    const account = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      const simErr = new Error("Simulation error: " + simResult.error);
      simErr.response = { data: simResult.error };
      throw simErr;
    }

    const assembled = rpc.assembleTransaction(tx, simResult).build().toXDR();

    const signed = await signTransaction(assembled, {
      address: publicKey,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    const signedXdr = signed.signedTxXdr ?? signed;
    const rpcResponse = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "sendTransaction",
        params: { transaction: signedXdr },
      }),
    });
    
    const rpcJson = await rpcResponse.json();
    if (rpcJson.error) {
      const e = new Error(rpcJson.error.message || "RPC sendTransaction error");
      e.response = { data: rpcJson.error };
      throw e;
    }
    const sendResult = rpcJson.result;

    if (sendResult.status === "ERROR") {
      const e = new Error("Transaction error");
      e.response = { data: sendResult.errorResult };
      throw e;
    }

    const hash = sendResult.hash;
    let status = "NOT_FOUND";
    for (let i = 0; i < 30; i++) {
       await new Promise((r) => setTimeout(r, 2000));
       const pollResp = await fetch(SOROBAN_RPC_URL, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           jsonrpc: "2.0",
           id: Date.now(),
           method: "getTransaction",
           params: { hash },
         }),
       });
       const pollJson = await pollResp.json();
       status = pollJson?.result?.status || "NOT_FOUND";
       if (status !== "NOT_FOUND") break;
    }

    if (status === "FAILED") {
      throw new Error("Transaction was rejected by the network.");
    }

    return { hash };
  } catch (err) {
    console.error("[submitTransaction] raw error:", err);
    const errType = classifyError(err);
    const error = new Error(errType.message || err.message);
    error.type = err.type ?? errType;
    throw error;
  }
}

export async function fetchPolls() {
  if (!CONTRACT_ID) return [];

  const contract = new Contract(CONTRACT_ID);
  const dummyAccount = new Account(DUMMY_KEY, "0");

  const tx = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_polls"))
    .setTimeout(30)
    .build();

  // Use raw JSON-RPC to avoid server.simulateTransaction()'s broken internal
  // XDR union handler, but pass the result to the SDK's own XDR deserialiser
  // which correctly handles all ScVal types including SCV_BOOL.
  const resp = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "simulateTransaction",
      params: { transaction: tx.toXDR() },
    }),
  });

  const json = await resp.json();
  if (json.error) {
    throw new Error("Simulation RPC error: " + JSON.stringify(json.error));
  }

  const results = json.result?.results;
  if (!results || !results.length || !results[0]?.xdr) return [];

  // Use the SDK's own XDR deserialiser — handles all ScVal types correctly.
  // xdr.ScVal.fromXDR does NOT go through the broken server.simulateTransaction path.
  const scVal = xdr.ScVal.fromXDR(results[0].xdr, "base64");
  const native = scValToNative(scVal);

  // scValToNative turns a Soroban Map<u32, Poll> into either a JS Map or plain object.
  // Soroban serialises #[contracttype] struct fields alphabetically:
  // closed, creator, id, no, question, yes
  if (!native) return [];

  let entries;
  if (native instanceof Map) {
    entries = [...native.entries()];
  } else if (typeof native === "object") {
    entries = Object.entries(native);
  } else {
    return [];
  }

  const polls = entries
    .map(([, poll]) => {
      if (!poll || typeof poll !== "object") return null;
      return {
        id:       Number(poll.id       ?? 0),
        question: String(poll.question ?? ""),
        yes:      Number(poll.yes      ?? 0),
        no:       Number(poll.no       ?? 0),
        creator:  String(poll.creator  ?? ""),
        closed:   Boolean(poll.closed),
      };
    })
    .filter(Boolean);

  return polls.sort((a, b) => b.id - a.id);
}

export async function castVote(pollId, option, publicKey, signTransaction) {
  const contract = new Contract(CONTRACT_ID);
  const call = contract.call(
    "vote",
    nativeToScVal(publicKey, { type: "address" }),
    nativeToScVal(pollId, { type: "u32" }),
    nativeToScVal(option, { type: "symbol" })
  );
  return submitTransaction(call, publicKey, signTransaction);
}

export async function createPoll(publicKey, question, signTransaction) {
  const contract = new Contract(CONTRACT_ID);
  const call = contract.call(
    "create_poll",
    nativeToScVal(publicKey, { type: "address" }),
    nativeToScVal(question, { type: "string" })
  );
  return submitTransaction(call, publicKey, signTransaction);
}

export async function closePoll(publicKey, pollId, signTransaction) {
  const contract = new Contract(CONTRACT_ID);
  const call = contract.call(
    "close_poll",
    nativeToScVal(publicKey, { type: "address" }),
    nativeToScVal(pollId, { type: "u32" })
  );
  return submitTransaction(call, publicKey, signTransaction);
}
