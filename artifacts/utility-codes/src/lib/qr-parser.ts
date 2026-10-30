export type QrPayloadType =
  | "url"
  | "wifi"
  | "vcard"
  | "whatsapp"
  | "phone"
  | "email"
  | "sms"
  | "text";

export interface ParsedWifi {
  ssid: string;
  security: "WPA" | "WEP" | "nopass" | string;
  password?: string;
  hidden?: boolean;
}

export interface ParsedVCard {
  name: string;
  family?: string;
  given?: string;
  company?: string;
  phone?: string;
  email?: string;
  title?: string;
  url?: string;
}

export interface ParsedWhatsApp {
  phone: string;
  message?: string;
}

export interface ParsedEmail {
  address: string;
  subject?: string;
  body?: string;
}

export interface ParsedSms {
  phone: string;
  message?: string;
}

export interface ParsedUrl {
  url: string;
  domain: string;
  protocol: string;
  isSecure: boolean;
  pathname: string;
  search: string;
}

export interface ParsedQrResult {
  type: QrPayloadType;
  raw: string;
  urlData?: ParsedUrl;
  wifiData?: ParsedWifi;
  vcardData?: ParsedVCard;
  whatsAppData?: ParsedWhatsApp;
  emailData?: ParsedEmail;
  phoneData?: string;
  smsData?: ParsedSms;
  textData?: {
    charCount: number;
    wordCount: number;
    lineCount: number;
  };
}

function unescapeWifi(val: string): string {
  return val.replace(/\\([\\;,:"'])/g, "$1");
}

function unescapeVCard(val: string): string {
  return val
    .replace(/\\n/gi, "\n")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

/**
 * Checks if a string looks like a valid HTTP/HTTPS URL or domain
 */
export function isLikelyUrl(text: string): boolean {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^www\.[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed)) return true;
  // Common domain pattern (e.g. google.com or sub.example.org/path)
  if (
    /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Normalizes text to a valid URL string with http(s)://
 */
export function normalizeUrl(text: string): string {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseQrPayload(rawText: string): ParsedQrResult {
  const raw = (rawText || "").trim();

  // 1. Wi-Fi
  if (/^WIFI:/i.test(raw)) {
    const wifiObj: ParsedWifi = {
      ssid: "",
      security: "WPA",
    };

    // Extract S:
    const sMatch = raw.match(/S:((?:\\;|[^;])+);?/i);
    if (sMatch) wifiObj.ssid = unescapeWifi(sMatch[1]);

    // Extract T:
    const tMatch = raw.match(/T:((?:\\;|[^;])+);?/i);
    if (tMatch) wifiObj.security = tMatch[1].toUpperCase() || "WPA";

    // Extract P:
    const pMatch = raw.match(/P:((?:\\;|[^;])+);?/i);
    if (pMatch) wifiObj.password = unescapeWifi(pMatch[1]);

    // Extract H:
    const hMatch = raw.match(/H:((?:\\;|[^;])+);?/i);
    if (hMatch) wifiObj.hidden = hMatch[1].toLowerCase() === "true";

    return {
      type: "wifi",
      raw,
      wifiData: wifiObj,
    };
  }

  // 2. vCard
  if (/BEGIN:VCARD/i.test(raw)) {
    const vcardObj: ParsedVCard = {
      name: "",
    };

    const fnMatch = raw.match(/FN[;:]([^\r\n]+)/i);
    if (fnMatch) {
      vcardObj.name = unescapeVCard(fnMatch[1]);
    }

    const nMatch = raw.match(/N[;:]([^\r\n]+)/i);
    if (nMatch) {
      const parts = nMatch[1].split(";");
      vcardObj.family = unescapeVCard(parts[0] || "");
      vcardObj.given = unescapeVCard(parts[1] || "");
      if (!vcardObj.name) {
        vcardObj.name = [vcardObj.given, vcardObj.family].filter(Boolean).join(" ");
      }
    }

    const orgMatch = raw.match(/ORG[;:]([^\r\n]+)/i);
    if (orgMatch) vcardObj.company = unescapeVCard(orgMatch[1]);

    const telMatch = raw.match(/TEL(?:[^:]*):([^\r\n]+)/i);
    if (telMatch) vcardObj.phone = unescapeVCard(telMatch[1]);

    const emailMatch = raw.match(/EMAIL(?:[^:]*):([^\r\n]+)/i);
    if (emailMatch) vcardObj.email = unescapeVCard(emailMatch[1]);

    const titleMatch = raw.match(/TITLE[;:]([^\r\n]+)/i);
    if (titleMatch) vcardObj.title = unescapeVCard(titleMatch[1]);

    const urlMatch = raw.match(/URL[;:]([^\r\n]+)/i);
    if (urlMatch) vcardObj.url = unescapeVCard(urlMatch[1]);

    return {
      type: "vcard",
      raw,
      vcardData: vcardObj,
    };
  }

  // 3. WhatsApp link
  if (
    /^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send)/i.test(raw) ||
    /^whatsapp:\/\/send/i.test(raw)
  ) {
    let phone = "";
    let message = "";

    const waMeMatch = raw.match(/wa\.me\/([0-9+]+)/i);
    if (waMeMatch) {
      phone = waMeMatch[1];
    } else {
      const phoneParam = raw.match(/[?&]phone=([0-9+]+)/i);
      if (phoneParam) phone = phoneParam[1];
    }

    const textMatch = raw.match(/[?&]text=([^&]+)/i);
    if (textMatch) {
      try {
        message = decodeURIComponent(textMatch[1]);
      } catch {
        message = textMatch[1];
      }
    }

    return {
      type: "whatsapp",
      raw,
      whatsAppData: {
        phone: phone.replace(/\D/g, ""),
        message,
      },
    };
  }

  // 4. Telephone
  if (/^tel:/i.test(raw)) {
    const phone = raw.replace(/^tel:/i, "").trim();
    return {
      type: "phone",
      raw,
      phoneData: phone,
    };
  }

  // 5. SMS
  if (/^(?:sms|smsto):/i.test(raw)) {
    const stripped = raw.replace(/^(?:sms|smsto):/i, "");
    const parts = stripped.split(/[:?]/);
    const phone = (parts[0] || "").trim();
    let message = "";
    const bodyMatch = raw.match(/[?&]body=([^&]+)/i);
    if (bodyMatch) {
      try {
        message = decodeURIComponent(bodyMatch[1]);
      } catch {
        message = bodyMatch[1];
      }
    } else if (parts[1]) {
      message = parts[1];
    }

    return {
      type: "sms",
      raw,
      smsData: { phone, message },
    };
  }

  // 6. Email (mailto:)
  if (/^mailto:/i.test(raw)) {
    const stripped = raw.replace(/^mailto:/i, "");
    const [addrPart, queryPart] = stripped.split("?");
    let subject = "";
    let body = "";
    if (queryPart) {
      const sp = new URLSearchParams(queryPart);
      subject = sp.get("subject") || "";
      body = sp.get("body") || "";
    }
    return {
      type: "email",
      raw,
      emailData: {
        address: addrPart.trim(),
        subject,
        body,
      },
    };
  }

  // 7. Web URL
  if (isLikelyUrl(raw)) {
    const fullUrl = normalizeUrl(raw);
    let domain = "";
    let pathname = "/";
    let search = "";
    let protocol = "https:";
    try {
      const parsed = new URL(fullUrl);
      domain = parsed.hostname;
      pathname = parsed.pathname;
      search = parsed.search;
      protocol = parsed.protocol;
    } catch {
      domain = fullUrl.replace(/^https?:\/\//i, "").split("/")[0] || "";
    }

    return {
      type: "url",
      raw,
      urlData: {
        url: fullUrl,
        domain,
        protocol,
        isSecure: protocol === "https:",
        pathname,
        search,
      },
    };
  }

  // 8. Plain text fallback
  const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
  const lines = raw.split(/\r?\n/).length;

  return {
    type: "text",
    raw,
    textData: {
      charCount: raw.length,
      wordCount: words,
      lineCount: lines,
    },
  };
}
