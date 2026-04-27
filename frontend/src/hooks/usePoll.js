import { useState, useEffect, useCallback } from "react";
import { fetchPolls, castVote, createPoll, closePoll } from "../utils/soroban";
import { TX_STATUS, ERROR_TYPES } from "../constants";

export function usePoll(publicKey, signTransaction) {
  const [polls, setPolls] = useState(() => {
    const cached = localStorage.getItem("poll_list");
    return cached ? JSON.parse(cached) : [];
  });
  const [loadingPolls, setLoadingPolls] = useState(true);

  // Transaction state
  const [txStatus, setTxStatus] = useState(TX_STATUS.IDLE);
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);

  const resetTx = useCallback(() => {
    setTxStatus(TX_STATUS.IDLE);
    setTxHash(null);
    setTxError(null);
  }, []);

  // loadPolls is intentionally stable (no deps) to avoid stale closures.
  // bust=true clears localStorage so stale data never masks a fresh fetch.
  const loadPolls = useCallback(async ({ bust = false } = {}) => {
    try {
      if (bust) localStorage.removeItem("poll_list");
      const data = await fetchPolls();
      setPolls(data);
      localStorage.setItem("poll_list", JSON.stringify(data));
    } catch (err) {
      console.error("fetchPolls error:", err);
    } finally {
      setLoadingPolls(false);
    }
  }, []); // stable — no dependencies

  // Initial load and 5-second polling
  useEffect(() => {
    loadPolls();
    const intervalId = setInterval(loadPolls, 5000);
    return () => clearInterval(intervalId);
  }, [loadPolls]);

  // Action: Vote
  const vote = async (pollId, option) => {
    if (!publicKey || !signTransaction) return;
    try {
      setTxStatus(TX_STATUS.PENDING);
      setTxError(null);
      setTxHash(null);

      const result = await castVote(pollId, option, publicKey, signTransaction);
      
      setTxStatus(TX_STATUS.SUCCESS);
      setTxHash(result.hash);

      // Track successful vote in localStorage
      localStorage.setItem(`voted_${pollId}_${publicKey}`, "true");

      // Refresh polls — bust cache to avoid showing stale data
      await loadPolls({ bust: true });
    } catch (err) {
      setTxStatus(TX_STATUS.ERROR);
      setTxError({
        message: err.message,
        type: err.type || ERROR_TYPES.UNKNOWN,
      });
    }
  };

  // Action: Create Poll
  const create = async (question) => {
    if (!publicKey || !signTransaction) return;
    try {
      setTxStatus(TX_STATUS.PENDING);
      setTxError(null);
      setTxHash(null);

      const result = await createPoll(publicKey, question, signTransaction);
      
      setTxStatus(TX_STATUS.SUCCESS);
      setTxHash(result.hash);
      
      // Bust cache so the new poll appears immediately
      await loadPolls({ bust: true });
    } catch (err) {
      setTxStatus(TX_STATUS.ERROR);
      setTxError({
        message: err.message,
        type: err.type || ERROR_TYPES.UNKNOWN,
      });
      // Rethrow to let the modal handle closing/staying open
      throw err;
    }
  };

  // Action: Close Poll
  const close = async (pollId) => {
    if (!publicKey || !signTransaction) return;
    try {
      setTxStatus(TX_STATUS.PENDING);
      setTxError(null);
      setTxHash(null);

      const result = await closePoll(publicKey, pollId, signTransaction);
      
      setTxStatus(TX_STATUS.SUCCESS);
      setTxHash(result.hash);
      
      await loadPolls({ bust: true });
    } catch (err) {
      setTxStatus(TX_STATUS.ERROR);
      setTxError({
        message: err.message,
        type: err.type || ERROR_TYPES.UNKNOWN,
      });
    }
  };

  // Helper check per-poll
  const hasVoted = useCallback((pollId) => {
    if (!publicKey) return false;
    return !!localStorage.getItem(`voted_${pollId}_${publicKey}`);
  }, [publicKey]);

  return {
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
  };
}
