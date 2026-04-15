// src/App.jsx
import React, { useState, useEffect } from "react";
import { WalletBar } from "./components/WalletBar.jsx";
import { PollList } from "./components/PollList.jsx";
import { CreatePollModal } from "./components/CreatePollModal.jsx";
import { TxStatus } from "./components/TxStatus.jsx";
import { useWallet } from "./hooks/useWallet.js";
import { usePoll } from "./hooks/usePoll.js";

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("poll_theme");
    return saved || "light";
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("poll_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const { publicKey, connecting, walletError, connect, disconnect, signTransaction } = useWallet();

  const {
    polls,
    loadingPolls,
    txStatus,
    txHash,
    txError,
    resetTx,
    vote,
    create,
    close,
    hasVoted,
  } = usePoll(publicKey, signTransaction);

  return (
    <div className="app">
      <WalletBar
        publicKey={publicKey}
        connecting={connecting}
        walletError={walletError}
        onConnect={connect}
        onDisconnect={disconnect}
        theme={theme}
        toggleTheme={toggleTheme}
        onCreateClick={() => setIsModalOpen(true)}
      />

      <div className="app__body">
        <div className="app__layout" style={{ display: "block", maxWidth: "800px", margin: "0 auto" }}>
          <div className="app__main">
            <div className="poll-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <h2>Community Polls</h2>
              {publicKey && (
                <button className="btn btn--accent" onClick={() => setIsModalOpen(true)}>
                  Create Poll +
                </button>
              )}
            </div>
            
            <TxStatus status={txStatus} hash={txHash} error={txError} onReset={resetTx} />

            <PollList
              polls={polls}
              loadingPolls={loadingPolls}
              publicKey={publicKey}
              txStatus={txStatus}
              hasVoted={hasVoted}
              onVote={vote}
              onClose={close}
              onConnect={connect}
            />
          </div>
        </div>
      </div>

      <CreatePollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={create}
        txStatus={txStatus}
      />

      <footer className="app__footer">
        <p>
          Built on{" "}
          <a
            href="https://developers.stellar.org/docs/smart-contracts"
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            Soroban
          </a>{" "}
          · Stellar Testnet
        </p>
      </footer>
    </div>
  );
}
