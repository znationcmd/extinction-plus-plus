#!/usr/bin/env python3
"""Stage opt-in HD asset resolver injection into CMD Sphere HTML responses."""
from pathlib import Path
p=Path(__file__).with_name('server.js')
s=p.read_text()
anchor='    if(typeof body==="string"&&body.includes(\'id="dockProfileMain"\'))body=body.replace(/<\\/head>/i,\'<link rel="stylesheet" href="/discord-native-layout.css?v=20261009chatfix9"></head>\');'
if anchor not in s:
    raise SystemExit('Expected CMD Sphere HTML response hook missing; no changes made')
injection='''    // HD emergency catalogue: staged, reversible, loaded only in CMD Sphere HTML pages.
    if(typeof body==="string"&&(body.includes('class="sphere-app"')||body.includes('id="dockProfileMain"')))
      body=body.replace(/<\\/body>/i,'<script defer src="/hd-secours/v1/catalogue-resolver.js?v=1"></script><script defer src="/hd-secours/v1/catalogue-enable.js?v=1"></script></body>');
'''
if 'catalogue-enable.js?v=1' in s:
    print('Already injected')
else:
    s=s.replace(anchor,anchor+'\n'+injection,1)
    p.write_text(s)
    print('CMD Sphere HTML injection staged')
