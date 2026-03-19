import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CERT_FR_URL = Deno.env.get("CERT_FR_URL") ?? "https://www.cert.ssi.gouv.fr";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href: string) {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return new URL(href, CERT_FR_URL).toString();
}

function inferSeverity(text: string): "informational" | "low" | "medium" | "high" | "critical" {
  const value = text.toLowerCase();
  if (/(critique|critical|urgence|exploitation active|rce)/.test(value)) return "critical";
  if (/(eleve|high|important|compromission)/.test(value)) return "high";
  if (/(moyen|medium|moderate)/.test(value)) return "medium";
  if (/(faible|low)/.test(value)) return "low";
  return "informational";
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CERT-RDC-Ingest/1.0",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) throw new Error(`CERT-FR fetch failed for ${url}: ${response.status}`);
  return await response.text();
}

function extractArticleLinks(html: string) {
  return [...html.matchAll(/href=["']([^"']*(?:\/actualite\/|\/alerte\/|\/avis\/)[^"']+)["']/gi)]
    .map((match) => absoluteUrl(match[1]))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 20);
}

function extractMetaContent(html: string, property: string) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  return html.match(pattern)?.[1]?.trim() ?? null;
}

function extractTitle(html: string) {
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle) return stripHtml(ogTitle);
  const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  return stripHtml(titleTag ?? "Publication CERT-FR");
}

function extractSummary(html: string) {
  const description = extractMetaContent(html, "description") ?? extractMetaContent(html, "og:description");
  if (description) return stripHtml(description);

  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);

  return paragraphs.find((paragraph) => paragraph.length > 80) ?? paragraphs[0] ?? "Publication importee depuis le CERT-FR.";
}

function extractReference(url: string, title: string) {
  const combined = `${url} ${title}`;
  const match = combined.match(/CERTFR-[0-9]{4}-[A-Z]+-[0-9]{3}/i);
  return match?.[0]?.toUpperCase() ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const homepageHtml = await fetchHtml(CERT_FR_URL);
    const articleLinks = extractArticleLinks(homepageHtml);
    const ingested: string[] = [];

    for (const articleUrl of articleLinks) {
      const articleHtml = await fetchHtml(articleUrl);
      const title = extractTitle(articleHtml);
      const summary = extractSummary(articleHtml);
      const advisoryId = extractReference(articleUrl, title);
      const severity = inferSeverity(`${title} ${summary}`);

      const query = supabase.from("vulnerability_advisories").select("id").eq("source_name", "CERT-FR");
      const { data: existing } = advisoryId
        ? await query.eq("advisory_id", advisoryId).maybeSingle()
        : await query.eq("source_url", articleUrl).maybeSingle();

      if (existing?.id) continue;

      const { error } = await supabase.from("vulnerability_advisories").insert({
        advisory_id: advisoryId,
        source_name: "CERT-FR",
        source_url: articleUrl,
        title,
        summary,
        severity,
        advisory_status: "tracking",
        affected_products: "A confirmer a partir de la publication source et des actifs nationaux exposes.",
        remediation: "Analyser l'avis, evaluer l'exposition locale, appliquer les correctifs editeur, consigner la mitigation et verifier la resolution.",
        country_context: "RDC - Kinshasa",
        standards_notes: "Traiter selon ISO 27001/27002, gestion des incidents, journalisation, audit et defense en profondeur.",
        tags: ["cert-fr", "veille", "rdc", "import-auto"],
        published_at: new Date().toISOString(),
      });

      if (!error) ingested.push(articleUrl);
    }

    return new Response(JSON.stringify({ success: true, scanned: articleLinks.length, inserted: ingested.length, links: ingested }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
