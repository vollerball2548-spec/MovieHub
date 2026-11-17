const palettes = [
  ["#071a2f", "#26c6da", "#f7a541"],
  ["#24102e", "#ed4f87", "#ffc857"],
  ["#101c20", "#5dc0a6", "#e1a857"],
  ["#171330", "#8585ff", "#ff8066"],
  ["#271712", "#ff8c42", "#ffd166"],
  ["#10223c", "#4ca1ff", "#b8e0ff"],
];

const escapeXml = (value) => String(value || "").replace(/[<>&'\"]/g, (char) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
}[char]));

function hash(value) {
  return [...String(value)].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function wrapTitle(value) {
  const words = String(value || "MovieHub").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > 17) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function createPosterFallback(title, genre = "MOVIE") {
  const [background, glow, accent] = palettes[hash(title) % palettes.length];
  const titleLines = wrapTitle(title);
  const titleSvg = titleLines.map((line, index) => `<text x="42" y="${446 + index * 43}" fill="#fff" font-family="Arial,sans-serif" font-size="34" font-weight="800" letter-spacing=".5">${escapeXml(line)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="#090a14"/></linearGradient><radialGradient id="orb"><stop stop-color="${glow}" stop-opacity=".95"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#080912" stop-opacity="0"/><stop offset="1" stop-color="#080912"/></linearGradient></defs><rect width="500" height="750" fill="url(#bg)"/><circle cx="350" cy="260" r="205" fill="url(#orb)"/><circle cx="350" cy="260" r="112" fill="none" stroke="${accent}" stroke-opacity=".72" stroke-width="2"/><circle cx="350" cy="260" r="145" fill="none" stroke="#fff" stroke-opacity=".25"/><path d="M0 420 95 330l65 58 83-139 77 141 68-82 112 122v320H0z" fill="#09111c" fill-opacity=".74"/><path d="M0 510h500M0 540h500M0 570h500M0 600h500" stroke="${glow}" stroke-opacity=".2"/><rect y="355" width="500" height="395" fill="url(#fade)"/><text x="42" y="62" fill="${accent}" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="4">MOVIEHUB ORIGINAL</text>${titleSvg}<text x="44" y="608" fill="#d4d8e3" font-family="Arial,sans-serif" font-size="16" letter-spacing="3">${escapeXml(String(genre).toUpperCase())}</text><path d="M44 632h72" stroke="${accent}" stroke-width="4"/><text x="44" y="692" fill="#aeb5c5" font-family="Arial,sans-serif" font-size="12" letter-spacing="3">A CINEMA EXPERIENCE</text><rect x="12" y="12" width="476" height="726" rx="8" fill="none" stroke="#fff" stroke-opacity=".16"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
