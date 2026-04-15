import React from "react";

function formatAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

export function ActivityFeed({ voters = [] }) {
  // Optional: slice to show only latest 10 to keep the layout tidy
  const displayVoters = voters.slice(0, 10);

  return (
    <div className="activity-feed">
      <h3>Live Activity</h3>
      {displayVoters.length === 0 ? (
        <p className="activity-empty">No votes yet. Be the first!</p>
      ) : (
        <ul className="activity-list">
          {displayVoters.map((v, i) => (
            <li key={i} className="activity-item">
              <span className="activity-address">{formatAddress(v.address)}</span>
              <span className="activity-action"> voted </span>
              <span className={`activity-vote ${v.vote.toLowerCase()}`}>{v.vote}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
