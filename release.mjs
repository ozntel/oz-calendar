import { execSync } from "child_process";
import { readFileSync } from "fs";

// Usage: npm run release -- <patch|minor|major|x.y.z>
// Bumps package.json, manifest.json and versions.json on a new release branch and pushes it.
// Merging that branch into master publishes the GitHub release (.github/workflows/release.yml).

const run = (command) => execSync(command, { stdio: "inherit" });
const read = (command) => execSync(command, { encoding: "utf8" }).trim();

const bump = process.argv[2];
if (!bump) {
	console.error("Usage: npm run release -- <patch|minor|major|x.y.z>");
	process.exit(1);
}

if (read("git status --porcelain") !== "") {
	console.error("Working tree is not clean. Commit or stash your changes first.");
	process.exit(1);
}

// Runs the "version" script too, which updates manifest.json and versions.json
run(`npm version ${bump} --no-git-tag-version`);

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const branch = `release-${version}`;

run(`git checkout -b ${branch}`);
run("git add package.json manifest.json versions.json");
run(`git commit -m "v.${version} Release"`);
run(`git push -u origin ${branch}`);

console.log(`\nPushed ${branch}. Open a pull request into master and merge it to publish ${version}.`);
console.log(`https://github.com/ozntel/oz-calendar/compare/master...${branch}?expand=1`);
