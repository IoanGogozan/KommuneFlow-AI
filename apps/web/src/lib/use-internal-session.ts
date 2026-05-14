"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clearSession } from "./auth";
import {
  getCurrentInternalUser,
  type InternalCurrentUser,
  type InternalPermission,
} from "./internal-user";

export type InternalSessionState = {
  currentUser: InternalCurrentUser | null;
  loading: boolean;
  error: Error | null;
  hasPermission: (permission: InternalPermission) => boolean;
};

export function useInternalSession(): InternalSessionState {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<InternalCurrentUser | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      setLoading(true);
      setError(null);

      try {
        const user = await getCurrentInternalUser();

        if (!isActive) {
          return;
        }

        if (!user) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        setCurrentUser(user);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError
            : new Error("Failed to load internal session."),
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      isActive = false;
    };
  }, [router]);

  const permissionSet = useMemo(() => {
    return new Set(currentUser?.permissions ?? []);
  }, [currentUser]);

  const hasPermission = useCallback(
    (permission: InternalPermission) => permissionSet.has(permission),
    [permissionSet],
  );

  return {
    currentUser,
    loading,
    error,
    hasPermission,
  };
}
