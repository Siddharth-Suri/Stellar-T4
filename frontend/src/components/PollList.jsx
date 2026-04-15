import React from "react";
import { ResultsBar } from "./ResultsBar";
import { TX_STATUS, POLL_OPTIONS } from "../constants";

export function PollList({
  polls,
  loadingPolls,
  publicKey,
  txStatus,
  hasVoted,
  onVote,
  onClose,
  onConnect,
}) {
  if (loadingPolls && polls.length === 0) {
    return (
      <div className="poll-list">
        <div className="skeleton" style={{ height: "200px" }} />
        <div className="skeleton" style={{ height: "200px" }} />
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="glass-card p-6" style={{ textAlign: "center", padding: "40px" }}>
        <h3>No Polls Yet</h3>
        <p style={{ color: "var(--ink-muted)", marginTop: "12px" }}>Be the first to create one!</p>
      </div>
    );
  }

  const openPolls = polls.filter((p) => !p.closed).sort((a, b) => b.id - a.id);
  const closedPolls = polls.filter((p) => p.closed).sort((a, b) => b.id - a.id);
  const sortedPolls = [...openPolls, ...closedPolls];

  const truncate = (key) => (key ? `${key.slice(0, 6)}…${key.slice(-4)}` : "");

  return (
    <div className="poll-list" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {sortedPolls.map((poll) => {
        const isPending = txStatus === TX_STATUS.PENDING;
        const voted = hasVoted(poll.id);
        const canVote = !!publicKey && !voted && !isPending && !poll.closed;
        const isCreator = publicKey === poll.creator;

        return (
          <article key={poll.id} className="glass-card poll-card poll-item">
            <header className="poll-item__header" style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {poll.closed ? (
                    <span className="badge badge--closed">Closed</span>
                  ) : (
                    <span className="badge badge--open">Live</span>
                  )}
                  {isCreator && <span className="badge badge--creator">Your Poll</span>}
                  <span className="poll-item__id">ID: #{poll.id}</span>
                </div>
                <div className="poll-item__creator" title={poll.creator}>
                  By {isCreator ? "You" : truncate(poll.creator)}
                </div>
              </div>
              <h2 className="poll-item__question">{poll.question}</h2>
            </header>

            <section className="poll-item__results" style={{ padding: "24px 32px" }}>
              <ResultsBar yes={poll.yes} no={poll.no} loading={false} />
            </section>

            <footer className="poll-item__actions" style={{ padding: "0 32px 32px" }}>
              {!poll.closed ? (
                !publicKey ? (
                  <div className="poll-card__gate" style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
                    <p style={{ color: "var(--ink-muted)", marginBottom: "16px" }}>Connect your Stellar wallet to vote.</p>
                    <button className="btn btn--accent btn--wide" onClick={onConnect}>
                      Connect Wallet
                    </button>
                  </div>
                ) : voted ? (
                  <div className="poll-card__voted" style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
                    <span style={{ color: "var(--yes)" }}>✦ Your vote has been recorded.</span>
                  </div>
                ) : (
                  <div className="poll-card__buttons">
                    <button
                      className="btn btn--yes btn--vote"
                      onClick={() => onVote(poll.id, POLL_OPTIONS.YES)}
                      disabled={!canVote}
                    >
                      <span className="btn__thumb">👍</span> Yes
                    </button>
                    <button
                      className="btn btn--no btn--vote"
                      onClick={() => onVote(poll.id, POLL_OPTIONS.NO)}
                      disabled={!canVote}
                    >
                      <span className="btn__thumb">👎</span> No
                    </button>
                  </div>
                )
              ) : (
                <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: "24px", color: "var(--ink-muted)" }}>
                  Voting is closed.
                </div>
              )}

              {isCreator && !poll.closed && (
                <div style={{ marginTop: "16px", textAlign: "right" }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => onClose(poll.id)}
                    disabled={isPending}
                  >
                    Close Poll
                  </button>
                </div>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
