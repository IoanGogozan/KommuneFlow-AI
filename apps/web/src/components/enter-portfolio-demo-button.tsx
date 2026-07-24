"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

export function EnterPortfolioDemoButton({
  className,
  idleLabel = "Explore employee demo",
  loadingLabel = "Entering demo…",
  redirectTo = "/internal",
  retryLabel = "Try again",
  tenantSlug,
}: {
  className?: string;
  idleLabel?: string;
  loadingLabel?: string;
  redirectTo?: string;
  retryLabel?: string;
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

      router.push(redirectTo);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={status === "loading"}
        onClick={enterDemo}
      >
        {status === "loading"
          ? loadingLabel
          : status === "error"
            ? retryLabel
            : idleLabel}
      </button>
      {status === "error" ? (
        <p role="alert">Demo temporarily unavailable</p>
      ) : null}
    </div>
  );
}
