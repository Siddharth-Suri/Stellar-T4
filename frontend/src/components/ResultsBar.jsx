// src/components/ResultsBar.jsx
import React from "react";

export function ResultsBar({ yes, no, loading }) {
  const total = yes + no;
  const yesPct = total === 0 ? 50 : Math.round((yes / total) * 100);
  const noPct = total === 0 ? 50 : 100 - yesPct;

  if (loading) {
    return (
      <div className="results">
        <div className="results__header">
          <div className="skeleton" style={{ width: "60px", height: "18px" }} />
          <div className="skeleton" style={{ width: "60px", height: "18px" }} />
        </div>
        <div className="skeleton" style={{ height: "12px", borderRadius: "99px", marginTop: "10px" }} />
        <div className="skeleton" style={{ width: "100px", height: "14px", margin: "8px auto 0" }} />
      </div>
    );
  }

  return (
    <div className="results">
      <div className="results__header">
        <span className="results__label results__label--yes">
          Yes &nbsp;<strong>{yes}</strong>
          <span className="results__pct">({yesPct}%)</span>
        </span>
        <span className="results__label results__label--no">
          No &nbsp;<strong>{no}</strong>
          <span className="results__pct">({noPct}%)</span>
        </span>
      </div>
      <div className="results__track" role="meter" aria-label="Poll results">
        <div
          className="results__fill results__fill--yes"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="results__fill results__fill--no"
          style={{ width: `${noPct}%` }}
        />
      </div>
      <p className="results__total">
        {`${total} vote${total !== 1 ? "s" : ""} cast`}
      </p>
    </div>
  );
}
