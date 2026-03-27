const baseYear = new Date().getFullYear();
const d0 = 0.96;
const g = 0.05;
const ks = 0.10;
const years = 5;

let pvSum = 0;
let prevD = d0;

for (let t = 1; t <= years; t++) {
  const dt = prevD * (1 + g);
  const pv = dt / Math.pow(1 + ks, t);
  pvSum += pv;
  prevD = dt;
}

const terminalYear = baseYear + years;
const dTerminal = prevD * (1 + g);
const tv = dTerminal / (ks - g);
const pvTv = tv / Math.pow(1 + ks, years);

const fairPrice = pvSum + pvTv;
console.log(fairPrice);
