"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (variant === "mobile") {
    return (
      <button
        onClick={logout}
        disabled={busy}
        className="w-full text-left py-2 text-[13px] text-rose-700 disabled:opacity-50"
      >
        Sign out
      </button>
    );
  }
  return (
    <button
      onClick={logout}
      disabled={busy}
      className="text-navy-light hover:text-white text-[13px]"
    >
      Sign out
    </button>
  );
}
