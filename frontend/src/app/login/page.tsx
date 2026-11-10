"use client";

import { ArrowRight, Boxes, ChartColumnBig, ReceiptText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  { icon: ReceiptText, title: "Bill in seconds", text: "Search by part, SKU or vehicle. GST worked out for you." },
  { icon: Boxes, title: "Stock you can trust", text: "Every unit in and out is recorded, with who did it." },
  { icon: ChartColumnBig, title: "Know your profit", text: "Sales, margins and GST for any day or month." },
];

// The brand panel stays dark in both themes — it's artwork, not chrome
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[#0c0b16] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* soft brand glow + fading grid */}
      <div className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-[#5a4ff3] opacity-40 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 -bottom-48 size-[480px] rounded-full bg-[#8b5cf6] opacity-25 blur-[120px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 30% 30%, black 20%, transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-2.5">
        <LogoMark />
        <span className="text-[15px] font-semibold tracking-tight">Auto Parts</span>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-[34px] leading-[1.15] font-semibold tracking-tight">
          Run the counter,
          <br />
          <span className="bg-[linear-gradient(90deg,#b4aeff,#d6c3ff)] bg-clip-text text-transparent">
            not the paperwork.
          </span>
        </h2>
        <ul className="mt-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] ring-1 ring-white/10">
                <Icon className="size-4 text-[#b4aeff]" />
              </span>
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-[13px] text-white/55">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* a glimpse of a finished bill */}
      <div className="relative w-72 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="font-mono">INV-00042</span>
          <span className="flex items-center gap-1.5 rounded-md bg-emerald-400/15 px-1.5 py-0.5 font-medium text-emerald-300">
            <span className="size-1.5 rounded-full bg-current" /> Paid
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-sm text-white/70">Front Brake Pad Set × 2</span>
          <span className="text-lg font-semibold">₹2,300</span>
        </div>
        <div className="mt-1 text-xs text-white/40">Maruti Swift · DL 3C AB 1234 · GST incl.</div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login, status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = params.get("next") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />

      <div className="relative flex items-center justify-center px-5 py-12">
        <ThemeToggleButton className="absolute top-4 right-4" tooltipSide="bottom" />

        <div className="stagger w-full max-w-[360px]">
          <div className="mb-8">
            <LogoMark className="mb-6 size-10 rounded-xl lg:hidden" />
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-fg-3">Sign in to manage your shop.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shop.com"
                className="h-10"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
              />
            </Field>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} className="h-10 w-full">
              Sign in {!busy && <ArrowRight />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-fg-3">Accounts are created by the shop admin.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
