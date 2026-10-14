"use client";

import { useState } from "react";
import { login } from "@/app/auth/actions";
import { Sparkles, Calendar, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const res = await login(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col md:flex-row font-sans transition-colors duration-150">
      {/* Brand Hero Panel */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-100 dark:from-[#121216] dark:via-black dark:to-[#09090b] p-8 md:p-14 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-200 dark:border-white/[0.08]">
        {/* Subtle ambient lighting effect */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#007aff]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-b from-[#007aff] to-[#0051d5] flex items-center justify-center shadow-lg shadow-[#007aff]/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground">XENO</span>
              <span className="text-[10px] uppercase tracking-widest text-[#007aff] dark:text-[#3894ff] block font-bold">
                OPERATIONS
              </span>
            </div>
          </div>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>

        <div className="my-12 space-y-5 max-w-md relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-white/[0.06] border border-border text-foreground text-xs font-semibold backdrop-blur-md shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#007aff]" /> Operations System
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.15]">
            Event Operations, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007aff] via-[#5e5ce6] to-[#af52de]">
              Elevated to Art.
            </span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed font-medium">
            Platform komprehensif internal Xeno Entertainment: timeline rundown panggung, vendor audio-lighting, dan koordinasi kru live.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground relative z-10">
          <ShieldCheck className="w-4 h-4 text-[#30d158]" />
          <span>Akses Terenkripsi Khusus Staf Xeno</span>
        </div>
      </div>

      {/* Login Card Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-14 bg-background relative">
        <div className="hidden md:block absolute top-8 right-8 z-20">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md apple-card p-8 space-y-6 border border-border shadow-xl">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Masuk Sistem
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Gunakan kredensial internal Xeno Anda.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Email Internal</label>
              <input
                name="email"
                type="email"
                required
                placeholder="staf@xenoent.com"
                className="apple-input w-full px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Kata Sandi</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="apple-input w-full pl-3.5 pr-10 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="apple-btn-primary w-full py-2.5 px-4 text-sm font-semibold gap-2 shadow-md shadow-[#007aff]/30 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Masuk Sistem</span>
              )}
              {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
