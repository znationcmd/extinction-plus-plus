#!/usr/bin/env node
// Read-only audit of exact duplicate *tracked Git blobs*. This command never
// removes files, checks out branches, reads application data, or edits the tree.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function parseTrackedIndex(input) {
  return String(input).split("\0").filter(Boolean).map(record => {
    const match = /^(100644|100755|120000|160000) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t([\s\S]+)$/.exec(record);
    if (!match) throw Error("Unexpected git ls-files --stage record");
    return {mode:match[1],sha:match[2],stage:Number(match[3]),path:match[4]};
  });
}

export function findExactDuplicates(entries, sizeOf, minBytes=10240) {
  if (!Number.isSafeInteger(minBytes) || minBytes < 0) throw Error("Invalid minimum byte size");
  const hashes=new Map();
  for (const entry of entries) {
    if(entry.stage!==0 || !["100644","100755"].includes(entry.mode)) continue;
    const list=hashes.get(entry.sha)||[];
    list.push(entry.path);
    hashes.set(entry.sha,list);
  }
  const groups=[];
  for(const [sha,paths] of hashes) {
    if(paths.length<2) continue;
    const bytes=sizeOf(sha);
    if(!Number.isSafeInteger(bytes) || bytes<0) throw Error("Invalid blob size");
    if(bytes<minBytes) continue;
    groups.push({sha,sizeBytes:bytes,copies:paths.length,
      extraPaths:paths.length-1,logicalDuplicateBytes:(paths.length-1)*bytes,
      paths:paths.sort()});
  }
  groups.sort((a,b)=>b.logicalDuplicateBytes-a.logicalDuplicateBytes || a.sha.localeCompare(b.sha));
  return {schema:"cmd-exact-git-duplicates-v1",
    note:"Logical duplicate path sizes, NOT reclaimable Git storage. Git deduplicates identical blobs.",
    groups,groupCount:groups.length,
    extraPaths:groups.reduce((n,g)=>n+g.extraPaths,0),
    logicalDuplicateBytes:groups.reduce((n,g)=>n+g.logicalDuplicateBytes,0)};
}

export function formatReport(report) {
  const lines=[
    "# CMD — audit des blobs Git identiques",
    "",
    "Lecture seule. Deux fichiers identiques peuvent avoir des noms ou des URL nécessaires à la production.",
    "Git stocke normalement un même blob une seule fois : le total ci-dessous **n'est pas un gain de stockage promis**.",
    "",
    "- Groupes : "+report.groupCount,
    "- Chemins supplémentaires : "+report.extraPaths,
    "- Taille logique supplémentaire : "+report.logicalDuplicateBytes+" octets",
    ""
  ];
  for(const item of report.groups) {
    lines.push("## "+item.sizeBytes+" octets, "+item.copies+" chemins — "+item.sha,"");
    for(const path of item.paths) lines.push("- "+path.replaceAll("\\","\\\\"));
    lines.push("");
  }
  return lines.join("\n");
}

export function auditCurrentRepository(minBytes=10240) {
  const raw=execFileSync("git",["ls-files","--stage","-z"],{encoding:"utf8",maxBuffer:32*1024*1024});
  const files=parseTrackedIndex(raw);
  const sizeOf=sha=>Number(execFileSync("git",["cat-file","-s",sha],{encoding:"utf8"}).trim());
  return findExactDuplicates(files,sizeOf,minBytes);
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const report=auditCurrentRepository();
    process.stdout.write(process.argv.includes("--json")
      ? JSON.stringify(report,null,2)+"\n" : formatReport(report));
  } catch(error) {
    console.error("Audit aborted without changes:",error.message);
    process.exitCode=1;
  }
}
