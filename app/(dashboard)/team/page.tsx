import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { updateMemberRoleAction, deleteMemberAction } from "./actions";
import { Mail, Trash2, ShieldCheck, Shield } from "lucide-react";
import type { UserRole } from "@/types/database";

const FALLBACK_TEAM = [
  { id: "1", full_name: "Jonathan Admin", role: "admin" as UserRole, email: "admin@xenoent.com" },
  { id: "2", full_name: "Rian Kru Operasional", role: "staff" as UserRole, email: "staf@xenoent.com" },
];

export default async function TeamPage() {
  const isUserAdmin = await isAdmin();
  const supabase = await createClient();
  const { data: rawProfiles } = await supabase.from("profiles").select("*").order("full_name");

  const team = (rawProfiles && rawProfiles.length > 0) ? rawProfiles : FALLBACK_TEAM;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Kru & Tim Internal</h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium">Daftar staf operasional Xeno Entertainment & manajemen hak akses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {team.map((member) => (
          <div key={member.id} className="apple-card-interactive p-5 space-y-3.5 rounded-2xl border border-border shadow-xs hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007aff] to-[#0051d5] flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-[#007aff]/30">
                  {member.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{member.full_name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {member.role === "admin" ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#ff9f0a]" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-muted-foreground/70" />
                    )}
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      member.role === "admin"
                        ? "bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30"
                        : "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30"
                    }`}>
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>

              {isUserAdmin && (
                <div className="flex items-center gap-2">
                  <form action={async (formData: FormData) => {
                    "use server";
                    const newRole = formData.get("role") as UserRole;
                    await updateMemberRoleAction(member.id, newRole);
                  }}>
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="apple-input text-[11px] uppercase font-bold px-2.5 py-1 bg-muted text-foreground border-border cursor-pointer"
                    >
                      <option value="staff" className="bg-card text-foreground">Staff</option>
                      <option value="admin" className="bg-card text-foreground">Admin</option>
                    </select>
                  </form>

                  <form action={async () => {
                    "use server";
                    await deleteMemberAction(member.id);
                  }}>
                    <button
                      type="submit"
                      className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Hapus Akun Staf"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-border text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span className="truncate">{member.email}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
