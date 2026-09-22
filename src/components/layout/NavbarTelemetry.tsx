"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";

interface NavbarTelemetryProps {
  userId?: string;
  userEmail?: string | null;
  userName?: string | null;
}

export function NavbarTelemetry({
  userId,
  userEmail,
  userName,
}: NavbarTelemetryProps) {
  const identifiedUserId = useRef<string | null>(null);
  const identifiedProps = useRef<{
    email?: string | null;
    name?: string | null;
  }>({});

  useEffect(() => {
    if (!userId) {
      if (identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
        identifiedProps.current = {};
      }
      return;
    }

    const propsChanged =
      identifiedProps.current.email !== userEmail ||
      identifiedProps.current.name !== userName;

    if (identifiedUserId.current === userId && !propsChanged) {
      return;
    }

    if (identifiedUserId.current && identifiedUserId.current !== userId) {
      posthog.reset();
    }

    posthog.identify(userId, {
      email: userEmail ?? undefined,
      name: userName ?? undefined,
    });
    identifiedUserId.current = userId;
    identifiedProps.current = { email: userEmail, name: userName };
  }, [userId, userEmail, userName]);

  return null;
}
