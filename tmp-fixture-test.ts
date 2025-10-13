process.env.NBCOT_VECTOR_FIXTURE = "mock";
import('./src/app/api/remediation/route').then(async (mod) => {
  const req = new Request('http://localhost/api/remediation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: 'test-question', prompt: 'Proximal stability work sample', keywords: ['proximal','stability'] }),
  });
  const res = await mod.POST(req);
  const json = await res.json();
  console.log(JSON.stringify(json));
}).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
