// src/utils/soroban.js
// @stellar/stellar-sdk v13 — uses `rpc` namespace (not SorobanRpc)
import {
  rpc,
  TransactionBuilder,
  Account,
  Contract,
  nativeToScVal,
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

  // Use raw JSON-RPC call instead of server.simulateTransaction()
  // because the SDK's internal XDR parser crashes on Soroban bool values
  // with "Bad union switch: 1"
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

  // Parse the raw XDR binary ourselves to avoid SDK's broken bool handler
  const rawBytes = Uint8Array.from(atob(results[0].xdr), c => c.charCodeAt(0));
  const parsed = parseScVal(rawBytes, { offset: 0 });
  if (!parsed || typeof parsed !== "object") return [];

  const polls = Object.entries(parsed).map(([id, poll]) => ({
    id: Number(id),
    question: String(poll.question ?? ""),
    yes: Number(poll.yes ?? 0),
    no: Number(poll.no ?? 0),
    creator: String(poll.creator ?? ""),
    closed: Boolean(poll.closed),
  }));

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

// ── Minimal ScVal XDR binary parser ──────────────────────────────────
// Parses raw XDR bytes directly, bypassing the SDK's broken union handler.

function readU32(buf, pos) {
  return ((buf[pos] << 24) | (buf[pos+1] << 16) | (buf[pos+2] << 8) | buf[pos+3]) >>> 0;
}

function readU64(buf, pos) {
  const hi = readU32(buf, pos);
  const lo = readU32(buf, pos + 4);
  return hi * 0x100000000 + lo;
}

function parseScVal(buf, ctx) {
  const type = readU32(buf, ctx.offset);
  ctx.offset += 4;

  switch (type) {
    case 0: // SCV_VOID
      return null;
    case 1: { // SCV_ERROR — skip 8 bytes (type u32 + code u32)
      ctx.offset += 8;
      return null;
    }
    case 2: { // SCV_BOOL
      const v = readU32(buf, ctx.offset);
      ctx.offset += 4;
      return v !== 0;
    }
    case 4: { // SCV_U32
      const v = readU32(buf, ctx.offset);
      ctx.offset += 4;
      return v;
    }
    case 5: { // SCV_I32
      const v = readU32(buf, ctx.offset);
      ctx.offset += 4;
      return v > 0x7FFFFFFF ? v - 0x100000000 : v;
    }
    case 6: // SCV_U64
    case 8: // SCV_TIMEPOINT
    case 9: { // SCV_DURATION
      const v = readU64(buf, ctx.offset);
      ctx.offset += 8;
      return v;
    }
    case 7: { // SCV_I64
      const v = readU64(buf, ctx.offset);
      ctx.offset += 8;
      return v;
    }
    case 10: { // SCV_U128 — lo(u64) then hi(u64) in XDR
      const lo = readU64(buf, ctx.offset);
      const hi = readU64(buf, ctx.offset + 8);
      ctx.offset += 16;
      return hi * 0x10000000000000000 + lo;
    }
    case 11: { // SCV_I128
      ctx.offset += 16;
      return 0;
    }
    case 12: { // SCV_U256
      ctx.offset += 32;
      return 0;
    }
    case 13: { // SCV_I256
      ctx.offset += 32;
      return 0;
    }
    case 14: { // SCV_BYTES
      const len = readU32(buf, ctx.offset);
      ctx.offset += 4;
      const bytes = buf.slice(ctx.offset, ctx.offset + len);
      ctx.offset += len + ((4 - (len % 4)) % 4);
      return bytes;
    }
    case 15: { // SCV_STRING
      const len = readU32(buf, ctx.offset);
      ctx.offset += 4;
      const str = new TextDecoder().decode(buf.slice(ctx.offset, ctx.offset + len));
      ctx.offset += len + ((4 - (len % 4)) % 4);
      return str;
    }
    case 16: { // SCV_SYMBOL
      const len = readU32(buf, ctx.offset);
      ctx.offset += 4;
      const sym = new TextDecoder().decode(buf.slice(ctx.offset, ctx.offset + len));
      ctx.offset += len + ((4 - (len % 4)) % 4);
      return sym;
    }
    case 17: { // SCV_VEC (optional<vec>)
      const present = readU32(buf, ctx.offset);
      ctx.offset += 4;
      if (!present) return [];
      const count = readU32(buf, ctx.offset);
      ctx.offset += 4;
      const arr = [];
      for (let i = 0; i < count; i++) arr.push(parseScVal(buf, ctx));
      return arr;
    }
    case 18: { // SCV_MAP (optional<map>)
      const present = readU32(buf, ctx.offset);
      ctx.offset += 4;
      if (!present) return {};
      const count = readU32(buf, ctx.offset);
      ctx.offset += 4;
      const result = {};
      for (let i = 0; i < count; i++) {
        const key = parseScVal(buf, ctx);
        const val = parseScVal(buf, ctx);
        result[key] = val;
      }
      return result;
    }
    case 19: { // SCV_ADDRESS
      const addrType = readU32(buf, ctx.offset);
      ctx.offset += 4;
      if (addrType === 0) {
        // SC_ADDRESS_TYPE_ACCOUNT: AccountID = PublicKey union
        // has an extra 4-byte PublicKeyType discriminant (KEY_TYPE_ED25519=0)
        // before the 32-byte ed25519 key.
        ctx.offset += 4; // skip PublicKeyType
        const keyBytes = buf.slice(ctx.offset, ctx.offset + 32);
        ctx.offset += 32;
        return encodeStrKey(6 << 3, keyBytes); // G... address
      } else {
        // SC_ADDRESS_TYPE_CONTRACT: just a raw 32-byte hash
        const keyBytes = buf.slice(ctx.offset, ctx.offset + 32);
        ctx.offset += 32;
        return encodeStrKey(2 << 3, keyBytes); // C... address
      }
    }
    default: {
      console.warn("[parseScVal] Unknown ScVal type:", type, "at offset:", ctx.offset);
      return null;
    }
  }
}

// ── StrKey (base32) encoding for Stellar addresses ───────────────────

function encodeStrKey(versionByte, rawBytes) {
  const payload = new Uint8Array(35);
  payload[0] = versionByte;
  payload.set(rawBytes, 1);
  const crc = crc16xmodem(payload.subarray(0, 33));
  payload[33] = crc & 0xff;
  payload[34] = (crc >> 8) & 0xff;
  return base32Encode(payload);
}

function crc16xmodem(data) {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(data) {
  let r = "", bits = 0, value = 0;
  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;
    while (bits >= 5) { r += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) r += B32[(value << (5 - bits)) & 31];
  return r;
}
