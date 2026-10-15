// utils/fuzzy.js

function calcularSimilaridade(s1, s2) {
  let longer = s1.toLowerCase().trim(); let shorter = s2.toLowerCase().trim();
  if (s1.length < s2.length) { longer = s2.toLowerCase().trim(); shorter = s1.toLowerCase().trim(); }
  let longerLength = longer.length; if (longerLength === 0) return 1.0;
  let costs = new Array();
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        costs[j - 1] = lastValue; lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  return (longerLength - costs[longer.length]) / parseFloat(longerLength);
}

module.exports = { calcularSimilaridade };
