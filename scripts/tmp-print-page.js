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
const pageNo = Number(process.argv[2]);
const target = data.framesData.find((page) => page.pageNo === pageNo);
if (!target) {
  console.error('Page not found');
  process.exit(1);
}
console.log(reconstructPage(target));
