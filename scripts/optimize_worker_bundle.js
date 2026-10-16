const fs = require("fs");
const path = require("path");

async function optimizeBundle() {
  console.log("=== Optimizing Cloudflare Worker Bundle Size ===");
  const swc = require("next/dist/build/swc");
  await swc.loadBindings();

  const targetDir = path.resolve(
    __dirname,
    "../.vercel/output/static/_worker.js/__next-on-pages-dist__/functions"
  );

  if (!fs.existsSync(targetDir)) {
    console.warn("Target directory not found:", targetDir);
    return;
  }

  function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(fullPath));
      } else if (file.endsWith(".js")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const files = getFiles(targetDir);
  console.log(`Found ${files.length} function bundles to optimize.`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    const beforeSize = code.length;
    totalBefore += beforeSize;

    try {
      const res = await swc.minify(code, {
        module: true,
        compress: true,
        mangle: true,
      });
      if (res && res.code) {
        fs.writeFileSync(file, res.code, "utf8");
        const afterSize = res.code.length;
        totalAfter += afterSize;
        const savedKiB = ((beforeSize - afterSize) / 1024).toFixed(1);
        console.log(`  ✓ Minified ${path.basename(file)}: saved ${savedKiB} KiB`);
      } else {
        totalAfter += beforeSize;
      }
    } catch (err) {
      console.warn(`  ⚠ Could not minify ${path.basename(file)}:`, err.message);
      totalAfter += beforeSize;
    }
  }

  const savedTotal = ((totalBefore - totalAfter) / 1024).toFixed(1);
  const totalAfterMiB = (totalAfter / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 Total saved: ${savedTotal} KiB! New functions size: ${totalAfterMiB} MiB.`);
}

optimizeBundle().catch((err) => {
  console.error("Optimization failed:", err);
  process.exit(1);
});
