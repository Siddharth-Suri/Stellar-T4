// src/hooks/useWallet.js
// @creit.tech/stellar-wallets-kit v2 — fully static class API
import { useState, useCallback } from "react";
import { StellarWalletsKit, Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { ERROR_TYPES, ERROR_MESSAGES, NETWORK_PASSPHRASE } from "../constants.js";

let kitInitialised = false;

function ensureKit() {
  if (!kitInitialised) {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: [
        new FreighterModule(),
        new LobstrModule(),
        new AlbedoModule(),
        new xBullModule(),
      ],
    });
    kitInitialised = true;
  }
}

function classifyWalletError(err) {
  const msg = (err?.message || "").toLowerCase();
  const code = err?.code;
  // v2 kit rejects with code: -1 when user closes the modal
  if (
    code === -1 ||
    msg.includes("closed") ||
    msg.includes("cancel") ||
    msg.includes("reject") ||
    msg.includes("denied")
  ) {
    return ERROR_TYPES.USER_REJECTED;
  }
  if (
    msg.includes("not found") ||
    msg.includes("install") ||
    msg.includes("extension")
  ) {
    return ERROR_TYPES.WALLET_NOT_FOUND;
  }
  return ERROR_TYPES.UNKNOWN;
}

export function useWallet() {
  const [publicKey, setPublicKey] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setWalletError(null);
    try {
      ensureKit();
      // authModal() resolves { address } or rejects (user closed / error)
      const { address } = await StellarWalletsKit.authModal();
      setPublicKey(address);
    } catch (err) {
      const type = classifyWalletError(err);
      // Silently swallow user-cancelled; surface real errors
      if (type !== ERROR_TYPES.USER_REJECTED) {
        setWalletError({
          type,
          message: ERROR_MESSAGES[type] || ERROR_MESSAGES.UNKNOWN,
        });
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (kitInitialised) await StellarWalletsKit.disconnect();
    } catch (_) {
      // ignore
    }
    setPublicKey(null);
    setWalletError(null);
  }, []);

  const signTransaction = useCallback(async (xdr, opts) => {
    ensureKit();
    // v2: returns { signedTxXdr }
    return StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase || NETWORK_PASSPHRASE,
      address: opts?.address,
    });
  }, []);

  return {
    publicKey,
    connecting,
    walletError,
    connect,
    disconnect,
    signTransaction,
  };
}
