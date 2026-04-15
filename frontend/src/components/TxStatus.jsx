// src/components/TxStatus.jsx
import React from "react";
import { TX_STATUS, STELLAR_EXPERT_BASE } from "../constants.js";

export function TxStatus({ status, hash, error, onReset }) {
  if (status === TX_STATUS.IDLE) return null;

  return (
    <div
      className={`tx-status tx-status--${status}`}
      role="status"
      aria-live="polite"
    >
      {status === TX_STATUS.PENDING && (
        <div className="tx-status__content">
          <span className="tx-status__spinner" />
          <span>Submitting vote to Stellar…</span>
        </div>
      )}

      {status === TX_STATUS.SUCCESS && (
        <div className="tx-status__content">
          <span className="tx-status__icon">✓</span>
          <div>
            <p className="tx-status__msg">Vote recorded on-chain!</p>
            {hash && (
              <a
                href={`${STELLAR_EXPERT_BASE}/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="tx-status__link"
                id="tx-explorer-link"
              >
                View on Stellar Expert ↗
              </a>
            )}
          </div>
          <button
            className="tx-status__close"
            onClick={onReset}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {status === TX_STATUS.FAIL && (
        <div className="tx-status__content">
          <span className="tx-status__icon tx-status__icon--fail">✕</span>
          <div>
            <p className="tx-status__msg">{error || "Transaction failed."}</p>
          </div>
          <button
            className="tx-status__close"
            onClick={onReset}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
