"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { login } from "@/app/auth/actions";
import {
  ShieldCheck,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Mail,
  Lock,
  Sparkles,
  MapPin,
  Calendar,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface SlideData {
  src: string;
  alt: string;
  tag: string;
  title: string;
  subtitle: string;
  location: string;
}

const SHOWCASE_SLIDES: SlideData[] = [
  {
    src: "/content1.jpeg",
    alt: "Grand Wedding Reception Celebration",
    tag: "GRAND RECEPTION",
    title: "Where Every Celebration Becomes Iconic.",
    subtitle:
      "Dari tata panggung megah, confetti shower, hingga lighting spektakuler—kami merangkai setiap detik menjadi momen tak terlupakan.",
    location: "Ballroom Grand Runway",
  },
  {
    src: "/content2.jpeg",
    alt: "Joyful Vintage Wedding Session",
    tag: "TIMELESS ROMANCE",
    title: "Candid Joy, Perfectly Captured.",
    subtitle:
      "Ekspresi tawa dan kebahagiaan sejati pengantin yang diabadikan dalam estetika vintage yang hangat dan berkelas.",
    location: "Vintage Kombi Editorial",
  },
  {
    src: "/content3.jpeg",
    alt: "Dramatic Night Portrait with Vintage Van",
    tag: "NIGHT CHOREOGRAPHY",
    title: "Dramatic Elegance Under the Spotlight.",
    subtitle:
      "Pencahayaan presisi dan atmosfer malam yang memukau menghadirkan visual sinematik eksklusif untuk acara Anda.",
    location: "Twilight Starlight Production",
  },
  {
    src: "/content4.jpeg",
    alt: "Heartfelt Laughter at Sunset",
    tag: "GENUINE EMOTIONS",
    title: "Radiant Smiles, Flawless Coordination.",
    subtitle:
      "Kenyamanan pasangan adalah prioritas utama kami. Seluruh rundown panggung dan operasional berjalan mulus tanpa celah.",
    location: "Golden Hour Tailgate",
  },
  {
    src: "/content5.jpeg",
    alt: "Romantic Journey Road in Pine Woods",
    tag: "JOURNEY TOGETHER",
    title: "Crafting Stories That Resonate Forever.",
    subtitle:
      "Perjalanan awal babak baru kehidupan Anda dimulai dengan harmoni sempurna dan eksekusi acara berstandar tertinggi.",
    location: "Scenic Pine Route",
  },
];

const SLIDE_DURATION = 5000; // 5 seconds per slide

export default function LoginPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Track progress (0 to 100) for the active slide's progress bar
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
    setProgress(0);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setProgress(0);
  };

  // Timer for smooth progress bar and auto-advance
  useEffect(() => {
    if (isPaused) return;

    const intervalStep = 50; // update progress every 50ms
    const stepIncrement = (intervalStep / SLIDE_DURATION) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalStep);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPaused, nextSlide]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const res = await login(formData);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan sistem saat login.");
      setLoading(false);
    }
  }

  const activeSlideData = SHOWCASE_SLIDES[currentSlide];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased selection:bg-[#007aff]/20 selection:text-[#007aff]">
      {/* =========================================================================
          LEFT / SHOWCASE PANEL (Desktop: 58% width, Mobile: Top Banner)
         ========================================================================= */}
      <section
        className="w-full lg:w-[58%] xl:w-[62%] relative flex flex-col justify-between overflow-hidden bg-neutral-950 text-white min-h-[460px] sm:min-h-[520px] lg:min-h-screen p-6 sm:p-10 lg:p-12"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-label="Xeno Showcase Carousel"
      >
        {/* Carousel Background Images with Ken Burns & Smooth Fade */}
        {SHOWCASE_SLIDES.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={idx === 0}
                sizes="(max-width: 1024px) 100vw, 62vw"
                className={`object-cover object-center transition-transform duration-[6000ms] ease-out will-change-transform ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              />
              {/* Dynamic Atmospheric Gradients for Uncompromising Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/70" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/40" />
            </div>
          );
        })}

        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#007aff]/25 rounded-full blur-3xl pointer-events-none z-10" />

        {/* --- TOP BAR: Brand Identity & Status --- */}
        <header className="relative z-20 flex items-center justify-between w-full">
          {/* Brand Pill */}
          <div className="flex items-center gap-3 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/20 py-1.5 px-3 rounded-2xl shadow-xl transition-all">
            <div className="bg-white px-2 py-1 rounded-xl shadow-xs flex items-center justify-center">
              <Image
                src="/logo-xeno.png"
                alt="XENO Entertainment"
                width={110}
                height={34}
                className="h-6 w-auto object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block border-l border-white/20 pl-2.5">
              <span className="text-xs font-bold tracking-tight text-white block leading-none">
                XENO
              </span>
              <span className="text-[9px] uppercase tracking-widest text-[#5ac8fa] font-extrabold block mt-0.5">
                OPERATIONS
              </span>
            </div>
          </div>

          {/* Status & Counter Badges */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-xs font-medium text-white/90 shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Production Suite</span>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-mono font-semibold text-white/90 tracking-wider">
              0{currentSlide + 1} / 0{SHOWCASE_SLIDES.length}
            </div>

            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* --- CENTER: Editorial Headline & Captions --- */}
        <div className="relative z-20 my-auto py-8 max-w-2xl">
          <div className="space-y-4">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-[11px] font-bold tracking-widest uppercase shadow-sm">
              <Sparkles className="w-3 h-3 text-[#5ac8fa]" />
              {activeSlideData.tag}
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.12] drop-shadow-md">
              {activeSlideData.title}
            </h1>

            {/* Subtitle Description */}
            <p className="text-white/85 text-sm sm:text-base font-normal max-w-xl leading-relaxed drop-shadow-xs">
              {activeSlideData.subtitle}
            </p>

            {/* Location Tag */}
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 pt-1">
              <MapPin className="w-3.5 h-3.5 text-[#5ac8fa]" />
              <span>{activeSlideData.location}</span>
              <span className="text-white/40">•</span>
              <span>Xeno Production Archive</span>
            </div>
          </div>
        </div>

        {/* --- BOTTOM CONTROLS: Segmented Progress Bars & Thumbnails --- */}
        <footer className="relative z-20 space-y-4 pt-4 border-t border-white/15">
          {/* Segmented Progress Bars (Instagram / Apple Stories Style) */}
          <div className="grid grid-cols-5 gap-2 w-full">
            {SHOWCASE_SLIDES.map((_, idx) => {
              const isPast = idx < currentSlide;
              const isCurrent = idx === currentSlide;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className="h-1.5 w-full bg-white/20 hover:bg-white/40 rounded-full overflow-hidden transition-colors cursor-pointer focus:outline-hidden"
                  aria-label={`Beralih ke slide ${idx + 1}`}
                >
                  <div
                    className="h-full bg-white rounded-full transition-all duration-75"
                    style={{
                      width: isPast ? "100%" : isCurrent ? `${progress}%` : "0%",
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Thumbnail Strip & Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            {/* Thumbnail previews */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {SHOWCASE_SLIDES.map((slide, idx) => {
                const isSelected = idx === currentSlide;
                return (
                  <button
                    key={slide.src}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    className={`relative w-12 h-9 sm:w-14 sm:h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "border-white ring-2 ring-[#007aff] scale-105 opacity-100 shadow-md"
                        : "border-white/30 opacity-60 hover:opacity-100 hover:border-white/60"
                    }`}
                    aria-label={`Pilih foto ${idx + 1}: ${slide.title}`}
                  >
                    <Image
                      src={slide.src}
                      alt={slide.alt}
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </button>
                );
              })}
            </div>

            {/* Arrows & Pause Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer"
                aria-label={isPaused ? "Lanjutkan perputaran" : "Jeda perputaran"}
                title={isPaused ? "Lanjutkan perputaran otomatis" : "Jeda perputaran otomatis"}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={prevSlide}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer"
                aria-label="Slide sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer"
                aria-label="Slide berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </footer>
      </section>

      {/* =========================================================================
          RIGHT / AUTHENTICATION PANEL (Apple Minimalist Light Mode)
         ========================================================================= */}
      <section className="w-full lg:w-[42%] xl:w-[38%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#fbfbfd] relative border-t lg:border-t-0 lg:border-l border-neutral-200/80">
        {/* Subtle background ambient lighting for Apple-like depth */}
        <div className="absolute top-12 right-12 w-80 h-80 bg-[#007aff]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between w-full relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#007aff]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-neutral-500">
              Internal Portal
            </span>
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>

        {/* Main Login Form Container */}
        <div className="my-auto py-8 w-full max-w-md mx-auto relative z-10">
          <div className="apple-card bg-white p-7 sm:p-9 border border-neutral-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] rounded-3xl space-y-7">
            {/* Title & Introduction */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#007aff]/10 text-[#007aff] text-xs font-bold mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Xeno Event Operations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
                Masuk Sistem
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                Gunakan kredensial resmi tim Xeno Entertainment untuk mengakses lembar kerja acara dan rundown kru.
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold text-neutral-700 tracking-wide"
                >
                  Email Internal
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="nama@xenoent.com"
                    className="apple-input w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50/80 hover:bg-neutral-50 focus:bg-white border-neutral-300 focus:border-[#007aff] rounded-xl transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-neutral-700 tracking-wide"
                  >
                    Kata Sandi
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="apple-input w-full pl-10 pr-11 py-2.5 text-sm bg-neutral-50/80 hover:bg-neutral-50 focus:bg-white border-neutral-300 focus:border-[#007aff] rounded-xl transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer rounded-lg hover:bg-neutral-100"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="apple-btn-primary w-full py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#007aff]/25 hover:shadow-[#007aff]/40 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed rounded-xl cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5] transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick System Badges */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-around text-[11px] text-neutral-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Rundown Realtime
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Live Sheets Sync
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Multi-Kru RBAC
              </span>
            </div>
          </div>
        </div>

        {/* Footer Security Assurance & Copyright */}
        <footer className="w-full max-w-md mx-auto pt-4 relative z-10 text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 bg-neutral-100/80 px-3 py-1.5 rounded-full border border-neutral-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Koneksi Aman Terenkripsi Khusus Staf Xeno</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-medium">
            © 2026 Xeno Entertainment. All rights reserved.
          </p>
        </footer>
      </section>
    </div>
  );
}
