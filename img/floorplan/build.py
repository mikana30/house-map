# Floor outlines traced from the Greene County auditor sketch (auditor-sketch.png).
# Scale on the sketch: 15.27 px per foot (15 ft wall = 229 px). North is up.
S=15.27
core=[(615,74),(660,30),(767,30),(813,74),(813,136),(996,136),(996,349),(935,349),(935,532),(813,532),(813,685),(508,685),(462,730),(386,730),(340,685),(340,625),(386,578),(386,502),(615,502)]
fam=[(386,136),(615,136),(615,502),(386,502)]
bump=[(996,136),(1148,136),(1148,380),(1057,380),(1057,349),(996,349)]
foyer=[(569,593),(646,593),(646,685),(569,685)]
gar=[(935,349),(1057,349),(1057,380),(1148,380),(1148,852),(813,852),(813,532),(935,532)]
bonus=[(935,486),(1057,486),(1057,852),(935,852)]
porch=[(310,74),(371,14),(600,14),(630,60),(615,74),(615,685),(813,685),(813,761),(538,761),(492,806),(340,806),(264,731),(264,578),(310,532)]
patio=[(35,44),(310,44),(310,532),(35,532)]
deck=[(813,74),(965,74),(965,136),(813,136)]
def poly(p,fill,stroke="#222",sw=4,dash=""):
    pts=" ".join(f"{x},{y}" for x,y in p)
    d=f' stroke-dasharray="{dash}"' if dash else ""
    return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"{d}/>'
def group(ps,fill,sw=4):
    st="".join(poly(p,fill,"#222",sw*2) for p in ps)
    fl="".join(poly(p,fill,fill,0) for p in ps)
    return st+fl
def text(x,y,s,size=22,w="bold",fill="#222"):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="middle">{s}</text>'
HOUSE="#f2f4f7"; GAR="#e9e3d6"; OUT="#dfeee0"; PAT="#e2e2e2"; OPEN="#ffffff"
floors={
 "basement":("BASEMENT (walkout on the west side)",
   [poly(patio,PAT,"#777",3),text(172,280,"PATIO",20),text(172,306,"18 × 32 (walkout)",17,"normal"),
    group([core,fam,bump],HOUSE),
    text(500,330,"under family room",18,"normal","#555"),text(720,420,"BASEMENT",26),text(720,450,"about 1,550 sq ft finished",18,"normal","#555"),
    text(1072,270,"under bump-out",16,"normal","#555"),
    poly(gar,"none","#999",3,"10 8"),text(1040,620,"(garage above:",17,"normal","#888"),text(1040,642,"no basement)",17,"normal","#888")]),
 "main":("MAIN FLOOR",
   [poly(porch,OUT,"#6a9a6c",3),text(300,450,"PORCH",18,"bold","#3d6b40"),text(660,786,"WRAPAROUND PORCH",18,"bold","#3d6b40"),
    group([core,fam,bump],HOUSE),poly(foyer,HOUSE,"#222",2,"6 5"),poly(gar,GAR),
    text(500,300,"FAMILY ROOM",22),text(500,326,"vaulted, open to 2nd floor",16,"normal","#555"),
    text(720,420,"MAIN FLOOR",26),text(607,650,"foyer",15,"normal","#555"),
    text(1072,250,"bump-out",18),text(1072,272,"10 × 16",15,"normal","#555"),
    text(990,680,"GARAGE",24),text(990,706,"about 22 × 31",16,"normal","#555")]),
 "second":("SECOND FLOOR",
   [group([core],HOUSE),poly(fam,OPEN,"#999",3,"10 8"),poly(foyer,OPEN,"#999",2,"6 5"),
    poly(deck,"#dbe6f5","#5a7aa8",3),text(889,112,"balcony 10 × 4",15,"normal","#3a5a88"),
    poly(gar,"none","#bbb",3,"10 8"),poly(bonus,HOUSE),
    text(500,310,"open to family",17,"normal","#888"),text(500,332,"room below",17,"normal","#888"),
    text(720,400,"SECOND FLOOR",26),text(720,428,"about 1,000 sq ft",18,"normal","#555"),
    text(607,625,"open",13,"normal","#888"),text(607,642,"to foyer",13,"normal","#888"),
    text(996,640,"ROOM OVER",17),text(996,662,"GARAGE",17),text(996,686,"8 × 24",15,"normal","#555"),
    text(880,800,"(garage roof)",15,"normal","#999")]),
}
def frame(title,body,w=1200,h=990):
    sb=10*S
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" font-family="DejaVu Sans, Arial, sans-serif">'
      f'<rect width="{w}" height="{h}" fill="#fff"/><g transform="translate(10,70)">'+"".join(body)+'</g>'
      +text(w/2,44,title,32)
      +f'<g transform="translate(60,940)"><line x1="0" y1="0" x2="{sb}" y2="0" stroke="#222" stroke-width="4"/><line x1="0" y1="-8" x2="0" y2="8" stroke="#222" stroke-width="3"/><line x1="{sb}" y1="-8" x2="{sb}" y2="8" stroke="#222" stroke-width="3"/>'+text(sb/2,30,"10 ft",18,"normal")+'</g>'
      +f'<g transform="translate({w-70},120)"><polygon points="0,-40 14,0 0,-10 -14,0" fill="#222"/>'+text(0,26,"N",22)+'</g>'
      +text(w/2,h-12,"FRONT (road side, south)",20,"bold","#555")+'</svg>')
for k,(t,b) in floors.items():
    open(f"{k}.svg","w").write(frame(t,b))
print("ok")
