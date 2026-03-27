const d0 = 0.96;
const ks = 0.10;
const years = 5;
for(let g = -0.10; g <= 0.10; g += 0.001) {
  let pvSum = 0;
  let prevD = d0;
  for (let t = 1; t <= years; t++) {
    const dt = prevD * (1 + g);
    const pv = dt / Math.pow(1 + ks, t);
    pvSum += pv;
    prevD = dt;
  }
  const dTerminal = prevD * (1 + g);
  const tv = dTerminal / (ks - g);
  const pvTv = tv / Math.pow(1 + ks, years);
  const fairPrice = pvSum + pvTv;
  if(Math.abs(fairPrice - 9.18) < 0.05) console.log('g =', g.toFixed(4), '-> fairPrice =', fairPrice.toFixed(4));
}
