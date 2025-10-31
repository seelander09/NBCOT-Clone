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
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^Scenario header:/i.test(lines[i])) {
    start = i;
    break;
  }
}
if (start >= 0) {
  for (let i = start; i < start + 80 && i < lines.length; i++) {
    console.log(lines[i]);
  }
}
