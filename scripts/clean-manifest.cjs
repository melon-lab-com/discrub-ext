#!/usr/bin/env node
// Removes use_dynamic_url from dist/manifest.json (replaces jq dependency)
const fs = require("fs");
const path = require("path");

const manifestPath = path.resolve(__dirname, "../dist/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

delete manifest.use_dynamic_url;

if (Array.isArray(manifest.web_accessible_resources)) {
  for (const entry of manifest.web_accessible_resources) {
    delete entry.use_dynamic_url;
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
