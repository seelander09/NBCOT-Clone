const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join('data','nbcot-sources','NBCOT_content.json'),'utf8'));
function reconstructPage(page) {
  let output = '';
  let buffer = '';
  const flush = () => {
    if (buffer) {
      output += buffer;
      buffer = '';
    }
  };
  for (const frame of page.frameData) {
    if (!frame.textBoundary) continue;
    for (const segment of frame.textBoundary) {
      for (const entry of segment) {
        const text = entry[0];
        if (!text) continue;
        if (text.length === 1 && text !== '\n' && text !== '\t') {
          buffer += text;
        } else {
          flush();
          output += text;
        }
      }
    }
  }
  flush();
  return output;
}
function cleanLine(line) {
  return line
    .replace(/\uFFFD/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/ +/g, ' ')
    .trim();
}
const lines = [];
for (const page of data.framesData) {
  const text = reconstructPage(page);
  text.split(/\r?\n/).forEach((line) => lines.push(cleanLine(line)));
}
let maxQuestion = 0;
lines.forEach((line) => {
  const match = line.match(/^(\d{1,3})\./);
  if (match) {
    const num = Number.parseInt(match[1], 10);
    if (num > maxQuestion) {
      maxQuestion = num;
    }
  }
});
console.log('Max question number:', maxQuestion);
