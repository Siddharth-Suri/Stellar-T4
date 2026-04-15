// src/tests/PollList.test.jsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PollList } from "../components/PollList";

describe("PollList", () => {
  const dummyPolls = [
    { id: 1, question: "Should we build this?", yes: 2, no: 1, creator: "GBX123", closed: false },
    { id: 2, question: "Closed Poll", yes: 0, no: 0, creator: "GBX456", closed: true }
  ];

  it("shows connect gate when wallet is not connected", () => {
    render(
      <PollList
        polls={dummyPolls}
        loadingPolls={false}
        publicKey={null}
        txStatus={null}
        hasVoted={() => false}
        onVote={() => {}}
        onClose={() => {}}
        onConnect={() => {}}
      />
    );

    const connectBtns = screen.getAllByRole("button", { name: /connect wallet/i });
    expect(connectBtns.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /yes/i })).toBeNull();
  });

  it("shows vote buttons and labels correctly when connected", () => {
    render(
      <PollList
        polls={dummyPolls}
        loadingPolls={false}
        publicKey="GBX123"
        txStatus={null}
        hasVoted={() => false} // neither voted
        onVote={() => {}}
        onClose={() => {}}
        onConnect={() => {}}
      />
    );

    // Active poll should show Yes/No buttons
    const yesBtn = screen.getByRole("button", { name: /yes/i });
    expect(yesBtn).toBeEnabled();

    // Since GBX123 rendered this, "Your Poll" badge should appear
    const badge = screen.getByText("Your Poll");
    expect(badge).toBeInTheDocument();

    // The Closed poll should render "Voting is closed."
    expect(screen.getByText("Voting is closed.")).toBeInTheDocument();
    
    // As GBX123, they can close Poll 1, but Poll 2 is from GBX456 and already closed anyway
    const closeBtn = screen.getByRole("button", { name: /close poll/i });
    expect(closeBtn).toBeInTheDocument();
  });
});
