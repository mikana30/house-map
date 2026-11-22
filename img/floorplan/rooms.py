# Main-floor room plan. County sketch dims are treated as correct; room layout
# from the robot-vacuum map (reach, door gaps) + listing photos. Sketch px, 15.27 px/ft.
exec(open('build.py').read().split('def poly')[0])
R={
 "office":[(386,532),(553,532),(553,685),(508,685),(462,730),(386,730),(340,685),(340,625),(386,578)],
 "hall":[(553,441),(615,441),(615,330),(646,330),(646,685),(553,685)],
 "front":[(646,487),(813,487),(813,685),(646,685)],
 "sitting":[(646,330),(813,330),(813,487),(646,487)],
 "kitchen":[(615,136),(838,136),(838,290),(813,290),(813,330),(615,330)],
 "nook":[(615,74),(660,30),(767,30),(813,74),(813,136),(615,136)],
 "family":[(386,136),(615,136),(615,441),(553,441),(553,400),(386,400)],
 "stairs":[(386,400),(553,400),(553,532),(386,532)],
 "laundry":[(838,136),(945,136),(945,290),(838,290)],
 "backhall":[(813,290),(945,290),(945,349),(935,349),(935,437),(813,437)],
 "bath":[(813,437),(935,437),(935,532),(813,532)],
 "bedroom":[(945,136),(996,136),(1148,136),(1148,380),(1057,380),(1057,349),(945,349)],
}
FILL={"office":"#dcebf5","hall":"#f4f4f4","front":"#efe6f7","sitting":"#efe6f7","kitchen":"#fbf0dc","nook":"#fbf0dc",
 "family":"#e8f3e6","stairs":"#d9d9d9","laundry":"#f7ead0","backhall":"#f4f4f4","bath":"#dfe8f7","bedroom":"#f7e1e3"}
LBL={"office":("OFFICE","turret, bay windows",458,640),"hall":("FOYER","front hall",600,600),
 "front":("FRONT ROOM","chandelier (listed as dining)",730,600),"sitting":("SITTING ROOM","",730,410),
 "kitchen":("KITCHEN","island",715,240),"nook":("BREAKFAST NOOK","bay",714,98),
 "family":("FAMILY ROOM","vaulted 2 stories",500,250),"stairs":("STAIRS","up · closets",470,470),
 "laundry":("LAUNDRY","",891,215),"backhall":("BACK HALL","",874,370),"bath":("BATH","shower",874,488),
 "bedroom":("BEDROOM","",1050,250)}
def poly(p,fill,stroke="#555",sw=2,dash=""):
    d=f' stroke-dasharray="{dash}"' if dash else ""
    return f'<polygon points="{" ".join(f"{x},{y}" for x,y in p)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"{d}/>'
def T(x,y,s,size=17,w="bold",fill="#1b1f24"):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="middle">{s}</text>'
def gap(x1,y1,x2,y2,kind="open"):  # erase wall segment and mark the opening
    col={"open":"#ffffff","door":"#ffffff"}[kind]
    s=f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="7"/>'
    if kind=="door": s+=f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#c0392b" stroke-width="3"/>'
    return s
b=poly(porch,"#dfeee0","#6a9a6c",3)+poly(gar,"#e9e3d6","#222",4)
for p in [core,fam,bump]: b+=poly(p,"#222","#222",14)   # exterior wall (inner half gets covered)
for k,p in R.items(): b+=poly(p,FILL[k],"#777",2)
b+=poly(R["stairs"],"url(#st)","#555",2)
# openings (no wall) and doors (red)
b+=gap(553,441,615,441)            # hall opens into family room
b+=gap(646,545,646,670)            # wide opening foyer -> front room
b+=gap(672,487,790,487)            # wide opening front room -> sitting room (the wall in between)
b+=gap(618,330,644,330)            # walkway to kitchen
b+=gap(615,140,615,326)            # kitchen open to family room
b+=gap(619,136,809,136)            # kitchen open to nook
b+=gap(615,334,615,437)
b+=gap(553,598,553,652,"door")     # office French doors
b+=gap(590,685,628,685,"door")     # front door
b+=gap(813,296,813,326,"door")     # kitchen -> back hall
b+=gap(860,290,900,290,"door")     # laundry
b+=gap(945,296,945,340,"door")     # bedroom
b+=gap(935,360,935,425,"door")     # garage
b+=gap(850,437,895,437,"door")     # bath
b+=gap(460,136,560,136,"door")     # French doors to porch (north)
for k,(a,s,x,y) in LBL.items():
    b+=T(x,y,a); 
    if s: b+=T(x,y+19,s,13,"normal","#555")
b+=T(1000,640,"GARAGE",22)+T(300,450,"PORCH",16,"bold","#3d6b40")+T(660,790,"WRAPAROUND PORCH",16,"bold","#3d6b40")
defs='<defs><pattern id="st" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e4e4e4"/><line x1="0" y1="0" x2="0" y2="12" stroke="#999" stroke-width="2"/></pattern></defs>'
W,H=1200,1060; sb=10*15.27
leg=('<g transform="translate(40,960)">'+'<line x1="0" y1="0" x2="40" y2="0" stroke="#c0392b" stroke-width="4"/>'+T(110,6,"door",15,"normal")
     +'<rect x="190" y="-8" width="40" height="16" fill="#fff" stroke="#555"/>'+T(300,6,"open, no wall",15,"normal")
     +'<rect x="400" y="-8" width="40" height="16" fill="url(#st)" stroke="#555"/>'+T(510,6,"vacuum can\'t reach",15,"normal")+'</g>')
svg=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="DejaVu Sans, Arial, sans-serif">{defs}'
     f'<rect width="{W}" height="{H}" fill="#fff"/>'+T(W/2,42,"MAIN FLOOR: ROOMS",30)
     +T(W/2,68,"Outline from county sketch · rooms from robot-vacuum map + listing photos · positions approximate",14,"normal","#555")
     +f'<g transform="translate(10,90)">{b}</g>'+leg
     +f'<g transform="translate(40,1010)"><line x1="0" y1="0" x2="{sb}" y2="0" stroke="#222" stroke-width="4"/>'+T(sb/2,24,"10 ft",15,"normal")+'</g>'
     +f'<g transform="translate({W-60},130)"><polygon points="0,-36 13,0 0,-9 -13,0" fill="#222"/>'+T(0,24,"N",20)+'</g>'
     +T(W/2,H-14,"FRONT (road side, south)",18,"bold","#555")+'</svg>')
open('main-rooms.svg','w').write(svg)
open('/tmp/claude-1000/-home-mike/932c57ac-5002-4f9b-acec-41c9464b732f/scratchpad/vac/mr.html','w').write('<html><body style="margin:0">'+svg+'</body></html>')
