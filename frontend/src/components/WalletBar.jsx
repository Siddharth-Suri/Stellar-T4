// src/components/WalletBar.jsx
import React from "react";
import { ThemeSwitcher } from "./ThemeSwitcher.jsx";
import { FRIENDBOT_URL } from "../constants.js";

export function WalletBar({ publicKey, connecting, walletError, onConnect, onDisconnect, theme, toggleTheme }) {
  const truncate = (key) =>
    key ? `${key.slice(0, 6)}…${key.slice(-4)}` : "";

  return (
    <header className="wallet-bar">
      <div className="wallet-bar__brand">
        <span className="wallet-bar__logo">✦</span>
        <span className="wallet-bar__title">Live Poll</span>
        <span className="wallet-bar__network">Testnet</span>
      </div>

      <div className="wallet-bar__actions">
        <ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />
        {publicKey ? (
          <div className="wallet-bar__connected">
            <span className="wallet-bar__address" title={publicKey}>
              <span className="wallet-bar__dot" />
              {truncate(publicKey)}
            </span>
            <button
              id="disconnect-btn"
              className="btn btn--ghost btn--sm"
              onClick={onDisconnect}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            id="connect-wallet-btn"
            className="btn btn--accent"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? (
              <span className="btn__spinner" />
            ) : (
              "Connect Wallet"
            )}
          </button>
        )}
      </div>

      {walletError && (
        <div className="wallet-bar__error" role="alert">
          ⚠ {walletError.message}
          {walletError.type === "WALLET_NOT_FOUND" && (
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noreferrer"
              className="wallet-bar__error-link"
            >
              Get Freighter
            </a>
          )}
        </div>
      )}
    </header>
  );
}
