/* Grand Squeeze Casino — puts you in the seat: the table's near edge reaches across your view
   and the dealer stays in sight on the far side. Works with casino.css on every game page. */
(function(){
  /* Bigger, but never stretched: the table is laid out at its full size and only tilted, so the browser
     draws every card, chip and letter sharp. (Scaling a tilted picture up is what made it blurry.) */
  var EYE=1000;
  function fit(){   // the tables sit flat at their normal size: clear anything an older version set
    document.querySelectorAll('.tablewrap').forEach(function(t){
      ['width','margin-left','margin-right','margin-top','flex','--near','--eye'].forEach(function(p){t.style.removeProperty(p)});
    });
  }
  /* the dealer stands upright behind the far edge of the table, not printed flat on the felt */
  var NS='http://www.w3.org/2000/svg';
  function stand(){
    document.querySelectorAll('.tablewrap').forEach(function(t){
      if(t.querySelector('.tub'))return;
      var st=t.querySelector('.station svg'),body=st&&st.querySelector('#dealer3d');if(!body)return;
      var up=t._dealer;
      if(!up){
        up=document.createElementNS(NS,'svg');up.setAttribute('viewBox','0 -40 1000 173');up.setAttribute('class','dealerup');up.setAttribute('aria-hidden','true');
        var c=body.cloneNode(true);c.removeAttribute('id');c.querySelectorAll('[id]').forEach(function(e){e.removeAttribute('id')});
        up.appendChild(c);document.body.appendChild(up);t._dealer=up;t.classList.add('standing');
      }
      var r=st.getBoundingClientRect();if(!r.width){up.style.display='none';return}
      var w=r.width*1.04,h=w*173/1000,rail=r.top+r.height*(92/133);
      up.style.display='';up.style.width=w+'px';up.style.height=h+'px';
      up.style.left=(r.left+r.width/2-w/2+scrollX)+'px';up.style.top=(rail-h*(132/173)+scrollY)+'px';
    });
  }
  /* baccarat: the roadmap screen and the table-limits sign stand on poles behind the table, not lying on the felt */
  function post(el,cls,x,wf,minW,maxW,r,wide){
    if(!el)return;
    if(!wide){   // phones keep them where they read best
      if(el._home&&el.parentNode!==el._home.p){el._home.p.insertBefore(el,el._home.n);el.classList.remove(cls);el.style.cssText=''}
      return}
    if(!el._home)el._home={p:el.parentNode,n:el.nextSibling};
    if(el.parentNode!==document.body){document.body.appendChild(el);el.classList.add(cls)}
    var sw=Math.max(minW,Math.min(maxW,r.width*wf));
    el.style.setProperty('--sw',sw+'px');
    var h=el.offsetHeight,pole=Math.max(30,r.height*.12);
    el.style.left=(r.left+r.width*x-sw/2+scrollX)+'px';
    el.style.top=(r.top+r.height*.05-pole-h+scrollY)+'px';
    el.style.setProperty('--pole',pole+'px');
  }
  function sign(){
    var t=document.querySelector('.tablewrap:has(> .board)');if(!t)return;
    var board=t.querySelector('.board'),r=board.getBoundingClientRect();
    var wide=innerWidth>760&&!document.body.classList.contains('rotated')&&!(innerHeight<=520&&innerWidth>innerHeight)&&r.top+scrollY>230;   // only when there's room above the table
    post(document.getElementById('scoreboard'),'sign',.86,.24,200,340,r,wide);
    post(board.querySelector('.plaque')||document.querySelector('.plaque.sign'),'sign',.14,.15,130,210,r,wide);
  }

  /* ---------- the casino room around you, drawn in proper perspective (no images to download) ---------- */
  function room(){
    var box=document.querySelector('.casino');if(!box||box.dataset.room)return;box.dataset.room='1';
    var F=620,CX=800,HY=455,ZB=13,WX=6.4,CY=4.2,FY=-1.55,o=[];
    function P(X,Y,z){return [CX+F*X/z,HY-F*Y/z]}
    function pt(a){return a[0].toFixed(1)+','+a[1].toFixed(1)}
    function quad(a,b,c,d,fill,extra){o.push('<path d="M'+pt(a)+'L'+pt(b)+'L'+pt(c)+'L'+pt(d)+'Z" fill="'+fill+'"'+(extra||'')+'/>')}
    function line(a,b,st,w,op){o.push('<path d="M'+pt(a)+'L'+pt(b)+'" stroke="'+st+'" stroke-width="'+w+'" opacity="'+(op||1)+'"/>')}
    var defs='<defs>'+
      '<linearGradient id="cwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a150c"/><stop offset=".55" stop-color="#3a1d10"/><stop offset="1" stop-color="#1a0c06"/></linearGradient>'+
      '<linearGradient id="cceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0705"/><stop offset="1" stop-color="#1c130d"/></linearGradient>'+
      '<linearGradient id="cfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a070c"/><stop offset="1" stop-color="#3d0b12"/></linearGradient>'+
      '<linearGradient id="cback" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24120a"/><stop offset="1" stop-color="#3a1c0f"/></linearGradient>'+
      '<radialGradient id="cglow"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".85"/><stop offset=".25" stop-color="#ffc874" stop-opacity=".35"/><stop offset="1" stop-color="#ffc874" stop-opacity="0"/></radialGradient>'+
      '<radialGradient id="cpool"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".28"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient>'+
      '<linearGradient id="carch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf8a"/><stop offset=".5" stop-color="#d9893a"/><stop offset="1" stop-color="#5a2a10"/></linearGradient>'+
      ['#ff3b6b','#3b8bff','#ffb43b','#2fd39a','#c35bff','#ff6a3b'].map(function(c,i){return '<linearGradient id="cs'+i+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="'+c+'"/><stop offset="1" stop-color="#120414"/></linearGradient>'}).join('')+
      '</defs>';
    // ceiling, walls, floor
    var nz=1.1;
    quad(P(-WX,CY,nz),P(WX,CY,nz),P(WX,CY,ZB),P(-WX,CY,ZB),'url(#cceil)');
    quad(P(-WX,FY,nz),P(WX,FY,nz),P(WX,FY,ZB),P(-WX,FY,ZB),'url(#cfloor)');
    quad(P(-WX,CY,nz),P(-WX,CY,ZB),P(-WX,FY,ZB),P(-WX,FY,nz),'url(#cwall)');
    quad(P(WX,CY,nz),P(WX,CY,ZB),P(WX,FY,ZB),P(WX,FY,nz),'url(#cwall)');
    quad(P(-WX,CY,ZB),P(WX,CY,ZB),P(WX,FY,ZB),P(-WX,FY,ZB),'url(#cback)');
    // carpet: a diamond pattern woven in gold, in perspective
    for(var c=-30;c<=30;c+=1.1){
      var a1=[c-nz,nz],a2=[c-ZB,ZB],b1=[nz-c,nz],b2=[ZB-c,ZB];
      [[a1,a2],[b1,b2]].forEach(function(L){
        var x1=L[0][0],z1=L[0][1],x2=L[1][0],z2=L[1][1];
        // clip to the room's width
        function cl(x,z,xo,zo){if(Math.abs(x)<=WX)return [x,z];var tx=(x>0?WX:-WX),t=(tx-xo)/(x-xo);return [tx,zo+(z-zo)*t]}
        var p=cl(x1,z1,x2,z2),q=cl(x2,z2,x1,z1);if(Math.abs(p[0])>WX+.01||Math.abs(q[0])>WX+.01)return;
        if((p[0]<-WX&&q[0]<-WX)||(p[0]>WX&&q[0]>WX))return;
        line(P(p[0],FY,p[1]),P(q[0],FY,q[1]),'#c9a24a',1,.22);
      });
    }
    for(var z=1.6;z<ZB;z*=1.32)line(P(-WX,FY,z),P(WX,FY,z),'#000',1.2,.25);
    // coffered ceiling with downlights
    for(var X=-WX;X<=WX+.01;X+=1.6)line(P(X,CY,nz),P(X,CY,ZB),'#000',2,.55);
    for(z=1.6;z<ZB;z*=1.28)line(P(-WX,CY,z),P(WX,CY,z),'#000',2,.55);
    for(z=2.2;z<ZB;z*=1.28)for(X=-WX+.8;X<WX;X+=1.6){var q0=P(X,CY-.02,z),r=Math.max(2,60/z);
      o.push('<circle cx="'+q0[0].toFixed(1)+'" cy="'+q0[1].toFixed(1)+'" r="'+(r*3.2).toFixed(1)+'" fill="url(#cglow)" opacity=".55"/><ellipse cx="'+q0[0].toFixed(1)+'" cy="'+q0[1].toFixed(1)+'" rx="'+r.toFixed(1)+'" ry="'+(r*.45).toFixed(1)+'" fill="#fff4dc"/>')}
    // wood panelling, crown moulding and chair rail on the walls
    [-WX,WX].forEach(function(X){
      for(z=1.4;z<ZB;z*=1.18)line(P(X,CY,z),P(X,FY,z),'#120804',1.6,.8);
      [3.6,.2,-.6].forEach(function(Y,i){var pts=[];for(var zz=nz;zz<=ZB;zz+=.3)pts.push(pt(P(X,Y,zz)));o.push('<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+(i?'#5a3a18':'#a8803a')+'" stroke-width="'+(i?2:3)+'" opacity=".8"/>')});
      // wall sconces
      for(z=2.4;z<ZB;z*=1.45){var sc=P(X*.985,1.9,z),rr=Math.max(3,90/z);
        o.push('<circle cx="'+sc[0].toFixed(1)+'" cy="'+sc[1].toFixed(1)+'" r="'+(rr*3).toFixed(1)+'" fill="url(#cglow)" opacity=".7"/><rect x="'+(sc[0]-rr*.35).toFixed(1)+'" y="'+(sc[1]-rr*.6).toFixed(1)+'" width="'+(rr*.7).toFixed(1)+'" height="'+(rr*1.2).toFixed(1)+'" rx="'+(rr*.3).toFixed(1)+'" fill="#ffe7b8"/>')}
    });
    // the back wall: panels and a lit archway into the next room
    for(X=-WX;X<=WX;X+=1.1)line(P(X,CY,ZB),P(X,FY,ZB),'#120804',1.4,.7);
    quad(P(-1.5,1.7,ZB),P(1.5,1.7,ZB),P(1.5,FY,ZB),P(-1.5,FY,ZB),'url(#carch)','opacity=".85"');
    var ac=P(0,1.7,ZB),aw=F*1.5/ZB;o.push('<path d="M'+(ac[0]-aw).toFixed(1)+','+ac[1].toFixed(1)+'A'+aw.toFixed(1)+','+(aw*.7).toFixed(1)+' 0 0 1 '+(ac[0]+aw).toFixed(1)+','+ac[1].toFixed(1)+'Z" fill="#ffcf8a" opacity=".85"/>');
    var ag=P(0,.6,ZB);o.push('<ellipse cx="'+ag[0]+'" cy="'+ag[1]+'" rx="'+(aw*3)+'" ry="'+(aw*2)+'" fill="url(#cglow)" opacity=".5"/>');
    // banks of slot machines along both walls, screens lit
    [-1,1].forEach(function(sd){
      var Xf=sd*(WX-1.05),Xb=sd*WX,k=0;
      for(z=2.6;z<ZB-.6;z+=1.0){var z2=z+.86,top=.85,bot=FY,ci=(k++)%6;
        quad(P(Xf,top,z),P(Xf,top,z2),P(Xf,bot,z2),P(Xf,bot,z),'#14090c','stroke="#000" stroke-width=".8"');      // cabinet front
        quad(P(Xf,top,z),P(Xb,top,z),P(Xb,top,z2),P(Xf,top,z2),'#2a1418');                                       // top
        quad(P(Xf,.62,z+.1),P(Xf,.62,z2-.1),P(Xf,-.25,z2-.1),P(Xf,-.25,z+.1),'url(#cs'+ci+')');                 // the game screen
        quad(P(Xf,-.42,z+.1),P(Xf,-.42,z2-.1),P(Xf,-.6,z2-.1),P(Xf,-.6,z+.1),'#c9a24a','opacity=".55"');         // button deck
        var cn=P(Xf,1.25,z+.43),cr=Math.max(2,40/z);o.push('<rect x="'+(cn[0]-cr*.4).toFixed(1)+'" y="'+cn[1].toFixed(1)+'" width="'+(cr*.8).toFixed(1)+'" height="'+(cr*2.6).toFixed(1)+'" fill="'+['#ff3b6b','#ffb43b','#3b8bff'][k%3]+'" opacity=".9"/>');
        var pool=P(Xf,0,z+.43);o.push('<circle cx="'+pool[0].toFixed(1)+'" cy="'+pool[1].toFixed(1)+'" r="'+(F*.9/z).toFixed(1)+'" fill="url(#cglow)" opacity=".22"/>');
      }
    });
    // other tables out on the floor, each under its own lamp
    [[-3.2,8.6,'#1f6a3a'],[3.4,9.4,'#1d3f7a'],[-1.6,11.6,'#7a1424'],[1.9,11.9,'#1f6a3a']].forEach(function(t){
      var X=t[0],z=t[1],c=P(X,-.62,z),rx=F*1.15/z,ry=rx*.26,lamp=P(X,2.1,z);
      o.push('<ellipse cx="'+c[0].toFixed(1)+'" cy="'+(c[1]+ry*.9).toFixed(1)+'" rx="'+(rx*1.25).toFixed(1)+'" ry="'+(ry*1.3).toFixed(1)+'" fill="url(#cpool)"/>');
      var b=P(X,FY,z);o.push('<rect x="'+(c[0]-rx*.12).toFixed(1)+'" y="'+c[1].toFixed(1)+'" width="'+(rx*.24).toFixed(1)+'" height="'+(b[1]-c[1]).toFixed(1)+'" fill="#0a0504"/>');
      o.push('<ellipse cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" rx="'+rx.toFixed(1)+'" ry="'+ry.toFixed(1)+'" fill="#0d0706"/><ellipse cx="'+c[0].toFixed(1)+'" cy="'+(c[1]-ry*.08).toFixed(1)+'" rx="'+(rx*.86).toFixed(1)+'" ry="'+(ry*.78).toFixed(1)+'" fill="'+t[2]+'"/>');
      // chairs around the near side
      for(var j=-2;j<=2;j++){var ch=[c[0]+j*rx*.42,c[1]+ry*(1-Math.abs(j)*.18)],cw=rx*.2;o.push('<rect x="'+(ch[0]-cw/2).toFixed(1)+'" y="'+(ch[1]-cw*.6).toFixed(1)+'" width="'+cw.toFixed(1)+'" height="'+(cw*1.4).toFixed(1)+'" rx="'+(cw*.3).toFixed(1)+'" fill="#3a0c12" stroke="#000" stroke-width=".6"/>')}
      var top=P(X,CY,z);line(top,lamp,'#000',1.2,.8);
      o.push('<path d="M'+(lamp[0]-rx*.5).toFixed(1)+','+(lamp[1]+rx*.12).toFixed(1)+'L'+(lamp[0]-rx*.3).toFixed(1)+','+lamp[1].toFixed(1)+'H'+(lamp[0]+rx*.3).toFixed(1)+'L'+(lamp[0]+rx*.5).toFixed(1)+','+(lamp[1]+rx*.12).toFixed(1)+'Z" fill="#1a1410" stroke="#8a6a2a" stroke-width=".8"/>');
      o.push('<ellipse cx="'+lamp[0].toFixed(1)+'" cy="'+(lamp[1]+rx*.13).toFixed(1)+'" rx="'+(rx*.45).toFixed(1)+'" ry="'+(rx*.05).toFixed(1)+'" fill="#ffe7b8"/>');
    });
    // two chandeliers
    [[-2.8,6.5],[2.8,6.5]].forEach(function(cz){var top=P(cz[0],CY,cz[1]),c=P(cz[0],2.9,cz[1]),r=F*.7/cz[1];
      line(top,c,'#8a6a2a',1.2);
      o.push('<circle cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="'+(r*2.6).toFixed(1)+'" fill="url(#cglow)" opacity=".75"/>');
      o.push('<ellipse cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" rx="'+r.toFixed(1)+'" ry="'+(r*.28).toFixed(1)+'" fill="none" stroke="#c9a24a" stroke-width="1.6"/>');
      for(var i=0;i<9;i++){var a=i/9*Math.PI*2,bx=c[0]+Math.cos(a)*r,by=c[1]+Math.sin(a)*r*.28;o.push('<circle cx="'+bx.toFixed(1)+'" cy="'+(by-r*.12).toFixed(1)+'" r="'+(r*.07).toFixed(1)+'" fill="#fff6e0"/><path d="M'+bx.toFixed(1)+','+by.toFixed(1)+'l0,'+(r*.25).toFixed(1)+'" stroke="#e8e0ff" stroke-width="'+(r*.03).toFixed(1)+'" opacity=".7"/>')}
    });
    var svg='<svg class="room" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'+defs+o.join('')+'</svg>';
    box.innerHTML=svg+'<i class="haze"></i>';
  }
  /* the progressive jackpot hangs on cables above the table, like the meters over real table games */
  function jackpot(){
    document.querySelectorAll('.tablewrap').forEach(function(t){
      if(t.querySelector('.tub')||t.querySelector(':scope > .board'))return;
      var tb=t.querySelector('.table'),jp=(tb&&tb.querySelector('.jackpot'))||t._jp;if(!jp)return;
      var wide=innerWidth>760;
      if(!wide){if(jp._home&&jp.parentNode!==jp._home.p){jp._home.p.insertBefore(jp,jp._home.n);jp.classList.remove('sign');jp.style.cssText=''}return}
      if(!jp._home){jp._home={p:jp.parentNode,n:jp.nextSibling};t._jp=jp}
      if(jp.parentNode!==document.body){document.body.appendChild(jp);jp.classList.add('sign')}
      var r=tb.getBoundingClientRect(),sw=Math.max(230,Math.min(380,r.width*.27));
      jp.style.setProperty('--sw',sw+'px');
      var h=jp.offsetHeight,top=Math.max(76,r.top-h-r.height*.03);
      jp.style.left=(r.left+r.width*.2-sw/2+scrollX)+'px';jp.style.top=(top+scrollY)+'px';
      jp.style.setProperty('--cable',(top+scrollY)+'px');
    });
  }
  /* the win / lose message pops up straight over the table, not printed on the tilted felt */
  function banner(){
    var bn=document.getElementById('banner');if(!bn)return;
    var home=bn._anchor||bn.closest('.tub')||bn.closest('.tablewrap');if(!home)return;
    if(!bn._anchor){bn._anchor=home;document.body.appendChild(bn);bn.classList.add('up')}
    var r=home.getBoundingClientRect(),y=home.classList.contains('tub')?.38:home.querySelector(':scope > .board')?.52:.46;
    bn.style.left=(r.left+r.width/2+scrollX)+'px';bn.style.top=(r.top+r.height*y+scrollY)+'px';
    // craps: the stickman's call on each roll stands up too
    var cl=document.getElementById('call');
    if(cl&&home.classList.contains('tub')){if(!cl._up){cl._up=1;document.body.appendChild(cl);cl.classList.add('up')}
      cl.style.left=(r.left+r.width/2+scrollX)+'px';cl.style.top=(r.top+r.height*.2+scrollY)+'px'}
  }
  var timer;function soon(){clearTimeout(timer);timer=setTimeout(function(){fit();stand();sign();jackpot();banner()},60)}
  addEventListener('resize',soon);addEventListener('orientationchange',soon);
  function all(){room();fit();stand();sign();jackpot();banner()}
  if(document.readyState!=='loading')all();else document.addEventListener('DOMContentLoaded',all);
  addEventListener('load',all);setTimeout(all,600);setTimeout(function(){stand();sign();jackpot();banner()},1500);
  // keep him in place if the page layout shifts (panels opening, fonts loading)
  if(window.ResizeObserver)new ResizeObserver(soon).observe(document.body);
})();
