"use server";

import { SignJWT, importPKCS8 } from "jose";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/auth";
import { parseWIBDate } from "@/lib/utils";

export interface SyncGCalResponse {
  success: boolean;
  message: string;
  error?: string;
  eventId?: string;
  gcalEventId?: string;
  htmlLink?: string;
}

/**
 * Creates a Supabase client with admin/service role access when available,
 * ensuring database state (such as gcal_event_id updates) is never blocked by RLS policies.
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key);
}

/**
 * Safely parses and validates event start and end dates using WIB/Jakarta timezone integrity.
 * If end_date is null, missing, or <= start_date, dynamically calculates a fallback end time (+2 hours).
 */
function resolveEventDates(
  rawStartDate?: string | null,
  rawEndDate?: string | null
): {
  safeStartDate: Date;
  safeEndDate: Date;
} {
  let safeStartDate = parseWIBDate(rawStartDate);
  if (isNaN(safeStartDate.getTime())) {
    safeStartDate = new Date();
  }

  let safeEndDate = rawEndDate ? parseWIBDate(rawEndDate) : null;
  if (!safeEndDate || isNaN(safeEndDate.getTime()) || safeEndDate.getTime() <= safeStartDate.getTime()) {
    // Dynamic fallback: add 2 hours to safeStartDate to guarantee a valid positive duration
    safeEndDate = new Date(safeStartDate.getTime() + 2 * 60 * 60 * 1000);
  }

  return { safeStartDate, safeEndDate };
}

/**
 * Validates Google Calendar credentials and exchanges a signed JWT for an OAuth2 access token.
 * 100% Edge-compatible using standard fetch and the zero-dependency 'jose' library.
 */
async function getGoogleCalendarAccessToken(): Promise<{
  accessToken: string;
  calendarId: string;
}> {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceAccountEmail || !rawPrivateKey || !calendarId) {
    const missing: string[] = [];
    if (!serviceAccountEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    if (!rawPrivateKey) missing.push("GOOGLE_PRIVATE_KEY");
    if (!calendarId) missing.push("GOOGLE_CALENDAR_ID");
    throw new Error(
      `Konfigurasi Google Calendar belum lengkap: [${missing.join(", ")}] wajib disetel di environment variables.`
    );
  }

  // Parse private key correctly and handle escaped newlines
  let privateKeyStr = rawPrivateKey;
  if (
    (privateKeyStr.startsWith('"') && privateKeyStr.endsWith('"')) ||
    (privateKeyStr.startsWith("'") && privateKeyStr.endsWith("'"))
  ) {
    privateKeyStr = privateKeyStr.slice(1, -1);
  }
  privateKeyStr = privateKeyStr.replace(/\\n/g, "\n");

  const privateKey = await importPKCS8(privateKeyStr, "RS256");

  const jwt = await new SignJWT({
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Gagal autentikasi Google OAuth2 (${tokenRes.status}): ${errBody}`);
  }

  const tokenData = await tokenRes.json();
  const { access_token } = tokenData;

  if (!access_token) {
    throw new Error("Akses token Google Calendar tidak ditemukan dalam respon OAuth2.");
  }

  return { accessToken: access_token, calendarId };
}

/**
 * Server Action: Syncs a single event to Google Calendar via REST API.
 * Idempotent: checks for event.gcal_event_id and issues PUT (update) or POST (create & save ID).
 * Gracefully catches all errors (including 403 Forbidden & 404 Not Found) without crashing client boundary.
 */
export async function syncEventToGoogleCalendar(eventId: string): Promise<SyncGCalResponse> {
  try {
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_CALENDAR_ID
    ) {
      const missing: string[] = [];
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
      if (!process.env.GOOGLE_PRIVATE_KEY) missing.push("GOOGLE_PRIVATE_KEY");
      if (!process.env.GOOGLE_CALENDAR_ID) missing.push("GOOGLE_CALENDAR_ID");
      const msg = `Konfigurasi Google Calendar belum lengkap: [${missing.join(", ")}] wajib disetel di environment variables.`;
      return {
        success: false,
        message: msg,
        error: msg,
      };
    }

    if (!eventId) {
      const msg = "Event ID wajib disertakan untuk sinkronisasi.";
      return {
        success: false,
        message: msg,
        error: msg,
      };
    }

    // RBAC: Verify authenticated session and admin/manager role
    let hasWebContext = false;
    try {
      const serverClient = await createServerClient();
      hasWebContext = true;
      const {
        data: { user },
      } = await serverClient.auth.getUser();

      if (!user) {
        const authMsg = "Autentikasi diperlukan. Silakan login terlebih dahulu.";
        return {
          success: false,
          message: authMsg,
          error: authMsg,
        };
      }

      const roles = await getUserRoles(user.id);
      const isAuthorized = roles.includes("admin") || roles.includes("manager");
      if (!isAuthorized) {
        const authMsg = "Akses ditolak: Hanya Administrator dan Manajer yang berwenang menyinkronkan Google Calendar.";
        return {
          success: false,
          message: authMsg,
          error: authMsg,
        };
      }
    } catch {
      if (hasWebContext) {
        return {
          success: false,
          message: "Autentikasi diperlukan. Silakan login terlebih dahulu.",
          error: "Autentikasi diperlukan. Silakan login terlebih dahulu.",
        };
      }
    }

    const { accessToken, calendarId } = await getGoogleCalendarAccessToken();
    const supabase = getSupabaseClient();

    // Fetch event details from database
    const { data: rawEvent } = await supabase
      .from("events")
      .select("*, client:clients(*)")
      .eq("id", eventId)
      .single();

    if (!rawEvent) {
      return {
        success: false,
        message: "Acara tidak ditemukan di database.",
        error: "Acara tidak ditemukan di database.",
      };
    }

    const event = rawEvent;

    const summary = event.title || "Acara Xeno Entertainment";
    const location = event.venue || "";
    const description = [
      `Nama Acara: ${event.title}`,
      event.venue ? `Venue / Lokasi: ${event.venue}` : null,
      event.pic ? `PIC (Person in Charge): ${event.pic}` : null,
      event.client?.name
        ? `Klien: ${event.client.name}${event.client.company ? ` (${event.client.company})` : ""}`
        : null,
      event.description ? `Catatan: ${event.description}` : null,
      "",
      "Disinkronkan otomatis dari Xeno Entertainment Operations System",
    ]
      .filter(Boolean)
      .join("\n");

    const { safeStartDate, safeEndDate } = resolveEventDates(event.start_date, event.end_date);

    const eventPayload = {
      summary,
      description,
      location,
      start: {
        dateTime: safeStartDate.toISOString(),
      },
      end: {
        dateTime: safeEndDate.toISOString(),
      },
    };

    const baseCalendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gcalEventData: any = null;

    // Step 2 & 3: Check if event.gcal_event_id EXISTS
    if (event.gcal_event_id) {
      try {
        const updateRes = await fetch(
          `${baseCalendarUrl}/${encodeURIComponent(event.gcal_event_id)}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventPayload),
          }
        );

        if (updateRes.ok) {
          gcalEventData = await updateRes.json();
        } else if (updateRes.status === 404) {
          // Event was deleted on Google Calendar (404). Clear ID and fall back to POST
          console.warn(
            `[GCal Sync] Event ${event.gcal_event_id} was deleted on Google Calendar (404). Clearing ID and recreating...`
          );
          if (rawEvent?.id) {
            await supabase
              .from("events")
              .update({ gcal_event_id: null })
              .eq("id", rawEvent.id);
          }
        } else if (updateRes.status === 403) {
          const errText = await updateRes.text();
          console.warn(`[GCal Sync] PUT 403 Forbidden:`, errText);
          return {
            success: false,
            message: `Akses ditolak (403 Forbidden). Pastikan kalender Google (${calendarId}) telah dibagikan dengan izin 'Make changes to events' ke service account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`,
            error: errText,
          };
        } else {
          const errText = await updateRes.text();
          console.warn(`[GCal Sync] Google Calendar PUT failed (${updateRes.status}): ${errText}`);
          // Fall back to POST creation if update fails
        }
      } catch (putErr) {
        console.warn("[GCal Sync] Exception during PUT update, falling back to POST:", putErr);
      }
    }

    // If it DOES NOT EXIST (or was reset due to 404 on Google Calendar)
    if (!gcalEventData) {
      const insertRes = await fetch(baseCalendarUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        console.warn(`[GCal Sync] POST failed (${insertRes.status}): ${errText}`);

        let userMsg = `Gagal menyinkronkan ke Google Calendar (${insertRes.status}).`;
        if (insertRes.status === 403) {
          userMsg = `Akses ditolak (403 Forbidden). Pastikan kalender Google (${calendarId}) telah dibagikan dengan akses edit ke email service account: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`;
        } else if (insertRes.status === 404) {
          userMsg = `Kalender Google (${calendarId}) tidak ditemukan (404 Not Found). Periksa kembali GOOGLE_CALENDAR_ID di konfigurasi.`;
        }

        return {
          success: false,
          message: userMsg,
          error: errText,
        };
      }

      gcalEventData = await insertRes.json();

      // Extract the id from Google API response and immediately save to Supabase
      if (gcalEventData?.id && rawEvent?.id) {
        const { error: dbUpdateError } = await supabase
          .from("events")
          .update({ gcal_event_id: gcalEventData.id })
          .eq("id", rawEvent.id);

        if (dbUpdateError) {
          console.error(
            `[GCal Sync] Failed to save gcal_event_id to Supabase for event ${rawEvent.id}:`,
            dbUpdateError
          );
        }
      }
    }

    return {
      success: true,
      message: `Acara "${event.title}" berhasil disinkronkan ke Google Calendar!`,
      eventId,
      gcalEventId: gcalEventData?.id,
      htmlLink: gcalEventData?.htmlLink,
    };
  } catch (err: unknown) {
    console.error("[syncEventToGoogleCalendar] Unexpected error caught gracefully:", err);
    const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat menyinkronkan ke Google Calendar.";
    return {
      success: false,
      message: errMsg,
      error: errMsg,
    };
  }
}

/**
 * Server Action: Syncs all active & upcoming events to Google Calendar.
 * Edge-compatible (fetch + jose).
 * Gracefully catches errors without throwing unhandled exceptions.
 */
export async function syncAllEventsToGoogleCalendar(): Promise<SyncGCalResponse> {
  try {
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_CALENDAR_ID
    ) {
      const missing: string[] = [];
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
      if (!process.env.GOOGLE_PRIVATE_KEY) missing.push("GOOGLE_PRIVATE_KEY");
      if (!process.env.GOOGLE_CALENDAR_ID) missing.push("GOOGLE_CALENDAR_ID");
      const msg = `Konfigurasi Google Calendar belum lengkap: [${missing.join(", ")}] wajib disetel di environment variables.`;
      return {
        success: false,
        message: msg,
        error: msg,
      };
    }

    // RBAC: Verify authenticated session and admin/manager role
    let hasWebContext = false;
    try {
      const serverClient = await createServerClient();
      hasWebContext = true;
      const {
        data: { user },
      } = await serverClient.auth.getUser();

      if (!user) {
        const authMsg = "Autentikasi diperlukan. Silakan login terlebih dahulu.";
        return {
          success: false,
          message: authMsg,
          error: authMsg,
        };
      }

      const roles = await getUserRoles(user.id);
      const isAuthorized = roles.includes("admin") || roles.includes("manager");
      if (!isAuthorized) {
        const authMsg = "Akses ditolak: Hanya Administrator dan Manajer yang berwenang menyinkronkan Google Calendar.";
        return {
          success: false,
          message: authMsg,
          error: authMsg,
        };
      }
    } catch {
      if (hasWebContext) {
        return {
          success: false,
          message: "Autentikasi diperlukan. Silakan login terlebih dahulu.",
          error: "Autentikasi diperlukan. Silakan login terlebih dahulu.",
        };
      }
    }

    const supabase = getSupabaseClient();

    const now = new Date();
    const localTodayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const jakartaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const jakartaTodayStart = new Date(`${jakartaDate}T00:00:00+07:00`);
    const todayStart = localTodayStart < jakartaTodayStart ? localTodayStart : jakartaTodayStart;

    const { data: rawEvents } = await supabase
      .from("events")
      .select("*, client:clients(*)")
      .gte("start_date", todayStart.toISOString())
      .order("start_date", { ascending: true });

    const eventsToSync = rawEvents || [];

    if (eventsToSync.length === 0) {
      return {
        success: true,
        message: "Tidak ada jadwal acara aktif yang perlu disinkronkan.",
      };
    }

    let count = 0;
    let failedCount = 0;
    let lastError: string | undefined;

    for (const ev of eventsToSync) {
      const res = await syncEventToGoogleCalendar(ev.id);
      if (res.success) {
        count++;
      } else {
        failedCount++;
        lastError = res.error || res.message;
      }
    }

    if (failedCount > 0 && count === 0) {
      return {
        success: false,
        message: lastError || `Gagal menyinkronkan ${failedCount} acara ke Google Calendar.`,
        error: lastError,
      };
    }

    return {
      success: true,
      message:
        failedCount > 0
          ? `${count} acara berhasil disinkronkan, ${failedCount} acara gagal disinkronkan.`
          : `${count} acara aktif berhasil disinkronkan ke Google Calendar!`,
    };
  } catch (err: unknown) {
    console.error("[syncAllEventsToGoogleCalendar] Unexpected error caught gracefully:", err);
    const errMsg = err instanceof Error ? err.message : "Gagal menyinkronkan seluruh acara ke Google Calendar.";
    return {
      success: false,
      message: errMsg,
      error: errMsg,
    };
  }
}

/**
 * Server Action alias: Syncs either a specific event (if eventId provided) or all upcoming events.
 * Returns clean object response on error without throwing unhandled exceptions.
 */
export async function syncUpcomingEventsToCalendar(eventId?: string): Promise<SyncGCalResponse> {
  try {
    if (eventId) {
      return await syncEventToGoogleCalendar(eventId);
    }
    return await syncAllEventsToGoogleCalendar();
  } catch (err: unknown) {
    console.error("[syncUpcomingEventsToCalendar] Unexpected error caught gracefully:", err);
    const errMsg = err instanceof Error ? err.message : "Gagal menyinkronkan ke Google Calendar.";
    return {
      success: false,
      message: errMsg,
      error: errMsg,
    };
  }
}

/**
 * Deletes an event from Google Calendar by its gcal_event_id.
 * Gracefully handles 404/410 (already deleted) and logs warnings on failure.
 */
export async function deleteEventFromGoogleCalendar(gcalEventId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { accessToken, calendarId } = await getGoogleCalendarAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(gcalEventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.warn(`[GCal Delete] DELETE failed (${res.status}) for ${gcalEventId}`);
      return { success: false, error: `Google Calendar DELETE failed (${res.status})` };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error deleting Google Calendar event";
    console.warn(`[GCal Delete] Warning for ${gcalEventId}:`, msg);
    return { success: false, error: msg };
  }
}
