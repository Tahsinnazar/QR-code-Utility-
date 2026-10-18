import { useEffect, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

type Props = { refined: boolean };
type Tab = 'Frame' | 'Shape' | 'Logo' | 'Level';
const patterns = [
  { id: 'square', name: 'Square', note: 'Crisp and classic' },
  { id: 'rounded', name: 'Soft', note: 'Smooth corners' },
  { id: 'dots', name: 'Dots', note: 'Light and friendly' },
  { id: 'classy', name: 'Classy', note: 'Distinctive detail' },
  { id: 'fluid', name: 'Fluid', note: 'Organic flow' },
  { id: 'extra-rounded', name: 'Pill', note: 'Extra rounded' },
];
const tabs: Tab[] = ['Frame', 'Shape', 'Logo', 'Level'];

function addLogo(svgText: string, data: string) {
  if (!data) return svgText;
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  const [,, w, h] = (root.getAttribute('viewBox') || '0 0 480 480').split(/\s+/).map(Number);
  const size = w * .22;
  const badge = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  badge.setAttribute('x', String((w-size*1.3)/2)); badge.setAttribute('y', String((h-size*1.3)/2));
  badge.setAttribute('width', String(size*1.3)); badge.setAttribute('height', String(size*1.3));
  badge.setAttribute('rx', String(size*.2)); badge.setAttribute('fill', '#fff');
  const img = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
  img.setAttribute('x', String((w-size)/2)); img.setAttribute('y', String((h-size)/2));
  img.setAttribute('width', String(size)); img.setAttribute('height', String(size));
  img.setAttribute('preserveAspectRatio', 'xMidYMid meet'); img.setAttribute('href', data);
  root.append(badge, img);
  return new XMLSerializer().serializeToString(root);
}

function addFrame(svgText: string, frame: string, foreground: string, background: string) {
  if (frame === 'none') return svgText;
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  const [x, y, width, height] = (root.getAttribute('viewBox') || '0 0 480 480').split(/\s+/).map(Number);
  const bandHeight = 54;
  root.setAttribute('viewBox', `${x} ${y} ${width} ${height + bandHeight}`);
  root.setAttribute('height', String(height + bandHeight));
  const band = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  band.setAttribute('x', String(x)); band.setAttribute('y', String(y + height));
  band.setAttribute('width', String(width)); band.setAttribute('height', String(bandHeight)); band.setAttribute('fill', background);
  const caption = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
  caption.setAttribute('x', String(x + width / 2)); caption.setAttribute('y', String(y + height + 35));
  caption.setAttribute('text-anchor', 'middle'); caption.setAttribute('font-family', 'Inter,Arial,sans-serif');
  caption.setAttribute('font-size', '22'); caption.setAttribute('font-weight', '700');
  caption.setAttribute('fill', foreground); caption.textContent = frame === 'scan' ? 'SCAN ME' : 'POINT YOUR CAMERA';
  root.append(band, caption);
  return new XMLSerializer().serializeToString(root);
}

function PatternSample({ style }: { style: string }) {
  const size = 21;
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
  const modules = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (finder(x, y) || (x * 17 + y * 31 + x * y * 7) % 13 > 5) continue;
    const left = x * 2, top = y * 2;
    modules.push(style === 'dots'
      ? <circle key={`${x}-${y}`} cx={left+1} cy={top+1} r=".82" />
      : <rect key={`${x}-${y}`} x={left} y={top} width="1.8" height="1.8" rx={style === 'square' ? 0 : style === 'extra-rounded' ? '.85' : '.5'} />);
  }
  const eye = (x: number, y: number) => <g key={`${x}-${y}`}><rect x={x*2} y={y*2} width="14" height="14" rx={style === 'square' ? 0 : 2} /><rect x={x*2+2} y={y*2+2} width="10" height="10" fill="white" /><rect x={x*2+4} y={y*2+4} width="6" height="6" rx={style === 'dots' ? 3 : 1} /></g>;
  return <svg className="qr-sample" viewBox="0 0 42 42" aria-hidden="true"><rect width="42" height="42" rx="3" fill="white"/><g fill="#111827">{modules}{eye(0,0)}{eye(14,0)}{eye(0,14)}</g></svg>;
}

function svgToPng(svg: string, pixels: number) {
  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    image.onload = () => {
      const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
      const box = (root.getAttribute('viewBox') || '0 0 480 480').split(/\s+/).map(Number);
      const width = pixels, height = Math.round(pixels * box[3] / box[2]);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas unavailable')); return; }
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url); canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/png');
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG preview failed')); };
    image.src = url;
  });
}

export function Editor({ refined }: Props) {
  const [tab, setTab] = useState<Tab>('Shape');
  const [style, setStyle] = useState('rounded');
  const [value, setValue] = useState('https://yourbrand.com/menu');
  const [ecc, setEcc] = useState('H');
  const [pixels, setPixels] = useState(2048);
  const [frame, setFrame] = useState('none');
  const [fg, setFg] = useState('#111827');
  const [bg, setBg] = useState('#ffffff');
  const [eyeFrame, setEyeFrame] = useState('extra-rounded');
  const [eyeCenter, setEyeCenter] = useState('dot');
  const [logo, setLogo] = useState('');
  const [preview, setPreview] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    let objectUrl = '';
    const qr = new QRCodeStyling({
      width: 480, height: 480, type: 'svg', data: value || 'https://yourbrand.com/menu',
      margin: 18,
      qrOptions: { errorCorrectionLevel: ecc as 'L'|'M'|'Q'|'H' },
      dotsOptions: { color: fg, type: style === 'fluid' ? 'classy-rounded' : style as 'square'|'rounded'|'dots'|'classy'|'extra-rounded' },
      cornersSquareOptions: { color: fg, type: eyeFrame as 'square'|'extra-rounded'|'dot' },
      cornersDotOptions: { color: fg, type: eyeCenter as 'square'|'dot' },
      backgroundOptions: { color: bg },
    });
    qr.getRawData('svg').then(async raw => {
      if (!raw || !alive) return;
      const source = raw instanceof Blob ? await raw.text() : raw.toString();
      const next = addFrame(addLogo(source, logo), frame, fg, bg);
      if (!alive) return;
      setSvg(next); setError('');
      objectUrl = URL.createObjectURL(new Blob([next], { type: 'image/svg+xml;charset=utf-8' }));
      setPreview(objectUrl);
    }).catch(() => { if (alive) setError('Could not build this QR code.'); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [value, style, ecc, logo, frame, fg, bg, eyeFrame, eyeCenter]);

  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Read failed')); reader.readAsDataURL(file);
    }).catch(() => '');
    if (data) { setLogo(data); setEcc('H'); setError(''); }
  }

  async function downloadPng() {
    if (!svg) return;
    try {
      const blob = await svgToPng(svg, pixels);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = `qr-${pixels}px.png`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
    } catch { setError('PNG export failed.'); }
  }

  return <main className={`qr-mock-page ${refined ? 'is-studio' : 'is-current'}`}>
    <div className="mock-toolbar"><div className="mock-brand"><span className="mock-mark">Q</span> UtilityCodes <span className="mock-divider">/</span> QR studio</div><span className="local-badge">◈ Local preview</span></div>
    <div className="mock-title"><div><small>{refined ? 'MAKE IT YOURS' : 'QR CODE GENERATOR'}</small><h1>{refined ? 'Design your QR' : 'Customize the look'}</h1><p>{refined ? 'Choose a shape, make it yours, and see the result as you go.' : 'Set a style and preview your QR before downloading.'}</p></div><span className="mock-step">{refined ? 'STEP 2 OF 2' : 'LIVE PREVIEW'}</span></div>
    <div className="mock-content">
      <section className="mock-editor">
        <div className="mock-field"><label>Website address</label><input value={value} onChange={e => setValue(e.target.value)} aria-label="Website address" /></div>
        {refined ? <>
          <div className="studio-tabs" role="tablist">{tabs.map(name => <button key={name} role="tab" aria-selected={tab === name} className={tab === name ? 'selected' : ''} onClick={() => setTab(name)}>{name}</button>)}</div>
          {tab === 'Shape' && <div className="studio-panel">
            <div className="panel-heading"><strong>Shape style</strong><span>Tap a style to see it on your code.</span></div>
            <div className="mock-shapes">{patterns.map(item => <button className={`mock-shape ${style === item.id ? 'active' : ''}`} key={item.id} onClick={() => setStyle(item.id)} aria-pressed={style === item.id}><span className="mock-thumb"><PatternSample style={item.id}/>{style === item.id && <i>✓</i>}</span><strong>{item.name}</strong><small>{item.note}</small></button>)}</div>
            <div className="mock-eye-row"><div><span>Outer frame</span><div className="eye-controls"><button className={`eye-control ${eyeFrame === 'square'?'selected':''}`} onClick={()=>setEyeFrame('square')}>□</button><button className={`eye-control round ${eyeFrame === 'extra-rounded'?'selected':''}`} onClick={()=>setEyeFrame('extra-rounded')}>□</button><button className={`eye-control circle ${eyeFrame === 'dot'?'selected':''}`} onClick={()=>setEyeFrame('dot')}>□</button></div></div><div><span>Center mark</span><div className="eye-controls"><button className={`eye-control ${eyeCenter === 'square'?'selected':''}`} onClick={()=>setEyeCenter('square')}>■</button><button className={`eye-control circle ${eyeCenter === 'dot'?'selected':''}`} onClick={()=>setEyeCenter('dot')}>●</button></div></div></div>
            <div className="mock-colors"><label>Code color <input type="color" value={fg} onChange={e=>setFg(e.target.value)} /></label><label>Background <input type="color" value={bg} onChange={e=>setBg(e.target.value)} /></label><button onClick={() => {setFg(bg);setBg(fg);}}>Invert</button></div>
          </div>}
          {tab === 'Frame' && <div className="studio-panel"><div className="panel-heading"><strong>Frame your code</strong><span>Invite people to scan without covering the pattern.</span></div><div className="frame-picks">{[['none','No frame'],['scan','Scan me'],['point','Point your camera']].map(([key,name])=><button key={key} className={frame === key?'active':''} onClick={()=>setFrame(key)}><PatternSample style={style}/><strong>{name}</strong></button>)}</div><p className="quiet-note">A clear margin around the code helps phones scan it quickly.</p></div>}
          {tab === 'Logo' && <div className="studio-panel"><div className="panel-heading"><strong>Center logo</strong><span>Your mark will be placed in the live code.</span></div>{logo ? <div className="mock-logo-preview"><img src={logo} alt="Center logo preview"/><div><strong>Logo ready</strong><small>Embedded in the code and exports</small></div><button onClick={()=>setLogo('')}>Remove</button></div> : <label className="mock-upload"><span className="upload-plus">＋</span><span><strong>Choose your logo</strong><small>PNG, JPG, WebP or SVG</small></span><span className="choose-file">Choose file</span><input type="file" accept="image/*" onChange={e=>{void uploadLogo(e.target.files?.[0]);e.currentTarget.value='';}}/></label>}<p className="quiet-note">A high correction level is selected to help keep logos scannable.</p></div>}
          {tab === 'Level' && <div className="studio-panel"><div className="panel-heading"><strong>Scan reliability &amp; export</strong><span>Higher correction helps recover a partly covered code.</span></div><div className="level-picks">{[['L','Low'],['M','Medium'],['Q','Quartile'],['H','High']].map(([key,name])=><button key={key} className={ecc===key?'active':''} onClick={()=>setEcc(key)}><b>{key}</b><strong>{name}</strong></button>)}</div><label className="pixel-select">PNG pixel quality<select value={pixels} onChange={e=>setPixels(Number(e.target.value))}><option value="1024">1024 px · web</option><option value="2048">2048 px · high quality</option><option value="4096">4096 px · print ready</option></select></label><p className="quiet-note">SVG export stays vector-sharp at any size.</p></div>}
        </> : <div className="current-controls">
          <div className="current-heading">Customize the look <small>Changes update your preview as you type.</small></div>
          <label>Dot pattern<select value={style} onChange={e => setStyle(e.target.value)}>{patterns.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Error correction<select value={ecc} onChange={e=>setEcc(e.target.value)}><option value="L">Low (L)</option><option value="M">Medium (M)</option><option value="Q">Quartile (Q)</option><option value="H">High (H)</option></select></label>
          <label>Center eye frame<select><option>Rounded</option><option>Square</option><option>Circular</option></select></label>
          <label>Center eye<select><option>Circular</option><option>Square</option></select></label>
          <label>Call-to-action frame<select value={frame} onChange={e=>setFrame(e.target.value)}><option value="none">No frame</option><option value="scan">Scan me</option><option value="point">Point your camera</option></select></label>
          <label>Center logo<input type="file" accept="image/*" onChange={e=>{void uploadLogo(e.target.files?.[0]);e.currentTarget.value='';}}/></label>
          <div className="current-color-row"><label>Code color<input type="color" value={fg} onChange={e=>setFg(e.target.value)}/></label><label>Background<input type="color" value={bg} onChange={e=>setBg(e.target.value)}/></label></div>
        </div>}
        {error && <p className="mock-error">{error}</p>}
      </section>
      <aside className="mock-preview">
        <div className="preview-title"><div><strong>Your QR code</strong><small>Live preview · stays on this device</small></div><span className="preview-local">Local</span></div>
        <div className="preview-canvas">{preview ? <img src={preview} alt="Live QR code preview"/> : <div className="preview-placeholder">Preparing preview…</div>}</div>
        <div className="preview-info"><span>PNG · {refined ? `${pixels} px` : '640 × 640 px'}</span><span>{value.length} characters</span></div>
        <div className="preview-actions"><button className="primary-download" onClick={()=>void downloadPng()}>↓ &nbsp;Download PNG{refined ? ` · ${pixels}px` : ''}</button><button className="secondary-download" onClick={()=>{if(svg){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));link.download='qr-code.svg';link.click();window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);}}}>↓ &nbsp;Download SVG</button></div>
        {logo && <p className="mock-confirm">✓ Your uploaded logo is visible in the preview and included in both exports.</p>}
        <p className="scan-tip">Keep a clear border and test the exported code with your phone.</p>
      </aside>
    </div>
  </main>;
}
