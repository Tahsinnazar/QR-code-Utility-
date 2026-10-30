import { useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  Globe,
  Wifi,
  Contact,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Lock,
  ArrowRight,
  Download,
  Share2,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { parseQrPayload, type ParsedQrResult } from "@/lib/qr-parser";
import { saveAs } from "file-saver";

interface QrResultDetailProps {
  rawContent: string;
  onUseAsQrContent: (
    kind: "URL" | "Text" | "Wi-Fi" | "vCard" | "WhatsApp" | "Phone",
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
  ) => void;
  onScanAnother: () => void;
}

export function QrResultDetail({
  rawContent,
  onUseAsQrContent,
  onScanAnother,
}: QrResultDetailProps) {
  const [copied, setCopied] = useState(false);
  const [showWifiPass, setShowWifiPass] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [currentContent, setCurrentContent] = useState(rawContent);

  const parsed: ParsedQrResult = parseQrPayload(currentContent);

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (title: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        handleCopy(url);
      }
    } else {
      handleCopy(url);
    }
  };

  const downloadVCard = () => {
    if (parsed.vcardData) {
      const blob = new Blob([currentContent], {
        type: "text/vcard;charset=utf-8",
      });
      const filename = `${(parsed.vcardData.name || "contact").replace(/\s+/g, "_")}.vcf`;
      saveAs(blob, filename);
    }
  };

  return (
    <div className="qr-detail-wrapper">
      {/* Top Header Card */}
      <div className="qr-detail-header-card">
        <div className="qr-detail-badge-group">
          {parsed.type === "url" && (
            <span className="qr-type-badge badge-url">
              <Globe size={15} /> Website Link
            </span>
          )}
          {parsed.type === "wifi" && (
            <span className="qr-type-badge badge-wifi">
              <Wifi size={15} /> Wi-Fi Network
            </span>
          )}
          {parsed.type === "vcard" && (
            <span className="qr-type-badge badge-vcard">
              <Contact size={15} /> Digital Business Card
            </span>
          )}
          {parsed.type === "whatsapp" && (
            <span className="qr-type-badge badge-whatsapp">
              <MessageCircle size={15} /> WhatsApp Chat
            </span>
          )}
          {parsed.type === "phone" && (
            <span className="qr-type-badge badge-phone">
              <Phone size={15} /> Phone Number
            </span>
          )}
          {parsed.type === "email" && (
            <span className="qr-type-badge badge-email">
              <Mail size={15} /> Email Message
            </span>
          )}
          {parsed.type === "text" && (
            <span className="qr-type-badge badge-text">
              <FileText size={15} /> Plain Text
            </span>
          )}

          <span className="qr-status-pill">
            <Check size={12} /> Successfully Scanned
          </span>
        </div>

        <button
          type="button"
          className="qr-scan-another-link"
          onClick={onScanAnother}
          title="Scan another QR code"
        >
          <RotateCcw size={14} /> Scan Another
        </button>
      </div>

      {/* Main Formatted Detail Section */}
      <div className="qr-detail-body">
        {/* URL TYPE */}
        {parsed.type === "url" && parsed.urlData && (
          <div className="qr-url-box">
            <div className="qr-url-meta">
              <div className="qr-url-domain-row">
                <span className="qr-domain-label">{parsed.urlData.domain}</span>
                {parsed.urlData.isSecure && (
                  <span className="qr-secure-pill">
                    <Lock size={12} /> Secure HTTPS
                  </span>
                )}
              </div>
              <a
                href={parsed.urlData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="qr-url-link"
                title={parsed.urlData.url}
              >
                {parsed.urlData.url}
              </a>
            </div>

            <div className="qr-detail-primary-actions">
              <a
                href={parsed.urlData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary qr-open-url-btn"
              >
                <ExternalLink size={16} /> Open Website in New Tab
              </a>

              <button
                type="button"
                className="btn btn-secondary qr-use-btn"
                onClick={() =>
                  onUseAsQrContent("URL", {
                    text: parsed.urlData?.url,
                  })
                }
              >
                <Sparkles size={15} /> Use as URL QR Code <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn qr-action-btn"
                onClick={() => handleCopy(parsed.urlData?.url || "")}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied!" : "Copy URL"}
              </button>

              <button
                type="button"
                className="btn qr-action-btn"
                onClick={() =>
                  handleShare(
                    parsed.urlData?.domain || "QR Link",
                    parsed.urlData?.url || "",
                  )
                }
              >
                <Share2 size={15} /> Share
              </button>
            </div>
          </div>
        )}

        {/* WI-FI TYPE */}
        {parsed.type === "wifi" && parsed.wifiData && (
          <div className="qr-wifi-box">
            <div className="qr-detail-grid">
              <div className="qr-detail-cell">
                <span className="cell-label">Network Name (SSID)</span>
                <span className="cell-val bold">{parsed.wifiData.ssid}</span>
              </div>

              <div className="qr-detail-cell">
                <span className="cell-label">Security Type</span>
                <span className="cell-val">{parsed.wifiData.security}</span>
              </div>

              {parsed.wifiData.password && (
                <div className="qr-detail-cell full-width">
                  <span className="cell-label">Network Password</span>
                  <div className="wifi-pass-row">
                    <span className="cell-val pass-font">
                      {showWifiPass
                        ? parsed.wifiData.password
                        : "••••••••••••"}
                    </span>
                    <button
                      type="button"
                      className="qr-icon-small-btn"
                      onClick={() => setShowWifiPass(!showWifiPass)}
                      title={showWifiPass ? "Hide password" : "Show password"}
                    >
                      {showWifiPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        handleCopy(parsed.wifiData?.password || "")
                      }
                    >
                      {copied ? "Copied" : "Copy Password"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="qr-detail-primary-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary qr-use-btn"
                onClick={() =>
                  onUseAsQrContent("Wi-Fi", {
                    ssid: parsed.wifiData?.ssid,
                    wifiPass: parsed.wifiData?.password || "",
                    wifiSecurity: parsed.wifiData?.security || "WPA",
                  })
                }
              >
                <Sparkles size={15} /> Customize as Wi-Fi QR Code{" "}
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  handleCopy(
                    `Network: ${parsed.wifiData?.ssid}\nPassword: ${parsed.wifiData?.password || "none"}`,
                  )
                }
              >
                <Copy size={15} /> Copy Credentials
              </button>
            </div>
          </div>
        )}

        {/* VCARD TYPE */}
        {parsed.type === "vcard" && parsed.vcardData && (
          <div className="qr-vcard-box">
            <div className="qr-vcard-card">
              <h4 className="vcard-name">
                {parsed.vcardData.name || "Contact Card"}
              </h4>
              {parsed.vcardData.title && (
                <p className="vcard-title">{parsed.vcardData.title}</p>
              )}
              {parsed.vcardData.company && (
                <p className="vcard-org">{parsed.vcardData.company}</p>
              )}

              <div className="vcard-details-list">
                {parsed.vcardData.phone && (
                  <div className="vcard-row">
                    <Phone size={14} />
                    <a href={`tel:${parsed.vcardData.phone}`}>
                      {parsed.vcardData.phone}
                    </a>
                  </div>
                )}
                {parsed.vcardData.email && (
                  <div className="vcard-row">
                    <Mail size={14} />
                    <a href={`mailto:${parsed.vcardData.email}`}>
                      {parsed.vcardData.email}
                    </a>
                  </div>
                )}
                {parsed.vcardData.url && (
                  <div className="vcard-row">
                    <Globe size={14} />
                    <a
                      href={parsed.vcardData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {parsed.vcardData.url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="qr-detail-primary-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={downloadVCard}
              >
                <Download size={15} /> Save Contact Card (.vcf)
              </button>

              <button
                type="button"
                className="btn btn-secondary qr-use-btn"
                onClick={() =>
                  onUseAsQrContent("vCard", {
                    name: parsed.vcardData?.name,
                    company: parsed.vcardData?.company,
                    phone: parsed.vcardData?.phone,
                    email: parsed.vcardData?.email,
                  })
                }
              >
                <Sparkles size={15} /> Use as vCard QR Code{" "}
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => handleCopy(currentContent)}
              >
                <Copy size={15} /> Copy All
              </button>
            </div>
          </div>
        )}

        {/* WHATSAPP TYPE */}
        {parsed.type === "whatsapp" && parsed.whatsAppData && (
          <div className="qr-whatsapp-box">
            <div className="qr-detail-grid">
              <div className="qr-detail-cell">
                <span className="cell-label">Phone Number</span>
                <span className="cell-val bold">
                  +{parsed.whatsAppData.phone}
                </span>
              </div>
              {parsed.whatsAppData.message && (
                <div className="qr-detail-cell full-width">
                  <span className="cell-label">Prefilled Message</span>
                  <span className="cell-val italic">
                    "{parsed.whatsAppData.message}"
                  </span>
                </div>
              )}
            </div>

            <div className="qr-detail-primary-actions" style={{ marginTop: 16 }}>
              <a
                href={`https://wa.me/${parsed.whatsAppData.phone}${
                  parsed.whatsAppData.message
                    ? `?text=${encodeURIComponent(parsed.whatsAppData.message)}`
                    : ""
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary qr-whatsapp-btn"
              >
                <MessageCircle size={16} /> Open in WhatsApp
              </a>

              <button
                type="button"
                className="btn btn-secondary qr-use-btn"
                onClick={() =>
                  onUseAsQrContent("WhatsApp", {
                    phone: parsed.whatsAppData?.phone,
                    whatsMessage: parsed.whatsAppData?.message || "",
                  })
                }
              >
                <Sparkles size={15} /> Use as WhatsApp QR Code{" "}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* PHONE / TEL TYPE */}
        {parsed.type === "phone" && parsed.phoneData && (
          <div className="qr-phone-box">
            <div className="qr-detail-cell">
              <span className="cell-label">Phone Number</span>
              <span className="cell-val bold">{parsed.phoneData}</span>
            </div>

            <div className="qr-detail-primary-actions" style={{ marginTop: 16 }}>
              <a href={`tel:${parsed.phoneData}`} className="btn btn-primary">
                <Phone size={15} /> Call Number
              </a>

              <button
                type="button"
                className="btn btn-secondary qr-use-btn"
                onClick={() =>
                  onUseAsQrContent("Phone", {
                    phone: parsed.phoneData,
                  })
                }
              >
                <Sparkles size={15} /> Use as Phone QR Code{" "}
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => handleCopy(parsed.phoneData || "")}
              >
                <Copy size={15} /> Copy Number
              </button>
            </div>
          </div>
        )}

        {/* GENERIC TEXT */}
        {parsed.type === "text" && (
          <div className="qr-text-box">
            <div className="qr-text-preview-box">{currentContent}</div>

            <div className="qr-text-meta">
              <span>{parsed.textData?.charCount} characters</span>
              <span>·</span>
              <span>{parsed.textData?.wordCount} words</span>
            </div>

            <div className="qr-detail-primary-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary qr-use-btn"
                onClick={() =>
                  onUseAsQrContent("Text", {
                    text: currentContent,
                  })
                }
              >
                <Sparkles size={15} /> Use in QR Code Generator{" "}
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => handleCopy(currentContent)}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied!" : "Copy Content"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Raw Content Toggle */}
      <div className="qr-raw-section">
        <button
          type="button"
          className="qr-raw-toggle"
          onClick={() => setShowRaw(!showRaw)}
        >
          <span>{showRaw ? "Hide Raw Content" : "View / Edit Raw Payload"}</span>
          <span className="raw-hint">
            {showRaw ? "▲" : "▼"}
          </span>
        </button>

        {showRaw && (
          <div className="qr-raw-content">
            <textarea
              className="textarea-control raw-textarea"
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              rows={4}
              placeholder="Edit raw QR payload"
            />
            <div className="raw-actions">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => handleCopy(currentContent)}
              >
                <Copy size={13} /> Copy Raw
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default QrResultDetail;
