/**
 * Server-side PostHog reads for the admin user-detail page.
 *
 * Requires (set in Vercel, mark the key Sensitive):
 *   POSTHOG_PERSONAL_API_KEY   personal API key (phx_...) — NOT the app's phc_ key
 *   POSTHOG_PROJECT_ID         numeric project id
 *   POSTHOG_HOST               api host, defaults to https://us.posthog.com (use https://eu.posthog.com for EU)
 *
 * People are identified in the app by their Supabase user id, so we query by
 * distinct_id = profile.id.
 */

export interface PostHogEvent {
  event: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export interface PostHogResult {
  configured: boolean;
  error?: string;
  personProperties?: Record<string, unknown> | null;
  events?: PostHogEvent[];
  personUrl?: string | null;
}

function cfg() {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = (process.env.POSTHOG_HOST ?? "https://us.posthog.com").replace(/\/$/, "");
  return { key, projectId, host };
}

/** Fetch a person's properties + recent events by Supabase user id. */
export async function getUserPostHog(distinctId: string): Promise<PostHogResult> {
  const { key, projectId, host } = cfg();
  if (!key || !projectId) return { configured: false };

  const headers = { Authorization: `Bearer ${key}` };
  const base = `${host}/api/projects/${projectId}`;

  try {
    const [personsRes, eventsRes] = await Promise.all([
      fetch(`${base}/persons/?distinct_id=${encodeURIComponent(distinctId)}`, { headers, cache: "no-store" }),
      fetch(`${base}/events/?distinct_id=${encodeURIComponent(distinctId)}&limit=30`, { headers, cache: "no-store" }),
    ]);

    if (!personsRes.ok && !eventsRes.ok) {
      return { configured: true, error: `PostHog API error (${personsRes.status}). Check the key, project id, and host.` };
    }

    let personProperties: Record<string, unknown> | null = null;
    let personUrl: string | null = null;
    if (personsRes.ok) {
      const pj = await personsRes.json();
      const person = pj?.results?.[0];
      personProperties = person?.properties ?? null;
      if (person?.id) personUrl = `${host}/project/${projectId}/person/${encodeURIComponent(distinctId)}`;
    }

    let events: PostHogEvent[] = [];
    if (eventsRes.ok) {
      const ej = await eventsRes.json();
      events = (ej?.results ?? []).map((e: any) => ({
        event: e.event,
        timestamp: e.timestamp,
        properties: e.properties,
      }));
    }

    return { configured: true, personProperties, events, personUrl };
  } catch (e: unknown) {
    return { configured: true, error: e instanceof Error ? e.message : "Failed to reach PostHog." };
  }
}
