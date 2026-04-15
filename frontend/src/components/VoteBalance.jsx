// src/components/VoteBalance.jsx
// Shows how many VOTE reward tokens the connected wallet has earned.
// The balance is fetched by calling VoteToken::balance(address) via
// a read-only Soroban RPC simulation (no signing required).
import React, { useEffect, useState } from "react";
import { SorobanRpc, Contract, Networks, nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL, REWARD_TOKEN_ID } from "../constants";

const DECIMALS = 7;

function formatVote(raw) {
  if (raw == null) return "—";
  const whole = Number(raw) / 10 ** DECIMALS;
  return whole.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function VoteBalance({ publicKey }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey || !REWARD_TOKEN_ID) return;

    let cancelled = false;

    async function fetchBalance() {
      setLoading(true);
      try {
        const server = new SorobanRpc.Server(SOROBAN_RPC_URL);
        const contract = new Contract(REWARD_TOKEN_ID);
        const accountArg = nativeToScVal(publicKey, { type: "address" });
        const operation = contract.call("balance", accountArg);

        const tx = {
          operations: [operation],
        };

        // Use simulateTransaction for a read-only call
        const sim = await server.simulateTransaction(
          // Build a minimal transaction envelope – only the operation matters for simulation
          new (await import("@stellar/stellar-sdk")).TransactionBuilder(
            { accountId: () => publicKey, sequence: () => "0", incrementSequenceNumber: () => {} },
            { fee: "100", networkPassphrase: Networks.TESTNET }
          )
            .addOperation(operation)
            .setTimeout(30)
            .build()
        );

        if (SorobanRpc.Api.isSimulationSuccess(sim)) {
          const resultVal = sim.result?.retval;
          if (resultVal) {
            const native = scValToNative(resultVal);
            if (!cancelled) setBalance(native);
          }
        }
      } catch {
        // Silently fail — balance display is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBalance();
    const id = setInterval(fetchBalance, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicKey]);

  if (!publicKey || !REWARD_TOKEN_ID) return null;

  return (
    <div className="vote-balance" title="Your VOTE reward token balance">
      <span className="vote-balance__icon">🗳️</span>
      <span className="vote-balance__amount">
        {loading && balance == null ? "…" : formatVote(balance)}
      </span>
      <span className="vote-balance__label">VOTE</span>
    </div>
  );
}
