import test from "node:test";
import assert from "node:assert/strict";
import {parseTrackedIndex,findExactDuplicates,formatReport} from "../scripts/cmd-duplicate-audit.mjs";

const a="a".repeat(40),b="b".repeat(40),c="c".repeat(40);
test("parse null-separated Git index entries without opening the files",()=>{
 const records=parseTrackedIndex("100644 "+a+" 0\tpublic/banner.png\0"+
   "100644 "+a+" 0\tdashboard/banner.png\0"+
   "100755 "+b+" 0\tscripts/run.sh\0");
 assert.equal(records.length,3);
 assert.equal(records[0].path,"public/banner.png");
 assert.equal(records[2].mode,"100755");
});

test("identical hashes are reported but never proposed for deletion",()=>{
 const files=[
  {mode:"100644",stage:0,sha:a,path:"public/banner.png"},
  {mode:"100644",stage:0,sha:a,path:"public/og-image.png"},
  {mode:"100644",stage:0,sha:b,path:"public/different.png"},
  {mode:"100644",stage:0,sha:c,path:"public/tiny.png"},
  {mode:"100644",stage:0,sha:c,path:"public/tiny-copy.png"}
 ];
 const report=findExactDuplicates(files,sha=>sha===a?12000:sha===b?20000:50);
 assert.equal(report.groupCount,1);
 assert.equal(report.extraPaths,1);
 assert.equal(report.logicalDuplicateBytes,12000);
 assert.deepEqual(report.groups[0].paths,["public/banner.png","public/og-image.png"]);
 assert.match(formatReport(report),/n'est pas un gain de stockage promis/);
});

test("unmerged index stages and symlinks are not counted as asset copies",()=>{
 const files=[
  {mode:"100644",stage:0,sha:a,path:"file.png"},
  {mode:"100644",stage:2,sha:a,path:"conflict.png"},
  {mode:"120000",stage:0,sha:a,path:"link.png"}
 ];
 assert.equal(findExactDuplicates(files,()=>999999).groupCount,0);
 assert.throws(()=>findExactDuplicates(files,()=>1,-1),/Invalid/);
 assert.throws(()=>parseTrackedIndex("not a git index entry\0"),/Unexpected/);
});
