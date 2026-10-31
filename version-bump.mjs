import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// update versions.json with target version and minAppVersion from manifest.json, newest version first
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
delete versions[targetVersion];
versions = { [targetVersion]: minAppVersion, ...versions };
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
