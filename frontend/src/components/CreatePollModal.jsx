import React, { useState } from "react";
import { TX_STATUS } from "../constants";

export function CreatePollModal({ isOpen, onClose, onCreate, txStatus }) {
  const [question, setQuestion] = useState("");
  const isPending = txStatus === TX_STATUS.PENDING;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    try {
      await onCreate(question);
      setQuestion("");
      onClose(); // Close on success
    } catch (err) {
      // Error handled by hook, stays open
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal">
        <h3>Create a New Poll</h3>
        <p className="modal__desc">Ask the community a question. Max 120 characters.</p>
        <form onSubmit={handleSubmit}>
          <textarea
            className="input-field"
            maxLength={120}
            rows={3}
            placeholder="E.g. Should Stellar adapt a UBI protocol?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isPending}
            required
            autoFocus
          />
          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--accent"
              disabled={isPending || !question.trim()}
            >
              {isPending ? <span className="btn__spinner" /> : "Create Poll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
