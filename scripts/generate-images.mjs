/**
 * FORMA Store — batch product/category/hero image generation
 * Uses z-ai-web-dev-sdk (backend only). Run: bun scripts/generate-images.mjs
 */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const ROOT = '/home/z/my-project/public/images';
const STYLE =
  'professional e-commerce product photography, centered composition on a warm cream beige seamless studio background, soft diffused natural lighting, subtle soft shadow, minimalist premium editorial style, muted earthy tones, photorealistic, high resolution, no text, no watermark, no logo';

const PRODUCTS = [
  ['merino-overshirt', 'beige merino wool overshirt jacket on a wooden hanger, buttons closed, relaxed tailoring'],
  ['merino-overshirt-2', 'beige merino wool overshirt jacket worn open over a cream t-shirt, torso crop on invisible mannequin, fabric texture detail'],
  ['heavyweight-tee', 'off-white heavyweight cotton t-shirt neatly folded in a square shape, thick fabric'],
  ['boxy-hoodie', 'stone gray boxy fit hoodie folded flat, thick fleece, drawstrings visible'],
  ['pleated-trousers', 'beige pleated wide-leg trousers hanging from a wooden hanger, pressed crease, draped fabric'],
  ['canvas-tote', 'natural ecru structured canvas tote bag standing upright, leather handles, boxy shape'],
  ['wool-beanie', 'camel tan ribbed wool beanie hat, folded cuff, soft knit texture'],
  ['leather-card-holder', 'dark brown full-grain leather card holder wallet, minimalist, slightly open showing card slots'],
  ['silk-scarf', 'folded silk-blend scarf in warm sand and terracotta pattern, elegantly draped'],
  ['leather-sneakers', 'pair of minimalist white leather sneakers with cream sole, side angle pair composition'],
  ['leather-sneakers-2', 'single minimalist white leather sneaker three-quarter view floating on cream background, clean details'],
  ['desert-boots', 'pair of taupe suede desert boots with crepe sole, side angle pair composition'],
  ['ceramic-mug', 'speckled stoneware ceramic mug in warm sand glaze, matte finish, handle to the side'],
  ['soy-candle', 'amber glass soy wax candle with minimal cream label area and wooden lid beside it, unlit'],
  ['soy-candle-2', 'lit amber glass soy candle with warm flame in a dark cozy interior corner, soft glow'],
  ['linen-throw', 'folded oatmeal linen throw blanket with frayed edges, soft texture, stacked'],
  ['oak-organizer', 'minimal oak wood desk organizer tray holding a pen and notebook, scandinavian style'],
  ['canvas-tote-2', 'ecru canvas tote bag hanging on a wooden peg against cream wall, lifestyle detail'],
];

const CATEGORIES = [
  ['apparel', 'stack of neatly folded knitwear and shirts in beige, cream and stone tones, minimal wardrobe'],
  ['accessories', 'flat lay of leather wallet, wool beanie, canvas tote and scarf on cream background'],
  ['footwear', 'minimal white leather sneakers and suede boots on cream studio background'],
  ['home', 'warm minimal home scene with ceramic mug, lit candle and folded linen throw on oak table'],
];

async function main() {
  const zai = await ZAI.create();
  fs.mkdirSync(path.join(ROOT, 'products'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'categories'), { recursive: true });

  const jobs = [];
  for (const [slug, subject] of PRODUCTS) {
    jobs.push({ file: path.join(ROOT, 'products', `${slug}.png`), prompt: `${subject}, ${STYLE}`, size: '1024x1024' });
  }
  for (const [slug, subject] of CATEGORIES) {
    jobs.push({
      file: path.join(ROOT, 'categories', `${slug}.png`),
      prompt: `${subject}, professional lifestyle photography, warm cream tones, soft diffused light, minimalist premium editorial style, photorealistic, high resolution, no text, no watermark`,
      size: '864x1152',
    });
  }
  jobs.push({
    file: path.join(ROOT, 'hero.png'),
    prompt:
      'minimalist fashion editorial photograph, person wearing beige merino wool overshirt and cream wide trousers standing in a bright empty concrete studio, warm natural window light, muted earthy tones, premium lifestyle brand aesthetic, generous negative space on the left side, photorealistic, high resolution, no text',
    size: '1440x720',
  });

  const CONCURRENCY = 2;
  let index = 0;
  let done = 0;

  async function worker(id) {
    while (index < jobs.length) {
      const job = jobs[index++];
      if (fs.existsSync(job.file) && fs.statSync(job.file).size > 10000) {
        done++;
        console.log(`[${done}/${jobs.length}] SKIP (exists) ${path.basename(job.file)}`);
        continue;
      }
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const res = await zai.images.generations.create({ prompt: job.prompt, size: job.size });
          const b64 = res?.data?.[0]?.base64;
          if (!b64) throw new Error('empty base64');
          fs.writeFileSync(job.file, Buffer.from(b64, 'base64'));
          done++;
          console.log(`[${done}/${jobs.length}] OK ${path.basename(job.file)} (worker ${id})`);
          break;
        } catch (err) {
          console.error(`FAIL ${path.basename(job.file)} attempt ${attempt}: ${err.message}`);
          if (attempt === 5) console.error(`GIVE UP ${job.file}`);
          else await new Promise((r) => setTimeout(r, 12000 * attempt));
        }
      }
      // pace requests to avoid 429s
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  console.log(`DONE ${done}/${jobs.length}`);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
