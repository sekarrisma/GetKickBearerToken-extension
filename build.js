const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require("esbuild");
const pug = require('pug');
const sass = require('sass');
const CleanCSS = require("clean-css");
const archiver = require("archiver");
/**
 * exec tsc command for translate T.S to J.S and minified the script code
 */
const scriptBuilder = () => {
  const tsConfigPath = path.join(__dirname, "tsconfig.build.json");
  const BUILD_DIR = path.join(__dirname, "build");
  const TEMP_DIR = path.join(__dirname, "temp_build");

  execSync(`npx tsc --project "${tsConfigPath}"`, { stdio: "inherit" });

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

  fs.readdirSync(BUILD_DIR).forEach(file => file.endsWith(".js") && fs.copyFileSync(path.join(BUILD_DIR, file), path.join(TEMP_DIR, file)));

  fs.readdirSync(TEMP_DIR).forEach(file => {
    if (file.endsWith(".js")) {
      const input = path.join(TEMP_DIR, file);
      const output = path.join(BUILD_DIR, file);

      esbuild.buildSync({
        entryPoints: [input],
        outfile: output,
        minify: true,
        bundle: false,
        target: "es2019"
      });

      console.log("Minified:", file);
    };
  });

  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
};
/**
 * function for transalte PUG to HTML and minifed the code
 */
const popupBuider = () => {
  const pugPath = path.join(__dirname, './src/popup.pug');
  const htmlPath = path.join(__dirname, './build/popup.html');

  let compiledFunction = pug.compileFile(pugPath);
  let html = compiledFunction();

  fs.writeFileSync(htmlPath, html);
};
/**
 * function for translate SCSS to CSS and minifed the code
 */
const styleBuilder = () => {
  const scssPath = path.join(__dirname, "./src/style.scss");
  const cssPath = path.join(__dirname, "./build/style.css");

  const result = sass.compile(scssPath);

  const minified = new CleanCSS({ level: 2 }).minify(result.css);

  fs.writeFileSync(cssPath, minified.styles);
};
/**
 * function for copy all static files to build file
 */
const staticBuilder = () => {
  const STATIC_DIR = path.join(__dirname, "static");
  const BUILD_STATIC = path.join(__dirname, "build");

  if (!fs.existsSync(BUILD_STATIC)) fs.mkdirSync(BUILD_STATIC, { recursive: true });

  fs.readdirSync(STATIC_DIR).forEach(file => {
    const srcPath = path.join(STATIC_DIR, file);
    const destPath = path.join(BUILD_STATIC, file);

    if (fs.lstatSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      fs.readdirSync(srcPath).forEach(subFile => {
        fs.copyFileSync(
          path.join(srcPath, subFile),
          path.join(destPath, subFile)
        );
      });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};
// build for firefox
function prepareFirefoxBuild() {
  const buildDir = path.join(__dirname, "build");
  const chromeZip = path.join(buildDir, "chrome.zip");
  const firefoxXpi = path.join(buildDir, "firefox.xpi");

  // --- Chrome ---
  const chromeOutput = fs.createWriteStream(chromeZip);
  const chromeArchive = archiver("zip", { zlib: { level: 9 } });

  chromeOutput.on("close", () => {
    console.log(`✅ Chrome ZIP créé (${chromeArchive.pointer()} bytes)`);
  });

  chromeArchive.on("error", err => { throw err; });

  chromeArchive.pipe(chromeOutput);
  chromeArchive.directory(buildDir, false); // ajouter tout le dossier build
  chromeArchive.finalize();

  // --- Firefox ---
  const firefoxOutput = fs.createWriteStream(firefoxXpi);
  const firefoxArchive = archiver("zip", { zlib: { level: 9 } });

  firefoxOutput.on("close", () => {
    console.log(`✅ Firefox XPI créé (${firefoxArchive.pointer()} bytes)`);
  });

  firefoxArchive.on("error", err => { throw err; });

  firefoxArchive.pipe(firefoxOutput);
  firefoxArchive.directory(buildDir, false); // ajouter tout le dossier build
  firefoxArchive.finalize();
};
// build all elements
(() => {
  // clear build directory
  let directoryPath = path.join(__dirname, 'build');

  fs.readdir(directoryPath, (err, files) => {
    if (err) throw err;

    files.forEach(file => {
      let filePath = path.join(directoryPath, file);

      // delete file
      fs.unlink(filePath, (err) => {
        if (err) throw err;
        console.log(`file deleted : ${filePath}`);
      });
    });
  });

  setTimeout(() => {
    scriptBuilder();
    popupBuider();
    styleBuilder();
    staticBuilder();
    prepareFirefoxBuild();
  }, 300)

})();