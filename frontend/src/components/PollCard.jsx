// src/components/PollCard.jsx
import React from "react";
import { ResultsBar } from "./ResultsBar.jsx";
import { TxStatus } from "./TxStatus.jsx";
import { POLL_QUESTION, POLL_OPTIONS, TX_STATUS, FRIENDBOT_URL } from "../constants.js";

export function PollCard({
  publicKey,
  results,
  loadingResults,
  txStatus,
  txHash,
  txError,
  hasVoted,
  onVote,
  onResetTx,
  onConnect,
}) {
  const isPending = txStatus === TX_STATUS.PENDING;
  const canVote = !!publicKey && !hasVoted && !isPending;

  return (
    <main className="glass-card poll-card">
      {/* Results */}
      <section className="poll-card__results-section">
        <ResultsBar
          yes={results.yes}
          no={results.no}
          loading={loadingResults}
        />
      </section>

      {/* Transaction Status */}
      <TxStatus
        status={txStatus}
        hash={txHash}
        error={txError}
        onReset={onResetTx}
      />

      {/* Vote Buttons or Gate */}
      <section className="poll-card__vote-section">
        {!publicKey ? (
          <div className="poll-card__gate">
            <p className="poll-card__gate-text">
              Connect your Stellar wallet to vote.
            </p>
            <button
              id="poll-connect-btn"
              className="btn btn--accent btn--wide"
              onClick={onConnect}
            >
              Connect Wallet
            </button>
          </div>
        ) : hasVoted ? (
          <div className="poll-card__voted">
            <span className="poll-card__voted-icon">✦</span>
            <p>Your vote has been recorded. Thank you!</p>
          </div>
        ) : (
          <div className="poll-card__buttons">
            <button
              id="vote-yes-btn"
              className="btn btn--yes btn--vote"
              onClick={() => onVote(POLL_OPTIONS.YES)}
              disabled={!canVote}
            >
              {isPending ? <span className="btn__spinner btn__spinner--light" /> : null}
              <span className="btn__thumb">👍</span> Yes
            </button>
            <button
              id="vote-no-btn"
              className="btn btn--no btn--vote"
              onClick={() => onVote(POLL_OPTIONS.NO)}
              disabled={!canVote}
            >
              {isPending ? <span className="btn__spinner btn__spinner--light" /> : null}
              <span className="btn__thumb">👎</span> No
            </button>
          </div>
        )}
      </section>

      {/* Friendbot reminder */}
      {publicKey && !hasVoted && (
        <footer className="poll-card__footer">
          <p>
            Need testnet XLM?{" "}
            <a
              href={FRIENDBOT_URL}
              target="_blank"
              rel="noreferrer"
              className="link"
            >
              Friendbot →
            </a>
          </p>
        </footer>
      )}
    </main>
  );
}
