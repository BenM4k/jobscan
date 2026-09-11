import React from "react";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

export default function ProfileLoading() {
  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8 z-10">
      <ProfileSkeleton />
    </main>
  );
}
