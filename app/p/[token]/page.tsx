import { Metadata } from "next";
import { getPublicFormDataByToken } from "@/app/(dashboard)/events/public-form-actions";
import { PublicFamilyForm } from "@/components/public-form/public-family-form";
import { Clock, AlertTriangle, MessageCircle, Calendar, MapPin, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await getPublicFormDataByToken(token);

  if (!result || !result.form) {
    return {
      title: "Tautan Tidak Ditemukan | Xeno Entertainment",
      description: "Formulir pendataan keluarga Xeno Entertainment",
    };
  }

  return {
    title: `Form Data Keluarga - ${result.event?.title || "Xeno Entertainment"}`,
    description: `Formulir pendataan anggota keluarga & sesi foto untuk ${result.event?.title || "acara"}.`,
  };
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicFormDataByToken(token);

  // 1. If form not found or invalid token
  if (!result || !result.form) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-lg p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Tautan Tidak Ditemukan</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tautan yang Anda tuju tidak valid atau telah dihapus dari sistem. Mohon periksa kembali link yang Anda terima dari tim Xeno Entertainment.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="https://wa.me/?text=Halo%20Tim%20Xeno,%20tautan%20form%20keluarga%20saya%20tidak%20dapat%20diakses."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi Tim Xeno</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. If token expired (new Date() > expires_at)
  if (result.isExpired) {
    const expiredAtFormatted = new Date(result.form.expires_at).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#000000] text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-xl p-8 text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Link Expired • Tautan Kadaluarsa
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Masa Berlaku Tautan Telah Berakhir
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tautan formulir pendataan keluarga untuk <strong>{result.event.title}</strong> telah melewati batas waktu (kadaluarsa pada <strong>{expiredAtFormatted}</strong>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-left space-y-2 text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#007aff]" />
              <span>Ingin memperbarui atau mengisi data?</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Silakan hubungi Wedding Organizer / PIC Acara Anda untuk memperpanjang batas waktu atau menerbitkan tautan baru.
            </p>
          </div>

          <div className="pt-2">
            <a
              href={`https://wa.me/?text=Halo%20Tim%20Xeno,%20tautan%20form%20keluarga%20untuk%20${encodeURIComponent(
                result.event.title
              )}%20sudah%20kadaluarsa.%20Boleh%20minta%20diperpanjang?`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#007aff] hover:bg-[#0066d6] text-white transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Minta Perpanjangan Tautan via WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active valid form
  return (
    <PublicFamilyForm
      form={result.form}
      token={token}
      event={result.event}
    />
  );
}
