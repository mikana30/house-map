# Second-floor room plan from Mike's walk-through (2026-11-21) on the county outline.
src=open('rooms.py').read()
exec(src.split('R={')[0])                     # outline polygons + helpers' prerequisites
exec('def poly('+src.split('\ndef poly(',1)[1].split('b=poly(porch')[0])   # poly, T, gap
R={
 "openfam":[(386,136),(615,136),(615,400),(386,400)],
 "stairs":[(386,400),(500,400),(500,532),(386,532)],
 "hall":[(500,400),(615,400),(615,440),(840,440),(840,500),(646,500),(646,532),(500,532)],
 "openfoyer":[(553,532),(646,532),(646,685),(553,685)],
 "bedA":[(386,532),(553,532),(553,685),(508,685),(462,730),(386,730),(340,685),(340,625),(386,578)],
 "bedB":[(646,500),(813,500),(813,685),(646,685)],
 "bath":[(615,250),(700,250),(700,440),(615,440)],
 "linen":[(700,395),(745,395),(745,440),(700,440)],
 "pbath":[(615,74),(660,30),(767,30),(813,74),(813,136),(836,136),(836,160),(760,236),(760,250),(615,250)],
 "primary":[(836,136),(996,136),(996,349),(935,349),(935,440),(745,440),(745,395),(700,395),(700,250),(760,250),(760,236),(836,160)],
 "wic":[(835,340),(875,300),(935,300),(935,440),(835,440)],
 "lhall":[(840,440),(935,440),(935,532),(813,532),(813,500),(840,500)],
 "attic":[(935,349),(1057,349),(1057,380),(1148,380),(1148,486),(935,486)],
 "office":[(935,486),(1057,486),(1057,852),(935,852)],
 "hvac":[(935,535),(985,535),(985,595),(935,595)],
}
FILL={"openfam":"#ffffff","stairs":"#d9d9d9","hall":"#f4f4f4","openfoyer":"#ffffff","bedA":"#f7e1e3","bedB":"#f7e1e3",
 "bath":"#dfe8f7","linen":"#eadfc8","pbath":"#dfe8f7","primary":"#efe6f7","lhall":"#f4f4f4","attic":"#ffffff",
 "office":"#dcebf5","hvac":"#eadfc8","wic":"#eadfc8"}
LBL={"openfam":("OPEN TO FAMILY ROOM","below",500,270),"stairs":("STAIRS","U-turn",462,440),
 "hall":("HALL","rail overlooks family room",700,476),"openfoyer":("OPEN TO","foyer below",600,610),
 "bedA":("BEDROOM","turret bay",458,640),"bedB":("BEDROOM","",730,600),
 "bath":("BATH","",657,300),"linen":("LINEN","",722,422),
 "pbath":("PRIMARY","bath",722,148),"primary":("PRIMARY BEDROOM","",880,225),"wic":("WALK-IN","closet",890,390),
 "lhall":("","",0,0),"attic":("UNFINISHED ATTIC","storage, over garage",1040,430),
 "office":("OFFICE","listed as bedroom",996,700),"hvac":("HVAC","",960,570)}
b=poly(gar,"none","#bbb",3,"10 8")
b+=poly(bump,"none","#bbb",3,"10 8")+T(1072,250,"roof (one-story below)",12,"normal","#999")
for p in [core,fam]: b+=poly(p,"#222","#222",14)
b+=poly(R["office"],"#222","#222",14)+poly(R["attic"],"none","#888",3,"10 8")
for k,p in R.items():
    if k=="attic": continue
    dash="8 6" if k in("openfam","openfoyer") else ""
    b+=poly(p,FILL[k],"#777",2,dash)
b+=poly(R["stairs"],"url(#st)","#555",2)
b+='<rect x="386" y="400" width="34" height="132" fill="#e4e4e4" stroke="#555" stroke-width="2"/>'
b+='<line x1="420" y1="466" x2="500" y2="466" stroke="#555" stroke-width="2"/>'
# primary-bath fixtures (small, approximate)
fx=[((640,45,790,118),"jacuzzi tub"),((622,128,676,192),"shower"),((758,124,810,166),"vanity"),((620,200,668,246),"toilet"),((672,215,718,246),"linen")]
for (x1,y1,x2,y2),n in fx:
    b+=f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" fill="#fff" stroke="#8aa" stroke-width="1.5" rx="4"/>'+T((x1+x2)/2,(y1+y2)/2+4,n,11,"normal","#456")
# hall-bath split: vanity (south) | door | toilet + tub (north)
b+='<line x1="615" y1="350" x2="700" y2="350" stroke="#777" stroke-width="2"/>'+gap(640,350,676,350,"door")
b+=T(657,330,"toilet + tub",11,"normal","#456")+T(657,400,"vanity",11,"normal","#456")
# openings and doors
b+=gap(504,400,612,400)               # hall open along the stairs
b+=gap(620,440,694,440,"door")        # hall bath
b+=gap(706,440,740,440,"door")        # linen
b+=gap(760,440,830,440,"door")        # primary double doors
b+=gap(660,500,700,500,"door")        # bedroom across from the bath
b+=gap(512,532,548,532,"door")        # bedroom at top of stairs
b+=gap(840,446,840,494,"door")        # doorway to little hall
b+=gap(935,490,935,528)               # open doorway (no door) into the office over the garage
b+=gap(985,545,985,585,"door")        # HVAC closet, west wall south of the entry
b+=gap(955,486,995,486,"door")        # small attic door
b+=gap(786,210,810,186,"door")        # angled-corner doorway into primary bath
b+=gap(860,136,925,136,"door")        # glass double doors to the balcony
b+=gap(842,333,868,307,"door")        # walk-in closet door on its angled wall
b+=T(996,838,"gable window",12,"normal","#555")
b+=poly(deck,"#dbe6f5","#5a7aa8",3)+T(889,112,"balcony",13,"normal","#3a5a88")+gap(860,136,925,136,"door")
for k,(a,s,x,y) in LBL.items():
    if not a: continue
    b+=T(x,y,a,16)
    if s: b+=T(x,y+18,s,12,"normal","#555")
defs='<defs><pattern id="st" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e4e4e4"/><line x1="0" y1="0" x2="0" y2="12" stroke="#999" stroke-width="2"/></pattern></defs>'
W,H=1200,1060; sb=10*15.27
leg=('<g transform="translate(40,960)">'+'<line x1="0" y1="0" x2="40" y2="0" stroke="#c0392b" stroke-width="4"/>'+T(90,6,"door",15,"normal")
     +'<rect x="150" y="-8" width="40" height="16" fill="#fff" stroke="#555" stroke-dasharray="6 4"/>'+T(270,6,"open to floor below",15,"normal")
     +'<rect x="380" y="-8" width="40" height="16" fill="url(#st)" stroke="#555"/>'+T(460,6,"stairs",15,"normal")+'</g>')
svg=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="DejaVu Sans, Arial, sans-serif">{defs}'
     f'<rect width="{W}" height="{H}" fill="#fff"/>'+T(W/2,42,"SECOND FLOOR: ROOMS",30)
     +T(W/2,68,"Outline from county sketch · rooms from owner walk-through · positions approximate",14,"normal","#555")
     +f'<g transform="translate(10,90)">{b}</g>'+leg
     +f'<g transform="translate(40,1010)"><line x1="0" y1="0" x2="{sb}" y2="0" stroke="#222" stroke-width="4"/>'+T(sb/2,24,"10 ft",15,"normal")+'</g>'
     +f'<g transform="translate({W-60},130)"><polygon points="0,-36 13,0 0,-9 -13,0" fill="#222"/>'+T(0,24,"N",20)+'</g>'
     +T(W/2,H-14,"FRONT (road side, south)",18,"bold","#555")+'</svg>')
open('second-rooms.svg','w').write(svg)
open('/tmp/claude-1000/-home-mike/932c57ac-5002-4f9b-acec-41c9464b732f/scratchpad/vac/sr.html','w').write('<html><body style="margin:0">'+svg+'</body></html>')
