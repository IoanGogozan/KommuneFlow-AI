"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

export function EnterPortfolioDemoButton({
  tenantSlug,
}: {
  tenantSlug?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function enterDemo() {
    setStatus("loading");

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/demo-session`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tenantSlug ? { tenantSlug } : {}),
      });

      if (!response.ok) {
        throw new Error("Demo session unavailable.");
      }

      router.push("/internal");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button type="button" disabled={status === "loading"} onClick={enterDemo}>
        {status === "loading"
          ? "Entering demo…"
          : status === "error"
            ? "Try again"
            : "Explore employee demo"}
      </button>
      {status === "error" ? (
        <p role="alert">Demo temporarily unavailable</p>
      ) : null}
    </div>
  );
}
