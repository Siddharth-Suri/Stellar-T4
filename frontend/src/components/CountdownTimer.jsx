import React, { useState, useEffect } from "react";

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    // Get or initialize poll end time
    let endTimeStr = localStorage.getItem("poll_endtime");
    if (!endTimeStr) {
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 48); // 48 hours from now
      endTimeStr = targetDate.getTime().toString();
      localStorage.setItem("poll_endtime", endTimeStr);
    }
    const endTime = parseInt(endTimeStr, 10);

    const updateTimer = () => {
      const now = Date.now();
      const diff = endTime - now;
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft({ d, h, m, s });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="countdown">
      <div className="countdown-block">
        <span className="countdown-value">{timeLeft.d}</span>
        <span className="countdown-label">Days</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-block">
        <span className="countdown-value">{timeLeft.h.toString().padStart(2, "0")}</span>
        <span className="countdown-label">Hours</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-block">
        <span className="countdown-value">{timeLeft.m.toString().padStart(2, "0")}</span>
        <span className="countdown-label">Mins</span>
      </div>
      <div className="countdown-separator">:</div>
      <div className="countdown-block">
        <span className="countdown-value">{timeLeft.s.toString().padStart(2, "0")}</span>
        <span className="countdown-label">Secs</span>
      </div>
    </div>
  );
}
