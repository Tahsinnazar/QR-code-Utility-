import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import QRCodeStyling from 'qr-code-styling';
import JsBarcode from 'jsbarcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ArrowDownToLine, Barcode, Camera, Check, ChevronRight, FileArchive, ImagePlus, LockKeyhole, Menu, QrCode, ScanLine, ShieldCheck, Sparkles, X } from 'lucide-react';

const queryClient = new QueryClient();

type Mode = 'qr' | 'barcode' | 'bulk' | 'labels' | 'scanner';
type QRKind = 'URL' | 'Text' | 'Wi-Fi' | 'vCard' | 'WhatsApp' | 'Phone';
type BarcodeKind = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
type QrDesignTab = 'frame' | 'shape' | 'logo' | 'level';
const guideRoutes = [
  ['/wifi-qr-code-generator', 'Wi-Fi QR code'],
  ['/vcard-qr-code-generator', 'vCard QR code'],
  ['/whatsapp-qr-code-generator', 'WhatsApp QR code'],
  ['/code128-barcode-generator', 'Code 128 barcode'],
  ['/printable-label-sheet', 'Printable labels'],
];
const legalRoutes = [['/privacy-policy', 'Privacy'], ['/terms-of-service', 'Terms'], ['/about-us', 'About'], ['/contact', 'Contact']];

const pageInfo: Record<string, { title: string; description: string; heading: string; intro: string }> = {
  '/wifi-qr-code-generator': { title: 'Free Wi-Fi QR Code Generator | UtilityCodes', description: 'Make a scannable Wi-Fi QR code in your browser. Share network access without revealing your password.', heading: 'Wi-Fi QR code generator', intro: 'Let guests join your network with one quick scan. UtilityCodes formats your network details into a standard Wi-Fi QR code, right in your browser.' },
  '/vcard-qr-code-generator': { title: 'Free vCard QR Code Generator | UtilityCodes', description: 'Create a digital business card QR code with contact details, generated locally in your browser.', heading: 'vCard QR code generator', intro: 'Put your contact details behind a scan-ready QR code. People can save your name, company and phone details directly to their contacts.' },
  '/whatsapp-qr-code-generator': { title: 'WhatsApp QR Code Generator | UtilityCodes', description: 'Create a WhatsApp QR code with an optional prefilled message. Free, private, and browser-based.', heading: 'WhatsApp QR code generator', intro: 'Make it easy to start a conversation. Enter a phone number and optional greeting to create a QR code that opens a WhatsApp chat.' },
  '/code128-barcode-generator': { title: 'Code 128 Barcode Generator | UtilityCodes', description: 'Generate and download Code 128 barcodes for labels, inventory, and quick product workflows.', heading: 'Code 128 barcode generator', intro: 'Create compact, high-density Code 128 barcodes for inventory, packaging or internal labels. Your data stays on this device.' },
  '/printable-label-sheet': { title: 'Printable QR Code Label Sheets | UtilityCodes', description: 'Arrange QR codes on a print-ready A4 label sheet, then print directly from your browser.', heading: 'Printable QR code label sheets', intro: 'Lay out consistent QR labels on an A4 sheet and print at actual size. Choose a label count and preview the page before printing.' },
};
const guideSections: Record<string, [string, string][]> = {
  '/wifi-qr-code-generator': [
    ['What a Wi-Fi QR code contains', 'A Wi-Fi QR code stores the network name, security type and, when needed, the password in a standard format that a phone can recognize. A guest scans the code with the built-in camera and can join without typing a long password. The QR is not a separate guest network and it does not change your router settings; it only shares the connection details you enter. Anyone who can see and scan the printed code may be able to join that network, so place it where intended guests can access it and avoid putting it in public view if the network is private.'],
    ['Enter the network details carefully', 'Choose Wi-Fi in the generator, then type the SSID exactly as it appears in your router or device settings. Network names are case-sensitive, and spaces or punctuation are part of the name. Select WPA for most modern home and office networks, WEP only for older equipment that still uses it, or no password for an open network. For a hidden SSID, enable the hidden-network option. When the code looks right, scan it with a second device before sharing it. A quick test catches typos before guests have to troubleshoot a connection.'],
    ['Keep the code readable', 'Use a dark foreground on a light background, preserve the quiet zone around the pattern and print at a size a phone camera can focus on. The default QR error correction is a good balance; higher correction can help when the code is damaged, but it also makes the pattern denser. If you add a center logo, use a modest image and choose a higher correction level. Avoid glossy surfaces and low-contrast color combinations. Test the final print in the room where visitors will use it, because lighting, distance and reflections can affect a scan.'],
    ['Share access without exposing more than needed', 'A Wi-Fi code is convenient, but it should only contain credentials you are comfortable sharing with its audience. If guests need internet access but should not reach office devices, create a guest network in your router first and generate a code for that guest SSID. UtilityCodes builds the QR in the current browser; it does not send the network name or password to an account or code-generation server. The password field is masked while you type, but the code itself necessarily encodes the password so that a compatible phone can connect.'],
    ['Troubleshoot a failed connection', 'If a phone sees the QR but does not join, first compare the SSID, password and security mode with the router settings. A typo can still produce a perfectly valid QR image, so inspect the details rather than only changing its appearance. Some older phones require a separate camera or QR reader to recognize the Wi-Fi payload. If scanning opens a prompt but connection fails, check that the guest network is active and that the device is within range. Generate a fresh code after changing a password, then remove or cover older printed copies so visitors do not keep trying stale credentials.'],
  ],
  '/vcard-qr-code-generator': [
    ['What a vCard QR code does', 'A vCard QR code packages contact details as a digital business card. When someone scans it, a compatible phone can offer to create a contact with the name, organization, phone number and email address you entered. It can save a conversation at an event and reduce errors from typing a long address or number. The code does not publish a profile page or update itself when your details change; it contains a snapshot of the information at the time you generate it. If a detail changes, create a replacement code and update the places where you shared the old one.'],
    ['Build a useful contact card', 'Select vCard and complete the fields you want to share. A full name is the most useful starting point; company, phone and email are optional and can be left blank when they do not apply. Use a phone number with its country code if contacts may be saved internationally. Check the spelling of names and the exact email address, then scan the preview with a phone and review the contact-import screen before printing or distributing it. Treat every filled field as information you intend the scanner to receive.'],
    ['Design for quick scanning', 'Keep the code high contrast, retain a clear quiet zone and avoid placing a large logo over the data pattern. Rounded dots and custom eye shapes can give a card a personal feel, but strong styling should not come at the cost of readability. If you add a logo or a call-to-action frame, test the exported PNG or SVG rather than relying only on the on-screen preview. A printed business card is small, so scan a sample at actual size and confirm it works under ordinary indoor light.'],
    ['Choose where the contact details live', 'A direct vCard code is useful when you want a card that works offline and contains a small set of details. Its trade-off is that the information is fixed: every reprint has to use a newly generated code after an update. If you need a contact page that can be edited without replacing the printed QR, encode a URL to a page you control instead. UtilityCodes creates the code and exports the image locally in your browser. It does not retain the contact fields, so keep a separate copy of your source details if you will need to update the design later.'],
    ['Check how different phones import contacts', 'Contact apps may label or display a field differently, so scan the code with at least one other phone before committing to a large print run. Confirm that the name appears as intended and that the phone and email fields are recognized rather than folded into a note. The generated card currently focuses on common details; keep extra information out of the code unless you have verified that your audience can use it. If a saved contact is wrong, return to the form, correct the source fields and export a new version. A brief test is easier than replacing cards after an event.'],
  ],
  '/whatsapp-qr-code-generator': [
    ['How a WhatsApp QR link works', 'A WhatsApp QR code points to a chat link for the phone number you enter. When someone scans it, their device opens WhatsApp or a web handoff where they can start a conversation. An optional prefilled message can make the next step clearer, such as asking for a quote or identifying a support request. The message is only a draft; the person scanning the code still chooses whether to send it. A code does not automatically subscribe someone to messages or add the sender to a contact list.'],
    ['Use an international phone number', 'Enter the number with its country calling code so the link identifies the intended WhatsApp account. The generator removes spaces and punctuation when it builds the wa.me address. Leave out local dialing prefixes that are not part of the international number, and double-check every digit before exporting. If the destination number is not registered with WhatsApp, the link may not open a usable chat. Scan your test code on a separate device and verify the chat header displays the correct business or person before you put the code on packaging, a poster or a profile.'],
    ['Write a helpful optional message', 'A short prefilled greeting can tell customers what to include, for example a product name or order reference. Keep the text brief, neutral and easy for the user to edit. Avoid putting sensitive information in a draft message because anyone scanning the QR can see its contents before sending it. Test punctuation, spaces and non-English characters in the preview; the message is encoded into the link and URL-escaped automatically. The user remains in control of the final message and must press send in WhatsApp.'],
    ['Place the QR where the conversation starts', 'Use a dark code on a light background, keep the quiet zone clear and make the printed code large enough for a phone camera to focus. Include a nearby explanation such as “Chat with us on WhatsApp” so people know what the scan will do. Keep the destination account active and staffed if you use the code for customer support. UtilityCodes generates the link and image on your device and does not upload the entered number or message. Once you export the code, scan the exported file and test it again from a real print.'],
    ['Review the destination and user experience', 'A WhatsApp QR is a link to a number, not a guarantee that a person will receive a response. Confirm that the number belongs to the intended account, that WhatsApp is available in the region and that someone monitors incoming conversations. When the scan opens a chat, the user should be able to inspect the destination and edit the draft before sending it. Keep the printed call to action honest about what happens next. If you change the number or prefilled message, export and replace old materials rather than assuming an existing QR will update itself.'],
  ],
  '/code128-barcode-generator': [
    ['When to use Code 128', 'Code 128 is a compact, high-density linear barcode that can encode upper- and lowercase letters, digits and a range of punctuation. It is commonly used for internal inventory labels, shipping workflows and asset identifiers where the organization controls both the code and the scanners. It is not the same thing as a retail EAN or UPC product number, and a Code 128 symbol does not make an identifier globally unique by itself. Decide on a consistent naming scheme before printing labels so that two items do not accidentally receive the same value.'],
    ['Choose a value your workflow can use', 'Enter a short identifier that your inventory system, spreadsheet or receiving process can recognize. Avoid leading or trailing spaces unless they are intentionally part of the data. Code 128 can carry more characters than a retail barcode, but longer values make the symbol wider and can be harder to scan at small print sizes. Check the value for transposed digits and compare it with the record it identifies. The text printed below the bars helps a person read the value, but a scanner returns the encoded content rather than validating the item or looking it up.'],
    ['Print at a useful size', 'Keep the barcode bars crisp and preserve clear blank space at both ends. Use dark bars on a light background and avoid squeezing the image to fit a very narrow label. If a barcode must be resized, keep its aspect ratio so the bars do not become too thin or too wide for the scanner. Download the SVG when you need to place the code into a layout program without losing vector sharpness, or use PNG for common documents. Print one test label and scan it with the device and software used in your actual workflow.'],
    ['Code 128 versus retail formats', 'If an item will be sold through a retail system, ask the retailer or standards body which identifier and barcode format is required. EAN-13 and UPC-A have fixed numeric lengths and check digits; UtilityCodes calculates the check digit for a payload and checks one you provide. Code 128 accepts more flexible internal values and does not add those retail check digits. A correct-looking barcode is not proof that a number is registered or appropriate for a specific supply chain. Keep a record of assigned identifiers and verify scanner compatibility before a large print run.'],
    ['Fix common scanning problems', 'If a reader misses the barcode, check that the bars have not been stretched during placement and that the image is not blurred or printed too lightly. Increase the symbol width or height, preserve the blank margin at both ends and use an uncoated test label if glare is a problem. Confirm that the reader is configured for Code 128 and that the application accepts the characters in the value. Try the original SVG or a high-resolution PNG rather than a screenshot. A successful scan should return exactly the characters you entered; compare them with the source record before using the label.'],
  ],
  '/printable-label-sheet': [
    ['Prepare a page of consistent labels', 'The label-sheet tool arranges one value per label on an A4 portrait page. Choose a large, standard or compact grid based on how much text and scanning distance each item needs. Paste one code value on each line; blank lines are ignored. You can make QR labels for URLs or identifiers and switch to barcodes for workflows that use a compatible barcode reader. The preview helps you inspect the page before printing, but it is still worth checking a paper test because printer margins and scaling settings can vary from one device to another.'],
    ['Keep label contents short and clear', 'Short values are easier to scan and leave more room for readable text. If a label carries a QR code, the visible text below it helps a person confirm which item they are about to open. Use meaningful names or compact asset identifiers rather than a long paragraph. For QR codes that point to a web destination, test the URL on a phone. For barcodes, match the format to the reader and the system that will consume the result. Check every line in the batch; a repeated identifier can create confusion even when the code itself scans correctly.'],
    ['Print at actual size', 'Open the browser print dialog and select A4 paper in portrait orientation. Set scaling to 100% or actual size and check that “fit to page” has not changed the layout. Printer-driver margins can shift the usable area, so compare the first printed grid with the label stock before using adhesive sheets. The dashed borders are guides and may appear on the printed page; if your workflow needs border-free stock, verify the browser print preview first. Do not use an ink-saving setting that makes the bars or QR modules too faint.'],
    ['Test before a full run', 'Scan several labels from different parts of the page, including near its edges. Make sure the phone or reader can focus at the distance people will use and confirm that each scan returns the intended value. If one code is difficult to read, enlarge the layout, increase contrast or choose a less compact content value. Labels placed on curved, glossy or textured surfaces may need a larger symbol. UtilityCodes lays out the grid and creates its QR or barcode images in your browser; printing and the final physical result depend on your printer, paper and chosen scale.'],
    ['Match the grid to your label stock', 'The page preview is a simple A4 grid, not a calibration file for every brand of precut sticker stock. Compare the grid dimensions with the sheet manufacturer’s measurements before feeding adhesive labels into a printer. If individual positions do not align, adjust the printer’s paper size and scaling settings or use plain paper for a trial. Avoid forcing the page to fit when the preview indicates actual-size printing; that can shift every label. Save a known-good print configuration for future runs, and keep an unprinted test sheet until you have confirmed alignment across the full page.'],
  ],
};
const legalContent: Record<string, { title: string; intro: string; sections: [string, string][] }> = {
  '/privacy-policy': { title: 'Privacy policy', intro: 'UtilityCodes is designed to work without accounts and without sending your code data to a server.', sections: [['Processing stays in your browser', 'QR code and barcode generation, batch file creation, image handling, and OCR run locally in your browser. We do not receive or store the content you enter.'], ['Camera and files', 'Camera access is only requested when you start the scanner. Uploaded files are processed in your current browser session and are not uploaded.'], ['Your choices', 'You can stop camera access by closing the scanner or leaving this page. Browser permissions and downloaded files remain under your control.']] },
  '/terms-of-service': { title: 'Terms of service', intro: 'Use UtilityCodes as a browser utility for creating and printing machine-readable codes.', sections: [['Use and accuracy', 'You are responsible for verifying code content, check digits, print sizing and scanner compatibility before relying on generated materials.'], ['Availability', 'The app is provided as-is. Browser support and device capabilities vary, particularly for camera access and printing.'], ['No sensitive data', 'Although processing is local, do not use a shared or untrusted device for information you would not want stored in its browser memory.']] },
  '/about-us': { title: 'About UtilityCodes', intro: 'Small, practical code tools that do their work on your device.', sections: [['Built for repeat use', 'From one quick QR code to a batch of inventory labels, UtilityCodes keeps the workflow simple: enter, check, export.'], ['Private by design', 'The generators and scanner are browser-side tools. No account is required and code content is not sent to a UtilityCodes server.'], ['A straightforward toolkit', 'Use QR, common retail and industrial barcodes, batch ZIP export, print layouts, or OCR text capture from a camera.']] },
  '/contact': { title: 'Contact UtilityCodes', intro: 'Questions or product feedback? UtilityCodes does not currently operate a support inbox.', sections: [['Share feedback', 'For an issue with a generated code, include the code type, browser, and a description of what happened. Avoid sending private code contents.'], ['Quick help', 'Try another code format, check input length and characters, and scan a test print before producing a full run. Camera access requires browser permission and a secure connection.']] },
};

function usePageMeta(path: string) {
  useEffect(() => {
    const info = pageInfo[path] || legalContent[path];
    const title = info?.title || 'Free QR & Barcode Generator — UtilityCodes';
    const description = info?.description || info?.intro || 'Create QR codes, barcodes, batches and print-ready labels locally in your browser.';
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    meta.setAttribute('content', description);
    let og = document.querySelector('meta[property="og:title"]');
    if (!og) { og = document.createElement('meta'); og.setAttribute('property', 'og:title'); document.head.appendChild(og); }
    og.setAttribute('content', title);
    const canonicalUrl = `${window.location.origin}${path}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', canonicalUrl);
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) { ogUrl = document.createElement('meta'); ogUrl.setAttribute('property', 'og:url'); document.head.appendChild(ogUrl); }
    ogUrl.setAttribute('content', canonicalUrl);
    const scriptId = 'utilitycodes-jsonld';
    document.getElementById(scriptId)?.remove();
    if (info) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'SoftwareApplication', name: 'UtilityCodes', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', description },
          { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Is this generator free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Create and download codes with no account required. Generation happens in your browser.' } }, { '@type': 'Question', name: 'Are my details sent to a server?', acceptedAnswer: { '@type': 'Answer', text: 'No. Content, uploaded logos and images are processed on your device.' } }, { '@type': 'Question', name: 'What should I check before distributing codes?', acceptedAnswer: { '@type': 'Answer', text: 'Verify the destination and every field, then scan a test export and print sample with the devices people will use.' } }] },
        ],
      });
      document.head.appendChild(script);
    }
    return () => { document.getElementById(scriptId)?.remove(); };
  }, [path]);
}

function Header() {
  const [, setLocation] = useLocation();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark"><QrCode size={18} /></span><span>UtilityCodes</span></Link>
    <nav className="nav-links" aria-label="Main navigation">
      <Link href="/" className="nav-link" data-testid="link-workspace">Workspace</Link>
      <Link href="/wifi-qr-code-generator" className="nav-link" data-testid="link-guides">Guides</Link>
      <Link href="/about-us" className="nav-link" data-testid="link-about">About</Link>
      <Link href="/" className="nav-cta" data-testid="link-start">Create a code</Link>
    </nav>
    <div className="mobile-nav"><Menu size={17} aria-hidden="true" /><select aria-label="Navigate" data-testid="select-navigation" value="" onChange={(e) => { if (e.target.value) setLocation(e.target.value); }}><option value="">Navigate to…</option><option value="/">Workspace</option>{guideRoutes.map(([url, name]) => <option key={url} value={url}>{name}</option>)}{legalRoutes.map(([url, name]) => <option key={url} value={url}>{name}</option>)}</select></div>
  </div></header>;
}

function Footer() {
  return <footer className="site-footer"><div className="page-wrap footer-inner"><span>UtilityCodes · Useful tools, processed on your device.</span><div className="footer-links">{guideRoutes.map(([url, name]) => <Link key={url} href={url} data-testid={`footer-${url.slice(1)}`}>{name}</Link>)}{legalRoutes.map(([url, name]) => <Link key={url} href={url} data-testid={`footer-${url.slice(1)}`}>{name}</Link>)}</div></div></footer>;
}

function AdSlot() {
  return <aside className="ad-slot" aria-label="Advertisement space" data-testid="ad-slot">Advertisement space</aside>;
}

function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return <div className="field"><label>{label}</label>{children}{help && <div className="field-help">{help}</div>}</div>;
}

const dotStyles: Record<string, 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'> = {
  square: 'square',
  rounded: 'rounded',
  dots: 'dots',
  classy: 'classy',
  fluid: 'classy-rounded',
  'extra-rounded': 'extra-rounded',
};

function brandMarkData(preset: string) {
  const marks: Record<string, string> = {
    instagram: '<rect x="19" y="19" width="90" height="90" rx="27" fill="none" stroke="#0F172A" stroke-width="10"/><circle cx="64" cy="64" r="22" fill="none" stroke="#0F172A" stroke-width="10"/><circle cx="94" cy="37" r="7" fill="#0F172A"/>',
    whatsapp: '<path d="M31 102l7-25a42 42 0 1 1 16 17z" fill="none" stroke="#0F172A" stroke-width="10" stroke-linejoin="round"/><path d="M50 48c3-5 7-3 9 1l5 10-5 7c5 9 10 14 20 18l7-7 10 5c5 2 6 6 2 10-7 8-16 8-30 1-16-8-29-23-29-35 0-4 4-8 11-10z" fill="#0F172A"/>',
    youtube: '<rect x="15" y="31" width="98" height="66" rx="21" fill="#0F172A"/><path d="M54 47v34l29-17z" fill="#FFFFFF"/>',
    globe: '<circle cx="64" cy="64" r="48" fill="none" stroke="#0F172A" stroke-width="9"/><path d="M16 64h96M64 16c15 14 22 30 22 48s-7 34-22 48M64 16C49 30 42 46 42 64s7 34 22 48" fill="none" stroke="#0F172A" stroke-width="7"/>',
    shop: '<path d="M24 52h80v60H24zM17 49l9-30h76l9 30c-1 10-15 14-23 4-8 10-22 10-30 0-8 10-22 10-30 0-5 4-9 3-11-4z" fill="none" stroke="#0F172A" stroke-width="9" stroke-linejoin="round"/><path d="M49 112V78h30v34" fill="none" stroke="#0F172A" stroke-width="8"/>',
  };
  const mark = marks[preset];
  if (!mark) return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="4" y="4" width="120" height="120" rx="28" fill="#FFFFFF"/>${mark}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function QrPatternThumb({ pattern }: { pattern: string }) {
  const modules = 21;
  const cell = 2;
  const shapeForModule = (x: number, y: number, key: string) => {
    const px = x * cell;
    const py = y * cell;
    if (key === 'dots') return <circle key={`${x}-${y}`} cx={px + 1} cy={py + 1} r=".82" fill="#0f172a" />;
    if (key === 'classy') return <path key={`${x}-${y}`} d={`M${px} ${py}h2v1.1H${px + 1.1}V${py + 2}H${px}z`} fill="#0f172a" />;
    return <rect key={`${x}-${y}`} x={px} y={py} width="1.8" height="1.8" rx={key === 'square' ? 0 : key === 'extra-rounded' ? '.85' : '.48'} fill="#0f172a" />;
  };
  const inFinder = (x: number, y: number, left: number, top: number) => x >= left && x < left + 7 && y >= top && y < top + 7;
  const finder = (left: number, top: number, key: string) => {
    const px = left * cell;
    const py = top * cell;
    const rx = key === 'square' ? 0 : key === 'extra-rounded' ? 3 : 1.5;
    return <g key={`${left}-${top}`}><rect x={px} y={py} width="14" height="14" rx={rx} fill="#0f172a" /><rect x={px + 2} y={py + 2} width="10" height="10" rx={Math.max(0, rx - 1)} fill="#fff" /><rect x={px + 4} y={py + 4} width="6" height="6" rx={Math.max(0, rx - 2)} fill="#0f172a" /></g>;
  };
  const blocks: ReactNode[] = [];
  for (let y = 0; y < modules; y++) for (let x = 0; x < modules; x++) {
    if (inFinder(x, y, 0, 0) || inFinder(x, y, 14, 0) || inFinder(x, y, 0, 14)) continue;
    if ((x * 17 + y * 31 + x * y * 7) % 13 < 6) blocks.push(shapeForModule(x, y, pattern));
  }
  return <svg viewBox="0 0 42 42" className="qr-pattern-thumb" role="img" aria-label={`${pattern} QR shape preview`}>
    <rect width="42" height="42" rx="3" fill="#fff" />
    {blocks}{finder(0, 0, pattern)}{finder(14, 0, pattern)}{finder(0, 14, pattern)}
  </svg>;
}

function addQrLogo(svgText: string, logoUrl: string, badgeShape: string, logoScale: number) {
  if (!logoUrl) return svgText;
  const svgDocument = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = svgDocument.documentElement;
  const namespace = 'http://www.w3.org/2000/svg';
  const xlink = 'http://www.w3.org/1999/xlink';
  const [, , viewWidth, viewHeight] = (root.getAttribute('viewBox') || '0 0 640 640').split(/\s+/).map(Number);
  if (!viewWidth || !viewHeight) return svgText;
  const centerX = viewWidth / 2;
  const centerY = viewHeight / 2;
  const logoSize = viewWidth * Math.min(.22, Math.max(.12, logoScale));
  const pad = viewWidth * .035;
  const badgeSize = logoSize + pad * 2;
  const x = centerX - badgeSize / 2;
  const y = centerY - badgeSize / 2;
  if (badgeShape === 'circle') {
    const badge = svgDocument.createElementNS(namespace, 'circle');
    badge.setAttribute('cx', String(centerX));
    badge.setAttribute('cy', String(centerY));
    badge.setAttribute('r', String(badgeSize / 2));
    badge.setAttribute('fill', '#ffffff');
    root.appendChild(badge);
  } else {
    const badge = svgDocument.createElementNS(namespace, 'rect');
    badge.setAttribute('x', String(x));
    badge.setAttribute('y', String(y));
    badge.setAttribute('width', String(badgeSize));
    badge.setAttribute('height', String(badgeSize));
    badge.setAttribute('rx', badgeShape === 'square' ? '2' : String(badgeSize * .2));
    badge.setAttribute('fill', '#ffffff');
    root.appendChild(badge);
  }
  const image = svgDocument.createElementNS(namespace, 'image');
  image.setAttribute('x', String(centerX - logoSize / 2));
  image.setAttribute('y', String(centerY - logoSize / 2));
  image.setAttribute('width', String(logoSize));
  image.setAttribute('height', String(logoSize));
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  image.setAttribute('href', logoUrl);
  root.setAttribute('xmlns:xlink', xlink);
  image.setAttributeNS(xlink, 'xlink:href', logoUrl);
  root.appendChild(image);
  return new XMLSerializer().serializeToString(root);
}

function addQrFrame(svgText: string, frame: string, foreground: string, background: string) {
  if (frame === 'none') return svgText;
  const svgDocument = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = svgDocument.documentElement;
  const namespace = 'http://www.w3.org/2000/svg';
  const [viewX, viewY, width, height] = (root.getAttribute('viewBox') || '0 0 640 640').split(/\s+/).map(Number);
  const bandHeight = 72;
  root.setAttribute('viewBox', `${viewX} ${viewY} ${width} ${height + bandHeight}`);
  root.setAttribute('height', String(height + bandHeight));
  const band = svgDocument.createElementNS(namespace, 'rect');
  band.setAttribute('x', String(viewX));
  band.setAttribute('y', String(viewY + height));
  band.setAttribute('width', String(width));
  band.setAttribute('height', String(bandHeight));
  band.setAttribute('fill', background);
  const caption = svgDocument.createElementNS(namespace, 'text');
  caption.setAttribute('x', String(viewX + width / 2));
  caption.setAttribute('y', String(viewY + height + 46));
  caption.setAttribute('text-anchor', 'middle');
  caption.setAttribute('font-family', 'Inter,Arial,sans-serif');
  caption.setAttribute('font-size', '26');
  caption.setAttribute('font-weight', '700');
  caption.setAttribute('letter-spacing', '3');
  caption.setAttribute('fill', foreground);
  caption.textContent = frame === 'scan' ? 'SCAN ME' : 'POINT YOUR CAMERA';
  root.append(band, caption);
  return new XMLSerializer().serializeToString(root);
}

function svgToPng(svgText: string, outputWidth?: number) {
  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    image.onload = () => {
      const svgDocument = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const viewBox = (svgDocument.documentElement.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      const sourceWidth = viewBox[2] || image.naturalWidth || 640;
      const sourceHeight = viewBox[3] || image.naturalHeight || 640;
      const width = outputWidth || image.naturalWidth || sourceWidth;
      const height = Math.round(width * sourceHeight / sourceWidth);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas export is unavailable.'));
        return;
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The QR preview could not be rendered.'));
    };
    image.src = url;
  });
}

function Workspace({ preset }: { preset?: string }) {
  const [mode, setMode] = useState<Mode>(preset === 'code128' ? 'barcode' : preset === 'labels' ? 'labels' : 'qr');
  const [kind, setKind] = useState<QRKind>(preset === 'wifi' ? 'Wi-Fi' : preset === 'vcard' ? 'vCard' : preset === 'whatsapp' ? 'WhatsApp' : 'URL');
  const [barcodeKind, setBarcodeKind] = useState<BarcodeKind>('CODE128');
  const [text, setText] = useState('https://example.com');
  const [ssid, setSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiSecurity, setWifiSecurity] = useState('WPA');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsMessage, setWhatsMessage] = useState('');
  const [barValue, setBarValue] = useState('UC-1048-2025');
  const [pattern, setPattern] = useState('rounded');
  const [eyeFrame, setEyeFrame] = useState('extra-rounded');
  const [eyeCenter, setEyeCenter] = useState('dot');
  const [qrFrame, setQrFrame] = useState('none');
  const [fg, setFg] = useState('#0F172A');
  const [bg, setBg] = useState('#FFFFFF');
  const [ecc, setEcc] = useState('Q');
  const [includeMargin, setIncludeMargin] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreset, setLogoPreset] = useState('none');
  const [logoBadge, setLogoBadge] = useState('rounded');
  const [logoScale, setLogoScale] = useState(.18);
  const [qrDesignTab, setQrDesignTab] = useState<QrDesignTab>('shape');
  const [exportPixels, setExportPixels] = useState(2048);
  const [error, setError] = useState('');
  const [codeData, setCodeData] = useState('');
  const [svgData, setSvgData] = useState('');
  const [batch, setBatch] = useState('https://example.com/product/01\\nhttps://example.com/product/02\\nhttps://example.com/product/03');
  const [zipBusy, setZipBusy] = useState(false);
  const [labelRows, setLabelRows] = useState(12);
  const [labelBarcode, setLabelBarcode] = useState(false);
  const [wifiHidden, setWifiHidden] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraText, setCameraText] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrSvgRef = useRef<SVGSVGElement | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const batchItems = useMemo(() => batch.split(/\r?\n/).map(line => line.trim()).filter(Boolean), [batch]);

  useEffect(() => {
    if (preset === 'wifi') setKind('Wi-Fi');
    if (preset === 'vcard') setKind('vCard');
    if (preset === 'whatsapp') setKind('WhatsApp');
    if (preset === 'code128') { setMode('barcode'); setBarcodeKind('CODE128'); }
    if (preset === 'labels') setMode('labels');
  }, [preset]);

  const qrText = useMemo(() => {
    const escapeVCard = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
    if (kind === 'Wi-Fi') return ssid ? `WIFI:T:${wifiSecurity};S:${ssid.replace(/[\\;,:]/g, '\\$&')};P:${wifiPass.replace(/[\\;,:]/g, '\\$&')};${wifiHidden ? 'H:true;' : ''};` : '';
    if (kind === 'vCard') return name ? `BEGIN:VCARD\nVERSION:3.0\nN:${escapeVCard(name)}\nFN:${escapeVCard(name)}\nORG:${escapeVCard(company)}\nTEL:${escapeVCard(phone)}\nEMAIL:${escapeVCard(email)}\nEND:VCARD` : '';
    if (kind === 'WhatsApp') return phone ? `https://wa.me/${phone.replace(/\D/g, '')}${whatsMessage ? `?text=${encodeURIComponent(whatsMessage)}` : ''}` : '';
    if (kind === 'Phone') return phone ? `tel:${phone}` : '';
    return text.trim();
  }, [kind, ssid, wifiSecurity, wifiPass, name, company, phone, email, whatsMessage, text, wifiHidden]);

  useEffect(() => {
    if (mode !== 'qr' && mode !== 'labels' && mode !== 'bulk') return;
    if (mode === 'labels' && labelBarcode) return;
    if (!qrText) { setCodeData(''); setSvgData(''); setError('Add the required content to create your QR code.'); return; }
    let dead = false;
    let previewUrl = '';
    setCodeData('');
    setSvgData('');
    const qr = new QRCodeStyling({
      width: 640, height: 640, type: 'svg', data: qrText,
      margin: includeMargin ? 18 : 0,
      qrOptions: { errorCorrectionLevel: ecc as 'L' | 'M' | 'Q' | 'H' },
      dotsOptions: { color: fg, type: dotStyles[pattern] || 'rounded' },
      backgroundOptions: { color: bg },
      cornersSquareOptions: { color: fg, type: eyeFrame as 'dot' | 'square' | 'extra-rounded' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' },
      cornersDotOptions: { color: fg, type: eyeCenter as 'dot' | 'square' },
    });
    qr.getRawData('svg').then(async raw => {
      if (!raw || dead) return;
      const originalSvg = raw instanceof Blob ? await raw.text() : raw.toString();
      const data = addQrFrame(addQrLogo(originalSvg, logoUrl, logoBadge, logoScale), qrFrame, fg, bg);
      if (dead) return;
      setSvgData(data);
      const pngBlob = await svgToPng(data);
      if (!dead) {
        previewUrl = URL.createObjectURL(pngBlob);
        setCodeData(previewUrl);
      }
      setError('');
    }).catch(() => { if (!dead) setError('This content could not be encoded. Try shortening it.'); });
    return () => { dead = true; if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [mode, qrText, pattern, fg, bg, ecc, includeMargin, logoUrl, logoBadge, logoScale, labelBarcode, eyeFrame, eyeCenter, qrFrame]);

  useEffect(() => {
    if (mode !== 'barcode' && !(mode === 'labels' && labelBarcode)) return;
    if (!barValue.trim()) { setCodeData(''); setSvgData(''); setError('Enter a barcode value to preview.'); return; }
    let dead = false;
    let svgUrl = '';
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const value = normalizedBarcode(barValue, barcodeKind);
      JsBarcode(svg, value, { format: barcodeKind === 'UPC' ? 'UPC' : barcodeKind, lineColor: fg, background: bg, width: 2, height: 88, displayValue: true, margin: includeMargin ? 12 : 0, font: 'Inter', fontSize: 15 });
      barcodeSvgRef.current = svg;
      setSvgData(new XMLSerializer().serializeToString(svg));
      const image = new Image();
      svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      image.onload = () => {
        if (dead) return;
        const canvas = document.createElement('canvas');
        canvas.width = image.width * 2; canvas.height = image.height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); setCodeData(canvas.toDataURL('image/png')); }
        URL.revokeObjectURL(svgUrl);
      };
      image.src = svgUrl;
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Enter a valid value for this barcode format.'); setCodeData(''); setSvgData(''); }
    return () => { dead = true; if (svgUrl) URL.revokeObjectURL(svgUrl); };
  }, [mode, barValue, barcodeKind, fg, bg, includeMargin, labelBarcode]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => setCameraError('Camera preview could not start. Check browser permissions.'));
    }
  }, [cameraActive]);

  function switchMode(next: Mode) { if (next === mode) return; if (next !== 'scanner') stopCamera(); setMode(next); setError(''); setCodeData(''); setSvgData(''); }
  function downloadBlob(blob: Blob, filename: string) {
    saveAs(blob, filename);
  }
  async function downloadPng() {
    if (mode === 'qr' && svgData) {
      try {
        const blob = await svgToPng(svgData, exportPixels);
        downloadBlob(blob, `utilitycodes-${exportPixels}px.png`);
      } catch { setError('High-resolution PNG export failed. Try a smaller pixel size.'); }
      return;
    }
    if (!codeData) return;
    try {
      const response = await fetch(codeData);
      if (!response.ok) throw new Error('PNG download failed.');
      downloadBlob(await response.blob(), 'utilitycodes.png');
    } catch { setError('PNG export failed. Try generating the code again.'); }
  }
  function downloadSvg() { if (svgData) downloadBlob(new Blob([svgData], { type: 'image/svg+xml' }), 'utilitycodes.svg'); }
  async function handleLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose a PNG, JPG, WebP or SVG logo.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Choose a logo smaller than 8 MB.'); return; }
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const loaded = new Image();
        loaded.onload = () => resolve(loaded);
        loaded.onerror = () => reject(new Error('Logo image could not be read.'));
        loaded.src = sourceUrl;
      });
      const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing is unavailable.');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const localPng = canvas.toDataURL('image/png');
      setLogoPreset('custom');
      setLogoUrl(localPng);
      setEcc('H');
      setError('');
    } catch {
      setError('That logo could not be prepared. Try a PNG or JPG image without external SVG links.');
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }
  function selectLogoPreset(value: string) {
    setLogoPreset(value);
    setLogoUrl(value === 'custom' || value === 'none' ? '' : brandMarkData(value));
    if (value !== 'none') setEcc('H');
  }
  async function createZip() {
    if (!batchItems.length) { setError('Add at least one non-empty line to your batch.'); return; }
    setZipBusy(true); setError('');
    try {
      const zip = new JSZip();
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const qr = new QRCodeStyling({
          width: 540, height: 540, type: 'svg', data: item, margin: 16,
          dotsOptions: { color: fg, type: dotStyles[pattern] || 'rounded' },
          cornersSquareOptions: { color: fg, type: eyeFrame as 'dot' | 'square' | 'extra-rounded' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' },
          cornersDotOptions: { color: fg, type: eyeCenter as 'dot' | 'square' },
          backgroundOptions: { color: bg }, qrOptions: { errorCorrectionLevel: ecc as 'L'|'M'|'Q'|'H' },
        });
        const raw = await qr.getRawData('svg');
        if (raw) {
          const svg = raw instanceof Blob ? await raw.text() : raw.toString();
          const withLogo = addQrLogo(svg, logoUrl, logoBadge, logoScale);
          zip.file(`${String(i + 1).padStart(3, '0')}-code.png`, await svgToPng(addQrFrame(withLogo, qrFrame, fg, bg), exportPixels));
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'utilitycodes-batch.zip');
    } catch { setError('The batch could not be created. Check the content and try again.'); }
    finally { setZipBusy(false); }
  }
  async function startCamera() {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError('Camera access is not available in this browser. Use the image upload or text fallback below.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
    } catch { setCameraError('Camera permission was denied or no camera was found. Use image upload or enter text below.'); }
  }
  function stopCamera() { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCameraActive(false); if (videoRef.current) videoRef.current.srcObject = null; }
  async function recognizeImage(file: File | Blob) {
    setOcrBusy(true); setCameraError('');
    let cleanupWorker: (() => Promise<unknown>) | undefined;
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      cleanupWorker = () => worker.terminate();
      const result = await worker.recognize(file);
      setCameraText(result.data.text.trim());
    } catch { setCameraError('Text recognition could not start. Try a clear image or use the text entry field.'); }
    finally { await cleanupWorker?.().catch(() => undefined); setOcrBusy(false); }
  }
  async function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setCameraError('Start your camera before capturing an image.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    await recognizeImage(await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob || new Blob()), 'image/png')));
  }
  const modeTitle = mode === 'qr' ? 'QR code maker' : mode === 'barcode' ? 'Barcode maker' : mode === 'bulk' ? 'Batch ZIP export' : mode === 'labels' ? 'Printable label sheet' : 'Camera text scanner';

  return <main className="page-wrap">
    <section className="workspace-head"><div><div className="eyebrow">The browser-side code toolkit</div>{preset ? <h2>Create a code. Keep it moving.</h2> : <h1>Create a code. Keep it moving.</h1>}<p>Quick QR codes, barcodes and print-ready labels — all processed on this device.</p></div><div className="privacy-pill"><ShieldCheck size={15} /> Your data stays in this browser</div></section>
    <div className="mode-switcher" role="tablist" aria-label="Utility tools">{([
      ['qr', <QrCode size={15} />, 'QR code'], ['barcode', <Barcode size={15} />, 'Barcode'], ['bulk', <FileArchive size={15} />, 'Batch ZIP'], ['labels', <ImagePlus size={15} />, 'Label sheet'], ['scanner', <ScanLine size={15} />, 'Text scanner'],
    ] as [Mode, ReactNode, string][]).map(([key, icon, label]) => <button key={key} role="tab" aria-selected={mode === key} className={`mode-pill ${mode === key ? 'active' : ''}`} onClick={() => switchMode(key)} data-testid={`tab-${key}`}>{icon}{label}</button>)}</div>

    <div className="workspace-grid">
      <section className="panel controls-panel" aria-label={`${modeTitle} controls`}>
        <div className="control-head"><div><h2 className="section-title">{modeTitle}</h2><p className="section-hint">{mode === 'scanner' ? 'Extract text from a camera image, privately.' : mode === 'bulk' ? 'One line per code. Download every QR as a ZIP.' : mode === 'labels' ? 'Prepare a print-ready A4 grid.' : 'Set the content, tune the details, export when ready.'}</p></div><span className="eyebrow">{mode === 'scanner' ? 'OCR' : 'LOCAL'}</span></div>

        {mode === 'qr' && <>
          <div className="content-type-row" role="group" aria-label="QR content type">{(['URL','Text','Wi-Fi','vCard','WhatsApp','Phone'] as QRKind[]).map(t => <button className={`type-chip ${kind === t ? 'active' : ''}`} key={t} onClick={() => { setKind(t); setError(''); }} data-testid={`type-${t.toLowerCase()}`}>{t}</button>)}</div>
          {['URL','Text'].includes(kind) && <Field label={kind === 'URL' ? 'Website address' : 'Your text'} help={kind === 'URL' ? 'Include https:// for the best compatibility.' : `${text.length} characters` }><textarea className="textarea-control" value={text} onChange={e => setText(e.target.value)} placeholder={kind === 'URL' ? 'https://example.com' : 'Type or paste your content'} data-testid="input-qr-content" rows={3} /></Field>}
          {kind === 'Wi-Fi' && <><Field label="Network name (SSID)"><input className="control" value={ssid} onChange={e => setSsid(e.target.value)} placeholder="e.g. Studio Guest" data-testid="input-wifi-ssid" /></Field><div className="form-grid"><Field label="Password"><input className="control" value={wifiPass} onChange={e => setWifiPass(e.target.value)} type="password" placeholder="Network password" data-testid="input-wifi-password" /></Field><Field label="Security"><select className="select-control" value={wifiSecurity} onChange={e => setWifiSecurity(e.target.value)} data-testid="select-wifi-security"><option>WPA</option><option>WEP</option><option>nopass</option></select></Field></div><label className="toggle-line"><span>Hidden network</span><input type="checkbox" checked={wifiHidden} data-testid="toggle-hidden-network" onChange={e => setWifiHidden(e.target.checked)} /></label></>}
          {kind === 'vCard' && <><div className="form-grid"><Field label="Full name"><input className="control" value={name} onChange={e => setName(e.target.value)} placeholder="Sam Taylor" data-testid="input-vcard-name" /></Field><Field label="Company"><input className="control" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" data-testid="input-vcard-company" /></Field><Field label="Phone"><input className="control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0100" data-testid="input-vcard-phone" /></Field><Field label="Email"><input className="control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sam@example.com" data-testid="input-vcard-email" /></Field></div></>}
          {kind === 'WhatsApp' && <><Field label="WhatsApp phone number" help="Include the country code; spaces and punctuation are removed."><input className="control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0100" data-testid="input-whatsapp-phone" /></Field><Field label="Prefilled message (optional)"><textarea className="textarea-control" value={whatsMessage} onChange={e => setWhatsMessage(e.target.value)} placeholder="Hi! I'd like to know more…" data-testid="input-whatsapp-message" rows={2} /></Field></>}
          {kind === 'Phone' && <Field label="Phone number"><input className="control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0100" data-testid="input-qr-phone" /></Field>}
           <div className="subsection qr-customizer">
             <div className="control-head"><div><h3 className="section-title"><span className="step-number">2</span> Design your QR</h3><p className="section-hint">Explore the shape, logo and scan settings.</p></div><Sparkles size={17} color="#64748b" /></div>
             <div className="qr-design-tabs" role="tablist" aria-label="QR design settings">
               {([
                 ['frame', 'Frame', <ImagePlus size={14} />],
                 ['shape', 'Shape', <QrCode size={14} />],
                 ['logo', 'Logo', <ImagePlus size={14} />],
                 ['level', 'Level', <ShieldCheck size={14} />],
               ] as [QrDesignTab, string, ReactNode][]).map(([key, label, icon]) => <button key={key} type="button" role="tab" aria-selected={qrDesignTab === key} className={`qr-design-tab ${qrDesignTab === key ? 'active' : ''}`} onClick={() => setQrDesignTab(key)} data-testid={`qr-design-tab-${key}`}>{icon}{label}</button>)}
             </div>

             <div className="qr-design-content">
               {qrDesignTab === 'shape' && <>
                 <div className="design-section-head"><div><strong>Shape style</strong><span>Choose the module look that fits your brand.</span></div></div>
                 <div className="shape-card-grid" role="group" aria-label="QR shape styles">
                   {([
                     ['square', 'Square', 'Crisp and classic'],
                     ['rounded', 'Soft', 'Smooth corners'],
                     ['dots', 'Dots', 'Light and friendly'],
                     ['classy', 'Classy', 'Distinctive detail'],
                     ['fluid', 'Fluid', 'Organic flow'],
                     ['extra-rounded', 'Pill', 'Extra rounded'],
                   ] as [string, string, string][]).map(([value, label, hint]) => <button key={value} type="button" className={`shape-card ${pattern === value ? 'active' : ''}`} aria-label={`${label} QR shape`} aria-pressed={pattern === value} onClick={() => setPattern(value)} data-testid={`button-shape-${value}`}>
                     <span className="shape-card-art"><QrPatternThumb pattern={value} />{pattern === value && <span className="shape-selected"><Check size={12}/></span>}</span><span className="shape-card-label">{label}</span><span className="shape-card-hint">{hint}</span>
                   </button>)}
                 </div>
                 <div className="design-section-head eye-heading"><div><strong>Finder eyes</strong><span>Shape the three corner markers.</span></div></div>
                 <div className="eye-options">
                   <div className="eye-option-group"><span className="eye-option-label">Outer frame</span><div className="eye-option-buttons">{([
                     ['square', 'Square'], ['extra-rounded', 'Rounded'], ['dot', 'Circle'],
                   ] as [string, string][]).map(([value, label]) => <button key={value} type="button" className={`eye-option ${eyeFrame === value ? 'active' : ''}`} aria-label={`${label} finder frame`} aria-pressed={eyeFrame === value} onClick={() => setEyeFrame(value)}><span className={`eye-glyph outer-${value}`}><i /></span></button>)}</div></div>
                   <div className="eye-option-group"><span className="eye-option-label">Center mark</span><div className="eye-option-buttons">{([
                     ['square', 'Square'], ['dot', 'Circle'],
                   ] as [string, string][]).map(([value, label]) => <button key={value} type="button" className={`eye-option ${eyeCenter === value ? 'active' : ''}`} aria-label={`${label} finder center`} aria-pressed={eyeCenter === value} onClick={() => setEyeCenter(value)}><span className={`eye-glyph inner-${value}`}><i /></span></button>)}</div></div>
                 </div>
                 <div className="design-color-row">
                   <Field label="Code color"><div className="swatch-row"><input className="color-input" type="color" value={fg} onChange={e => setFg(e.target.value)} data-testid="color-foreground" /><input className="control color-code" value={fg} onChange={e => setFg(e.target.value)} aria-label="Foreground hex color" /></div></Field>
                   <Field label="Background color"><div className="swatch-row"><input className="color-input" type="color" value={bg} onChange={e => setBg(e.target.value)} data-testid="color-background" /><input className="control color-code" value={bg} onChange={e => setBg(e.target.value)} aria-label="Background hex color" /></div></Field>
                   <button className="invert-colors" type="button" onClick={() => { setFg(bg); setBg(fg); }} data-testid="button-invert-colors">Invert</button>
                 </div>
               </>}

               {qrDesignTab === 'frame' && <>
                 <div className="design-section-head"><div><strong>Call-to-action frame</strong><span>Add a short invitation below your code.</span></div></div>
                 <div className="frame-card-grid" role="group" aria-label="QR call-to-action frame">
                   {([
                     ['none', 'No frame', 'Just the code'],
                     ['scan', 'Scan me', 'Clear and direct'],
                     ['point', 'Point your camera', 'Helpful instruction'],
                   ] as [string, string, string][]).map(([value, label, hint]) => <button key={value} type="button" className={`frame-card ${qrFrame === value ? 'active' : ''}`} aria-pressed={qrFrame === value} onClick={() => setQrFrame(value)} data-testid={`button-frame-${value}`}><span className="frame-card-code"><QrCode size={22}/>{value !== 'none' && <small>{value === 'scan' ? 'SCAN ME' : 'POINT CAMERA'}</small>}</span><strong>{label}</strong><span>{hint}</span></button>)}
                 </div>
                 <label className="toggle-line"><span><strong>Keep a quiet zone</strong><small>Leave a clear margin around the QR pattern for easier scanning.</small></span><input type="checkbox" checked={includeMargin} onChange={e => setIncludeMargin(e.target.checked)} data-testid="toggle-quiet-zone" /></label>
               </>}

               {qrDesignTab === 'logo' && <>
                 <div className="design-section-head"><div><strong>Center logo</strong><span>Place your own mark in the middle of the code.</span></div></div>
                 {logoUrl ? <div className="logo-preview-card"><span className="logo-preview-image"><img src={logoUrl} alt="Uploaded center logo preview" /></span><span className="logo-preview-copy"><strong>{logoPreset === 'custom' ? 'Your uploaded logo' : `${logoPreset[0].toUpperCase()}${logoPreset.slice(1)} icon`}</strong><small>It will appear in the live QR and in PNG/SVG exports.</small></span><button className="logo-remove" type="button" onClick={() => { setLogoUrl(''); setLogoPreset('none'); }} aria-label="Remove center logo" data-testid="button-remove-logo"><X size={15}/></button></div> : <label className="logo-upload-card" htmlFor="center-logo-file">
                   <span className="logo-upload-icon"><ImagePlus size={19}/></span><span><strong>Upload a center logo</strong><small>PNG, JPG, WebP or SVG · up to 8 MB · processed here</small></span><span className="logo-upload-action">Choose file</span><input id="center-logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => { void handleLogo(e.target.files?.[0]); e.currentTarget.value = ''; }} data-testid="input-logo-upload" />
                 </label>}
                 <div className="logo-preset-row"><span className="eye-option-label">Or use a ready-made mark</span><div className="logo-presets">
                   {([['instagram','Instagram'],['whatsapp','WhatsApp'],['youtube','YouTube'],['globe','Globe'],['shop','Shop']] as [string,string][]).map(([value,label]) => <button key={value} type="button" className={`logo-preset ${logoPreset === value ? 'active' : ''}`} onClick={() => selectLogoPreset(value)} aria-label={`Use ${label} logo`} aria-pressed={logoPreset === value} data-testid={`logo-preset-${value}`}><img src={brandMarkData(value)} alt="" /><span>{label}</span></button>)}
                 </div></div>
                 {logoUrl && <div className="logo-detail-controls"><div className="logo-badge-options"><span className="eye-option-label">Logo backing</span>{([['rounded','Rounded'],['square','Square'],['circle','Circle']] as [string,string][]).map(([value,label]) => <button key={value} type="button" className={`mini-choice ${logoBadge === value ? 'active' : ''}`} onClick={() => setLogoBadge(value)} aria-pressed={logoBadge === value}>{label}</button>)}</div><Field label={`Logo size · ${Math.round(logoScale * 100)}%`}><input className="range-control" type="range" min=".12" max=".22" step=".01" value={logoScale} onChange={e => setLogoScale(Number(e.target.value))} aria-label="Center logo size" data-testid="range-logo-size" /></Field></div>}
                 {logoUrl && <div className="notice logo-scan-note"><strong>Logo added.</strong> High error correction is selected to help preserve scan reliability. Test the exported code with a phone.</div>}
               </>}

               {qrDesignTab === 'level' && <>
                 <div className="design-section-head"><div><strong>Error correction</strong><span>More correction improves recovery, with a denser pattern.</span></div></div>
                 <div className="level-card-grid" role="group" aria-label="Error correction level">
                   {([
                     ['L', 'Low', '7% recovery'],
                     ['M', 'Medium', '15% recovery'],
                     ['Q', 'Quartile', '25% recovery'],
                     ['H', 'High', '30% recovery'],
                   ] as [string, string, string][]).map(([value, label, hint]) => <button key={value} type="button" className={`level-card ${ecc === value ? 'active' : ''}`} aria-pressed={ecc === value} onClick={() => setEcc(value)} data-testid={`button-ecc-${value}`}><span>{value}</span><strong>{label}</strong><small>{hint}</small></button>)}
                 </div>
                 <Field label="PNG export quality" help="The preview stays quick. The PNG is rendered directly from vector data at this size."><select className="select-control" value={exportPixels} onChange={e => setExportPixels(Number(e.target.value))} data-testid="select-export-pixels"><option value="1024">1024 px · web</option><option value="2048">2048 px · high quality</option><option value="4096">4096 px · print ready</option></select></Field>
                 <div className="vector-note"><QrCode size={16}/><span><strong>SVG stays sharp at any size.</strong><small>Choose PNG when you need a fixed pixel image.</small></span></div>
               </>}
             </div>
           </div>
        </>}

        {mode === 'barcode' && <>
          <Field label="Barcode format"><select className="select-control" value={barcodeKind} onChange={e => setBarcodeKind(e.target.value as BarcodeKind)} data-testid="select-barcode-type"><option value="CODE128">Code 128 · versatile</option><option value="EAN13">EAN-13 · retail</option><option value="UPC">UPC-A · North American retail</option><option value="CODE39">Code 39 · industrial</option></select></Field>
          <Field label="Value" help={barcodeKind === 'EAN13' ? 'Enter 12 digits; the check digit is calculated automatically. Or enter all 13 digits to validate.' : barcodeKind === 'UPC' ? 'Enter 11 digits for automatic check digit, or 12 digits to validate.' : 'Code 128 and Code 39 accept letters, digits and supported punctuation.'}><input className="control" value={barValue} onChange={e => setBarValue(e.target.value)} placeholder="Enter a product or inventory value" data-testid="input-barcode-value" /></Field>
          <div className="form-grid"><Field label="Ink color"><div className="swatch-row"><input className="color-input" type="color" value={fg} onChange={e => setFg(e.target.value)} data-testid="color-barcode-foreground" /><input className="control color-code" value={fg} onChange={e => setFg(e.target.value)} aria-label="Barcode ink hex" /></div></Field><Field label="Paper color"><div className="swatch-row"><input className="color-input" type="color" value={bg} onChange={e => setBg(e.target.value)} data-testid="color-barcode-background" /><input className="control color-code" value={bg} onChange={e => setBg(e.target.value)} aria-label="Barcode background hex" /></div></Field></div>
          <label className="toggle-line"><span>Include quiet margins</span><input type="checkbox" checked={includeMargin} onChange={e => setIncludeMargin(e.target.checked)} data-testid="toggle-barcode-margin" /></label>
          <div className="notice">Check digits are validated or calculated for EAN-13 and UPC-A. Always test a printed sample with your scanner.</div>
        </>}

        {mode === 'bulk' && <>
          <Field label="One value per line" help={`${batchItems.length} codes ready · blank lines are ignored.`}><textarea className="textarea-control" value={batch} onChange={e => setBatch(e.target.value)} rows={9} placeholder="Paste or type one URL or text value per line" data-testid="input-batch-values" /></Field>
          <div className="bulk-list">{batchItems.slice(0, 4).map((item, i) => <div className="bulk-item" key={`${i}-${item}`} data-testid={`batch-item-${i}`}>{String(i + 1).padStart(2, '0')} &nbsp; {item}</div>)}{batchItems.length > 4 && <div className="field-help">and {batchItems.length - 4} more…</div>}</div>
          <div className="subsection"><h3 className="section-title">Export settings</h3><div className="form-grid" style={{marginTop:13}}><Field label="Dot pattern"><select className="select-control" value={pattern} onChange={e => setPattern(e.target.value)} data-testid="select-batch-pattern"><option value="square">Square</option><option value="rounded">Rounded</option><option value="dots">Dots</option><option value="classy">Classy</option><option value="fluid">Fluid</option></select></Field><Field label="Error correction"><select className="select-control" value={ecc} onChange={e => setEcc(e.target.value)} data-testid="select-batch-ecc"><option value="L">Low</option><option value="M">Medium</option><option value="Q">Quartile (Q)</option><option value="H">High (H)</option></select></Field></div><p className="field-help">Batch exports reuse the selected QR style, eye shapes, frame, colors and center icon.</p></div>
          <button className="btn btn-primary" onClick={createZip} disabled={zipBusy || !batchItems.length} data-testid="button-download-zip"><FileArchive size={15} />{zipBusy ? `Building ${batchItems.length} codes…` : `Download ${batchItems.length} PNGs as ZIP`}</button>
        </>}

        {mode === 'labels' && <>
          <Field label="Label content"><textarea className="textarea-control" value={batch} onChange={e => setBatch(e.target.value)} rows={5} placeholder="One label per line" data-testid="input-label-values" /></Field>
          <div className="form-grid"><Field label="Grid density"><select className="select-control" value={labelRows} onChange={e => setLabelRows(Number(e.target.value))} data-testid="select-label-count"><option value="6">6 large labels</option><option value="12">12 standard labels</option><option value="21">21 compact labels</option></select></Field><Field label="Code type"><select className="select-control" value={labelBarcode ? 'barcode' : 'qr'} onChange={e => setLabelBarcode(e.target.value === 'barcode')} data-testid="select-label-code-type"><option value="qr">QR code</option><option value="barcode">Barcode</option></select></Field></div>
          <div className="notice"><strong>A4 · portrait</strong><br />Print at 100% scale for consistent sizing. Grid layout adapts to the selected label count.</div>
          <button className="btn btn-primary print-hide" onClick={() => window.print()} data-testid="button-print-labels"><ArrowDownToLine size={15} /> Print label sheet</button>
        </>}

        {mode === 'scanner' && <>
          <div className="scanner-box">{cameraActive ? <video ref={videoRef} autoPlay playsInline muted data-testid="video-camera-preview" /> : <div><Camera size={27} color="#94a3b8" /><p className="section-hint">Camera preview appears here when started.</p></div>}</div>
          <div className="scanner-actions"><button className="btn btn-primary" onClick={startCamera} data-testid="button-start-camera"><Camera size={15} /> Start camera</button><button className="btn" onClick={captureFrame} disabled={!cameraActive || ocrBusy} data-testid="button-capture-scan"><ScanLine size={15} />{ocrBusy ? 'Reading text…' : 'Capture & read'}</button><button className="btn" onClick={stopCamera} disabled={!cameraActive} data-testid="button-stop-camera">Stop</button></div>
          <Field label="Or upload an image"><input className="control" type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) void recognizeImage(file); }} data-testid="input-ocr-image" /></Field>
          {cameraError && <p className="error-message" role="alert" data-testid="error-camera">{cameraError}</p>}
          <Field label="Recognized text" help="Text recognition runs locally. Review the result before using it."><textarea className="textarea-control" value={cameraText} onChange={e => setCameraText(e.target.value)} placeholder="Capture a frame or upload an image, or enter text here…" rows={5} data-testid="textarea-recognized-text" /></Field>
          <div className="action-row"><button className="btn" onClick={() => { setText(cameraText); setKind('Text'); setMode('qr'); }} disabled={!cameraText.trim()} data-testid="button-use-scanned-text"><QrCode size={15} /> Use as QR content</button><button className="btn" onClick={() => navigator.clipboard?.writeText(cameraText)} disabled={!cameraText.trim()} data-testid="button-copy-scanned-text"><Check size={14} /> Copy text</button></div>
          <div className="notice" style={{marginTop:15}}>Camera permission is optional. If unavailable, upload a photo or type/paste text in the field above.</div>
        </>}

        {mode !== 'scanner' && error && <p className="error-message" role="alert" data-testid="error-code">{error}</p>}
      </section>

      <section className="panel preview-panel" aria-label="Code preview">
        <div className="control-head"><div><h2 className="section-title">{mode === 'labels' ? 'A4 sheet preview' : 'Live preview'}</h2><p className="section-hint">{mode === 'scanner' ? 'Recognized output stays on this device.' : mode === 'bulk' ? `${batchItems.length} entries in this batch` : 'Export a crisp image or a scalable vector.'}</p></div>{mode !== 'scanner' && <span className="privacy-pill" style={{padding:'6px 9px',fontSize:10}}><LockKeyhole size={12}/> Local</span>}</div>
        {mode === 'labels' ? <div className="print-sheet" style={{gridTemplateColumns:`repeat(${labelRows === 6 ? 2 : 3},1fr)`}} data-density={labelRows} data-testid="preview-label-sheet">{Array.from({length: labelRows}, (_, i) => {
          const val = batchItems[i] || batchItems[0] || `Label ${i + 1}`;
          return <div className="print-label" key={i} data-testid={`print-label-${i}`}>{labelBarcode ? <BarcodeCell value={val} kind={barcodeKind} fg={fg} bg={bg} /> : <><LabelQr value={val} fg={fg} bg={bg} pattern={pattern} ecc={ecc} logoUrl={logoUrl} logoBadge={logoBadge} logoScale={logoScale} frame={qrFrame} eyeFrame={eyeFrame} eyeCenter={eyeCenter} /><span>{val}</span></>}</div>;
        })}</div> : mode === 'scanner' ? <div className="preview-stage"><div className="placeholder-art"><ScanLine size={32} /><div>OCR reads text from an image using your browser.</div></div></div> : <div className="preview-stage">
          {mode === 'barcode' ? codeData && <img className="code-output barcode-output" src={codeData} alt="Generated barcode preview" data-testid="image-barcode-preview" /> : codeData ? <img className="code-output qr-output" src={codeData} alt="Generated QR code preview" data-testid="image-qr-preview" /> : <div className="placeholder-art"><QrCode size={34}/><div>Enter your content to see a live QR preview.</div></div>}
          {mode === 'barcode' && !codeData && <div className="placeholder-art"><Barcode size={34}/><div>Enter a valid value to preview your barcode.</div></div>}
        </div>}
        <div className="preview-meta"><span>{mode === 'barcode' ? `${barcodeKind} · ${barcodeKind === 'EAN13' || barcodeKind === 'UPC' ? 'check digit included' : 'barcode'}` : mode === 'labels' ? `A4 · ${labelRows} labels` : mode === 'bulk' ? 'PNG files · ZIP archive' : `PNG · ${exportPixels}px output`}</span>{mode === 'qr' && <span>{qrText.length} chars</span>}</div>
        {mode === 'qr' || mode === 'barcode' ? <div className={`download-row ${codeData ? '' : 'disabled'}`}><button className="download-btn png" onClick={downloadPng} data-testid="button-download-png"><ArrowDownToLine size={15}/> Download PNG{mode === 'qr' ? ` · ${exportPixels}px` : ''}</button><button className="download-btn svg" onClick={downloadSvg} data-testid="button-download-svg"><ArrowDownToLine size={15}/> Download SVG</button></div>
          : mode === 'labels' ? <button className="btn btn-primary print-hide" style={{width:'100%',marginTop:12}} onClick={() => window.print()} data-testid="button-print-preview"><ArrowDownToLine size={15}/> Print A4 sheet</button>
          : mode === 'bulk' ? <div className="notice" style={{marginTop:12}}>Each line becomes a numbered PNG in a browser-generated ZIP. No files are uploaded.</div> : <div className="notice" style={{marginTop:12}}>No photo or recognized text leaves your browser.</div>}
        {mode === 'qr' || mode === 'barcode' ? <div className="notice" style={{marginTop:12}}>For best scan results, keep a clear border and use dark marks on a light background.</div> : null}
      </section>
    </div>
    {(mode === 'qr' || mode === 'barcode') && <div className={`mobile-download ${codeData ? '' : 'disabled'}`}><button className="download-btn png" onClick={downloadPng} data-testid="mobile-download-png"><ArrowDownToLine size={15}/> PNG{mode === 'qr' ? ` · ${exportPixels}px` : ''}</button><button className="download-btn svg" onClick={downloadSvg} data-testid="mobile-download-svg"><ArrowDownToLine size={15}/> Download SVG</button></div>}

    <section className="guide-section"><div className="eyebrow">Built for the everyday workflow</div><h2 className="guide-title">A useful code, minus the busywork.</h2><p className="guide-copy">Make a one-off link code, tailor a network QR for visitors, create a barcode with a checked retail digit, or batch a set of codes into a ZIP. UtilityCodes keeps content and files in your current browser session — there is no account and no upload step.</p><div className="guide-links">{guideRoutes.map(([url, label]) => <Link key={url} href={url} className="guide-link" data-testid={`guide-${url.slice(1)}`}>{label}<ChevronRight size={13} style={{verticalAlign:'middle',marginLeft:4}} /></Link>)}</div><div className="faq-list" style={{marginTop:20}}>{[
      ['Does UtilityCodes upload my content?', 'No. QR and barcode generation, batch ZIP creation and OCR are processed in your browser.'],
      ['Can I use my own logo in a QR code?', 'Yes. Add a PNG, JPG or SVG logo. A higher error-correction level can help, but always test the resulting code with a phone.'],
      ['Can I print labels at the right size?', 'The label sheet is laid out as an A4 portrait page. Use your browser print dialog at 100% scale, then test a sample page first.'],
    ].map(([q,a]) => <details className="faq-item" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
  </main>;
}

function LabelQr({ value, fg, bg, pattern, ecc, logoUrl, logoBadge, logoScale, frame, eyeFrame, eyeCenter }: { value: string; fg: string; bg: string; pattern: string; ecc: string; logoUrl: string; logoBadge: string; logoScale: number; frame: string; eyeFrame: string; eyeCenter: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    let objectUrl = '';
    const qr = new QRCodeStyling({
      width: 180, height: 180, type: 'svg', data: value, margin: 8,
      dotsOptions: { color: fg, type: dotStyles[pattern] || 'rounded' },
      cornersSquareOptions: { color: fg, type: eyeFrame as 'dot' | 'square' | 'extra-rounded' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' },
      cornersDotOptions: { color: fg, type: eyeCenter as 'dot' | 'square' },
      backgroundOptions: { color: bg }, qrOptions: { errorCorrectionLevel: ecc as 'L' | 'M' | 'Q' | 'H' },
    });
    qr.getRawData('svg').then(async blob => {
      if (!blob || !alive) return;
      const svg = blob instanceof Blob ? await blob.text() : blob.toString();
      const imageBlob = await svgToPng(addQrFrame(addQrLogo(svg, logoUrl, logoBadge, logoScale), frame, fg, bg));
      if (!alive) return;
      objectUrl = URL.createObjectURL(imageBlob);
      setSrc(objectUrl);
    }).catch(() => undefined);
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [value, fg, bg, pattern, ecc, logoUrl, logoBadge, logoScale, frame, eyeFrame, eyeCenter]);
  return src ? <img src={src} alt={`QR code for ${value}`} style={{width:58,height:58,objectFit:'contain'}} data-testid={`label-qr-${value.slice(0,16)}`} /> : <span aria-label="Generating QR code">…</span>;
}

function BarcodeCell({ value, kind, fg, bg }: { value: string; kind: BarcodeKind; fg: string; bg: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, normalizedBarcode(value, kind), { format: kind === 'UPC' ? 'UPC' : kind, lineColor: fg, background: bg, width: 1.2, height: 38, displayValue: false, margin: 3 });
      setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`);
    } catch { setSrc(''); }
  }, [value, kind, fg, bg]);
  return src ? <img src={src} alt={`Barcode for ${value}`} style={{width:'100%',height:50,objectFit:'contain'}} data-testid={`label-barcode-${value.slice(0,16)}`} /> : <span>{value}</span>;
}

function GuidePage({ path }: { path: string }) {
  const info = pageInfo[path];
  const sections = guideSections[path] || [];
  const preset = path.includes('wifi') ? 'wifi' : path.includes('vcard') ? 'vcard' : path.includes('whatsapp') ? 'whatsapp' : path.includes('code128') ? 'code128' : 'labels';
  return <><section className="document-page" style={{paddingBottom:25}}><div className="eyebrow">Free browser tool · no account</div><h1>{info.heading}</h1><p className="lead">{info.intro}</p><div className="action-row" style={{marginTop:20}}><Link href="/" className="btn btn-primary" data-testid="link-open-guide-tool">Open the generator <ChevronRight size={15}/></Link><span className="privacy-pill"><LockKeyhole size={14}/> Runs locally in your browser</span></div></section>
    <Workspace preset={preset}/><section className="document-page guide-article" style={{paddingTop:15}}>{sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<h2>Frequently asked questions</h2><div className="faq-list"><details className="faq-item"><summary>Is this generator free to use?</summary><p>Yes. Create and download codes with no account required. Generation happens in your browser, and you can export the result when it is ready.</p></details><details className="faq-item"><summary>Are my details sent to a server?</summary><p>No. Content, uploaded logos and images are processed on your device. They are not submitted to UtilityCodes for code generation.</p></details><details className="faq-item"><summary>What should I check before distributing codes?</summary><p>Verify the destination and every field, then scan a test export and print sample with the devices people will use.</p></details></div></section></>;
}

function LegalPage({ path }: { path: string }) {
  const content = legalContent[path];
  return <main className="document-page"><div className="eyebrow">UtilityCodes · Help and information</div><h1>{content.title}</h1><p className="lead">{content.intro}</p>{content.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}{path === '/contact' && <section><h2>Use the tools</h2><p>For quick help, the generators include format-specific hints and local validation. Return to the workspace to try another code format.</p><Link href="/" className="btn btn-primary" data-testid="link-contact-workspace">Open the workspace <ChevronRight size={14}/></Link></section>}</main>;
}

function AppRoutes() {
  const [location] = useLocation();
  usePageMeta(location);
  const page = pageInfo[location];
  const legal = legalContent[location];
  return <div className="app-shell"><Header/><Switch>
    <Route path="/" component={() => <Workspace/>}/>
    {guideRoutes.map(([path]) => <Route key={path} path={path} component={() => <GuidePage path={path}/>}/>)}
    {legalRoutes.map(([path]) => <Route key={path} path={path} component={() => <LegalPage path={path}/>}/>)}
    <Route component={NotFound}/>
  </Switch><AdSlot/><Footer/>{page && <span className="sr-only" data-testid="page-title">{page.title}</span>}{legal && <span className="sr-only" data-testid="page-title">{legal.title}</span>}</div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><AppRoutes/></RoutedErrorBoundary></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}
function normalizedBarcode(value: string, kind: BarcodeKind) {
  const input = value.trim();
  if (kind === 'CODE128') return input;
  if (kind === 'CODE39') {
    if (!/^[0-9A-Z .$/+%-]+$/i.test(input)) throw new Error('Code 39 supports letters A–Z, digits, spaces and - . $ / + %.');
    return input.toUpperCase();
  }
  const required = kind === 'EAN13' ? 12 : 11;
  const fullLength = required + 1;
  if (!/^\d+$/.test(input) || (input.length !== required && input.length !== fullLength)) throw new Error(`${kind === 'EAN13' ? 'EAN-13' : 'UPC-A'} needs ${required} digits; the check digit is calculated for you.`);
  const data = input.slice(0, required);
  const sum = [...data].reduce((acc, digit, i) => acc + Number(digit) * ((data.length - i) % 2 === 0 ? 1 : 3), 0);
  const check = String((10 - sum % 10) % 10);
  if (input.length === fullLength && input.at(-1) !== check) throw new Error(`Check digit should be ${check}; review the entered value.`);
  return data + check;
}
export default App;
