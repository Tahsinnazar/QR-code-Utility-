import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DotLottieReact,
  setWasmUrl,
  type DotLottie,
} from "@lottiefiles/dotlottie-react";
import { createPortal } from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  Link,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
  useSearch,
} from "wouter";
import QRCodeStyling from "qr-code-styling";
import JsBarcode from "jsbarcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  ArrowDownToLine,
  ArrowRight,
  Barcode,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Contact,
  FileArchive,
  FileText,
  Globe,
  MessageCircle,
  PartyPopper,
  Phone,
  PiggyBank,
  Printer,
  Wifi,
  ImagePlus,
  LockKeyhole,
  Menu,
  QrCode,
  ScanLine,
  ScanQrCode,
  ShieldCheck,
  Sparkles,
  Upload,
  FileImage,
  ExternalLink,
  X,
} from "lucide-react";
import { QrScanner, decodeQrFromImageFile } from "./components/QrScanner";
import { QrResultDetail } from "./components/QrResultDetail";
import { playScanSuccessSound } from "./lib/scanner-audio";

declare const __PUBLIC_SITE_URL__: string | undefined;

const queryClient = new QueryClient();

type Mode = "qr" | "barcode" | "bulk" | "labels" | "scanner";
type QRKind = "URL" | "Text" | "Wi-Fi" | "vCard" | "WhatsApp" | "Phone";
type BarcodeKind = "CODE128" | "EAN13" | "UPC" | "CODE39";
type QrDesignTab = "frame" | "shape" | "logo" | "level";
type MobileStep = "content" | "design";

const guideRoutes = [
  ["/wifi-qr-code-generator", "Wi-Fi QR code"],
  ["/vcard-qr-code-generator", "vCard QR code"],
  ["/whatsapp-qr-code-generator", "WhatsApp QR code"],
  ["/code128-barcode-generator", "Code 128 barcode"],
  ["/printable-label-sheet", "Printable labels"],
];

const legalRoutes = [
  ["/privacy-policy", "Privacy"],
  ["/terms-of-service", "Terms"],
  ["/about-us", "About"],
  ["/contact", "Contact"],
];

const pageInfo: Record<
  string,
  { title: string; description: string; heading: string; intro: string }
> = {
  "/wifi-qr-code-generator": {
    title: "Free Wi-Fi QR Code Generator | UtilityCodes",
    description:
      "Make a scannable Wi-Fi QR code in your browser. Share network access without revealing your password.",
    heading: "Wi-Fi QR code generator",
    intro:
      "Let guests join your network with one quick scan. UtilityCodes formats your network details into a standard Wi-Fi QR code, right in your browser.",
  },
  "/vcard-qr-code-generator": {
    title: "Free vCard QR Code Generator | UtilityCodes",
    description:
      "Create a digital business card QR code with contact details, generated locally in your browser.",
    heading: "vCard QR code generator",
    intro:
      "Put your contact details behind a scan-ready QR code. People can save your name, company and phone details directly to their contacts.",
  },
  "/whatsapp-qr-code-generator": {
    title: "WhatsApp QR Code Generator | UtilityCodes",
    description:
      "Create a WhatsApp QR code with an optional prefilled message. Free, private, and browser-based.",
    heading: "WhatsApp QR code generator",
    intro:
      "Make it easy to start a conversation. Enter a phone number and optional greeting to create a QR code that opens a WhatsApp chat.",
  },
  "/code128-barcode-generator": {
    title: "Code 128 Barcode Generator | UtilityCodes",
    description:
      "Generate and download Code 128 barcodes for labels, inventory, and quick product workflows.",
    heading: "Code 128 barcode generator",
    intro:
      "Create compact, high-density Code 128 barcodes for inventory, packaging or internal labels. Your data stays on this device.",
  },
  "/printable-label-sheet": {
    title: "Printable QR Code Label Sheets | UtilityCodes",
    description:
      "Arrange QR codes on a print-ready A4 label sheet, then print directly from your browser.",
    heading: "Printable QR code label sheets",
    intro:
      "Lay out consistent QR labels on an A4 sheet and print at actual size. Choose a label count and preview the page before printing.",
  },
  "/scanner": {
    title: "Free Online QR Code Scanner | UtilityCodes",
    description:
      "Scan and decode QR codes instantly using your device camera or upload an image file. 100% private, client-side processing in your browser.",
    heading: "QR code scanner",
    intro:
      "Point your device camera at any QR code or upload an image file to read URLs, Wi-Fi networks, contact cards, and text in seconds without saving anything to a server.",
  },
};

const guideSections: Record<string, [string, string][]> = {
  "/wifi-qr-code-generator": [
    [
      "What a Wi-Fi QR code contains",
      "A Wi-Fi QR code stores the network name, security type and, when needed, the password in a standard format that a phone can recognize. A guest scans the code with the built-in camera and can join without typing a long password. The QR is not a separate guest network and it does not change your router settings; it only shares the connection details you enter. Anyone who can see and scan the printed code may be able to join that network, so place it where intended guests can access it and avoid putting it in public view if the network is private.",
    ],
    [
      "Enter the network details carefully",
      "Choose Wi-Fi in the generator, then type the SSID exactly as it appears in your router or device settings. Network names are case-sensitive, and spaces or punctuation are part of the name. Select WPA for most modern home and office networks, WEP only for older equipment that still uses it, or no password for an open network. For a hidden SSID, enable the hidden-network option. When the code looks right, scan it with a second device before sharing it. A quick test catches typos before guests have to troubleshoot a connection.",
    ],
    [
      "Keep the code readable",
      "Use a dark foreground on a light background, preserve the quiet zone around the pattern and print at a size a phone camera can focus on. The default QR error correction is a good balance; higher correction can help when the code is damaged, but it also makes the pattern denser. If you add a center logo, use a modest image and choose a higher correction level. Avoid glossy surfaces and low-contrast color combinations. Test the final print in the room where visitors will use it, because lighting, distance and reflections can affect a scan.",
    ],
    [
      "Share access without exposing more than needed",
      "A Wi-Fi code is convenient, but it should only contain credentials you are comfortable sharing with its audience. If guests need internet access but should not reach office devices, create a guest network in your router first and generate a code for that guest SSID. UtilityCodes builds the QR in the current browser; it does not send the network name or password to an account or code-generation server. The password field is masked while you type, but the code itself necessarily encodes the password so that a compatible phone can connect.",
    ],
    [
      "Troubleshoot a failed connection",
      "If a phone sees the QR but does not join, first compare the SSID, password and security mode with the router settings. A typo can still produce a perfectly valid QR image, so inspect the details rather than only changing its appearance. Some older phones require a separate camera or QR reader to recognize the Wi-Fi payload. If scanning opens a prompt but connection fails, check that the guest network is active and that the device is within range. Generate a fresh code after changing a password, then remove or cover older printed copies so visitors do not keep trying stale credentials.",
    ],
  ],
  "/vcard-qr-code-generator": [
    [
      "What a vCard QR code does",
      "A vCard QR code packages contact details as a digital business card. When someone scans it, a compatible phone can offer to create a contact with the name, organization, phone number and email address you entered. It can save a conversation at an event and reduce errors from typing a long address or number. The code does not publish a profile page or update itself when your details change; it contains a snapshot of the information at the time you generate it. If a detail changes, create a replacement code and update the places where you shared the old one.",
    ],
    [
      "Build a useful contact card",
      "Select vCard and complete the fields you want to share. A full name is the most useful starting point; company, phone and email are optional and can be left blank when they do not apply. Use a phone number with its country code if contacts may be saved internationally. Check the spelling of names and the exact email address, then scan the preview with a phone and review the contact-import screen before printing or distributing it. Treat every filled field as information you intend the scanner to receive.",
    ],
    [
      "Design for quick scanning",
      "Keep the code high contrast, retain a clear quiet zone and avoid placing a large logo over the data pattern. Rounded dots and custom eye shapes can give a card a personal feel, but strong styling should not come at the cost of readability. If you add a logo or a call-to-action frame, test the exported PNG or SVG rather than relying only on the on-screen preview. A printed business card is small, so scan a sample at actual size and confirm it works under ordinary indoor light.",
    ],
    [
      "Choose where the contact details live",
      "A direct vCard code is useful when you want a card that works offline and contains a small set of details. Its trade-off is that the information is fixed: every reprint has to use a newly generated code after an update. If you need a contact page that can be edited without replacing the printed QR, encode a URL to a page you control instead. UtilityCodes creates the code and exports the image locally in your browser. It does not retain the contact fields, so keep a separate copy of your source details if you will need to update the design later.",
    ],
    [
      "Check how different phones import contacts",
      "Contact apps may label or display a field differently, so scan the code with at least one other phone before committing to a large print run. Confirm that the name appears as intended and that the phone and email fields are recognized rather than folded into a note. The generated card currently focuses on common details; keep extra information out of the code unless you have verified that your audience can use it. If a saved contact is wrong, return to the form, correct the source fields and export a new version. A brief test is easier than replacing cards after an event.",
    ],
  ],
  "/whatsapp-qr-code-generator": [
    [
      "How a WhatsApp QR link works",
      "A WhatsApp QR code points to a chat link for the phone number you enter. When someone scans it, their device opens WhatsApp or a web handoff where they can start a conversation. An optional prefilled message can make the next step clearer, such as asking for a quote or identifying a support request. The message is only a draft; the person scanning the code still chooses whether to send it. A code does not automatically subscribe someone to messages or add the sender to a contact list.",
    ],
    [
      "Use an international phone number",
      "Enter the number with its country calling code so the link identifies the intended WhatsApp account. The generator removes spaces and punctuation when it builds the wa.me address. Leave out local dialing prefixes that are not part of the international number, and double-check every digit before exporting. If the destination number is not registered with WhatsApp, the link may not open a usable chat. Scan your test code on a separate device and verify the chat header displays the correct business or person before you put the code on packaging, a poster or a profile.",
    ],
    [
      "Write a helpful optional message",
      "A short prefilled greeting can tell customers what to include, for example a product name or order reference. Keep the text brief, neutral and easy for the user to edit. Avoid putting sensitive information in a draft message because anyone scanning the QR can see its contents before sending it. Test punctuation, spaces and non-English characters in the preview; the message is encoded into the link and URL-escaped automatically. The user remains in control of the final message and must press send in WhatsApp.",
    ],
    [
      "Place the QR where the conversation starts",
      "Use a dark code on a light background, keep the quiet zone clear and make the printed code large enough for a phone camera to focus. Include a nearby explanation such as “Chat with us on WhatsApp” so people know what the scan will do. Keep the destination account active and staffed if you use the code for customer support. UtilityCodes generates the link and image on your device and does not upload the entered number or message. Once you export the code, scan the exported file and test it again from a real print.",
    ],
    [
      "Review the destination and user experience",
      "A WhatsApp QR is a link to a number, not a guarantee that a person will receive a response. Confirm that the number belongs to the intended account, that WhatsApp is available in the region and that someone monitors incoming conversations. When the scan opens a chat, the user should be able to inspect the destination and edit the draft before sending it. Keep the printed call to action honest about what happens next. If you change the number or prefilled message, export and replace old materials rather than assuming an existing QR will update itself.",
    ],
  ],
  "/code128-barcode-generator": [
    [
      "When to use Code 128",
      "Code 128 is a compact, high-density linear barcode that can encode upper- and lowercase letters, digits and a range of punctuation. It is commonly used for internal inventory labels, shipping workflows and asset identifiers where the organization controls both the code and the scanners. It is not the same thing as a retail EAN or UPC product number, and a Code 128 symbol does not make an identifier globally unique by itself. Decide on a consistent naming scheme before printing labels so that two items do not accidentally receive the same value.",
    ],
    [
      "Choose a value your workflow can use",
      "Enter a short identifier that your inventory system, spreadsheet or receiving process can recognize. Avoid leading or trailing spaces unless they are intentionally part of the data. Code 128 can carry more characters than a retail barcode, but longer values make the symbol wider and can be harder to scan at small print sizes. Check the value for transposed digits and compare it with the record it identifies. The text printed below the bars helps a person read the value, but a scanner returns the encoded content rather than validating the item or looking it up.",
    ],
    [
      "Print at a useful size",
      "Keep the barcode bars crisp and preserve clear blank space at both ends. Use dark bars on a light background and avoid squeezing the image to fit a very narrow label. If a barcode must be resized, keep its aspect ratio so the bars do not become too thin or too wide for the scanner. Download the SVG when you need to place the code into a layout program without losing vector sharpness, or use PNG for common documents. Print one test label and scan it with the device and software used in your actual workflow.",
    ],
    [
      "Code 128 versus retail formats",
      "If an item will be sold through a retail system, ask the retailer or standards body which identifier and barcode format is required. EAN-13 and UPC-A have fixed numeric lengths and check digits; UtilityCodes calculates the check digit for a payload and checks one you provide. Code 128 accepts more flexible internal values and does not add those retail check digits. A correct-looking barcode is not proof that a number is registered or appropriate for a specific supply chain. Keep a record of assigned identifiers and verify scanner compatibility before a large print run.",
    ],
    [
      "Fix common scanning problems",
      "If a reader misses the barcode, check that the bars have not been stretched during placement and that the image is not blurred or printed too lightly. Increase the symbol width or height, preserve the blank margin at both ends and use an uncoated test label if glare is a problem. Confirm that the reader is configured for Code 128 and that the application accepts the characters in the value. Try the original SVG or a high-resolution PNG rather than a screenshot. A successful scan should return exactly the characters you entered; compare them with the source record before using the label.",
    ],
  ],
  "/printable-label-sheet": [
    [
      "Prepare a page of consistent labels",
      "The label-sheet tool arranges one value per label on an A4 portrait page. Choose a large, standard or compact grid based on how much text and scanning distance each item needs. Paste one code value on each line; blank lines are ignored. You can make QR labels for URLs or identifiers and switch to barcodes for workflows that use a compatible barcode reader. The preview helps you inspect the page before printing, but it is still worth checking a paper test because printer margins and scaling settings can vary from one device to another.",
    ],
    [
      "Keep label contents short and clear",
      "Short values are easier to scan and leave more room for readable text. If a label carries a QR code, the visible text below it helps a person confirm which item they are about to open. Use meaningful names or compact asset identifiers rather than a long paragraph. For QR codes that point to a web destination, test the URL on a phone. For barcodes, match the format to the reader and the system that will consume the result. Check every line in the batch; a repeated identifier can create confusion even when the code itself scans correctly.",
    ],
    [
      "Print at actual size",
      "Open the browser print dialog and select A4 paper in portrait orientation. Set scaling to 100% or actual size and check that “fit to page” has not changed the layout. Printer-driver margins can shift the usable area, so compare the first printed grid with the label stock before using adhesive sheets. The dashed borders are guides and may appear on the printed page; if your workflow needs border-free stock, verify the browser print preview first. Do not use an ink-saving setting that makes the bars or QR modules too faint.",
    ],
    [
      "Test before a full run",
      "Scan several labels from different parts of the page, including near its edges. Make sure the phone or reader can focus at the distance people will use and confirm that each scan returns the intended value. If one code is difficult to read, enlarge the layout, increase contrast or choose a less compact content value. Labels placed on curved, glossy or textured surfaces may need a larger symbol. UtilityCodes lays out the grid and creates its QR or barcode images in your browser; printing and the final physical result depend on your printer, paper and chosen scale.",
    ],
    [
      "Match the grid to your label stock",
      "The page preview is a simple A4 grid, not a calibration file for every brand of precut sticker stock. Compare the grid dimensions with the sheet manufacturer’s measurements before feeding adhesive labels into a printer. If individual positions do not align, adjust the printer’s paper size and scaling settings or use plain paper for a trial. Avoid forcing the page to fit when the preview indicates actual-size printing; that can shift every label. Save a known-good print configuration for future runs, and keep an unprinted test sheet until you have confirmed alignment across the full page.",
    ],
  ],
};

const legalContent: Record<
  string,
  { title: string; intro: string; sections: [string, string][] }
> = {
  "/privacy-policy": {
    title: "Privacy policy",
    intro:
      "UtilityCodes is designed to work without accounts and without sending your code data to a server.",
    sections: [
      [
        "Processing stays in your browser",
        "QR code and barcode generation, batch file creation, image handling, and OCR run locally in your browser. We do not receive or store the content you enter.",
      ],
      [
        "Camera and files",
        "Camera access is only requested when you start the scanner. Uploaded files are processed in your current browser session and are not uploaded.",
      ],
      [
        "Your choices",
        "You can stop camera access by closing the scanner or leaving this page. Browser permissions and downloaded files remain under your control.",
      ],
    ],
  },
  "/terms-of-service": {
    title: "Terms of service",
    intro:
      "Use UtilityCodes as a browser utility for creating and printing machine-readable codes.",
    sections: [
      [
        "Use and accuracy",
        "You are responsible for verifying code content, check digits, print sizing and scanner compatibility before relying on generated materials.",
      ],
      [
        "Availability",
        "The app is provided as-is. Browser support and device capabilities vary, particularly for camera access and printing.",
      ],
      [
        "No sensitive data",
        "Although processing is local, do not use a shared or untrusted device for information you would not want stored in its browser memory.",
      ],
    ],
  },
  "/about-us": {
    title: "About UtilityCodes",
    intro: "Small, practical code tools that do their work on your device.",
    sections: [
      [
        "Built for repeat use",
        "From one quick QR code to a batch of inventory labels, UtilityCodes keeps the workflow simple: enter, check, export.",
      ],
      [
        "Private by design",
        "The generators and scanner are browser-side tools. No account is required and code content is not sent to a UtilityCodes server.",
      ],
      [
        "A straightforward toolkit",
        "Use QR, common retail and industrial barcodes, batch ZIP export, print layouts, or OCR text capture from a camera.",
      ],
    ],
  },
  "/contact": {
    title: "Contact UtilityCodes",
    intro:
      "Questions or product feedback? UtilityCodes does not currently operate a support inbox.",
    sections: [
      [
        "Share feedback",
        "For an issue with a generated code, include the code type, browser, and a description of what happened. Avoid sending private code contents.",
      ],
      [
        "Quick help",
        "Try another code format, check input length and characters, and scan a test print before producing a full run. Camera access requires browser permission and a secure connection.",
      ],
    ],
  },
};

const OG_IMAGE_PATH = "/assets/og-utilitycodes.png";

function siteRootUrl() {
  const siteBase =
    (typeof __PUBLIC_SITE_URL__ !== "undefined" && __PUBLIC_SITE_URL__) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return (siteBase || "http://localhost:3000").replace(/\/+$/, "");
}

function usePageMeta(path: string) {
  useEffect(() => {
    const info = pageInfo[path] || legalContent[path];
    const isHome = path === "/";
    const knownRoute = isHome || Boolean(info);
    const title = isHome
      ? "Free QR & Barcode Generator — UtilityCodes"
      : info?.title || "Page not found — UtilityCodes";
    const description =
      info?.description ||
      info?.intro ||
      (isHome
        ? "Create QR codes, barcodes, batch ZIP exports and print-ready labels locally in your browser. No account, no uploads, no tracking of what you create."
        : "Create QR codes, barcodes, batches and print-ready labels locally in your browser.");
    document.title = title;

    const root = siteRootUrl();
    const canonicalUrl = new URL(path, root).toString();
    const ogImage = `${root}${OG_IMAGE_PATH}`;

    const upsertMeta = (
      attribute: "name" | "property",
      key: string,
      content: string,
    ) => {
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`,
      );
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attribute, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const upsertLink = (rel: string, href: string) => {
      let el = document.head.querySelector<HTMLLinkElement>(
        `link[rel="${rel}"]`,
      );
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    upsertMeta("name", "description", description);
    upsertMeta(
      "name",
      "robots",
      knownRoute
        ? "index, follow, max-image-preview:large, max-snippet:-1"
        : "noindex, follow",
    );
    upsertMeta("property", "og:site_name", "UtilityCodes");
    upsertMeta("property", "og:locale", "en_US");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta(
      "property",
      "og:image:alt",
      "UtilityCodes — free QR and barcode tools that run in your browser",
    );
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);
    upsertLink("canonical", canonicalUrl);
    // Structured data: one @graph per route so answer engines and rich-result
    // crawlers can connect the page to the site, the app and its FAQ/how-to.
    const scriptId = "utilitycodes-jsonld";
    document.getElementById(scriptId)?.remove();
    if (!knownRoute) return;

    const organization = {
      "@type": "Organization",
      "@id": `${root}/#organization`,
      name: "UtilityCodes",
      url: `${root}/`,
      description:
        "Free, browser-side tools for QR codes, barcodes, batch exports and printable labels.",
      logo: { "@type": "ImageObject", url: ogImage },
    };
    const website = {
      "@type": "WebSite",
      "@id": `${root}/#website`,
      name: "UtilityCodes",
      url: `${root}/`,
      inLanguage: "en",
      publisher: { "@id": `${root}/#organization` },
    };
    const app = {
      "@type": "SoftwareApplication",
      "@id": `${root}/#app`,
      name: "UtilityCodes",
      url: `${root}/`,
      description:
        "Create customizable QR codes and barcodes, export batches as ZIP files and prepare printable label sheets — entirely in the browser.",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Works in modern browsers",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "QR codes for URLs, text, Wi-Fi, vCard, WhatsApp and phone numbers",
        "Code 128, EAN-13, UPC-A and Code 39 barcodes",
        "Center logos, custom colors, dot shapes and caption frames",
        "PNG and SVG downloads, plus batch ZIP export",
        "Printable A4 QR label sheets",
        "In-browser camera and image QR scanner",
      ],
      image: ogImage,
      publisher: { "@id": `${root}/#organization` },
    };
    const webpage = {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: "en",
      isPartOf: { "@id": `${root}/#website` },
      about: { "@id": `${root}/#app` },
    };

    const graph: Record<string, unknown>[] = [organization, website, webpage];
    if (isHome || pageInfo[path]) {
      graph.push(app);
    }

    if (isHome) {
      graph.push({
        "@type": "HowTo",
        "@id": `${canonicalUrl}#howto`,
        name: "How to create a QR code",
        description:
          "Pick your content, style the code and export it — all in the browser.",
        step: homeSteps.map((item, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: item.title,
          text: item.body,
        })),
      });
      graph.push({
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: homeFaqGroups.flatMap((group) =>
          group.items.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        ),
      });
    }

    if (!isHome && (pageInfo[path] || legalContent[path])) {
      graph.push({
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${root}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name:
              pageInfo[path]?.heading ||
              legalContent[path]?.title ||
              title,
            item: canonicalUrl,
          },
        ],
      });
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph,
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [path]);
}

function useIsMobile(query = "(max-width: 640px)") {
  const [mobile, setMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const handler = () => setMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return mobile;
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  // Fades sections in as they scroll into view. Skipped entirely for users who
  // prefer reduced motion, and when IntersectionObserver is unavailable.
  const ref = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
    if (!el || typeof IntersectionObserver === "undefined" || reduceMotion) {
      setVisible(true);
      return;
    }
    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${armed ? "reveal-armed" : ""} ${visible ? "in-view" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function triggerOpenScanner(setLocation?: (to: string) => void) {
  if (setLocation) {
    setLocation("/scanner");
  } else if (window.location.pathname !== "/scanner") {
    window.history.pushState(null, "", "/scanner");
  }
  window.dispatchEvent(new CustomEvent("open-qr-scanner"));
}

// "Home"/"Create a code" affordances must always show the QR generator, even
// when clicked from an open barcode/labels view (wouter keeps App state alive
// across URL-only navigations). Mirrors the scanner trigger above.
export function triggerWorkspaceHome(setLocation?: (to: string) => void) {
  if (setLocation) {
    setLocation("/");
  } else if (window.location.pathname !== "/" || window.location.search) {
    window.history.pushState(null, "", "/");
  }
  window.dispatchEvent(new CustomEvent("reset-workspace-qr"));
  window.scrollTo(0, 0);
}

function QrReaderButton() {
  const [, setLocation] = useLocation();
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        className="qr-reader-btn"
        aria-label="Scan QR code"
        title="Scan QR code with camera or upload image"
        onClick={() => triggerOpenScanner(setLocation)}
        data-testid="button-qr-reader"
      >
        <ScanQrCode size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

function useHeaderHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector<HTMLElement>(".site-header");
      setHeight(header ? Math.round(header.getBoundingClientRect().height) : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return height;
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [group, setGroup] = useState<"guides" | "info" | null>(null);
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
  const toggle = (key: "guides" | "info") =>
    setGroup((current) => (current === key ? null : key));
  const infoRoutes = [
    ["/about-us", "About"],
    ["/privacy-policy", "Privacy"],
    ["/terms-of-service", "Terms"],
  ];
  return createPortal(
    <div
      className={`drawer-root ${open ? "open" : ""}`}
      aria-hidden={!open}
      data-testid="mobile-drawer"
    >
      <div
        className="drawer-overlay"
        onClick={onClose}
        data-testid="drawer-overlay"
      />
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) onClose();
        }}
      >
        <div className="drawer-head">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <QrCode size={18} />
            </span>
            <span>UtilityCodes</span>
          </Link>
          <button
            type="button"
            className="drawer-close"
            aria-label="Close menu"
            onClick={onClose}
            data-testid="button-close-menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="drawer-list" aria-label="Mobile navigation">
          <Link href="/" className="drawer-item" data-testid="drawer-workspace" onClick={() => triggerWorkspaceHome(setLocation)}>
            Workspace
          </Link>
          <button
            type="button"
            className="drawer-item"
            aria-expanded={group === "guides"}
            onClick={() => toggle("guides")}
            data-testid="drawer-guides"
          >
            Guides
            <ChevronRight size={16} />
          </button>
          {group === "guides" && (
            <div className="drawer-sub">
              {guideRoutes.map(([url, name]) => (
                <Link key={url} href={url}>
                  {name}
                </Link>
              ))}
            </div>
          )}
          <button
            type="button"
            className="drawer-item"
            aria-expanded={group === "info"}
            onClick={() => toggle("info")}
            data-testid="drawer-info"
          >
            Information
            <ChevronRight size={16} />
          </button>
          {group === "info" && (
            <div className="drawer-sub">
              {infoRoutes.map(([url, name]) => (
                <Link key={url} href={url}>
                  {name}
                </Link>
              ))}
            </div>
          )}
          <button
            type="button"
            className="drawer-item"
            onClick={() => {
              onClose();
              triggerOpenScanner(setLocation);
            }}
            data-testid="drawer-qr-reader"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <ScanQrCode size={18} />
              <span>Scan QR code</span>
            </span>
          </button>
          <Link
            href="/contact"
            className="drawer-item"
            data-testid="drawer-contact"
          >
            Contact
          </Link>
        </nav>
        <div className="drawer-actions">
          <Link href="/about-us" className="btn drawer-btn">
            About
          </Link>
          <Link
            href="/"
            className="btn btn-primary drawer-btn"
            data-testid="drawer-create"
            onClick={() => triggerWorkspaceHome(setLocation)}
          >
            Create a code
          </Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

// Serve the dotLottie renderer's wasm from our own assets instead of its
// default CDN, keeping the site's no-external-runtime-fetch setup.
setWasmUrl(`${import.meta.env.BASE_URL}assets/dotlottie-player.wasm`);

/**
 * Decorative QR-scan brand animation for the footer brand-mark plate. Layered
 * on top of the QrCode icon, which remains visible until the animation paints
 * and comes back automatically when the browser reduced-motion setting is on
 * or the bundle fails to load. The instance plays/pauses with the
 * prefers-reduced-motion media query.
 */
function BrandMarkLottie() {
  const [lottie, setLottie] = useState<DotLottie | null>(null);
  useEffect(() => {
    if (!lottie) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (motion.matches) {
        lottie.pause();
      } else {
        lottie.play();
      }
    };
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, [lottie]);
  return (
    <DotLottieReact
      className="brand-lottie"
      src="https://lottie.host/ad1044ff-8276-469b-8d22-00fe3b5291f6/Eu4bc890ry.lottie"
      loop
      autoplay
      dotLottieRefCallback={setLottie}
      aria-hidden="true"
    />
  );
}

function Header() {
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Logo/"Workspace"/"Create a code" always return to the QR-first workspace
  // (and to the top) — even when tapped from a deep barcode/labels view.
  const resetScroll = useCallback(() => triggerWorkspaceHome(setLocation), [setLocation]);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" data-testid="link-home" onClick={resetScroll}>
          <span>UtilityCodes</span>
        </Link>
        <div
          className="header-right"
          style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}
        >
          <nav className="nav-links" aria-label="Main navigation">
            <Link
              href="/"
              className={`nav-link ${location === "/" ? "active" : ""}`}
              aria-current={location === "/" ? "page" : undefined}
              data-testid="link-workspace"
              onClick={resetScroll}
            >
              Workspace
            </Link>
            <button
              type="button"
              className={`nav-link nav-link-scan ${location === "/scanner" ? "active" : ""}`}
              aria-current={location === "/scanner" ? "page" : undefined}
              onClick={() => triggerOpenScanner(setLocation)}
              data-testid="nav-scan-qr"
            >
              <ScanLine size={15} aria-hidden="true" />
              <span>Scan QR</span>
            </button>
            <Link
              href="/wifi-qr-code-generator"
              className={`nav-link ${
                guideRoutes.some(([path]) => location === path) ? "active" : ""
              }`}
              data-testid="link-guides"
            >
              Guides
            </Link>
            <Link
              href="/about-us"
              className={`nav-link ${location === "/about-us" ? "active" : ""}`}
              data-testid="link-about"
            >
              About
            </Link>
            <Link href="/" className="nav-cta" data-testid="link-start" onClick={resetScroll}>
              Create a code
            </Link>
          </nav>
          <QrReaderButton />
          <button
            type="button"
            className="mobile-nav menu-button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            data-testid="button-open-menu"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <MobileMenu open={menuOpen} onClose={closeMenu} />
        </div>
      </div>
    </header>
  );
}

function Footer({ pageTitle }: { pageTitle?: string }) {
  const [, setLocation] = useLocation();
  const toolRoutes: [string, string][] = [
    ["/?mode=qr", "QR code maker"],
    ["/?mode=barcode", "Barcode maker"],
    ["/?mode=bulk", "Batch ZIP export"],
    ["/?mode=labels", "Label sheets"],
  ];
  return (
    <footer className="site-footer footer-outway">
      {pageTitle && (
        <span className="sr-only" data-testid="page-title">
          {pageTitle}
        </span>
      )}
      <div className="page-wrap footer-inner-v2">
        <div className="footer-brand">
          <Link href="/" className="brand" data-testid="footer-link-home" onClick={() => triggerWorkspaceHome(setLocation)}>
            <span className="brand-mark">
              <span className="icon-fallback" aria-hidden="true">
                <QrCode size={28} />
              </span>
              <BrandMarkLottie />
            </span>
            <span>UtilityCodes</span>
          </Link>
          <p className="footer-cta-title">
            Make your next code in seconds.
          </p>
          <p className="footer-tagline">
            Free QR and barcode tools that do all their processing in your
            browser. No accounts, no uploads, and no tracking of the codes you
            create.
          </p>
          <div className="footer-cta-row">
            <Link href="/" className="footer-cta-btn" data-testid="footer-cta-create" onClick={() => triggerWorkspaceHome(setLocation)}>
              Create a QR code <ArrowRight size={15} />
            </Link>
            <Link
              href="/scanner"
              className="footer-cta-btn footer-cta-ghost"
              data-testid="footer-cta-scan"
            >
              <ScanLine size={15} /> Scan a code
            </Link>
          </div>
          <span className="privacy-pill footer-pill">
            <LockKeyhole size={13} /> 100% local processing
          </span>
        </div>
        <nav className="footer-col" aria-label="Tools">
          <span className="footer-col-title">Tools</span>
          {toolRoutes.map(([url, name]) => (
            <Link
              key={url}
              href={url}
              className="footer-link"
              data-testid={`footer-${name.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => window.scrollTo(0, 0)}
            >
              {name}
            </Link>
          ))}
          <Link href="/scanner" className="footer-link" data-testid="footer-scanner" onClick={() => window.scrollTo(0, 0)}>
            QR scanner
          </Link>
        </nav>
        <nav className="footer-col" aria-label="Guides">
          <span className="footer-col-title">Guides</span>
          {guideRoutes.map(([url, name]) => (
            <Link
              key={url}
              href={url}
              className="footer-link"
              data-testid={`footer-${url.slice(1)}`}
            >
              {name}
            </Link>
          ))}
        </nav>
        <nav className="footer-col" aria-label="Information">
          <span className="footer-col-title">Information</span>
          {legalRoutes.map(([url, name]) => (
            <Link
              key={url}
              href={url}
              className="footer-link"
              data-testid={`footer-${url.slice(1)}`}
            >
              {name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="footer-bottom">
        <div className="page-wrap footer-bottom-inner">
          <span>© {new Date().getFullYear()} UtilityCodes</span>
          <span>Codes are generated on your device — nothing is uploaded.</span>
        </div>
      </div>
      <div className="footer-wordmark-clip" aria-hidden="true">
        <svg
          className="footer-wordmark"
          viewBox="0 0 1000 105"
          width="100%"
          focusable="false"
        >
          <text
            x="500"
            y="128"
            textAnchor="middle"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
          >
            UTILITYCODES
          </text>
        </svg>
      </div>
    </footer>
  );
}

function AdSlot() {
  return (
    <aside
      className="ad-slot"
      aria-label="Advertisement space"
      data-testid="ad-slot"
    >
      Advertisement space
    </aside>
  );
}

function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {help && <div className="field-help">{help}</div>}
    </div>
  );
}

const dotStyles: Record<
  string,
  "square" | "rounded" | "dots" | "classy" | "classy-rounded" | "extra-rounded"
> = {
  square: "square",
  rounded: "rounded",
  dots: "dots",
  classy: "classy",
  fluid: "classy-rounded",
  "extra-rounded": "extra-rounded",
};

function brandMarkData(preset: string) {
  const marks: Record<string, string> = {
    instagram:
      '<rect x="19" y="19" width="90" height="90" rx="27" fill="none" stroke="#0F172A" stroke-width="10"/><circle cx="64" cy="64" r="22" fill="none" stroke="#0F172A" stroke-width="10"/><circle cx="94" cy="37" r="7" fill="#0F172A"/>',
    whatsapp:
      '<path d="M31 102l7-25a42 42 0 1 1 16 17z" fill="none" stroke="#0F172A" stroke-width="10" stroke-linejoin="round"/><path d="M50 48c3-5 7-3 9 1l5 10-5 7c5 9 10 14 20 18l7-7 10 5c5 2 6 6 2 10-7 8-16 8-30 1-16-8-29-23-29-35 0-4 4-8 11-10z" fill="#0F172A"/>',
    youtube:
      '<rect x="15" y="31" width="98" height="66" rx="21" fill="#0F172A"/><path d="M54 47v34l29-17z" fill="#FFFFFF"/>',
    globe:
      '<circle cx="64" cy="64" r="48" fill="none" stroke="#0F172A" stroke-width="9"/><path d="M16 64h96M64 16c15 14 22 30 22 48s-7 34-22 48M64 16C49 30 42 46 42 64s7 34 22 48" fill="none" stroke="#0F172A" stroke-width="7"/>',
    shop: '<path d="M24 52h80v60H24zM17 49l9-30h76l9 30c-1 10-15 14-23 4-8 10-22 10-30 0-8 10-22 10-30 0-5 4-9 3-11-4z" fill="none" stroke="#0F172A" stroke-width="9" stroke-linejoin="round"/><path d="M49 112V78h30v34" fill="none" stroke="#0F172A" stroke-width="8"/>',
  };
  const mark = marks[preset];
  if (!mark) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="4" y="4" width="120" height="120" rx="28" fill="#FFFFFF"/>${mark}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function QrPatternThumb({ pattern }: { pattern: string }) {
  const modules = 21;
  const cell = 2;
  const shapeForModule = (x: number, y: number, key: string) => {
    const px = x * cell;
    const py = y * cell;
    if (key === "dots")
      return (
        <circle
          key={`${x}-${y}`}
          cx={px + 1}
          cy={py + 1}
          r=".82"
          fill="#0f172a"
        />
      );
    if (key === "classy")
      return (
        <path
          key={`${x}-${y}`}
          d={`M${px} ${py}h2v1.1H${px + 1.1}V${py + 2}H${px}z`}
          fill="#0f172a"
        />
      );
    return (
      <rect
        key={`${x}-${y}`}
        x={px}
        y={py}
        width="1.8"
        height="1.8"
        rx={key === "square" ? 0 : key === "extra-rounded" ? ".85" : ".48"}
        fill="#0f172a"
      />
    );
  };
  const inFinder = (x: number, y: number, left: number, top: number) =>
    x >= left && x < left + 7 && y >= top && y < top + 7;
  const finder = (left: number, top: number, key: string) => {
    const px = left * cell;
    const py = top * cell;
    const rx = key === "square" ? 0 : key === "extra-rounded" ? 3 : 1.5;
    return (
      <g key={`${left}-${top}`}>
        <rect x={px} y={py} width="14" height="14" rx={rx} fill="#0f172a" />
        <rect
          x={px + 2}
          y={py + 2}
          width="10"
          height="10"
          rx={Math.max(0, rx - 1)}
          fill="#fff"
        />
        <rect
          x={px + 4}
          y={py + 4}
          width="6"
          height="6"
          rx={Math.max(0, rx - 2)}
          fill="#0f172a"
        />
      </g>
    );
  };
  const blocks: ReactNode[] = [];
  for (let y = 0; y < modules; y++)
    for (let x = 0; x < modules; x++) {
      if (
        inFinder(x, y, 0, 0) ||
        inFinder(x, y, 14, 0) ||
        inFinder(x, y, 0, 14)
      )
        continue;
      if ((x * 17 + y * 31 + x * y * 7) % 13 < 6)
        blocks.push(shapeForModule(x, y, pattern));
    }
  return (
    <svg
      viewBox="0 0 42 42"
      className="qr-pattern-thumb"
      role="img"
      aria-label={`${pattern} QR shape preview`}
    >
      <rect width="42" height="42" rx="3" fill="#fff" />
      {blocks}
      {finder(0, 0, pattern)}
      {finder(14, 0, pattern)}
      {finder(0, 14, pattern)}
    </svg>
  );
}

function addQrLogo(
  svgText: string,
  logoUrl: string,
  badgeShape: string,
  logoScale: number,
) {
  if (!logoUrl) return svgText;
  const svgDocument = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = svgDocument.documentElement;
  const namespace = "http://www.w3.org/2000/svg";
  const xlink = "http://www.w3.org/1999/xlink";
  const [, , viewWidth, viewHeight] = (
    root.getAttribute("viewBox") || "0 0 640 640"
  )
    .split(/\s+/)
    .map(Number);
  if (!viewWidth || !viewHeight) return svgText;
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const logoSize = viewWidth * Math.min(0.22, Math.max(0.12, logoScale));
  const pad = viewWidth * 0.035;
  const badgeSize = logoSize + pad * 2;
  const x = centerX - badgeSize / 2;
  const y = centerY - badgeSize / 2;
  if (badgeShape === "circle") {
    const badge = svgDocument.createElementNS(namespace, "circle");
    badge.setAttribute("cx", String(centerX));
    badge.setAttribute("cy", String(centerY));
    badge.setAttribute("r", String(badgeSize / 2));
    badge.setAttribute("fill", "#ffffff");
    root.appendChild(badge);
  } else {
    const badge = svgDocument.createElementNS(namespace, "rect");
    badge.setAttribute("x", String(x));
    badge.setAttribute("y", String(y));
    badge.setAttribute("width", String(badgeSize));
    badge.setAttribute("height", String(badgeSize));
    badge.setAttribute(
      "rx",
      badgeShape === "square" ? "2" : String(badgeSize * 0.2),
    );
    badge.setAttribute("fill", "#ffffff");
    root.appendChild(badge);
  }
  const image = svgDocument.createElementNS(namespace, "image");
  image.setAttribute("x", String(centerX - logoSize / 2));
  image.setAttribute("y", String(centerY - logoSize / 2));
  image.setAttribute("width", String(logoSize));
  image.setAttribute("height", String(logoSize));
  image.setAttribute("preserveAspectRatio", "xMidYMid meet");
  image.setAttribute("href", logoUrl);
  root.setAttribute("xmlns:xlink", xlink);
  image.setAttributeNS(xlink, "xlink:href", logoUrl);
  root.appendChild(image);
  return new XMLSerializer().serializeToString(root);
}

function addQrFrame(
  svgText: string,
  frame: string,
  foreground: string,
  background: string,
  customText = "",
) {
  if (frame === "none") return svgText;
  const captionText =
    customText.trim() ||
    (frame === "scan"
      ? "SCAN ME"
      : frame === "point"
        ? "POINT YOUR CAMERA"
        : "");
  if (!captionText) return svgText;
  const svgDocument = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = svgDocument.documentElement;
  const namespace = "http://www.w3.org/2000/svg";
  const [viewX, viewY, width, height] = (
    root.getAttribute("viewBox") || "0 0 640 640"
  )
    .split(/\s+/)
    .map(Number);
  const bandHeight = 72;
  root.setAttribute(
    "viewBox",
    `${viewX} ${viewY} ${width} ${height + bandHeight}`,
  );
  root.setAttribute("height", String(height + bandHeight));
  const band = svgDocument.createElementNS(namespace, "rect");
  band.setAttribute("x", String(viewX));
  band.setAttribute("y", String(viewY + height));
  band.setAttribute("width", String(width));
  band.setAttribute("height", String(bandHeight));
  band.setAttribute("fill", background);
  const caption = svgDocument.createElementNS(namespace, "text");
  caption.setAttribute("x", String(viewX + width / 2));
  caption.setAttribute("y", String(viewY + height + 46));
  caption.setAttribute("text-anchor", "middle");
  caption.setAttribute("font-family", "Inter,Arial,sans-serif");
  const longText = captionText.length > 16;
  caption.setAttribute(
    "font-size",
    String(
      longText ? Math.max(14, Math.floor((26 * 16) / captionText.length)) : 26,
    ),
  );
  caption.setAttribute("font-weight", "700");
  caption.setAttribute("letter-spacing", longText ? "1" : "3");
  caption.setAttribute("fill", foreground);
  caption.textContent = captionText;
  root.append(band, caption);
  return new XMLSerializer().serializeToString(root);
}

function svgToPng(svgText: string, outputWidth?: number) {
  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(
      new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }),
    );
    image.onload = () => {
      const svgDocument = new DOMParser().parseFromString(
        svgText,
        "image/svg+xml",
      );
      const viewBox = (
        svgDocument.documentElement.getAttribute("viewBox") || ""
      )
        .split(/\s+/)
        .map(Number);
      const sourceWidth = viewBox[2] || image.naturalWidth || 640;
      const sourceHeight = viewBox[3] || image.naturalHeight || 640;
      const width = outputWidth || image.naturalWidth || sourceWidth;
      const height = Math.round((width * sourceHeight) / sourceWidth);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas export is unavailable."));
        return;
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("PNG export failed.")),
        "image/png",
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The QR preview could not be rendered."));
    };
    image.src = url;
  });
}

const qrTypeOptions: [QRKind, string, ReactNode][] = [
  ["URL", "Website", <Globe size={18} />],
  ["Text", "Text", <FileText size={18} />],
  ["Wi-Fi", "Wi-Fi", <Wifi size={18} />],
  ["vCard", "vCard", <Contact size={18} />],
  ["WhatsApp", "WhatsApp", <MessageCircle size={18} />],
  ["Phone", "Phone", <Phone size={18} />],
];

// --- Homepage marketing sections (kept honest: only features this app has) ---

const qrTypeDetails: Record<QRKind, { label: string; blurb: string; bullets: string[] }> = {
  URL: {
    label: "Website",
    blurb:
      "Turn any link into a scan-to-open code for landing pages, menus, portfolios or documents.",
    bullets: [
      "Opens instantly in any phone camera",
      "Crisp PNG export plus infinitely sharp SVG",
      "Frames, colors and center logos stay optional",
    ],
  },
  Text: {
    label: "Text",
    blurb:
      "Encode plain text — serials, notes, instructions — readable by any scanner app.",
    bullets: [
      "Any characters, emoji and line breaks welcome",
      "Live character counter as you type",
      "Great for shelf labels and asset notes",
    ],
  },
  "Wi-Fi": {
    label: "Wi-Fi",
    blurb:
      "Let guests join your network with one scan — no more reading passwords out loud.",
    bullets: [
      "WPA, WEP and open networks supported",
      "Hidden SSID flag for non-broadcast routers",
      "Built as a standard WIFI: payload on this device",
    ],
  },
  vCard: {
    label: "vCard",
    blurb:
      "A scan-to-save digital business card with your name, company, phone and email.",
    bullets: [
      "Imports straight into phone contacts",
      "Optional fields only — share just what you want",
      "Remember to regenerate if your details change",
    ],
  },
  WhatsApp: {
    label: "WhatsApp",
    blurb:
      "Open a WhatsApp chat with an optional prefilled message — perfect for support and quotes.",
    bullets: [
      "Country-code-aware wa.me links",
      "Prefilled draft the customer can edit",
      "Great on flyers, packaging and Bio pages",
    ],
  },
  Phone: {
    label: "Phone",
    blurb:
      "A tap-to-call code for business cards, posters and packaging — no typing numbers.",
    bullets: [
      "Standard tel: payload, dials on scan",
      "Handles international +country formats",
      "Instant preview as you type",
    ],
  },
};

function MiniQr({ size = 64, fill = "#1e293b" }: { size?: number; fill?: string }) {
  // Decorative pseudo-QR used only in marketing illustrations (aria-hidden).
  const modules = 9;
  const cell = 20;
  const view = modules * cell;
  const finder = (fx: number, fy: number) => (
    <g key={`f${fx}-${fy}`}>
      <rect x={fx * cell} y={fy * cell} width={cell * 3} height={cell * 3} rx={cell * 0.9} fill={fill} />
      <rect x={(fx + 0.75) * cell} y={(fy + 0.75) * cell} width={cell * 1.5} height={cell * 1.5} rx={cell * 0.5} fill="#ffffff" />
      <rect x={(fx + 1.2) * cell} y={(fy + 1.2) * cell} width={cell * 0.6} height={cell * 0.6} rx={cell * 0.25} fill={fill} />
    </g>
  );
  const cells: ReactNode[] = [];
  for (let r = 0; r < modules; r++)
    for (let c = 0; c < modules; c++) {
      const inFinder =
        (r < 3 && c < 3) || (r < 3 && c >= modules - 3) || (r >= modules - 3 && c < 3);
      if (inFinder) continue;
      if ((r * 11 + c * 7 + r * c) % 4 < 2)
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={c * cell + cell * 0.1}
            y={r * cell + cell * 0.1}
            width={cell * 0.8}
            height={cell * 0.8}
            rx={cell * 0.26}
            fill={fill}
          />,
        );
    }
  return (
    <svg viewBox={`0 0 ${view} ${view}`} width={size} height={size} className="mini-qr" aria-hidden="true" focusable="false">
      <rect width={view} height={view} rx={view * 0.06} fill="#ffffff" />
      {cells}
      {finder(0, 0)}
      {finder(modules - 3, 0)}
      {finder(0, modules - 3)}
    </svg>
  );
}

function StepArtContent() {
  return (
    <div className="art-scene" aria-hidden="true">
      <div className="art-window">
        <div className="art-field art-field-wide" />
        <div className="art-field art-field-short" />
        <div className="art-chips">
          <i /><i /><i />
        </div>
      </div>
      <span className="art-float art-float-type"><Globe size={16} /></span>
    </div>
  );
}

function StepArtDesign() {
  return (
    <div className="art-scene" aria-hidden="true">
      <div className="art-window art-window-center">
        <MiniQr size={64} />
      </div>
      <span className="art-float art-dot art-dot-a" />
      <span className="art-float art-dot art-dot-b" />
    </div>
  );
}

function StepArtDownload() {
  return (
    <div className="art-scene" aria-hidden="true">
      <div className="art-window art-window-center">
        <MiniQr size={64} />
      </div>
      <span className="art-float art-float-download"><ArrowDownToLine size={16} /></span>
    </div>
  );
}

type PhoneScreenKind = QRKind;

function PhoneMock({ kind }: { kind: PhoneScreenKind }) {
  const barText: Record<QRKind, string> = {
    URL: "https://www.example.com/menu",
    Text: "scan-note.txt",
    "Wi-Fi": "Wi-Fi settings",
    vCard: "contact-card.vcf",
    WhatsApp: "wa.me/12065551234",
    Phone: "tel:+12065551234",
  };
  return (
    <div className="qr-phone" aria-hidden="true">
      <div className="qr-phone-screen">
        <div className="qr-phone-browser">
          <span className="qr-phone-url">{barText[kind]}</span>
        </div>
        {kind === "URL" && (
          <div className="qr-phone-page">
            <span className="pp-photo" />
            <span className="pp-line pp-line-title" />
            <span className="pp-line pp-line-mid" />
            <span className="pp-btn pp-btn-blue">View page</span>
          </div>
        )}
        {kind === "Text" && (
          <div className="qr-phone-page pp-note">
            <span className="pp-line" />
            <span className="pp-line" />
            <span className="pp-line pp-line-mid" />
            <span className="pp-chip pp-chip-blue">Saved on your device</span>
          </div>
        )}
        {kind === "Wi-Fi" && (
          <div className="qr-phone-page pp-center">
            <span className="pp-badge pp-badge-blue"><Wifi size={22} /></span>
            <span className="pp-line pp-line-title" />
            <span className="pp-dots"><i /><i /><i /><i /><i /><i /></span>
            <span className="pp-btn pp-btn-blue">Join network</span>
          </div>
        )}
        {kind === "vCard" && (
          <div className="qr-phone-page pp-center">
            <span className="pp-avatar">AK</span>
            <span className="pp-line pp-line-title" />
            <span className="pp-line pp-line-mid" />
            <span className="pp-btn pp-btn-blue">Save contact</span>
          </div>
        )}
        {kind === "WhatsApp" && (
          <div className="qr-phone-page pp-center">
            <span className="pp-badge pp-badge-green"><MessageCircle size={22} /></span>
            <span className="pp-line pp-line-title" />
            <span className="pp-bubble" />
            <span className="pp-btn pp-btn-green">Continue chat</span>
          </div>
        )}
        {kind === "Phone" && (
          <div className="qr-phone-page pp-center">
            <span className="pp-badge pp-badge-green"><Phone size={22} /></span>
            <span className="pp-line pp-line-title" />
            <span className="pp-line pp-line-mid" />
            <span className="pp-btn pp-btn-green">Call</span>
          </div>
        )}
      </div>
      <img
        className="qr-phone-frame"
        src={`${import.meta.env.BASE_URL}assets/phone-frame.jpg`}
        alt=""
        width={442}
        height={888}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

function StarSpark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`faq-spark ${className}`} aria-hidden="true">
      <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z" fill="currentColor" />
    </svg>
  );
}

function FaqSpotArt() {
  return (
    <div className="faq-art" aria-hidden="true">
      <span className="faq-blob" />
      <span className="faq-paper faq-paper-a"><MiniQr size={96} fill="#ff4d00" /></span>
      <span className="faq-paper faq-paper-b"><MiniQr size={72} fill="#94a3b8" /></span>
      <svg className="faq-folder" viewBox="0 0 232 150" width="220" height="142">
        <defs>
          <linearGradient id="faqFolderBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1c1233" />
            <stop offset="0.55" stopColor="#20306b" />
            <stop offset="1" stopColor="#2f56d9" />
          </linearGradient>
        </defs>
        <path
          d="M166 18c0-9-7-16-16-16H78c-5 0-9 2-12 6L52 22H24c-9 0-16 7-16 16v92c0 9 7 16 16 16h140c9 0 16-7 16-16V18z"
          fill="url(#faqFolderBg)"
        />
        <path
          d="M52 62c0-4 3-7 7-7l73 2 8-12c3-4 7-7 12-7h48c8 0 14 6 14 14v79c0 9-7 16-16 16H68c-9 0-16-7-16-16V62z"
          fill="#2b4bd8"
          opacity="0.65"
        />
      </svg>
      <StarSpark className="spark-a" />
      <StarSpark className="spark-b" />
      <StarSpark className="spark-c" />
    </div>
  );
}

const homeSteps: { step: string; title: string; body: string; art: ReactNode }[] = [
  {
    step: "1",
    title: "Choose your content",
    body: "Paste a link, some text, Wi-Fi details, a contact card, a WhatsApp chat or a phone number.",
    art: <StepArtContent />,
  },
  {
    step: "2",
    title: "Style your code",
    body: "Adjust shapes, colors and error correction — add a center logo if you want one.",
    art: <StepArtDesign />,
  },
  {
    step: "3",
    title: "Export and share",
    body: "Download a crisp PNG or scalable SVG, or print an A4 sheet of labels at actual size.",
    art: <StepArtDownload />,
  },
];

const homeFeatures: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <ShieldCheck size={18} />,
    title: "Private by design",
    body: "Inputs, uploads and camera frames are processed in this tab. Nothing is sent to a server.",
  },
  {
    icon: <QrCode size={18} />,
    title: "Six QR content types",
    body: "URLs, text, Wi-Fi, vCard, WhatsApp and phone — with frames, colors and center logos.",
  },
  {
    icon: <Barcode size={18} />,
    title: "Barcode formats",
    body: "Code 128, EAN-13, UPC-A and Code 39, with automatic check-digit validation.",
  },
  {
    icon: <FileArchive size={18} />,
    title: "Batch ZIP export",
    body: "Paste one value per line and download every code as a numbered PNG inside a single ZIP.",
  },
  {
    icon: <Printer size={18} />,
    title: "Print-ready labels",
    body: "A4 label sheets in three densities, printed at actual size straight from the browser.",
  },
  {
    icon: <ScanLine size={18} />,
    title: "Scan and read",
    body: "Decode QR codes with your camera or an uploaded screenshot — URL, Wi-Fi, contacts and more.",
  },
];

type HomeUseCaseAction =
  | { type: "qr"; qrKind: QRKind }
  | { type: "mode"; mode: "labels" | "barcode" };

const homeUseCases: {
  title: string;
  body: string;
  cta: string;
  image: string;
  alt: string;
  w: number;
  h: number;
  action: HomeUseCaseAction;
}[] = [
  {
    title: "Flyers & posters",
    body: "Link print to the page that matters — bookings, sign-ups, schedules — in a single scan.",
    cta: "Build a URL code",
    image: "assets/usecase-flyers.jpg",
    alt: "Paper flyer with a QR code beside the text",
    w: 713,
    h: 625,
    action: { type: "qr", qrKind: "URL" },
  },
  {
    title: "Menus & tables",
    body: "Print a Wi-Fi code for the counter and label sheets for every table. No password spelling, ever.",
    cta: "Wi-Fi code or labels",
    image: "assets/usecase-menus.jpg",
    alt: "Table tent holding a QR code for guests to scan",
    w: 712,
    h: 625,
    action: { type: "mode", mode: "labels" },
  },
  {
    title: "Packaging & shelves",
    body: "Code 128, EAN-13, UPC-A or Code 39 tags for assets, shelves and small production runs.",
    cta: "Generate a barcode",
    image: "assets/usecase-packaging.jpg",
    alt: "Barcode label on a product package ready to be scanned",
    w: 713,
    h: 625,
    action: { type: "mode", mode: "barcode" },
  },
  {
    title: "Business cards",
    body: "A vCard that drops your name, number and email straight into the other person's phone.",
    cta: "Make a vCard code",
    image: "assets/usecase-cards.jpg",
    alt: "Business card with a QR code on the back",
    w: 712,
    h: 625,
    action: { type: "qr", qrKind: "vCard" },
  },
  {
    title: "Bottles & jars",
    body: "A4 label sheets printed at actual size — ingredients, batch stories or a link to the full range.",
    cta: "Print a label sheet",
    image: "assets/usecase-bottles.jpg",
    alt: "Bottles carrying QR code labels",
    w: 712,
    h: 625,
    action: { type: "mode", mode: "labels" },
  },
  {
    title: "Brochures & manuals",
    body: "Extend the paper with the deep detail: spec sheets, warranty pages, video walkthroughs.",
    cta: "Encode a link",
    image: "assets/usecase-brochures.jpg",
    alt: "Brochure with a QR code on its back panel",
    w: 712,
    h: 625,
    action: { type: "qr", qrKind: "URL" },
  },
];

const homeCampaigns: {
  id: "events" | "studio" | "cause";
  icon: ReactNode;
  tab: string;
  title: string;
  body: string;
  image: string;
  alt: string;
}[] = [
  {
    id: "events",
    icon: <PartyPopper size={20} />,
    tab: "QR code for events",
    title: "An unmissable code for the big day",
    body: "Table cards that open the schedule, the venue map or a shared album. Generate in the morning, print a fresh sheet before doors open.",
    image: "assets/campaign-events.jpg",
    alt: "Guests at an event scanning a QR code card",
  },
  {
    id: "studio",
    icon: <Clapperboard size={20} />,
    tab: "QR code for photographers",
    title: "Galleries clients open in one tap",
    body: "Put the proofing gallery address on a code, frame it in a card, and hand it over with the photos. Nothing stored, nothing expiring.",
    image: "assets/campaign-photographers.jpg",
    alt: "Photographer handing over a printed card with a QR code",
  },
  {
    id: "cause",
    icon: <PiggyBank size={20} />,
    tab: "QR code for nonprofits",
    title: "Generosity with fewer taps",
    body: "Posters and flyers that carry supporters straight to the donation page. Works at markets, fairs and on every printed handout.",
    image: "assets/campaign-nonprofits.jpg",
    alt: "Volunteer setting up flyers with a QR code",
  },
];

const homeFaqGroups: { id: "basics" | "design" | "scan"; label: string; items: { q: string; a: string }[] }[] = [
  {
    id: "basics",
    label: "Basic information",
    items: [
      {
        q: "What exactly is a QR code?",
        a: "A square pattern of black and white modules that phones read with their camera. It stores plain data — most often a web address, Wi-Fi credentials or a contact card, which appears the moment the camera locks on.",
      },
      {
        q: "Are QR codes free to create here?",
        a: "Yes. Create and download codes with no account, no trial and no subscription. Generation happens in your browser, and you can export the result whenever it is ready.",
      },
      {
        q: "Are my details sent to a server?",
        a: "No. Content you type, uploaded logos and scanned images are processed on your device and stay there.",
      },
      {
        q: "Do QR codes expire?",
        a: "The code is just a picture, so it never expires on its own. One that holds a URL keeps working for as long as that address does — a good reason to double-check links before printing anything.",
      },
    ],
  },
  {
    id: "design",
    label: "Design & creation",
    items: [
      {
        q: "Can I add a logo or change the colors?",
        a: "Yes. Pick dot shapes, corner styles, colors and a caption frame, and drop a center logo in. Raise the error correction to High when you add a logo so the code stays safely scannable.",
      },
      {
        q: "PNG or SVG — which should I export?",
        a: "PNG is the safe pick for documents and social posts. SVG stays perfectly sharp at any size, which makes it the better choice for print, signage and laser engraving.",
      },
      {
        q: "Can I match the code to my brand?",
        a: "Beyond colors and shapes you can wrap the code in a frame with its own caption — scan types like Scan me or Menu, and keep the whole thing recognizably yours.",
      },
      {
        q: "Which design choices keep every scanner happy?",
        a: "Dark modules on a light background always. Avoid pastel-on-pastel pairings and very long URLs when there is little room, and you will be readable on every device in the room.",
      },
    ],
  },
  {
    id: "scan",
    label: "Scan & print",
    items: [
      {
        q: "Do I need an app to scan codes?",
        a: "No. Modern phone cameras read QR codes natively. This site also has an in-browser scanner — camera or uploaded screenshot — that decodes everything on your device.",
      },
      {
        q: "How do I scan a code from a saved image?",
        a: "Open the scanner mode and upload the file. Decoding runs locally, and results are one tap from useful — open the link, join the Wi-Fi or add the contact.",
      },
      {
        q: "How large should a printed QR code be?",
        a: "A practical minimum is one tenth of the expected scanning distance — 10 cm for a meter away — with the quiet margin of blank background around it intact. Label sheets and caption frames both respect that margin.",
      },
      {
        q: "What should I check before distributing codes?",
        a: "Verify the destination and every field, then scan a test export and print sample with the devices people will actually use.",
      },
    ],
  },
];

function QrTypePicker({
  value,
  onChange,
}: {
  value: QRKind;
  onChange: (kind: QRKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const current =
    qrTypeOptions.find((option) => option[0] === value) ?? qrTypeOptions[0];
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="type-picker"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        data-testid="select-qr-type"
      >
        <span className="type-picker-icon">{current[2]}</span>
        <span className="type-picker-label">{current[1]}</span>
        <ChevronDown size={16} />
      </button>
      {createPortal(
        <div
          className={`sheet-root ${open ? "open" : ""}`}
          aria-hidden={!open}
          data-testid="qr-type-sheet"
        >
          <div className="sheet-overlay" onClick={() => setOpen(false)} />
          <div
            className="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Select a QR type"
          >
            <div className="sheet-grab" aria-hidden="true" />
            <h3 className="sheet-title">Select a QR type</h3>
            <div className="sheet-list" role="listbox" aria-label="QR types">
              {qrTypeOptions.map(([kindValue, label, icon]) => (
                <button
                  key={kindValue}
                  type="button"
                  role="option"
                  aria-selected={value === kindValue}
                  className={`sheet-item ${value === kindValue ? "active" : ""}`}
                  onClick={() => {
                    onChange(kindValue);
                    setOpen(false);
                  }}
                  data-testid={`type-${kindValue.toLowerCase()}`}
                >
                  <span className="sheet-item-icon">{icon}</span>
                  <span className="sheet-item-label">{label}</span>
                  {value === kindValue && (
                    <Check size={16} className="sheet-item-check" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function DownloadMenu({
  mode,
  exportPixels,
  onPng,
  onSvg,
  up = false,
  testId,
}: {
  mode: Mode;
  exportPixels: number;
  onPng: () => void;
  onSvg: () => void;
  up?: boolean;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };
  return (
    <div className={`download-menu ${up ? "up" : ""}`} ref={ref}>
      <button
        type="button"
        className="download-btn png download-main"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
      >
        <ArrowDownToLine size={15} /> Download{" "}
        {mode === "qr" ? "QR" : "barcode"}{" "}
        <ChevronDown size={15} className="download-chevron" />
      </button>
      {open && (
        <div
          className="download-options"
          role="menu"
          aria-label="Choose a file type"
        >
          <button
            type="button"
            role="menuitem"
            className="download-option"
            onClick={() => choose(onPng)}
            data-testid={`${testId}-png`}
          >
            <strong>PNG image</strong>
            <small>
              {mode === "qr"
                ? `${exportPixels}px · web and print`
                : "Documents and sharing"}
            </small>
          </button>
          <button
            type="button"
            role="menuitem"
            className="download-option"
            onClick={() => choose(onSvg)}
            data-testid={`${testId}-svg`}
          >
            <strong>SVG vector</strong>
            <small>Sharp at any size</small>
          </button>
        </div>
      )}
    </div>
  );
}

function Workspace({ preset }: { preset?: string }) {
  const [currentLocation, setLocation] = useLocation();
  const currentSearch = useSearch();

  const isScannerInit =
    preset === "scanner" ||
    currentLocation === "/scanner" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "scanner");

  const [mode, setMode] = useState<Mode>(
    isScannerInit
      ? "scanner"
      : preset === "code128"
        ? "barcode"
        : preset === "labels"
          ? "labels"
          : "qr",
  );

  useEffect(() => {
    const requested = new URLSearchParams(currentSearch).get("mode");
    if (
      currentLocation === "/scanner" ||
      preset === "scanner" ||
      requested === "scanner"
    ) {
      // Arriving at the scanner view shows the scanner workspace; the camera
      // window is only opened by the explicit "Open Camera Scanner" action.
      setMode("scanner");
      setShowScanner(false);
    } else if (
      requested === "qr" ||
      requested === "barcode" ||
      requested === "bulk" ||
      requested === "labels"
    ) {
      setShowScanner(false);
      setMode(requested);
    }
  }, [currentLocation, currentSearch, preset]);

  // URL-driven navigation (footer tool links, the mobile drawer, back/forward)
  // must land on the workspace top. Without this, tapping "Barcode maker"
  // while deep in the page kept the viewport at the footer — the mode changed
  // but the inputs stayed off-screen above. In-app affordances (mode pills,
  // hub buttons, CTAs) already scroll explicitly; a duplicate scrollTo(0) is
  // idempotent.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    // The mode-driven content swap commits a frame later; the browser's scroll
    // anchoring re-pins the viewport against the old layout between our scroll
    // and that commit. Re-assert the top on the next frame(s) so the workspace
    // inputs are actually in the first viewport.
    requestAnimationFrame(() => window.scrollTo(0, 0));
    const settle = setTimeout(() => window.scrollTo(0, 0), 0);
    return () => clearTimeout(settle);
  }, [currentLocation, currentSearch]);

  useEffect(() => {
    const handleTriggerScanner = () => {
      setMode("scanner");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("open-qr-scanner", handleTriggerScanner);
    return () => window.removeEventListener("open-qr-scanner", handleTriggerScanner);
  }, []);

  // "Home" affordances (logo, Workspace, "Create a code") always return to the
  // QR generator — App state survives URL-only navigation, so without this a
  // tap on "Create a QR code" from a labels view would stay in labels.
  useEffect(() => {
    const handleReset = () => {
      setMode("qr");
      setStep("content");
      setShowScanner(false);
      setError("");
    };
    window.addEventListener("reset-workspace-qr", handleReset);
    return () => window.removeEventListener("reset-workspace-qr", handleReset);
  }, []);

  const [kind, setKind] = useState<QRKind>(
    preset === "wifi"
      ? "Wi-Fi"
      : preset === "vcard"
        ? "vCard"
        : preset === "whatsapp"
          ? "WhatsApp"
          : "URL",
  );
  const [barcodeKind, setBarcodeKind] = useState<BarcodeKind>("CODE128");
  const [text, setText] = useState("");
  const [ssid, setSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState("WPA");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsMessage, setWhatsMessage] = useState("");
  const [barValue, setBarValue] = useState("");
  const [pattern, setPattern] = useState("rounded");
  const [eyeFrame, setEyeFrame] = useState("extra-rounded");
  const [eyeCenter, setEyeCenter] = useState("dot");
  const [qrFrame, setQrFrame] = useState("none");
  const [frameText, setFrameText] = useState("");
  const [fg, setFg] = useState("#0F172A");
  const [bg, setBg] = useState("#FFFFFF");
  const [ecc, setEcc] = useState("Q");
  const [includeMargin, setIncludeMargin] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreset, setLogoPreset] = useState("none");
  const [logoBadge, setLogoBadge] = useState("rounded");
  const [logoScale, setLogoScale] = useState(0.18);
  const [qrDesignTab, setQrDesignTab] = useState<QrDesignTab>("shape");
  const [exportPixels, setExportPixels] = useState(2048);
  const [error, setError] = useState("");
  const [codeData, setCodeData] = useState("");
  const [svgData, setSvgData] = useState("");
  const [batch, setBatch] = useState("");
  const [zipBusy, setZipBusy] = useState(false);
  const [labelRows, setLabelRows] = useState(12);
  const [labelBarcode, setLabelBarcode] = useState(false);
  const [wifiHidden, setWifiHidden] = useState(false);
  const [activeType, setActiveType] = useState<QRKind>("URL");
  const typeStripRef = useRef<HTMLDivElement | null>(null);
  // On phones the type strip is a horizontal swipe row; keep the tapped tab
  // centred so the choice and its details stay visually connected.
  const centerTypeTab = (el: HTMLElement) => {
    const strip = typeStripRef.current;
    if (!strip || strip.scrollWidth <= strip.clientWidth + 2) return;
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    const tabRect = el.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    const left =
      strip.scrollLeft +
      (tabRect.left - stripRect.left) -
      (strip.clientWidth - tabRect.width) / 2;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: Math.max(0, left), behavior: reduced ? "auto" : "smooth" });
  };
  const [campaignKind, setCampaignKind] = useState<"events" | "studio" | "cause">("events");
  const [faqGroup, setFaqGroup] = useState<"basics" | "design" | "scan">("basics");
  const activeCampaign =
    homeCampaigns.find((story) => story.id === campaignKind) ?? homeCampaigns[0];

  // New Scanner State — the camera window never opens on its own; only the
  // explicit "Open Camera Scanner" / "Scan another" actions open it.
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [isHubDragOver, setIsHubDragOver] = useState(false);
  const [isHubDecoding, setIsHubDecoding] = useState(false);
  const hubFileInputRef = useRef<HTMLInputElement>(null);

  const handleUseAsQrContent = useCallback(
    (
      targetKind: "URL" | "Text" | "Wi-Fi" | "vCard" | "WhatsApp" | "Phone",
      values: {
        text?: string;
        ssid?: string;
        wifiPass?: string;
        wifiSecurity?: string;
        name?: string;
        company?: string;
        phone?: string;
        email?: string;
        whatsMessage?: string;
      },
    ) => {
      setKind(targetKind);
      if (values.text !== undefined) setText(values.text);
      if (values.ssid !== undefined) setSsid(values.ssid);
      if (values.wifiPass !== undefined) setWifiPass(values.wifiPass);
      if (values.wifiSecurity !== undefined)
        setWifiSecurity(values.wifiSecurity);
      if (values.name !== undefined) setName(values.name);
      if (values.company !== undefined) setCompany(values.company);
      if (values.phone !== undefined) setPhone(values.phone);
      if (values.email !== undefined) setEmail(values.email);
      if (values.whatsMessage !== undefined)
        setWhatsMessage(values.whatsMessage);
      setMode("qr");
      setStep("content");
      setError("");
      if (currentLocation === "/scanner") {
        setLocation("/");
      }
    },
    [currentLocation, setLocation],
  );

  const handleHubFileDecode = async (file: File) => {
    setIsHubDecoding(true);
    setError("");
    try {
      const text = await decodeQrFromImageFile(file);
      playScanSuccessSound();
      setScanResult(text);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No QR code could be detected in this image.",
      );
    } finally {
      setIsHubDecoding(false);
    }
  };

  // Homepage CTAs: preselect a QR type and jump to the workspace controls.
  const startGenerating = useCallback(
    (nextKind: QRKind) => {
      setMode("qr");
      setKind(nextKind);
      setStep("content");
      setError("");
      setShowScanner(false);
      // Normalize the URL too: a lingering ?mode= would re-run the mode effect
      // and fight the freshly selected type on reload or back/forward.
      if (currentLocation !== "/" || currentSearch) setLocation("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentLocation, currentSearch, setLocation],
  );

  const openMode = useCallback(
    (nextMode: "barcode" | "labels") => {
      setMode(nextMode);
      setShowScanner(false);
      setError("");
      if (currentLocation !== "/" || !currentSearch.includes(`mode=${nextMode}`)) {
        setLocation(`/?mode=${nextMode}`);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentLocation, currentSearch, setLocation],
  );

  const followUseCase = useCallback(
    (action: HomeUseCaseAction) => {
      if (action.type === "qr") startGenerating(action.qrKind);
      else openMode(action.mode);
    },
    [startGenerating, openMode],
  );

  // Mobile-only selection motion: the strip's highlight glides to the chosen
  // tool, the strip auto-centres it, and the switched workspace section
  // slides in. Completely inert above 640px and under reduced motion.
  const modeStripRef = useRef<HTMLDivElement | null>(null);
  const workspaceGridRef = useRef<HTMLDivElement | null>(null);
  const modeFirstRun = useRef(true);
  const sectionFirstRun = useRef(true);

  useEffect(() => {
    const strip = modeStripRef.current;
    const dot = strip?.querySelector<HTMLSpanElement>(".mode-indicator") ?? null;
    const pill = strip?.querySelector<HTMLButtonElement>(".mode-pill.active") ?? null;
    const mobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    if (!strip || !dot || !pill || !mobile) return;
    const first = modeFirstRun.current;
    modeFirstRun.current = false;
    const place = (glide: boolean) => {
      if (!glide) dot.style.transition = "none";
      dot.style.width = `${pill.offsetWidth}px`;
      dot.style.transform = `translateX(${pill.offsetLeft}px)`;
      dot.style.opacity = "1";
      if (!glide) {
        void dot.offsetWidth;
        dot.style.transition = "";
      }
    };
    place(!first);
    strip.scrollTo({
      left: Math.max(
        0,
        pill.offsetLeft + pill.offsetWidth / 2 - strip.clientWidth / 2,
      ),
      behavior: "smooth",
    });
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    void document.fonts?.ready?.then(() => {
      if (document.contains(dot)) place(false);
    });
    return () => window.removeEventListener("resize", onResize);
  }, [mode]);

  useEffect(() => {
    const first = sectionFirstRun.current;
    sectionFirstRun.current = false;
    const mobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (first || !mobile || reduced) return;
    const grid = workspaceGridRef.current;
    if (!grid) return;
    grid.classList.remove("mode-enter");
    void grid.offsetWidth;
    grid.classList.add("mode-enter");
  }, [mode]);

  const isMobile = useIsMobile();
  const [step, setStep] = useState<MobileStep>("content");
  const showContent = !isMobile || step === "content";
  const showDesign = !isMobile || step === "design";
  const qrSvgRef = useRef<SVGSVGElement | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const previewUrlRef = useRef("");

  const batchItems = useMemo(
    () =>
      batch
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [batch],
  );

  useEffect(() => {
    if (preset === "wifi") setKind("Wi-Fi");
    if (preset === "vcard") setKind("vCard");
    if (preset === "whatsapp") setKind("WhatsApp");
    if (preset === "code128") {
      setMode("barcode");
      setBarcodeKind("CODE128");
    }
    if (preset === "labels") setMode("labels");
  }, [preset]);

  const qrText = useMemo(() => {
    const escapeVCard = (value: string) =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replace(/([,;])/g, "\\$1");
    if (kind === "Wi-Fi")
      return ssid
        ? `WIFI:T:${wifiSecurity};S:${ssid.replace(/[\\;,:]/g, "\\$&")};${wifiSecurity === "nopass" ? "" : `P:${wifiPass.replace(/[\\;,:]/g, "\\$&")};`}${wifiHidden ? "H:true;" : ""};`
        : "";
    if (kind === "vCard") {
      if (!name.trim()) return "";
      const parts = name.trim().split(/\s+/);
      const family = parts.length > 1 ? (parts.pop() as string) : "";
      const given = parts.join(" ");
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(family)};${escapeVCard(given)};;;`,
        `FN:${escapeVCard(name.trim())}`,
        company.trim() && `ORG:${escapeVCard(company.trim())}`,
        phone.trim() && `TEL:${escapeVCard(phone.trim())}`,
        email.trim() && `EMAIL:${escapeVCard(email.trim())}`,
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (kind === "WhatsApp")
      return phone
        ? `https://wa.me/${phone.replace(/\D/g, "")}${whatsMessage ? `?text=${encodeURIComponent(whatsMessage)}` : ""}`
        : "";
    if (kind === "Phone")
      return phone.trim() ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
    if (kind === "URL") return websiteLink(text);
    return text.trim();
  }, [
    kind,
    ssid,
    wifiSecurity,
    wifiPass,
    name,
    company,
    phone,
    email,
    whatsMessage,
    text,
    wifiHidden,
  ]);

  const previewText =
    mode === "bulk"
      ? (batchItems[0] ?? "")
      : mode === "scanner"
        ? scanResult
        : qrText;

  useEffect(() => {
    if (mode !== "qr" && mode !== "bulk" && !(mode === "scanner" && scanResult))
      return;
    if (!previewText) {
      setCodeData("");
      setSvgData("");
      if (mode !== "scanner") {
        setError(
          mode === "bulk"
            ? "Paste at least one value to preview your batch."
            : kind === "URL" && text.trim()
              ? "Only website links can become a QR code here — use a web address like https://www.example.com."
              : "Add the required content to create your QR code.",
        );
      }
      return;
    }
    let dead = false;
    const qr = new QRCodeStyling({
      width: 640,
      height: 640,
      type: "svg",
      data: previewText,
      margin: includeMargin ? 18 : 0,
      qrOptions: { errorCorrectionLevel: ecc as "L" | "M" | "Q" | "H" },
      dotsOptions: { color: fg, type: dotStyles[pattern] || "rounded" },
      backgroundOptions: { color: bg },
      cornersSquareOptions: {
        color: fg,
        type: eyeFrame as
          | "dot"
          | "square"
          | "extra-rounded"
          | "rounded"
          | "dots"
          | "classy"
          | "classy-rounded",
      },
      cornersDotOptions: { color: fg, type: eyeCenter as "dot" | "square" },
    });
    qr.getRawData("svg")
      .then(async (raw) => {
        if (!raw || dead) return;
        const originalSvg =
          raw instanceof Blob ? await raw.text() : raw.toString();
        const data = addQrFrame(
          addQrLogo(originalSvg, logoUrl, logoBadge, logoScale),
          qrFrame,
          fg,
          bg,
          frameText,
        );
        if (dead) return;
        setSvgData(data);
        const pngBlob = await svgToPng(data);
        if (!dead) {
          const next = URL.createObjectURL(pngBlob);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = next;
          setCodeData(next);
          setError("");
        }
      })
      .catch(() => {
        if (!dead)
          setError("This content could not be encoded. Try shortening it.");
      });
    return () => {
      dead = true;
    };
  }, [
    mode,
    kind,
    text,
    previewText,
    pattern,
    fg,
    bg,
    ecc,
    includeMargin,
    logoUrl,
    logoBadge,
    logoScale,
    eyeFrame,
    eyeCenter,
    qrFrame,
    frameText,
  ]);

  useEffect(() => {
    if (mode !== "barcode") return;
    if (!barValue.trim()) {
      setCodeData("");
      setSvgData("");
      setError("Enter a barcode value to preview.");
      return;
    }
    let dead = false;
    let svgUrl = "";
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const value = normalizedBarcode(barValue, barcodeKind);
      JsBarcode(svg, value, {
        format: barcodeKind === "UPC" ? "UPC" : barcodeKind,
        lineColor: fg,
        background: bg,
        width: 2,
        height: 88,
        displayValue: true,
        margin: includeMargin ? 12 : 0,
        font: "Inter",
        fontSize: 15,
      });
      barcodeSvgRef.current = svg;
      setSvgData(new XMLSerializer().serializeToString(svg));
      const image = new Image();
      svgUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], {
          type: "image/svg+xml",
        }),
      );
      image.onload = () => {
        if (dead) return;
        const canvas = document.createElement("canvas");
        canvas.width = image.width * 2;
        canvas.height = image.height * 2;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          setCodeData(canvas.toDataURL("image/png"));
        }
        URL.revokeObjectURL(svgUrl);
      };
      image.onerror = () => {
        if (!dead) setError("The barcode preview could not be rendered.");
      };
      image.src = svgUrl;
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Enter a valid value for this barcode format.",
      );
      setCodeData("");
      setSvgData("");
    }
    return () => {
      dead = true;
      if (svgUrl) URL.revokeObjectURL(svgUrl);
    };
  }, [mode, barValue, barcodeKind, fg, bg, includeMargin]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function switchMode(next: Mode) {
    if (next === mode) return;
    setShowScanner(false);
    setMode(next);
    setError("");
    setCodeData("");
    setSvgData("");
    if (next === "scanner" && currentLocation !== "/scanner") {
      setLocation("/scanner");
    } else if (next !== "scanner" && currentLocation === "/scanner") {
      setLocation("/");
    } else if (
      next !== "scanner" &&
      new URLSearchParams(window.location.search).has("mode")
    ) {
      setLocation("/");
    }
  }
  function downloadBlob(blob: Blob, filename: string) {
    saveAs(blob, filename);
  }
  async function downloadPng() {
    if ((mode === "qr" || mode === "scanner") && svgData) {
      try {
        const blob = await svgToPng(svgData, exportPixels);
        downloadBlob(blob, `utilitycodes-${exportPixels}px.png`);
      } catch {
        setError(
          "High-resolution PNG export failed. Try a smaller pixel size.",
        );
      }
      return;
    }
    if (!codeData) return;
    try {
      const response = await fetch(codeData);
      if (!response.ok) throw new Error("PNG download failed.");
      downloadBlob(await response.blob(), "utilitycodes.png");
    } catch {
      setError("PNG export failed. Try generating the code again.");
    }
  }
  function downloadSvg() {
    if (svgData)
      downloadBlob(
        new Blob([svgData], { type: "image/svg+xml" }),
        "utilitycodes.svg",
      );
  }
  async function handleLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, WebP or SVG logo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose a logo smaller than 8 MB.");
      return;
    }
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const loaded = new Image();
        loaded.onload = () => resolve(loaded);
        loaded.onerror = () =>
          reject(new Error("Logo image could not be read."));
        loaded.src = sourceUrl;
      });
      const scale = Math.min(
        1,
        1024 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable.");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const localPng = canvas.toDataURL("image/png");
      setLogoPreset("custom");
      setLogoUrl(localPng);
      setEcc("H");
      setError("");
    } catch {
      setError(
        "That logo could not be prepared. Try a PNG or JPG image without external SVG links.",
      );
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }
  function selectLogoPreset(value: string) {
    setLogoPreset(value);
    setLogoUrl(
      value === "custom" || value === "none" ? "" : brandMarkData(value),
    );
    if (value !== "none") setEcc("H");
  }
  async function createZip() {
    if (!batchItems.length) {
      setError("Add at least one non-empty line to your batch.");
      return;
    }
    setZipBusy(true);
    setError("");
    try {
      const zip = new JSZip();
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const qr = new QRCodeStyling({
          width: 540,
          height: 540,
          type: "svg",
          data: item,
          margin: 16,
          dotsOptions: { color: fg, type: dotStyles[pattern] || "rounded" },
          cornersSquareOptions: {
            color: fg,
            type: eyeFrame as
              | "dot"
              | "square"
              | "extra-rounded"
              | "rounded"
              | "dots"
              | "classy"
              | "classy-rounded",
          },
          cornersDotOptions: { color: fg, type: eyeCenter as "dot" | "square" },
          backgroundOptions: { color: bg },
          qrOptions: { errorCorrectionLevel: ecc as "L" | "M" | "Q" | "H" },
        });
        const raw = await qr.getRawData("svg");
        if (raw) {
          const svg = raw instanceof Blob ? await raw.text() : raw.toString();
          const withLogo = addQrLogo(svg, logoUrl, logoBadge, logoScale);
          zip.file(
            `${String(i + 1).padStart(3, "0")}-code.png`,
            await svgToPng(
              addQrFrame(withLogo, qrFrame, fg, bg, frameText),
              isMobile ? Math.min(exportPixels, 1024) : exportPixels,
            ),
          );
        }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "utilitycodes-batch.zip");
    } catch {
      setError(
        "The batch could not be created. Check the content and try again.",
      );
    } finally {
      setZipBusy(false);
    }
  }

  const modeTitle =
    mode === "qr"
      ? "QR code maker"
      : mode === "barcode"
        ? "Barcode maker"
        : mode === "bulk"
          ? "Batch ZIP export"
          : mode === "labels"
            ? "Printable label sheet"
            : "QR Scanner";

  const mobileHeadline =
    mode === "barcode"
      ? "Barcode Generator: Create Free Barcodes"
      : mode === "bulk"
        ? "Batch QR Export: Many Codes at Once"
        : mode === "labels"
          ? "Printable QR Label Sheets"
          : mode === "scanner"
            ? "QR Code Scanner: Read Codes Instantly"
            : "QR Code Generator: Create your Free QR Code";

  return (
    <main className="page-wrap">
      <section className="workspace-head">
        <div>
          <div className="eyebrow">The browser-side code toolkit</div>
          <h1>
            {isMobile ? mobileHeadline : "Create a code. Keep it moving."}
          </h1>
          <p>
            {isMobile
              ? "Make QR codes and barcodes in seconds. Everything is processed on this device."
              : "Quick QR codes, barcodes and print-ready labels — all processed on this device."}
          </p>
        </div>
        <div className="privacy-pill">
          <ShieldCheck size={15} /> Your data stays in this browser
        </div>
      </section>
      <div
        className="mode-switcher"
        role="tablist"
        aria-label="Utility tools"
        ref={modeStripRef}
      >
        <span className="mode-indicator" aria-hidden="true" />
        {(
          [
            ["qr", <QrCode size={15} />, "QR code"],
            ["barcode", <Barcode size={15} />, "Barcode"],
            ["bulk", <FileArchive size={15} />, "Batch ZIP"],
            ["labels", <ImagePlus size={15} />, "Label sheet"],
            ["scanner", <ScanLine size={15} />, "Scan QR"],
          ] as [Mode, ReactNode, string][]
        ).map(([key, icon, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            className={`mode-pill ${mode === key ? "active" : ""}`}
            onClick={() => switchMode(key)}
            data-testid={`tab-${key}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div
        ref={workspaceGridRef}
        className={`workspace-grid mode-${mode}`}
      >
        <section className="panel controls-panel" aria-label={`${modeTitle} controls`}>
          <div className="control-head">
            <div>
              <h2 className="section-title">{modeTitle}</h2>
              <p className="section-hint">
                {mode === "scanner"
                  ? "Scan a QR code using your camera or upload an image."
                  : mode === "bulk"
                    ? "One line per code. Download every QR as a ZIP."
                    : mode === "labels"
                      ? "Prepare a print-ready A4 grid."
                      : "Set the content, tune the details, export when ready."}
              </p>
            </div>
            <span className="eyebrow">
              {mode === "scanner" ? "SCANNER" : "LOCAL"}
            </span>
          </div>

          {mode === "qr" && (
            <>
              {isMobile && (
                <div
                  className="qr-design-tabs qr-step-tabs"
                  role="tablist"
                  aria-label="QR steps"
                >
                  {(
                    [
                      ["content", "1", "Content"],
                      ["design", "2", "Design"],
                    ] as [MobileStep, string, string][]
                  ).map(([key, num, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={step === key}
                      className={`qr-design-tab ${step === key ? "active" : ""}`}
                      onClick={() => setStep(key)}
                      data-testid={`step-${key}`}
                    >
                      <span className="step-number">{num}</span>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {showContent && (
                <>
                  {isMobile ? (
                    <QrTypePicker
                      value={kind}
                      onChange={(next) => {
                        setKind(next);
                        setError("");
                      }}
                    />
                  ) : (
                    <div
                      className="content-type-row"
                      role="group"
                      aria-label="QR content type"
                    >
                      {(
                        [
                          "URL",
                          "Text",
                          "Wi-Fi",
                          "vCard",
                          "WhatsApp",
                          "Phone",
                        ] as QRKind[]
                      ).map((t) => (
                        <button
                          className={`type-chip ${kind === t ? "active" : ""}`}
                          key={t}
                          type="button"
                          onClick={() => {
                            setKind(t);
                            setError("");
                          }}
                          data-testid={`type-${t.toLowerCase()}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  {["URL", "Text"].includes(kind) && (
                    <Field
                      label={kind === "URL" ? "Website address" : "Your text"}
                      help={
                        kind === "URL"
                          ? "Website links only — like https://www.example.com or example.com."
                          : `${text.length} characters`
                      }
                    >
                      <textarea
                        className="textarea-control"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={
                          kind === "URL"
                            ? "https://example.com"
                            : "Type or paste your content"
                        }
                        data-testid="input-qr-content"
                        rows={3}
                        inputMode={kind === "URL" ? "url" : "text"}
                        autoCapitalize={kind === "URL" ? "none" : "sentences"}
                        autoCorrect={kind === "URL" ? "off" : "on"}
                        spellCheck={kind !== "URL"}
                      />
                    </Field>
                  )}
                  {kind === "Wi-Fi" && (
                    <>
                      <Field label="Network name (SSID)">
                        <input
                          className="control"
                          value={ssid}
                          onChange={(e) => setSsid(e.target.value)}
                          placeholder="e.g. Studio Guest"
                          data-testid="input-wifi-ssid"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      </Field>
                      <div className="form-grid">
                        <Field label="Password">
                          <input
                            className="control"
                            value={wifiPass}
                            onChange={(e) => setWifiPass(e.target.value)}
                            type="password"
                            placeholder="Network password"
                            data-testid="input-wifi-password"
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="off"
                          />
                        </Field>
                        <Field label="Security">
                          <select
                            className="select-control"
                            value={wifiSecurity}
                            onChange={(e) => setWifiSecurity(e.target.value)}
                            data-testid="select-wifi-security"
                          >
                            <option>WPA</option>
                            <option>WEP</option>
                            <option>nopass</option>
                          </select>
                        </Field>
                      </div>
                      <label className="toggle-line">
                        <span>Hidden network</span>
                        <input
                          type="checkbox"
                          checked={wifiHidden}
                          data-testid="toggle-hidden-network"
                          onChange={(e) => setWifiHidden(e.target.checked)}
                        />
                      </label>
                    </>
                  )}
                  {kind === "vCard" && (
                    <>
                      <div className="form-grid">
                        <Field label="Full name">
                          <input
                            className="control"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Sam Taylor"
                            data-testid="input-vcard-name"
                            autoComplete="name"
                          />
                        </Field>
                        <Field label="Company">
                          <input
                            className="control"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Company name"
                            data-testid="input-vcard-company"
                            autoComplete="organization"
                          />
                        </Field>
                        <Field label="Phone">
                          <input
                            className="control"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 555 0100"
                            data-testid="input-vcard-phone"
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            className="control"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="sam@example.com"
                            data-testid="input-vcard-email"
                          />
                        </Field>
                      </div>
                    </>
                  )}
                  {kind === "WhatsApp" && (
                    <>
                      <Field
                        label="WhatsApp phone number"
                        help="Include the country code; spaces and punctuation are removed."
                      >
                        <input
                          className="control"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 555 0100"
                          data-testid="input-whatsapp-phone"
                        />
                      </Field>
                      <Field label="Prefilled message (optional)">
                        <textarea
                          className="textarea-control"
                          value={whatsMessage}
                          onChange={(e) => setWhatsMessage(e.target.value)}
                          placeholder="Hi! I'd like to know more…"
                          data-testid="input-whatsapp-message"
                          rows={2}
                        />
                      </Field>
                    </>
                  )}
                  {kind === "Phone" && (
                    <Field label="Phone number">
                      <input
                        className="control"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555 0100"
                        data-testid="input-qr-phone"
                      />
                    </Field>
                  )}
                  {isMobile && (
                    <button
                      type="button"
                      className="btn step-next"
                      onClick={() => setStep("design")}
                      data-testid="button-next-design"
                    >
                      Next: Design your QR <ChevronRight size={15} />
                    </button>
                  )}
                </>
              )}

              {showDesign && (
                <div className="subsection qr-customizer">
                  {!isMobile && (
                    <div className="control-head">
                      <div>
                        <h3 className="section-title">
                          <span className="step-number">2</span> Design your QR
                        </h3>
                        <p className="section-hint">
                          Explore the shape, logo and scan settings.
                        </p>
                      </div>
                      <Sparkles size={17} color="#64748b" />
                    </div>
                  )}
                  <div
                    className="qr-design-tabs"
                    role="tablist"
                    aria-label="QR design settings"
                  >
                    {(
                      [
                        ["frame", "Frame", <ImagePlus size={14} />],
                        ["shape", "Shape", <QrCode size={14} />],
                        ["logo", "Logo", <ImagePlus size={14} />],
                        ["level", "Level", <ShieldCheck size={14} />],
                      ] as [QrDesignTab, string, ReactNode][]
                    ).map(([key, label, icon]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={qrDesignTab === key}
                        className={`qr-design-tab ${qrDesignTab === key ? "active" : ""}`}
                        onClick={() => setQrDesignTab(key)}
                        data-testid={`qr-design-tab-${key}`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="qr-design-content">
                    {qrDesignTab === "shape" && (
                      <>
                        <div className="design-section-head">
                          <div>
                            <strong>Shape style</strong>
                            <span>
                              Choose the module look that fits your brand.
                            </span>
                          </div>
                        </div>
                        <div
                          className="shape-card-grid"
                          role="group"
                          aria-label="QR shape styles"
                        >
                          {(
                            [
                              ["square", "Square", "Crisp and classic"],
                              ["rounded", "Soft", "Smooth corners"],
                              ["dots", "Dots", "Light and friendly"],
                              ["classy", "Classy", "Distinctive detail"],
                              ["fluid", "Fluid", "Organic flow"],
                              ["extra-rounded", "Pill", "Extra rounded"],
                            ] as [string, string, string][]
                          ).map(([value, label, hint]) => (
                            <button
                              key={value}
                              type="button"
                              className={`shape-card ${pattern === value ? "active" : ""}`}
                              aria-pressed={pattern === value}
                              onClick={() => setPattern(value)}
                              data-testid={`button-shape-${value}`}
                            >
                              <span className="shape-card-art" aria-hidden="true">
                                <QrPatternThumb pattern={value} />
                                {pattern === value && (
                                  <span className="shape-selected">
                                    <Check size={12} />
                                  </span>
                                )}
                              </span>
                              <span className="shape-card-label">{label}</span>
                              <span className="shape-card-hint">{hint}</span>
                            </button>
                          ))}
                        </div>
                        <div className="design-section-head eye-heading">
                          <div>
                            <strong>Finder eyes</strong>
                            <span>Shape the three corner markers.</span>
                          </div>
                        </div>
                        <div className="eye-options">
                          <div className="eye-option-group">
                            <span className="eye-option-label">
                              Outer frame
                            </span>
                            <div className="eye-option-buttons">
                              {(
                                [
                                  ["square", "Square"],
                                  ["extra-rounded", "Rounded"],
                                  ["dot", "Circle"],
                                ] as [string, string][]
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`eye-option ${eyeFrame === value ? "active" : ""}`}
                                  aria-label={`${label} finder frame`}
                                  aria-pressed={eyeFrame === value}
                                  onClick={() => setEyeFrame(value)}
                                >
                                  <span className={`eye-glyph outer-${value}`}>
                                    <i />
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="eye-option-group">
                            <span className="eye-option-label">
                              Center mark
                            </span>
                            <div className="eye-option-buttons">
                              {(
                                [
                                  ["square", "Square"],
                                  ["dot", "Circle"],
                                ] as [string, string][]
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`eye-option ${eyeCenter === value ? "active" : ""}`}
                                  aria-label={`${label} finder center`}
                                  aria-pressed={eyeCenter === value}
                                  onClick={() => setEyeCenter(value)}
                                >
                                  <span className={`eye-glyph inner-${value}`}>
                                    <i />
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="design-color-row">
                          <Field label="Code color">
                            <div className="swatch-row">
                              <input
                                className="color-input"
                                type="color"
                                value={fg}
                                onChange={(e) => setFg(e.target.value)}
                                aria-label="Pick code color"
                                data-testid="color-foreground"
                              />
                              <input
                                className="control color-code"
                                value={fg}
                                onChange={(e) => setFg(e.target.value)}
                                aria-label="Foreground hex color"
                                autoCapitalize="none"
                                spellCheck={false}
                              />
                            </div>
                          </Field>
                          <Field label="Background color">
                            <div className="swatch-row">
                              <input
                                className="color-input"
                                type="color"
                                value={bg}
                                onChange={(e) => setBg(e.target.value)}
                                aria-label="Pick background color"
                                data-testid="color-background"
                              />
                              <input
                                className="control color-code"
                                value={bg}
                                onChange={(e) => setBg(e.target.value)}
                                aria-label="Background hex color"
                                autoCapitalize="none"
                                spellCheck={false}
                              />
                            </div>
                          </Field>
                          <button
                            className="invert-colors"
                            type="button"
                            onClick={() => {
                              setFg(bg);
                              setBg(fg);
                            }}
                            data-testid="button-invert-colors"
                          >
                            Invert
                          </button>
                        </div>
                      </>
                    )}

                    {qrDesignTab === "frame" && (
                      <>
                        <div className="design-section-head">
                          <div>
                            <strong>Call-to-action frame</strong>
                            <span>Add a short invitation below your code.</span>
                          </div>
                        </div>
                        <div
                          className="frame-card-grid"
                          role="group"
                          aria-label="QR call-to-action frame"
                        >
                          {(
                            [
                              ["none", "No frame", "Just the code"],
                              ["scan", "Scan me", "Clear and direct"],
                              [
                                "point",
                                "Point your camera",
                                "Helpful instruction",
                              ],
                              ["custom", "Your text", "Write your own"],
                            ] as [string, string, string][]
                          ).map(([value, label, hint]) => (
                            <button
                              key={value}
                              type="button"
                              className={`frame-card ${qrFrame === value ? "active" : ""}`}
                              aria-pressed={qrFrame === value}
                              onClick={() => setQrFrame(value)}
                              data-testid={`button-frame-${value}`}
                            >
                              <span className="frame-card-code">
                                <QrCode size={22} />
                                {value !== "none" && (
                                  <small>
                                    {value === "scan"
                                      ? "SCAN ME"
                                      : value === "point"
                                        ? "POINT CAMERA"
                                        : "YOUR TEXT"}
                                  </small>
                                )}
                              </span>
                              <strong>{label}</strong>
                              <span>{hint}</span>
                            </button>
                          ))}
                        </div>
                        {qrFrame !== "none" && (
                          <div style={{ marginTop: 14 }}>
                            <Field
                              label="Text below the QR code"
                              help={
                                qrFrame === "custom"
                                  ? `${frameText.length}/28 · this text appears under your code.`
                                  : `${frameText.length}/28 · leave empty to use the default caption.`
                              }
                            >
                              <input
                                className="control"
                                value={frameText}
                                maxLength={28}
                                onChange={(e) => setFrameText(e.target.value)}
                                placeholder={
                                  qrFrame === "scan"
                                    ? "SCAN ME"
                                    : qrFrame === "point"
                                      ? "POINT YOUR CAMERA"
                                      : "e.g. Scan to see our menu"
                                }
                                data-testid="input-frame-text"
                              />
                            </Field>
                          </div>
                        )}
                        <label className="toggle-line">
                          <span>
                            <strong>Keep a quiet zone</strong>
                            <small>
                              Leave a clear margin around the QR pattern for
                              easier scanning.
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            checked={includeMargin}
                            onChange={(e) => setIncludeMargin(e.target.checked)}
                            data-testid="toggle-quiet-zone"
                          />
                        </label>
                      </>
                    )}

                    {qrDesignTab === "logo" && (
                      <>
                        <div className="design-section-head">
                          <div>
                            <strong>Center logo</strong>
                            <span>
                              Place your own mark in the middle of the code.
                            </span>
                          </div>
                        </div>
                        {logoUrl ? (
                          <div className="logo-preview-card">
                            <span className="logo-preview-image">
                              <img
                                src={logoUrl}
                                alt="Uploaded center logo preview"
                              />
                            </span>
                            <span className="logo-preview-copy">
                              <strong>
                                {logoPreset === "custom"
                                  ? "Your uploaded logo"
                                  : `${logoPreset[0].toUpperCase()}${logoPreset.slice(1)} icon`}
                              </strong>
                              <small>
                                It will appear in the live QR and in PNG/SVG
                                exports.
                              </small>
                            </span>
                            <button
                              className="logo-remove"
                              type="button"
                              onClick={() => {
                                setLogoUrl("");
                                setLogoPreset("none");
                              }}
                              aria-label="Remove center logo"
                              data-testid="button-remove-logo"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <label
                            className="logo-upload-card"
                            htmlFor="center-logo-file"
                          >
                            <span className="logo-upload-icon">
                              <ImagePlus size={19} />
                            </span>
                            <span>
                              <strong>Upload a center logo</strong>
                              <small>
                                PNG, JPG, WebP or SVG · up to 8 MB · processed
                                here
                              </small>
                            </span>
                            <span className="logo-upload-action">
                              Choose file
                            </span>
                            <input
                              id="center-logo-file"
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              onChange={(e) => {
                                void handleLogo(e.target.files?.[0]);
                                e.currentTarget.value = "";
                              }}
                              data-testid="input-logo-upload"
                            />
                          </label>
                        )}
                        <div className="logo-preset-row">
                          <span className="eye-option-label">
                            Or use a ready-made mark
                          </span>
                          <div className="logo-presets">
                            {(
                              [
                                ["instagram", "Instagram"],
                                ["whatsapp", "WhatsApp"],
                                ["youtube", "YouTube"],
                                ["globe", "Globe"],
                                ["shop", "Shop"],
                              ] as [string, string][]
                            ).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                className={`logo-preset ${logoPreset === value ? "active" : ""}`}
                                onClick={() => selectLogoPreset(value)}
                                aria-label={`Use ${label} logo`}
                                aria-pressed={logoPreset === value}
                                data-testid={`logo-preset-${value}`}
                              >
                                <img src={brandMarkData(value)} alt="" />
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        {logoUrl && (
                          <div className="logo-detail-controls">
                            <div className="logo-badge-options">
                              <span className="eye-option-label">
                                Logo backing
                              </span>
                              {(
                                [
                                  ["rounded", "Rounded"],
                                  ["square", "Square"],
                                  ["circle", "Circle"],
                                ] as [string, string][]
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`mini-choice ${logoBadge === value ? "active" : ""}`}
                                  onClick={() => setLogoBadge(value)}
                                  aria-pressed={logoBadge === value}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <Field
                              label={`Logo size · ${Math.round(logoScale * 100)}%`}
                            >
                              <input
                                className="range-control"
                                type="range"
                                min=".12"
                                max=".22"
                                step=".01"
                                value={logoScale}
                                onChange={(e) =>
                                  setLogoScale(Number(e.target.value))
                                }
                                aria-label="Center logo size"
                                data-testid="range-logo-size"
                              />
                            </Field>
                          </div>
                        )}
                        {logoUrl && (
                          <div className="notice logo-scan-note">
                            <strong>Logo added.</strong> High error correction
                            is selected to help preserve scan reliability. Test
                            the exported code with a phone.
                          </div>
                        )}
                      </>
                    )}

                    {qrDesignTab === "level" && (
                      <>
                        <div className="design-section-head">
                          <div>
                            <strong>Error correction</strong>
                            <span>
                              More correction improves recovery, with a denser
                              pattern.
                            </span>
                          </div>
                        </div>
                        <div
                          className="level-card-grid"
                          role="group"
                          aria-label="Error correction level"
                        >
                          {(
                            [
                              ["L", "Low", "7% recovery"],
                              ["M", "Medium", "15% recovery"],
                              ["Q", "Quartile", "25% recovery"],
                              ["H", "High", "30% recovery"],
                            ] as [string, string, string][]
                          ).map(([value, label, hint]) => (
                            <button
                              key={value}
                              type="button"
                              className={`level-card ${ecc === value ? "active" : ""}`}
                              aria-pressed={ecc === value}
                              onClick={() => setEcc(value)}
                              data-testid={`button-ecc-${value}`}
                            >
                              <span>{value}</span>
                              <strong>{label}</strong>
                              <small>{hint}</small>
                            </button>
                          ))}
                        </div>
                        <Field
                          label="PNG export quality"
                          help="The preview stays quick. The PNG is rendered directly from vector data at this size."
                        >
                          <select
                            className="select-control"
                            value={exportPixels}
                            onChange={(e) =>
                              setExportPixels(Number(e.target.value))
                            }
                            data-testid="select-export-pixels"
                          >
                            <option value="1024">1024 px · web</option>
                            <option value="2048">2048 px · high quality</option>
                            <option value="4096">4096 px · print ready</option>
                          </select>
                        </Field>
                        <div className="vector-note">
                          <QrCode size={16} />
                          <span>
                            <strong>SVG stays sharp at any size.</strong>
                            <small>
                              Choose PNG when you need a fixed pixel image.
                            </small>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {mode === "barcode" && (
            <>
              <Field label="Barcode format">
                <select
                  className="select-control"
                  value={barcodeKind}
                  onChange={(e) =>
                    setBarcodeKind(e.target.value as BarcodeKind)
                  }
                  data-testid="select-barcode-type"
                >
                  <option value="CODE128">Code 128 · versatile</option>
                  <option value="EAN13">EAN-13 · retail</option>
                  <option value="UPC">UPC-A · North American retail</option>
                  <option value="CODE39">Code 39 · industrial</option>
                </select>
              </Field>
              <Field
                label="Value"
                help={
                  barcodeKind === "EAN13"
                    ? "Enter 12 digits; the check digit is calculated automatically. Or enter all 13 digits to validate."
                    : barcodeKind === "UPC"
                      ? "Enter 11 digits for automatic check digit, or 12 digits to validate."
                      : "Code 128 and Code 39 accept letters, digits and supported punctuation."
                }
              >
                <input
                  className="control"
                  value={barValue}
                  onChange={(e) => setBarValue(e.target.value)}
                  placeholder="Enter a product or inventory value"
                  data-testid="input-barcode-value"
                  inputMode={
                    barcodeKind === "EAN13" || barcodeKind === "UPC"
                      ? "numeric"
                      : "text"
                  }
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </Field>
              <div className="form-grid">
                <Field label="Ink color">
                  <div className="swatch-row">
                    <input
                      className="color-input"
                      type="color"
                      value={fg}
                      onChange={(e) => setFg(e.target.value)}
                      aria-label="Pick barcode ink color"
                      data-testid="color-barcode-foreground"
                    />
                    <input
                      className="control color-code"
                      value={fg}
                      onChange={(e) => setFg(e.target.value)}
                      aria-label="Barcode ink hex"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>
                </Field>
                <Field label="Paper color">
                  <div className="swatch-row">
                    <input
                      className="color-input"
                      type="color"
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      aria-label="Pick barcode paper color"
                      data-testid="color-barcode-background"
                    />
                    <input
                      className="control color-code"
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      aria-label="Barcode background hex"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>
                </Field>
              </div>
              <label className="toggle-line">
                <span>Include quiet margins</span>
                <input
                  type="checkbox"
                  checked={includeMargin}
                  onChange={(e) => setIncludeMargin(e.target.checked)}
                  data-testid="toggle-barcode-margin"
                />
              </label>
              <div className="notice">
                Check digits are validated or calculated for EAN-13 and UPC-A.
                Always test a printed sample with your scanner.
              </div>
            </>
          )}

          {mode === "bulk" && (
            <>
              <Field
                label="One value per line"
                help={`${batchItems.length} codes ready · blank lines are ignored.`}
              >
                <textarea
                  className="textarea-control"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  rows={9}
                  placeholder="Paste or type one URL or text value per line"
                  data-testid="input-batch-values"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </Field>
              <div className="bulk-list">
                {batchItems.slice(0, 4).map((item, i) => (
                  <div
                    className="bulk-item"
                    key={`${i}-${item}`}
                    data-testid={`batch-item-${i}`}
                  >
                    {String(i + 1).padStart(2, "0")} &nbsp; {item}
                  </div>
                ))}
                {batchItems.length > 4 && (
                  <div className="field-help">
                    and {batchItems.length - 4} more…
                  </div>
                )}
              </div>
              <div className="subsection">
                <h3 className="section-title">Export settings</h3>
                <div className="form-grid" style={{ marginTop: 13 }}>
                  <Field label="Dot pattern">
                    <select
                      className="select-control"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      data-testid="select-batch-pattern"
                    >
                      <option value="square">Square</option>
                      <option value="rounded">Rounded</option>
                      <option value="dots">Dots</option>
                      <option value="classy">Classy</option>
                      <option value="fluid">Fluid</option>
                    </select>
                  </Field>
                  <Field label="Error correction">
                    <select
                      className="select-control"
                      value={ecc}
                      onChange={(e) => setEcc(e.target.value)}
                      data-testid="select-batch-ecc"
                    >
                      <option value="L">Low</option>
                      <option value="M">Medium</option>
                      <option value="Q">Quartile (Q)</option>
                      <option value="H">High (H)</option>
                    </select>
                  </Field>
                </div>
                <p className="field-help">
                  Batch exports reuse the selected QR style, eye shapes, frame,
                  colors and center icon.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={createZip}
                disabled={zipBusy || !batchItems.length}
                data-testid="button-download-zip"
              >
                <FileArchive size={15} />
                {zipBusy
                  ? `Building ${batchItems.length} codes…`
                  : `Download ${batchItems.length} PNGs as ZIP`}
              </button>
            </>
          )}

          {mode === "labels" && (
            <>
              <Field label="Label content">
                <textarea
                  className="textarea-control"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  rows={5}
                  placeholder="One label per line"
                  data-testid="input-label-values"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </Field>
              <div className="form-grid">
                <Field label="Grid density">
                  <select
                    className="select-control"
                    value={labelRows}
                    onChange={(e) => setLabelRows(Number(e.target.value))}
                    data-testid="select-label-count"
                  >
                    <option value="6">6 large labels</option>
                    <option value="12">12 standard labels</option>
                    <option value="21">21 compact labels</option>
                  </select>
                </Field>
                <Field label="Code type">
                  <select
                    className="select-control"
                    value={labelBarcode ? "barcode" : "qr"}
                    onChange={(e) =>
                      setLabelBarcode(e.target.value === "barcode")
                    }
                    data-testid="select-label-code-type"
                  >
                    <option value="qr">QR code</option>
                    <option value="barcode">Barcode</option>
                  </select>
                </Field>
                {labelBarcode && (
                  <Field
                    label="Barcode format"
                    help="EAN-13 / UPC-A need digits only."
                  >
                    <select
                      className="select-control"
                      value={barcodeKind}
                      onChange={(e) =>
                        setBarcodeKind(e.target.value as BarcodeKind)
                      }
                      data-testid="select-label-barcode-format"
                    >
                      <option value="CODE128">Code 128</option>
                      <option value="CODE39">Code 39</option>
                      <option value="EAN13">EAN-13</option>
                      <option value="UPC">UPC-A</option>
                    </select>
                  </Field>
                )}
              </div>
              <div className="notice">
                <strong>A4 · portrait</strong>
                <br />
                Print at 100% scale for consistent sizing. Grid layout adapts to
                the selected label count.
              </div>
              <button
                className="btn btn-primary print-hide"
                onClick={() => window.print()}
                data-testid="button-print-labels"
              >
                <ArrowDownToLine size={15} /> Print label sheet
              </button>
            </>
          )}

          {mode === "scanner" && (
            <>
              {showScanner && (
                <QrScanner
                  onScan={(result) => {
                    setScanResult(result);
                    setShowScanner(false);
                  }}
                  onClose={() => setShowScanner(false)}
                />
              )}

              {scanResult ? (
                <QrResultDetail
                  rawContent={scanResult}
                  onUseAsQrContent={handleUseAsQrContent}
                  onScanAnother={() => {
                    setScanResult("");
                    setShowScanner(true);
                  }}
                />
              ) : (
                <div className="scanner-hub-card">
                  <div className="scanner-hub-icon">
                    <Camera size={32} />
                  </div>
                  <h3 className="scanner-hub-title">Scan & Read Any QR Code</h3>
                  <p className="scanner-hub-desc">
                    Point your camera at a code, upload an image file, or drag and
                    drop a screenshot to detect URLs, Wi-Fi networks, and contact
                    cards.
                  </p>

                  <div className="scanner-hub-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setShowScanner(true)}
                    >
                      <Camera size={16} /> Open Camera Scanner
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => hubFileInputRef.current?.click()}
                    >
                      <Upload size={16} /> Upload Image File
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={hubFileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleHubFileDecode(file);
                        e.target.value = "";
                      }
                    }}
                  />

                  {/* Drag and Drop Zone */}
                  <div
                    className={`scanner-dropzone-box ${isHubDragOver ? "drag-over" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsHubDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsHubDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsHubDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleHubFileDecode(file);
                    }}
                    onClick={() => hubFileInputRef.current?.click()}
                  >
                    <FileImage size={24} className="text-slate-400" />
                    <p className="dropzone-label">
                      {isHubDecoding
                        ? "Decoding QR image..."
                        : "Drag and drop QR code image here"}
                    </p>
                    <p className="dropzone-sub">
                      Supports PNG, JPG, WebP, SVG screenshots
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {mode !== "scanner" && error && (
            <p className="error-message" role="alert" data-testid="error-code">
              {error}
            </p>
          )}
        </section>

        <section className="panel preview-panel" aria-label="Code preview">
          <div className="control-head">
            <div>
              <h2 className="section-title">
                {mode === "labels" ? "A4 sheet preview" : "Live preview"}
              </h2>
              <p className="section-hint">
                {mode === "scanner"
                  ? "Recognized output stays on this device."
                  : mode === "bulk"
                    ? `${batchItems.length} entries in this batch`
                    : "Export a crisp image or a scalable vector."}
              </p>
            </div>
            {mode !== "scanner" && (
              <span
                className="privacy-pill"
                style={{ padding: "6px 9px", fontSize: 10 }}
              >
                <LockKeyhole size={12} /> Local
              </span>
            )}
          </div>
          {(mode === "qr" || mode === "barcode") && (
            <div className="preview-label">Preview</div>
          )}
          {mode === "labels" ? (
            <div
              className="print-sheet"
              style={{
                gridTemplateColumns: `repeat(${labelRows === 6 ? 2 : 3},1fr)`,
              }}
              data-density={labelRows}
              data-testid="preview-label-sheet"
            >
              {Array.from({ length: labelRows }, (_, i) => {
                const val = batchItems[i] || batchItems[0] || `Label ${i + 1}`;
                return (
                  <div
                    className="print-label"
                    key={i}
                    data-testid={`print-label-${i}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      gap: 4,
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    {labelBarcode ? (
                      <BarcodeCell
                        value={val}
                        kind={barcodeKind}
                        fg={fg}
                        bg={bg}
                      />
                    ) : (
                      <>
                        <LabelQr
                          value={val}
                          fg={fg}
                          bg={bg}
                          pattern={pattern}
                          ecc={ecc}
                          logoUrl={logoUrl}
                          logoBadge={logoBadge}
                          logoScale={logoScale}
                          frame={qrFrame}
                          frameText={frameText}
                          eyeFrame={eyeFrame}
                          eyeCenter={eyeCenter}
                        />
                        <span
                          style={{
                            maxWidth: "100%",
                            overflowWrap: "anywhere",
                            fontSize: 9,
                            lineHeight: 1.2,
                          }}
                        >
                          {val}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : mode === "scanner" ? (
            <div className="preview-stage">
              {scanResult && codeData ? (
                <div className="scanner-preview-live">
                  <div className="scanner-preview-card">
                    <div className="scanner-preview-qr">
                      <img
                        className="code-output qr-output"
                        src={codeData}
                        alt="Scanned QR code live vector"
                      />
                    </div>
                    <div className="scanner-preview-meta">
                      <span className="eyebrow" style={{ fontSize: 10 }}>
                        SCANNED CODE PREVIEW
                      </span>
                      <span className="scanner-preview-val">{scanResult}</span>
                    </div>
                  </div>
                  <div className="action-row" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={downloadPng}
                      title="Download PNG of this QR code"
                    >
                      <ArrowDownToLine size={14} /> Download PNG
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={downloadSvg}
                      title="Download SVG vector"
                    >
                      <ArrowDownToLine size={14} /> Download SVG
                    </button>
                  </div>
                </div>
              ) : (
                <div className="placeholder-art">
                  <ScanLine size={36} className="text-slate-400" />
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#0f172a",
                      marginTop: 8,
                    }}
                  >
                    QR Code Reader & Analyzer
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      maxWidth: 280,
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    Scan URLs, Wi-Fi networks, business cards, WhatsApp chats,
                    and more directly in your browser.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="preview-stage">
              {mode === "barcode" ? (
                codeData && (
                  <img
                    key={codeData}
                    className="code-output barcode-output"
                    src={codeData}
                    alt="Generated barcode preview"
                    data-testid="image-barcode-preview"
                  />
                )
              ) : codeData ? (
                <img
                  key={codeData}
                  className="code-output qr-output"
                  src={codeData}
                  alt="Generated QR code preview"
                  data-testid="image-qr-preview"
                />
              ) : (
                <div className="placeholder-art">
                  <QrCode size={34} />
                  <div>Enter your content to see a live QR preview.</div>
                </div>
              )}
              {mode === "barcode" && !codeData && (
                <div className="placeholder-art">
                  <Barcode size={34} />
                  <div>Enter a valid value to preview your barcode.</div>
                </div>
              )}
            </div>
          )}
          <div className="preview-meta">
            <span>
              {mode === "barcode"
                ? `${barcodeKind} · ${barcodeKind === "EAN13" || barcodeKind === "UPC" ? "check digit included" : "barcode"}`
                : mode === "labels"
                  ? `A4 · ${labelRows} labels`
                  : mode === "bulk"
                    ? "PNG files · ZIP archive"
                    : `PNG · ${exportPixels}px output`}
            </span>
            {mode === "qr" && <span>{qrText.length} chars</span>}
          </div>
          {mode === "qr" || mode === "barcode" ? (
            <div className={`download-row ${codeData ? "" : "disabled"}`}>
              <DownloadMenu
                mode={mode}
                exportPixels={exportPixels}
                onPng={downloadPng}
                onSvg={downloadSvg}
                testId="button-download"
              />
            </div>
          ) : mode === "labels" ? (
            <button
              className="btn btn-primary print-hide"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => window.print()}
              data-testid="button-print-preview"
            >
              <ArrowDownToLine size={15} /> Print A4 sheet
            </button>
          ) : mode === "bulk" ? (
            <div className="notice" style={{ marginTop: 12 }}>
              Each line becomes a numbered PNG in a browser-generated ZIP. No
              files are uploaded.
            </div>
          ) : (
            <div className="notice" style={{ marginTop: 12 }}>
              No photo or recognized text leaves your browser.
            </div>
          )}
          {mode === "qr" || mode === "barcode" ? (
            <div className="notice" style={{ marginTop: 12 }}>
              For best scan results, keep a clear border and use dark marks on a
              light background.
            </div>
          ) : null}
        </section>
      </div>
      {(mode === "qr" || mode === "barcode") && (
        <div className={`mobile-download ${codeData ? "" : "disabled"}`}>
          <DownloadMenu
            mode={mode}
            exportPixels={exportPixels}
            onPng={downloadPng}
            onSvg={downloadSvg}
            up
            testId="mobile-download"
          />
        </div>
      )}

      <section className="guide-section" aria-label="How QR codes work">
        <div className="home-block">
          <Reveal className="home-head">
            <h2 className="guide-title">How to create a QR code?</h2>
            <p className="guide-copy">
              Three quick steps, entirely in your browser: pick content, style it,
              export it. Nothing you type ever leaves this device.
            </p>
          </Reveal>
          <div className="steps-grid">
            {homeSteps.map((item, index) => (
              <Reveal key={item.step} className="step-card" delay={index * 70}>
                <span className="step-badge">{item.step}</span>
                {item.art}
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>
          <div className="guide-action">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => startGenerating("URL")}
              data-testid="home-cta-create"
            >
              Create a QR code <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="home-block">
          <Reveal className="home-head">
            <h2 className="guide-title">Generate different types of QR codes</h2>
            <p className="guide-copy">
              Six practical QR formats. Pick one to see what it does, then jump
              straight into the generator with that type preselected.
            </p>
          </Reveal>
          <Reveal>
            <div className="qr-type-box">
              <div
                className="qr-type-tabs"
                role="group"
                aria-label="QR content types"
                ref={typeStripRef}
              >
                {(
                  ["URL", "Text", "Wi-Fi", "vCard", "WhatsApp", "Phone"] as QRKind[]
                ).map((kind) => {
                  const icon = qrTypeOptions.find(
                    (option) => option[0] === kind,
                  )?.[2];
                  return (
                    <button
                      key={kind}
                      type="button"
                      className={`type-tab ${activeType === kind ? "active" : ""}`}
                      aria-pressed={activeType === kind}
                      onClick={(e) => {
                        setActiveType(kind);
                        centerTypeTab(e.currentTarget);
                      }}
                      data-testid={`home-type-${kind.toLowerCase()}`}
                    >
                      <span className="type-tab-icon">{icon}</span>
                      <span>{qrTypeDetails[kind].label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="qr-type-panel">
                <div className="qr-type-info">
                  <h3>{qrTypeDetails[activeType].label}</h3>
                  <p>{qrTypeDetails[activeType].blurb}</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-pill"
                    onClick={() => startGenerating(activeType)}
                    data-testid="home-generate-type"
                  >
                    Generate {qrTypeDetails[activeType].label} QR code{" "}
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="qr-type-visual" aria-hidden="true">
                  <PhoneMock kind={activeType} />
                </div>
                <ul className="qr-type-checks">
                  {qrTypeDetails[activeType].bullets.map((point) => (
                    <li key={point}>
                      <span className="check-dot"><Check size={12} /></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="home-block">
          <Reveal className="home-head">
            <p className="eyebrow">Why UtilityCodes</p>
            <h2 className="guide-title">A toolkit that works on your device</h2>
            <p className="guide-copy">
              Code generation, batch exports and OCR all run inside this browser
              tab. No uploads, no accounts, and no history of what you created.
            </p>
          </Reveal>
          <div className="features-grid">
            {homeFeatures.map((feature, index) => (
              <Reveal key={feature.title} className="feature-card" delay={index * 50}>
                {index === 0 && (
                  <span className="feature-art-qr" aria-hidden="true">
                    <MiniQr size={34} fill="#ff6b1a" />
                    <MiniQr size={34} />
                    <MiniQr size={34} fill="#ff6b1a" />
                    <MiniQr size={34} />
                    <MiniQr size={34} fill="#ff6b1a" />
                    <MiniQr size={34} />
                  </span>
                )}
                <span className="feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                {index === 5 && (
                  <span className="feature-art-dl" aria-hidden="true">
                    <span className="fa-doc"><i /><i /><i /></span>
                    <span className="fa-badge"><ArrowDownToLine size={14} /></span>
                  </span>
                )}
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="home-block">
          <div className="cta-banner">
            <div className="cta-banner-copy">
              <h2>Create your first code in under a minute</h2>
              <p>
                Pick a type, style it, download a PNG or SVG — right from this
                page.
              </p>
            </div>
            <button
              type="button"
              className="btn banner-btn"
              onClick={() => startGenerating("URL")}
              data-testid="home-cta-banner"
            >
              Create QR code <ArrowRight size={16} />
            </button>
          </div>
        </Reveal>

        <div className="usecase-band">
          <Reveal className="home-head">
            <p className="eyebrow">QR codes on</p>
            <h2 className="guide-title">
              Discover where a printed code quietly does the work
            </h2>
          </Reveal>
          <div className="usecase-grid">
            {homeUseCases.map((useCase, index) => (
              <Reveal key={useCase.title} className="usecase-card" delay={index * 70}>
                <span className="usecase-photo">
                  <img
                    src={`${import.meta.env.BASE_URL}${useCase.image}`}
                    alt={useCase.alt}
                    width={useCase.w}
                    height={useCase.h}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <h3>{useCase.title}</h3>
                <p>{useCase.body}</p>
                <button
                  type="button"
                  className="usecase-link"
                  onClick={() => followUseCase(useCase.action)}
                  data-testid={`home-usecase-${index}`}
                >
                  {useCase.cta} <ArrowRight size={14} />
                </button>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="home-block">
          <Reveal className="home-head home-head-center">
            <p className="eyebrow">QR codes for</p>
            <h2 className="guide-title">Where printed codes carry the moment</h2>
            <p className="guide-copy">
              Three quiet examples from events, studios and causes — the paper
              does the scanning work.
            </p>
          </Reveal>
          <Reveal>
            <div className="campaign-zone">
              <div className="campaign-hero">
                <div className="campaign-copy">
                  <h3>{activeCampaign.title}</h3>
                  <p>{activeCampaign.body}</p>
                  <button
                    type="button"
                    className="btn campaign-btn-outline"
                    onClick={() => startGenerating("URL")}
                    data-testid="home-campaign-start"
                  >
                    Start creating <ArrowRight size={15} />
                  </button>
                </div>
                <img
                  key={activeCampaign.image}
                  className="campaign-img"
                  src={`${import.meta.env.BASE_URL}${activeCampaign.image}`}
                  alt={activeCampaign.alt}
                  width={711}
                  height={353}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="campaign-tabs" role="group" aria-label="Campaign ideas">
                {homeCampaigns.map((story) => (
                  <button
                    key={story.id}
                    type="button"
                    className={`campaign-tab ${campaignKind === story.id ? "active" : ""}`}
                    aria-pressed={campaignKind === story.id}
                    onClick={() => setCampaignKind(story.id)}
                    data-testid={`home-campaign-tab-${story.id}`}
                  >
                    <span className="campaign-tab-icon">{story.icon}</span>
                    <span>{story.tab}</span>
                  </button>
                ))}
              </div>
              <div className="campaign-more">
                <button
                  type="button"
                  className="btn btn-soft-pill"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("open-qr-scanner"))
                  }
                  data-testid="home-campaign-more"
                >
                  Try it yourself — scan a sample <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="home-block block-faq">
          <Reveal className="home-head home-head-center">
            <h2 className="guide-title">Do not leave with doubt</h2>
            <p className="guide-copy">
              Short answers while you create, style, print and scan.
            </p>
          </Reveal>
          <Reveal>
            <div className="faq-tabs" role="group" aria-label="FAQ categories">
              {homeFaqGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`faq-tab ${faqGroup === group.id ? "active" : ""}`}
                  aria-pressed={faqGroup === group.id}
                  onClick={() => setFaqGroup(group.id)}
                  data-testid={`home-faq-tab-${group.id}`}
                >
                  {group.label}
                </button>
              ))}
            </div>
            {homeFaqGroups.map((group) => (
              <div key={group.id} className="faq-zone" hidden={faqGroup !== group.id}>
                <FaqSpotArt />
                <div className="faq-list">
                  {group.items.map((item, i) => (
                    <details key={item.q} className="faq-item" open={i === 0}>
                      <summary>{item.q}</summary>
                      <p>{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function LabelQr({
  value,
  fg,
  bg,
  pattern,
  ecc,
  logoUrl,
  logoBadge,
  logoScale,
  frame,
  frameText,
  eyeFrame,
  eyeCenter,
}: {
  value: string;
  fg: string;
  bg: string;
  pattern: string;
  ecc: string;
  logoUrl: string;
  logoBadge: string;
  logoScale: number;
  frame: string;
  frameText: string;
  eyeFrame: string;
  eyeCenter: string;
}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    const qr = new QRCodeStyling({
      width: 180,
      height: 180,
      type: "svg",
      data: value,
      margin: 8,
      dotsOptions: { color: fg, type: dotStyles[pattern] || "rounded" },
      cornersSquareOptions: {
        color: fg,
        type: eyeFrame as
          | "dot"
          | "square"
          | "extra-rounded"
          | "rounded"
          | "dots"
          | "classy"
          | "classy-rounded",
      },
      cornersDotOptions: { color: fg, type: eyeCenter as "dot" | "square" },
      backgroundOptions: { color: bg },
      qrOptions: { errorCorrectionLevel: ecc as "L" | "M" | "Q" | "H" },
    });
    qr.getRawData("svg")
      .then(async (blob) => {
        if (!blob || !alive) return;
        const svg = blob instanceof Blob ? await blob.text() : blob.toString();
        const imageBlob = await svgToPng(
          addQrFrame(
            addQrLogo(svg, logoUrl, logoBadge, logoScale),
            frame,
            fg,
            bg,
            frameText,
          ),
        );
        if (!alive) return;
        objectUrl = URL.createObjectURL(imageBlob);
        setSrc(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    value,
    fg,
    bg,
    pattern,
    ecc,
    logoUrl,
    logoBadge,
    logoScale,
    frame,
    frameText,
    eyeFrame,
    eyeCenter,
  ]);
  return src ? (
    <img
      src={src}
      alt={`QR code for ${value}`}
      style={{ width: 58, height: 58, objectFit: "contain" }}
      data-testid={`label-qr-${value.slice(0, 16)}`}
    />
  ) : (
    <span aria-label="Generating QR code">…</span>
  );
}

function BarcodeCell({
  value,
  kind,
  fg,
  bg,
}: {
  value: string;
  kind: BarcodeKind;
  fg: string;
  bg: string;
}) {
  const [src, setSrc] = useState("");
  const [problem, setProblem] = useState("");
  useEffect(() => {
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, normalizedBarcode(value, kind), {
        format: kind === "UPC" ? "UPC" : kind,
        lineColor: fg,
        background: bg,
        width: 1.4,
        height: 42,
        displayValue: true,
        font: "Arial, sans-serif",
        fontSize: 13,
        textMargin: 2,
        margin: 4,
      });
      setSrc(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`,
      );
      setProblem("");
    } catch (e) {
      setSrc("");
      setProblem(e instanceof Error ? e.message : `Not valid for ${kind}`);
    }
  }, [value, kind, fg, bg]);
  return src ? (
    <img
      src={src}
      alt={`Barcode for ${value}`}
      style={{
        display: "block",
        margin: "0 auto",
        width: "100%",
        maxHeight: 74,
        objectFit: "contain",
      }}
      data-testid={`label-barcode-${value.slice(0, 16)}`}
    />
  ) : (
    <>
      <span style={{ overflowWrap: "anywhere", fontSize: 10 }}>{value}</span>
      <span style={{ color: "#b91c1c", fontSize: 8, lineHeight: 1.2 }}>
        {problem}
      </span>
    </>
  );
}

function GuidePage({ path }: { path: string }) {
  const info = pageInfo[path];
  const sections = guideSections[path] || [];
  const preset = path.includes("wifi")
    ? "wifi"
    : path.includes("vcard")
      ? "vcard"
      : path.includes("whatsapp")
        ? "whatsapp"
        : path.includes("code128")
          ? "code128"
          : "labels";
  return (
    <>
      <section className="document-page" style={{ paddingBottom: 25 }}>
        <div className="eyebrow">Free browser tool · no account</div>
        <h1>{info.heading}</h1>
        <p className="lead">{info.intro}</p>
        <div className="action-row" style={{ marginTop: 20 }}>
          <Link
            href="/"
            className="btn btn-primary"
            data-testid="link-open-guide-tool"
          >
            Open the generator <ChevronRight size={15} />
          </Link>
          <span className="privacy-pill">
            <LockKeyhole size={14} /> Runs locally in your browser
          </span>
        </div>
      </section>
      <Workspace preset={preset} />
      <section
        className="document-page guide-article"
        style={{ paddingTop: 15 }}
      >
        {sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Is this generator free to use?</summary>
            <p>
              Yes. Create and download codes with no account required.
              Generation happens in your browser, and you can export the result
              when it is ready.
            </p>
          </details>
          <details className="faq-item">
            <summary>Are my details sent to a server?</summary>
            <p>
              No. Content, uploaded logos and images are processed on your
              device. They are not submitted to UtilityCodes for code
              generation.
            </p>
          </details>
          <details className="faq-item">
            <summary>What should I check before distributing codes?</summary>
            <p>
              Verify the destination and every field, then scan a test export
              and print sample with the devices people will use.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}

function LegalPage({ path }: { path: string }) {
  const content = legalContent[path];
  return (
    <main className="document-page">
      <div className="eyebrow">UtilityCodes · Help and information</div>
      <h1>{content.title}</h1>
      <p className="lead">{content.intro}</p>
      {content.sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      {path === "/contact" && (
        <section>
          <h2>Use the tools</h2>
          <p>
            For quick help, the generators include format-specific hints and
            local validation. Return to the workspace to try another code
            format.
          </p>
          <Link
            href="/"
            className="btn btn-primary"
            data-testid="link-contact-workspace"
          >
            Open the workspace <ChevronRight size={14} />
          </Link>
        </section>
      )}
    </main>
  );
}

function ScrollProgress() {
  const barRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const progress =
        max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="scroll-progress" aria-hidden="true">
      <span ref={barRef} />
    </div>
  );
}

function AppRoutes() {
  const [location] = useLocation();
  usePageMeta(location);
  const page = pageInfo[location];
  const legal = legalContent[location];
  return (
    <div className="app-shell">
      <ScrollProgress />
      <Header />
      <Switch>
        <Route path="/" component={() => <Workspace />} />
        <Route path="/scanner" component={() => <Workspace preset="scanner" />} />
        {guideRoutes.map(([path]) => (
          <Route
            key={path}
            path={path}
            component={() => <GuidePage path={path} />}
          />
        ))}
        {legalRoutes.map(([path]) => (
          <Route
            key={path}
            path={path}
            component={() => <LegalPage path={path} />}
          />
        ))}
        <Route component={NotFound} />
      </Switch>
      <AdSlot />
      <Footer pageTitle={page?.title || legal?.title} />
    </div>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <RoutedErrorBoundary>
            <AppRoutes />
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
/**
 * Website-links-only validation for the URL kind: returns the normalized
 * https:// address when the input is a web link (full URL, www. or bare
 * domain with a TLD). Anything that is not a single web address returns "".
 */
function websiteLink(raw: string): string {
  const input = raw.trim();
  if (!input || /\s/.test(input)) return "";
  let candidate = input;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  if (candidate.includes("..")) return "";
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes(".")) return "";
    return candidate;
  } catch {
    return "";
  }
}

function normalizedBarcode(value: string, kind: BarcodeKind) {
  const input = value.trim();
  if (kind === "CODE128") return input;
  if (kind === "CODE39") {
    if (!/^[0-9A-Z .$/+%-]+$/i.test(input))
      throw new Error(
        "Code 39 supports letters A–Z, digits, spaces and - . $ / + %.",
      );
    return input.toUpperCase();
  }
  const required = kind === "EAN13" ? 12 : 11;
  const fullLength = required + 1;
  if (
    !/^\d+$/.test(input) ||
    (input.length !== required && input.length !== fullLength)
  )
    throw new Error(
      `${kind === "EAN13" ? "EAN-13" : "UPC-A"} needs ${required} digits; the check digit is calculated for you.`,
    );
  const data = input.slice(0, required);
  const sum = [...data].reduce(
    (acc, digit, i) =>
      acc + Number(digit) * ((data.length - i) % 2 === 0 ? 1 : 3),
    0,
  );
  const check = String((10 - (sum % 10)) % 10);
  if (input.length === fullLength && input.at(-1) !== check)
    throw new Error(
      `Check digit should be ${check}; review the entered value.`,
    );
  return data + check;
}
export default App;