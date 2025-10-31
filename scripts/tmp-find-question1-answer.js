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
const lines = [];
for (const page of data.framesData) {
  const text = reconstructPage(page);
  text.split(/\r?\n/).forEach((line) => lines.push(line.replace(/\s+/g,' ').trim()));
}
for (let i = 0; i < lines.length - 1; i++) {
  if (/^Correct Answer$/i.test(lines[i]) && /^1\./.test(lines[i+1])) {
    console.log('Found question 1 answer context at indices', i, '->', lines[i+1]);
  }
}
