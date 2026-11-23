// Potongan HTML untuk notasi matematika
export const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
export const it = s => `<span class="it">${s}</span>`;
/** Notasi aktuaria a_{n|i}, ä_{n|i}, s_{n|i} */
export const act = (sym, n, i = 'i') => `<span class="act"><span class="it">${sym}</span><sub><span class="ang">${n}</span>${i ? `<span class="it">${i}</span>` : ''}</sub></span>`;
