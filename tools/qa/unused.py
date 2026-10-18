import os,re,glob,subprocess
root=os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
src=''
for pat in ['src/**/*.ts','src/**/*.tsx','src/**/*.css','content/**/*.json','content/**/*.md','index.html','vite.config.ts','public/admin/*.yml','functions/**/*.ts','public/*.html','public/_redirects','public/_headers','public/*.webmanifest','public/*.xml']:
    for f in glob.glob(os.path.join(root,pat),recursive=True):
        src+=open(f,encoding='utf8',errors='ignore').read()
print('== unused public files ==')
for f in glob.glob(root+'/public/**/*',recursive=True):
    if os.path.isdir(f) or '/admin/' in f: continue
    name=os.path.basename(f); rel=f[len(root)+7:]
    if name in ('robots.txt','favicon.ico','_redirects','_headers') : continue
    if name not in src and rel not in src: print(rel)
print('== css classes not referenced in tsx/ts/html/content ==')
code=''
for pat in ['src/**/*.ts','src/**/*.tsx','index.html','vite.config.ts','content/**/*.json','content/**/*.md']:
    for f in glob.glob(os.path.join(root,pat),recursive=True): code+=open(f,encoding='utf8').read()
for css in glob.glob(root+'/src/**/*.css',recursive=True):
    t=re.sub(r'/\*.*?\*/','',open(css).read(),flags=re.S)
    classes=set(re.findall(r'\.([a-zA-Z][\w-]*)',re.sub(r'url\([^)]*\)|\d+\.\d+','',t)))
    miss=[c for c in sorted(classes) if c not in code]
    print(os.path.basename(css), miss)
