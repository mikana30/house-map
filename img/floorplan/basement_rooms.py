# Basement room plan from Mike's walk-through (2026-11-22) on the county outline.
src=open('rooms.py').read()
exec(src.split('R={')[0])
exec('def poly('+src.split('\ndef poly(',1)[1].split('b=poly(porch')[0])
R={
 "turret":[(386,532),(553,532),(553,685),(508,685),(462,730),(386,730),(340,685),(340,625),(386,578)],
 "underland":[(386,400),(420,400),(420,532),(386,532)],
 "fairy":[(420,466),(553,466),(553,532),(420,532)],
 "stairs":[(420,400),(553,400),(553,466),(420,466)],
 "play":[(553,590),(729,590),(729,685),(553,685)],
 "mech":[(729,450),(813,450),(813,685),(729,685)],
 "bath":[(813,410),(935,410),(935,532),(813,532)],
 "theater":[(945,136),(1148,136),(1148,380),(1057,380),(1057,349),(945,349)],
 "kitchen":[(615,74),(660,30),(767,30),(813,74),(813,200),(615,200)],
}
FILL={"turret":"#e8f3e6","underland":"#ececec","fairy":"#f7e1e3","stairs":"#d9d9d9","play":"#fbf0dc","mech":"#e2e2e2",
 "bath":"#dfe8f7","theater":"#e6e0f2","kitchen":"#fbf0dc"}
LBL={"turret":("TURRET ROOM","octagon, under office",458,640),"underland":("","",0,0),"fairy":("FAIRY ROOM","under stairs",487,494),
 "stairs":("STAIRS","down from main floor",487,430),"play":("PLAYROOM","",640,615),"mech":("MECH","room",771,560),
 "bath":("BATH","",888,478),"theater":("THEATER","",1050,260),"kitchen":("KITCHEN","alcove",714,150)}
b=poly(gar,"none","#bbb",3,"10 8")+T(1000,700,"(garage above, no basement)",14,"normal","#999")
b+=poly(patio,"#e2e2e2","#777",3)+T(172,290,"PATIO",16)+T(172,310,"walkout, under porch",12,"normal","#555")
for p in [core,fam,bump]: b+=poly(p,"#222","#222",14)
for p in [core,fam,bump]: b+=poly(p,"#f6f3ec","none",0)          # open finished area
for k,p in R.items(): b+=poly(p,FILL[k],"#777",2)
b+=poly(R["stairs"],"url(#st)","#555",2)+T(403,470,"under",11,"normal","#666")+T(403,484,"landing",11,"normal","#666")
# built-ins / fixtures
fx=[((560,652,650,683),"built-in bunk"),((662,640,727,683),"closet"),
    ((845,500,905,530),"vanity"),((815,440,850,530),"shower"),((842,412,882,452),"toilet"),((815,412,840,438),"linen"),
    ((1098,138,1146,190),"wiring")]
for (x1,y1,x2,y2),n in fx:
    b+=f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" fill="#fff" stroke="#8aa" stroke-width="1.5" rx="3"/>'+T((x1+x2)/2,(y1+y2)/2+4,n,10,"normal","#456")
b+='<rect x="388" y="235" width="22" height="60" fill="#c9b8a6" stroke="#7a6a5a" stroke-width="2"/>'+T(440,270,"fireplace",11,"normal","#555")
b+='<circle cx="646" cy="445" r="9" fill="#555"/>'+T(646,470,"post",11,"normal","#555")
# openings / doors
b+=gap(505,466,548,466,"door")       # fairy-room door at the bottom of the stairs
b+=gap(420,472,420,526)              # fairy room open to the space under the landing
b+=gap(426,532,470,532)              # fairy room open into the turret room
b+=gap(553,610,553,660,"door")       # hidden bookshelf door, turret -> playroom
b+=gap(690,590,724,590,"door")       # playroom -> main room
b+=gap(729,597,729,633,"door")       # playroom -> mechanical
b+=gap(890,410,930,410,"door")       # bath door on its north wall, from the passage
b+=gap(945,300,945,344,"door")       # theater
b+=gap(386,160,386,215,"door")       # glass double doors to walkout
b+=gap(520,136,570,136,"door").replace("#c0392b","#5a7aa8")  # window
b+=gap(620,200,808,200)              # kitchen alcove wide opening
for k,(a,s,x,y) in LBL.items():
    if not a: continue
    b+=T(x,y,a,16)
    if s: b+=T(x,y+18,s,12,"normal","#555")
b+=T(500,270,"REC ROOM",17)+T(500,290,"under family room",12,"normal","#555")
b+=T(650,380,"OPEN ROOM",17)+T(880,230,"DINING AREA",15)+T(870,375,"passage",11,"normal","#555")
b+=T(300,190,"glass doors",12,"normal","#3a5a88")
defs='<defs><pattern id="st" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e4e4e4"/><line x1="0" y1="0" x2="0" y2="12" stroke="#999" stroke-width="2"/></pattern></defs>'
W,H=1200,1060; sb=10*15.27
leg=('<g transform="translate(40,960)">'+'<line x1="0" y1="0" x2="40" y2="0" stroke="#c0392b" stroke-width="4"/>'+T(90,6,"door",15,"normal")
     +'<line x1="150" y1="0" x2="190" y2="0" stroke="#5a7aa8" stroke-width="4"/>'+T(240,6,"window",15,"normal")
     +'<rect x="310" y="-8" width="40" height="16" fill="url(#st)" stroke="#555"/>'+T(390,6,"stairs",15,"normal")+'</g>')
svg=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="DejaVu Sans, Arial, sans-serif">{defs}'
     f'<rect width="{W}" height="{H}" fill="#fff"/>'+T(W/2,42,"BASEMENT: ROOMS",30)
     +T(W/2,68,"Outline from county sketch · rooms from owner walk-through + listing photos · positions approximate",14,"normal","#555")
     +f'<g transform="translate(10,90)">{b}</g>'+leg
     +f'<g transform="translate(40,1010)"><line x1="0" y1="0" x2="{sb}" y2="0" stroke="#222" stroke-width="4"/>'+T(sb/2,24,"10 ft",15,"normal")+'</g>'
     +f'<g transform="translate({W-60},130)"><polygon points="0,-36 13,0 0,-9 -13,0" fill="#222"/>'+T(0,24,"N",20)+'</g>'
     +T(W/2,H-14,"FRONT (road side, south)",18,"bold","#555")+'</svg>')
open('basement-rooms.svg','w').write(svg)
open('/tmp/claude-1000/-home-mike/932c57ac-5002-4f9b-acec-41c9464b732f/scratchpad/vac/br.html','w').write('<html><body style="margin:0">'+svg+'</body></html>')
