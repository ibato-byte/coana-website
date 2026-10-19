import os, re, json, urllib.request, html
B='http://localhost:8789'
class NoRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*a,**k): return None
op=urllib.request.build_opener(NoRedir, urllib.request.ProxyHandler({}))
def get(p):
    try:
        r=op.open(B+p, timeout=20); return r.status, r.headers, r.read().decode('utf8','ignore')
    except urllib.error.HTTPError as e: return e.code, e.headers, e.read().decode('utf8','ignore')
ng=[]
st,_,sm=get('/sitemap.xml'); locs=re.findall(r'<loc>([^<]+)</loc>',sm)
paths=[re.sub(r'^https?://[^/]+','',l) or '/' for l in locs]
print('sitemap', st, len(paths))
links=set()
for p in paths:
    st,h,t=get(p)
    title=re.search(r'<title>(.*?)</title>',t,re.S); desc=re.search(r'<meta name="description" content="([^"]*)"',t)
    can=re.search(r'<link rel="canonical" href="([^"]+)"',t); h1=len(re.findall(r'<h1[\s>]',t))
    for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>',t,re.S):
        try: json.loads(j)
        except Exception as e: ng.append((p,'jsonld',str(e)))
    if st!=200: ng.append((p,'status',st))
    if not title or not desc or not can: ng.append((p,'meta',bool(title),bool(desc),bool(can)))
    if can and re.sub(r'^https?://[^/]+','',can.group(1)).rstrip('/') != p.rstrip('/'): ng.append((p,'canonical',can.group(1)))
    if h1!=1: ng.append((p,'h1',h1))
    for a in re.findall(r'href="(/[^"#?]*)',t): links.add(a)
for a in sorted(links):
    st,h,_=get(a)
    if st not in (200,): ng.append((a,'link',st,h.get('location')))
# redirects
for line in open(os.path.join(os.path.dirname(__file__), '../../') + 'public/_redirects'):
    m=re.match(r'(\S+)\s+(\S+)\s+(\d+)',line)
    if not m or line.startswith('#'): continue
    src,dst,code=m.groups(); src=src.replace('*','foo/bar')
    st,h,_=get(src); loc=re.sub(r'^https?://[^/]+','',h.get('location') or '')
    if str(st)!=code or loc!=dst: ng.append((src,'redirect',st,loc))
for p in ['/feed.xml','/llms.txt','/robots.txt','/chat-knowledge.json','/og-image.jpg']:
    st,_,_=get(p)
    if st!=200: ng.append((p,'asset',st))
print('internal links', len(links)); print('NG' if ng else 'ALL OK'); [print(x) for x in ng]
