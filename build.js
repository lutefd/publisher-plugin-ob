const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "dist/obsidian-publisher-plugin");
const srcDir = __dirname;

if (!fs.existsSync(distDir)) {
	fs.mkdirSync(distDir, { recursive: true });
}

console.log("Copying manifest.json...");
fs.copyFileSync(
	path.join(srcDir, "manifest.json"),
	path.join(distDir, "manifest.json")
);

console.log("Copying styles.css...");
fs.copyFileSync(
	path.join(srcDir, "styles.css"),
	path.join(distDir, "styles.css")
);

console.log("Build completed successfully!");
