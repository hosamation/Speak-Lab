export const pad = n => String(n).padStart(2, '0');
export const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
};
export const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
export function pickRandom(arr, not){
  if(arr.length < 2) return arr[0];
  let v;
  do { v = arr[Math.floor(Math.random()*arr.length)]; } while(v === not);
  return v;
}
const toastEl = document.getElementById('toast');
export function toast(msg, ms = 2200){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), ms);
}
export function downloadBlob(name, blob){
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
