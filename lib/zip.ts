// Map a US ZIP code to its state using standard 3-digit ZIP prefix ranges.
// Good enough for admin-side location insight without any external API.
const RANGES: [number, number, string][] = [
  [0,5,"NY"],[6,9,"PR"],[10,27,"MA"],[28,29,"RI"],[30,38,"NH"],[39,49,"MA"],
  [50,54,"VT"],[55,59,"MA"],[60,69,"CT"],[70,89,"NJ"],[100,149,"NY"],[150,196,"PA"],
  [197,199,"DE"],[200,205,"DC"],[206,219,"MD"],[220,246,"VA"],[247,268,"WV"],
  [270,289,"NC"],[290,299,"SC"],[300,319,"GA"],[320,349,"FL"],[350,369,"AL"],
  [370,385,"TN"],[386,397,"MS"],[398,399,"GA"],[400,427,"KY"],[430,459,"OH"],
  [460,479,"IN"],[480,499,"MI"],[500,528,"IA"],[530,549,"WI"],[550,567,"MN"],
  [570,577,"SD"],[580,588,"ND"],[590,599,"MT"],[600,629,"IL"],[630,658,"MO"],
  [660,679,"KS"],[680,693,"NE"],[700,714,"LA"],[716,729,"AR"],[730,749,"OK"],
  [750,799,"TX"],[800,816,"CO"],[820,831,"WY"],[832,838,"ID"],[840,847,"UT"],
  [850,865,"AZ"],[870,884,"NM"],[889,898,"NV"],[900,961,"CA"],[967,968,"HI"],
  [970,979,"OR"],[980,994,"WA"],[995,999,"AK"],
];
export function zipToState(zip?: string | null): string | null {
  if (!zip || zip.length < 3) return null;
  const p = parseInt(zip.slice(0, 3), 10);
  if (Number.isNaN(p)) return null;
  for (const [lo, hi, st] of RANGES) if (p >= lo && p <= hi) return st;
  return null;
}
export function formatPhone(p?: string | null): string {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return p;
}
