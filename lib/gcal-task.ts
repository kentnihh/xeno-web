import { SignJWT, importPKCS8 } from "jose";

const TZ = "Asia/Jakarta";

async function getAccessToken(): Promise<{ accessToken: string; calendarId: string }> {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!email || !rawKey || !calendarId) {
        throw new Error("Konfigurasi Google Calendar belum lengkap di environment variables.");
    }

    let keyStr = rawKey;
    if (
        (keyStr.startsWith('"') && keyStr.endsWith('"')) ||
        (keyStr.startsWith("'") && keyStr.endsWith("'"))
    ) {
        keyStr = keyStr.slice(1, -1);
    }
    keyStr = keyStr.replace(/\\n/g, "\n");

    const privateKey = await importPKCS8(keyStr, "RS256");
    const jwt = await new SignJWT({
        iss: email,
        scope: "https://www.googleapis.com/auth/calendar.events",
        aud: "https://oauth2.googleapis.com/token",
    })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });
    if (!res.ok) {
        throw new Error(`Gagal autentikasi Google (${res.status}).`);
    }
    const { access_token } = await res.json();
    if (!access_token) throw new Error("Akses token Google tidak ditemukan.");
    return { accessToken: access_token, calendarId };
}

export interface TaskCalendarInput {
    title: string;
    description?: string | null;
    assigneeName?: string | null;
    priority?: string | null;
    eventTitle?: string | null;
    start: Date;
    end: Date;
    existingId?: string | null;
}

export type TaskCalendarResult = { ok: true; id: string } | { ok: false; error: string };

export async function upsertTaskCalendarEvent(input: TaskCalendarInput): Promise<TaskCalendarResult> {
    try {
        const { accessToken, calendarId } = await getAccessToken();
        const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

        const payload = {
            summary: `[Tugas] ${input.title}${input.eventTitle ? ` — ${input.eventTitle}` : ""}`,
            description: [
                input.eventTitle ? `Acara: ${input.eventTitle}` : null,
                input.assigneeName ? `Ditugaskan ke: ${input.assigneeName}` : null,
                input.priority ? `Prioritas: ${input.priority}` : null,
                input.description ? `Instruksi: ${input.description}` : null,
                "",
                "Disinkronkan dari Xeno Entertainment Operations System",
            ]
                .filter((l) => l !== null)
                .join("\n"),
            start: { dateTime: input.start.toISOString(), timeZone: TZ },
            end: { dateTime: input.end.toISOString(), timeZone: TZ },
        };

        const headers = {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        };

        if (input.existingId) {
            const put = await fetch(`${base}/${encodeURIComponent(input.existingId)}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload),
            });
            if (put.ok) {
                const data = await put.json();
                return { ok: true, id: data.id };
            }
            // 404/410: event sudah dihapus di Google, lanjut buat baru
            if (put.status !== 404 && put.status !== 410) {
                return { ok: false, error: `Google Calendar menolak pembaruan (${put.status}).` };
            }
        }

        const post = await fetch(base, { method: "POST", headers, body: JSON.stringify(payload) });
        if (!post.ok) {
            const hint = post.status === 403 ? " Pastikan kalender dibagikan ke service account dengan izin edit." : "";
            return { ok: false, error: `Google Calendar menolak (${post.status}).${hint}` };
        }
        const data = await post.json();
        return { ok: true, id: data.id };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Gagal terhubung ke Google Calendar." };
    }
}

/** Best effort: kegagalan hanya dicatat, tidak melempar error. */
export async function deleteTaskCalendarEvent(gcalEventId: string): Promise<void> {
    try {
        const { accessToken, calendarId } = await getAccessToken();
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(gcalEventId)}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok && res.status !== 404 && res.status !== 410) {
            console.warn(`[gcal-task] DELETE gagal (${res.status})`);
        }
    } catch (err) {
        console.warn("[gcal-task] DELETE error:", err);
    }
}