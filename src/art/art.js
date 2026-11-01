/* Generado por tools/extraer-arte.cjs desde diseno/pantallas-papel-crema.html. No editar a mano. */
export const Art = (function(){
  var CRUST="#E39A35",CRUMB="#F7D9A0",RED="#E5483A",CHEEK="#F08A6A",DARK="#2A1608";
  function L(inner,cls){return '<g class="ln'+(cls?' '+cls:'')+'" filter="url(#wob)" fill="none" stroke="#F8E9D2" stroke-linecap="round" stroke-linejoin="round">'+inner+'</g>';}
  function F(inner){return '<g class="fl">'+inner+'</g>';}
  function f1(n){return (Math.round(n*10)/10).toString();}
  /* ---------- media luna clásica: lóbulos a lo largo de un arco ---------- */
  var R=52;
  function seg(a,rx,ry){var r=a*Math.PI/180;return {a:a,cx:80+R*Math.cos(r),cy:96+R*Math.sin(r),rx:rx,ry:ry,rot:a+90};}
  var SEGS=[seg(190,12,9),seg(350,12,9),seg(214,11,16),seg(326,11,16),seg(242,14,21),seg(298,14,21),seg(270,19,25)];
  function ell(s,extra){return '<ellipse cx="'+f1(s.cx)+'" cy="'+f1(s.cy)+'" rx="'+s.rx+'" ry="'+s.ry+'" transform="rotate('+s.rot+' '+f1(s.cx)+' '+f1(s.cy)+')" '+extra+'/>';}
  var BANDS=[[202,12],[228,18],[256,23],[284,23],[312,18],[338,12]];
  function bandLines(){
    return BANDS.map(function(b){var r=b[0]*Math.PI/180,t=b[1]*.95,c=Math.cos(r),s=Math.sin(r);
      var x1=80+(R-t)*c,y1=96+(R-t)*s,x2=80+(R+t)*c,y2=96+(R+t)*s,mx=(x1+x2)/2-s*4,my=(y1+y2)/2+c*4;
      return '<path d="M'+f1(x1)+' '+f1(y1)+'Q'+f1(mx)+' '+f1(my)+' '+f1(x2)+' '+f1(y2)+'" stroke-width="2.4" opacity=".85"/>';}).join("");
  }
  function mold(x,y,s,col){
    var P=[[0,0,5],[5,-2,3.6],[-4.5,3,3.6],[2,4.5,3.2],[-5,-3.2,3.2]],o='<g stroke="none">';
    P.forEach(function(p){o+='<circle cx="'+f1(x+p[0]*s)+'" cy="'+f1(y+p[1]*s)+'" r="'+f1(p[2]*s)+'" fill="'+col+'"/>';});
    o+='<g fill="#2F4F32"><circle cx="'+f1(x+s)+'" cy="'+f1(y+.5*s)+'" r="'+f1(.9*s)+'"/><circle cx="'+f1(x-3*s)+'" cy="'+f1(y+3*s)+'" r="'+f1(.8*s)+'"/><circle cx="'+f1(x+5*s)+'" cy="'+f1(y-2*s)+'" r="'+f1(.8*s)+'"/></g>';
    o+='<g fill="#EAF2DD" opacity=".8"><circle cx="'+f1(x-1.5*s)+'" cy="'+f1(y-1.5*s)+'" r="'+f1(.6*s)+'"/><circle cx="'+f1(x+3*s)+'" cy="'+f1(y+3.5*s)+'" r="'+f1(.6*s)+'"/></g></g>';
    return o;
  }
  function fly(x,y){return '<g stroke="none"><circle cx="'+(x-2.5)+'" cy="'+(y-3)+'" r="2.6" fill="#F4E6C8" opacity=".75"/><circle cx="'+(x+2.5)+'" cy="'+(y-3)+'" r="2.6" fill="#F4E6C8" opacity=".75"/><ellipse cx="'+x+'" cy="'+y+'" rx="3.2" ry="2.2" fill="#161010"/></g>';}
  function lunaFace(m){
    var ink=m==="bad"?"#F4E6C8":DARK;
    if(m==="bad")return '<g stroke="'+ink+'"><path d="M66 38l8 8M74 38l-8 8M86 38l8 8M94 38l-8 8" stroke-width="2.6"/><path d="M72 56q4 -4 8 0t8 0" stroke-width="2.4"/></g><path d="M83 57q2 9 7 6q1 -4 -2 -7z" fill="#E56B6F" stroke="none"/>';
    var e;
    if(m==="mid")e='<g fill="'+ink+'" stroke="none"><path d="M68 44a4 4 0 0 0 8 0Z"/><path d="M84 44a4 4 0 0 0 8 0Z"/></g><path d="M67 43h10M83 43h10" stroke="'+ink+'" stroke-width="2.2"/><path d="M66 37l9 -3M94 37l-9 -3" stroke="'+ink+'" stroke-width="2.2"/><path d="M73 56q3.5 -3 7 0t7 0" stroke="'+ink+'" stroke-width="2.4"/><path d="M110 40q4 7 0 10q-4 -3 0 -10z" fill="#BFE3F0" stroke-width="1.8"/>';
    else e='<g fill="'+ink+'" stroke="none"><ellipse cx="72" cy="42" rx="3.9" ry="5.2"/><ellipse cx="88" cy="42" rx="3.9" ry="5.2"/><circle cx="73.3" cy="40" r="1.6" fill="'+CRUMB+'"/><circle cx="89.3" cy="40" r="1.6" fill="'+CRUMB+'"/></g><path d="M74 54q6 5.5 12 0" stroke="'+ink+'" stroke-width="2.4"/>';
    return e;
  }
  function luna(m){
    var c={ok:["#E5A13E","#F7D9A0"],mid:["#C9A443","#E3CE7A"],bad:["#6F6B45","#8D8A5E"]}[m];
    var cheekCol=m==="ok"?CHEEK:"#A3B864";
    var hL=m==="ok"?[10,50]:[14,80],aL=m==="ok"?'M30 62Q16 62 10 50':'M30 62Q18 68 14 80';
    var sil='<g class="ln dk" filter="url(#wob)" fill="none" stroke-linejoin="round">'+SEGS.map(function(s){return ell(s,'stroke-width="5.2"');}).join("")+'</g>';
    var fill='<ellipse cx="30" cy="102" rx="12" ry="6" fill="'+RED+'"/><ellipse cx="130" cy="102" rx="12" ry="6" fill="'+RED+'"/>'+SEGS.map(function(s){return ell(s,'fill="'+c[0]+'"');}).join("")+
      '<ellipse cx="80" cy="29" rx="10" ry="3.6" fill="'+c[1]+'" opacity=".65"/><ellipse cx="57" cy="36" rx="6" ry="3" fill="'+c[1]+'" opacity=".55" transform="rotate(-25 57 36)"/><ellipse cx="103" cy="36" rx="6" ry="3" fill="'+c[1]+'" opacity=".55" transform="rotate(25 103 36)"/>'+
      '<circle cx="66" cy="51" r="5.2" fill="'+cheekCol+'" opacity=".85"/><circle cx="94" cy="51" r="5.2" fill="'+cheekCol+'" opacity=".85"/>';
    var det=bandLines()+'<path d="'+aL+'" stroke-width="3"/><path d="M130 62Q142 68 146 80" stroke-width="3"/><circle cx="'+hL[0]+'" cy="'+hL[1]+'" r="5" fill="'+c[1]+'" stroke-width="2.4"/><circle cx="146" cy="80" r="5" fill="'+c[1]+'" stroke-width="2.4"/><path d="M30 94V98M130 94V98" stroke-width="3"/><ellipse cx="30" cy="102" rx="12" ry="6" stroke-width="2.4"/><ellipse cx="130" cy="102" rx="12" ry="6" stroke-width="2.4"/>';
    if(m==="mid")det+=mold(48,62,1,"#79A874")+mold(116,58,1,"#79A874")+mold(98,32,.9,"#6FA3B8");
    if(m==="bad")det+=mold(48,62,1.2,"#6FA86B")+mold(116,58,1.2,"#6FA3B8")+mold(98,32,1.1,"#6FA86B")+mold(60,30,1,"#6FA3B8")+mold(30,84,.9,"#6FA86B")+mold(132,86,.9,"#6FA86B")+mold(92,66,.9,"#6FA3B8")+
      '<path d="M66 14q-5 -5 0 -10M80 12q-5 -5 0 -10M94 14q-5 -5 0 -10" stroke="#8DBB6A" stroke-width="2.2" opacity=".9"/>'+fly(30,34)+fly(130,26);
    det+=lunaFace(m);
    return '<svg class="sl" viewBox="0 0 160 112" role="img" aria-label="Media luna">'+sil+F(fill)+L(det,"dk")+'</svg>';
  }

  /* ---------- Miguita: sanguchito de miga triangular ---------- */
  var MP={
    ok:{bread:"#F7E9CF",ham:"#E88F8F",cheese:"#F2D45C",tom:"#E5483A",let:"#8DBB6A",cheek:CHEEK},
    mid:{bread:"#E3D49F",ham:"#C98080",cheese:"#D9BE55",tom:"#C2573F",let:"#7FA05A",cheek:"#A3B864"},
    bad:{bread:"#A9A98A",ham:"#8A6A62",cheese:"#A4A55A",tom:"#8A4A38",let:"#6B7A47",cheek:"#A3B864"}
  };
  function mfaceAt(m,cx,cy,sp){
    var l=cx-sp,r=cx+sp;
    if(m==="bad")return '<g stroke="'+DARK+'"><path d="M'+(l-5)+' '+(cy-5)+'l10 10M'+(l+5)+' '+(cy-5)+'l-10 10M'+(r-5)+' '+(cy-5)+'l10 10M'+(r+5)+' '+(cy-5)+'l-10 10" stroke-width="2.6"/><path d="M'+(cx-10)+' '+(cy+16)+'q5 -5 10 0t10 0" stroke-width="2.4"/></g><path d="M'+(cx+4)+' '+(cy+17)+'q2 8 7 5q1 -4 -2 -6z" fill="#E56B6F" stroke="none"/>';
    if(m==="mid")return '<g fill="'+DARK+'" stroke="none"><path d="M'+(l-4)+' '+(cy+1)+'a4 4 0 0 0 8 0Z"/><path d="M'+(r-4)+' '+(cy+1)+'a4 4 0 0 0 8 0Z"/></g><path d="M'+(l-5)+' '+cy+'h10M'+(r-5)+' '+cy+'h10" stroke="'+DARK+'" stroke-width="2.2"/><path d="M'+(l-6)+' '+(cy-7)+'l9 -3M'+(r+6)+' '+(cy-7)+'l-9 -3" stroke="'+DARK+'" stroke-width="2.2"/><path d="M'+(cx-8)+' '+(cy+14)+'q4 -3 8 0t8 0" stroke="'+DARK+'" stroke-width="2.4"/>';
    return '<g fill="'+DARK+'" stroke="none"><ellipse cx="'+l+'" cy="'+cy+'" rx="3.9" ry="5.2"/><ellipse cx="'+r+'" cy="'+cy+'" rx="3.9" ry="5.2"/><circle cx="'+(l+1.3)+'" cy="'+(cy-2)+'" r="1.6" fill="#F4E6C8"/><circle cx="'+(r+1.3)+'" cy="'+(cy-2)+'" r="1.6" fill="#F4E6C8"/></g><path d="M'+(cx-7)+' '+(cy+11)+'q7 6 14 0" stroke="'+DARK+'" stroke-width="2.4"/>';
  }
  function lay(xa,xb,y,h,amp,over,ph){
    var a=xa-over,b=xb+over,n=Math.ceil((b-a)/4),pts=[],bot=[],i,x;
    for(i=0;i<=n;i++){x=a+(b-a)*i/n;pts.push(f1(x)+' '+f1(y+amp*Math.sin(x*.28+ph)));}
    for(i=n;i>=0;i--){x=a+(b-a)*i/n;bot.push(f1(x)+' '+f1(y+h+amp*Math.sin(x*.28+ph+1.7)));}
    return 'M'+pts.concat(bot).join('L')+'Z';
  }
  function rbT(x0,x1,y0,y1,r){return 'M'+(x0+r)+' '+y0+'H'+(x1-r)+'Q'+x1+' '+y0+' '+x1+' '+(y0+r)+'V'+y1+'H'+x0+'V'+(y0+r)+'Q'+x0+' '+y0+' '+(x0+r)+' '+y0+'Z';}
  function rbB(x0,x1,y0,y1,r){return 'M'+x0+' '+y0+'H'+x1+'V'+(y1-r)+'Q'+x1+' '+y1+' '+(x1-r)+' '+y1+'H'+(x0+r)+'Q'+x0+' '+y1+' '+x0+' '+(y1-r)+'Z';}
  function seeds(xa,xb,y,col){var s='',x;for(x=xa+6;x<xb-4;x+=13)s+='<ellipse cx="'+x+'" cy="'+(y+3.6)+'" rx="2.6" ry="1.4" fill="'+col+'" opacity=".85"/>';return s;}
  function mshoes(x1,x2,y){return [{d:'M'+(x1-12)+' '+y+'a12 6 0 1 0 24 0a12 6 0 1 0 -24 0Z',c:RED},{d:'M'+(x2-12)+' '+y+'a12 6 0 1 0 24 0a12 6 0 1 0 -24 0Z',c:RED}];}
  function overlay(m,molds){
    var o='',i;
    if(m==="mid")for(i=0;i<Math.min(3,molds.length);i++)o+=mold(molds[i][0],molds[i][1],molds[i][2]||1,i===1?"#6FA3B8":"#79A874");
    if(m==="bad"){for(i=0;i<molds.length;i++)o+=mold(molds[i][0],molds[i][1],(molds[i][2]||1)*1.15,i%3===1?"#6FA3B8":"#6FA86B");
      o+='<path d="M64 -4q-5 -4 0 -8M80 -6q-5 -4 0 -8M96 -4q-5 -4 0 -8" stroke="#8DBB6A" stroke-width="2.2" opacity=".9"/>'+fly(22,16)+fly(148,12);}
    return o;
  }
  function slice(m){
    var p=MP[m],tri="M80 3Q84 3 87 8L122 56Q126 62 120 62H40Q34 62 38 56L73 8Q76 3 80 3Z";
    var tb=rbT(36,124,62,69,4),bb=rbB(36,124,91,98,5);
    var lt=lay(36,124,68,8,2,5,0),tm=lay(36,124,75,8,.8,4,1),hm=lay(36,124,82,6,1.6,5,2),ch=lay(36,124,87,5,.3,3,3);
    var sh=mshoes(62,98,110).concat([{d:bb,c:p.bread},{d:tb,c:p.bread},{d:ch,c:p.cheese},{d:hm,c:p.ham},{d:tm,c:p.tom},{d:lt,c:p.let},{d:tri,c:p.bread}]);
    var aL=m==="ok"?'M36 78Q22 78 16 64':'M36 80Q22 86 18 98',hL=m==="ok"?[16,64]:[18,98];
    var sil='<g class="ln dk" filter="url(#wob)" fill="none" stroke-linejoin="round">'+sh.map(function(s){return '<path d="'+s.d+'" stroke-width="5.2"/>';}).join('')+'</g>';
    var fill=sh.map(function(s){return '<path d="'+s.d+'" fill="'+s.c+'"/>';}).join('')+seeds(36,124,75,p.bread)+'<circle cx="62" cy="50" r="4.8" fill="'+p.cheek+'" opacity=".85"/><circle cx="98" cy="50" r="4.8" fill="'+p.cheek+'" opacity=".85"/>';
    var line='<path d="'+lt+'" stroke-width="2"/><path d="'+tm+'" stroke-width="2"/><path d="'+hm+'" stroke-width="2"/><path d="'+ch+'" stroke-width="2"/><path d="M80 14h0M70 28h0M92 26h0" stroke-width="2.4" opacity=".5"/>'+
      '<path d="'+aL+'" stroke-width="3"/><path d="M124 80Q136 86 140 98" stroke-width="3"/><circle cx="'+hL[0]+'" cy="'+hL[1]+'" r="5" fill="'+p.bread+'" stroke-width="2.4"/><circle cx="140" cy="98" r="5" fill="'+p.bread+'" stroke-width="2.4"/>'+
      '<path d="M62 98V104M98 98V104" stroke-width="3"/><ellipse cx="62" cy="110" rx="12" ry="6" stroke-width="2.4"/><ellipse cx="98" cy="110" rx="12" ry="6" stroke-width="2.4"/>'+
      overlay(m,[[66,26,.9],[96,36,.9],[80,56,.8],[48,72],[112,92],[70,94,.8]])+mfaceAt(m,80,36,11);
    return '<svg class="sl" viewBox="0 -24 160 148" role="img" aria-label="Miguita, sanguchito de miga">'+sil+F(fill)+L(line,"dk")+'</svg>';
  }

  /* ---------- amigos: la docena de facturas ---------- */
  function ff(x1,x2,y){
    var mid=(x1+x2)/2;
    return '<g fill="'+DARK+'" stroke="none"><ellipse cx="'+x1+'" cy="'+y+'" rx="3.2" ry="4.3"/><ellipse cx="'+x2+'" cy="'+y+'" rx="3.2" ry="4.3"/><circle cx="'+(x1+1)+'" cy="'+(y-1.6)+'" r="1.2" fill="#F4E6C8"/><circle cx="'+(x2+1)+'" cy="'+(y-1.6)+'" r="1.2" fill="#F4E6C8"/></g><path d="M'+(mid-5)+' '+(y+9)+'q5 4.5 10 0" stroke="'+DARK+'" stroke-width="2.2"/>';
  }
  function friend(k){
    if(k==="luna")return luna("ok").replace('class="sl"','class="fr lu"');
    if(k==="fact"){
      var fb="M16 10H64Q70 10 70 16V62Q70 68 64 68H16Q10 68 10 62V16Q10 10 16 10Z";
      var f2='<ellipse cx="28" cy="77" rx="9" ry="4.5" fill="'+RED+'"/><ellipse cx="52" cy="77" rx="9" ry="4.5" fill="'+RED+'"/><path d="'+fb+'" fill="'+CRUST+'"/><path d="M18 16H40Q36 29 40 42H18Z" fill="#F2D45C"/><path d="M40 16H62V42H40Q44 29 40 16Z" fill="#B8431F"/><circle cx="25" cy="57" r="4.2" fill="'+CHEEK+'" opacity=".85"/><circle cx="55" cy="57" r="4.2" fill="'+CHEEK+'" opacity=".85"/>';
      var l2='<path d="'+fb+'" stroke-width="2.6"/><path d="M18 16H62V42H18Z" stroke-width="2"/><path d="M40 16Q36 29 40 42" stroke-width="2"/><path d="M12 12L18 16M68 12L62 16" stroke-width="1.8" opacity=".7"/><path d="M28 68V72M52 68V72" stroke-width="2.6"/><ellipse cx="28" cy="77" rx="9" ry="4.5" stroke-width="2.2"/><ellipse cx="52" cy="77" rx="9" ry="4.5" stroke-width="2.2"/>'+ff(32,48,54);
      return '<svg class="fr" viewBox="0 0 80 84" aria-hidden="true">'+F(f2)+L(l2)+'</svg>';
    }    var fl,ln;
    if(k==="canon"){
      var d="M6 52Q10 36 40 26Q58 20 68 20Q78 36 68 56Q40 56 12 58Q4 58 6 52Z";
      fl='<ellipse cx="26" cy="70" rx="9" ry="4.5" fill="'+RED+'"/><ellipse cx="50" cy="70" rx="9" ry="4.5" fill="'+RED+'"/><path d="'+d+'" fill="'+CRUST+'"/><ellipse cx="69" cy="38" rx="6.5" ry="17" fill="#8B4A17"/><circle cx="23" cy="51" r="4.2" fill="'+CHEEK+'" opacity=".85"/><circle cx="51" cy="51" r="4.2" fill="'+CHEEK+'" opacity=".85"/>';
      ln='<path d="'+d+'" stroke-width="2.6"/><ellipse cx="69" cy="38" rx="6.5" ry="17" stroke-width="2.2"/><path d="M16 44q4 4 2 9M24 37q4 5 2 11" stroke-width="2"/><path d="M26 58V65M50 58V65" stroke-width="2.6"/><ellipse cx="26" cy="70" rx="9" ry="4.5" stroke-width="2.2"/><ellipse cx="50" cy="70" rx="9" ry="4.5" stroke-width="2.2"/>'+ff(31,45,44);
    }else{
      var c="M15 38a25 25 0 1 0 50 0a25 25 0 1 0 -50 0Z";
      fl='<ellipse cx="31" cy="72" rx="9" ry="4.5" fill="'+RED+'"/><ellipse cx="50" cy="72" rx="9" ry="4.5" fill="'+RED+'"/><path d="'+c+'" fill="'+CRUST+'"/><g fill="'+CRUMB+'"><circle cx="24" cy="24" r="1.8"/><circle cx="40" cy="15" r="1.8"/><circle cx="56" cy="24" r="1.8"/><circle cx="20" cy="40" r="1.8"/><circle cx="60" cy="42" r="1.8"/><circle cx="32" cy="58" r="1.8"/><circle cx="50" cy="58" r="1.8"/></g><circle cx="27" cy="45" r="4.2" fill="'+CHEEK+'" opacity=".85"/><circle cx="53" cy="45" r="4.2" fill="'+CHEEK+'" opacity=".85"/>';
      ln='<path d="'+c+'" stroke-width="2.6"/><path d="M31 63V68M50 63V68" stroke-width="2.6"/><ellipse cx="31" cy="72" rx="9" ry="4.5" stroke-width="2.2"/><ellipse cx="50" cy="72" rx="9" ry="4.5" stroke-width="2.2"/>'+ff(33,47,36);
    }
    return '<svg class="fr" viewBox="0 0 80 80" aria-hidden="true">'+F(fl)+L(ln)+'</svg>';
  }
  /* ---------- pan francés visto desde arriba: lo que queda ---------- */
  var cpN=0;
  function loaf(rem){
    var xr=6+88*Math.max(rem,.08),id="cp"+(++cpN);
    var leaf="M6 28Q14 11 50 11Q86 11 94 28Q86 45 50 45Q14 45 6 28Z";
    var hh=17*Math.sqrt(Math.max(0,1-Math.pow((xr-50)/44,2)));
    var clip='<defs><clipPath id="'+id+'"><rect x="0" y="0" width="'+f1(xr)+'" height="60"/></clipPath></defs>';
    var cp=' clip-path="url(#'+id+')"';
    var cut=rem<.995?'<ellipse cx="'+f1(xr)+'" cy="28" rx="3.4" ry="'+f1(hh)+'"':'';
    var fl='<g transform="rotate(-14 50 28)"><path d="'+leaf+'" fill="'+CRUST+'"'+cp+'/><path d="M12 28Q50 16 88 28Q50 22 12 28Z" fill="'+CRUMB+'"'+cp+'/>'+(cut?cut+' fill="'+CRUMB+'"/>':'')+'</g>';
    var ln='<g transform="rotate(-14 50 28)"><path d="'+leaf+'" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 4" opacity=".5"/><path d="'+leaf+'" stroke-width="2.6"'+cp+'/><path d="M12 28Q50 16 88 28" stroke-width="2"'+cp+'/><path d="M20 22q5 -5 9 -2M40 18q5 -4 9 -2M62 18q5 -4 9 -2" stroke-width="1.8" opacity=".7"'+cp+'/>'+(cut?cut+' stroke-width="2.2"/>':'')+'</g>';
    return '<svg class="lf" viewBox="-4 -2 108 66" role="img" aria-label="Pan francés visto desde arriba">'+clip+F(fl)+L(ln)+'</svg>';
  }

  /* ---------- pan francés, masa, miñón ---------- */
  function bag(rem){
    var xr=24+194*rem,m=(24+xr)/2,m2=(xr+214)/2;
    var body='M24 10Q'+f1(m)+' 3 '+f1(xr)+' 9V35Q'+f1(m)+' 42 24 34Q6 24 24 10Z';
    var fill='<path d="'+body+'" fill="'+CRUST+'"/><ellipse cx="'+f1(xr)+'" cy="22" rx="5" ry="13" fill="'+CRUMB+'"/><path d="M'+f1(xr-30)+' 12Q'+f1(xr-18)+' 8 '+f1(xr-6)+' 11" stroke="'+CRUMB+'" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>';
    var line='<path d="'+body+'" stroke-width="2.6"/><ellipse cx="'+f1(xr)+'" cy="22" rx="5" ry="13" stroke-width="2.2"/><path d="M'+f1(xr)+' 9Q'+f1(m2)+' 3 214 10Q232 22 214 34Q'+f1(m2)+' 41 '+f1(xr)+' 35" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5" opacity=".55"/>';
    for(var x=42;x<xr-16;x+=24)line+='<path d="M'+(x-7)+' 24Q'+x+' 10 '+(x+7)+' 18" stroke-width="2"/><path d="M'+(x-3)+' 27Q'+(x+2)+' 20 '+(x+6)+' 24" stroke-width="1.4" opacity=".7"/>';
    return '<svg class="bg" viewBox="0 0 240 44" role="img" aria-label="Pan francés cortado">'+F(fill)+L(line)+'</svg>';
  }
  function dough(p){
    var cy=54-84*p;
    var fill='<path d="M30 54Q80 '+cy+' 130 54Z" fill="'+CRUMB+'"/><circle cx="66" cy="38" r="2.6" fill="'+CRUST+'" opacity=".6"/><circle cx="92" cy="30" r="3.2" fill="'+CRUST+'" opacity=".6"/><circle cx="108" cy="42" r="2" fill="'+CRUST+'" opacity=".6"/><path d="M14 52Q80 60 146 52Q142 88 80 88Q18 88 14 52Z" fill="'+CRUST+'"/>';
    var line='<path d="M30 54Q80 '+cy+' 130 54Z" stroke-width="2.4"/><path d="M24 54Q80 -30 136 54" stroke="currentColor" stroke-width="1.8" stroke-dasharray="5 5" opacity=".55"/><path d="M14 52Q80 60 146 52Q142 88 80 88Q18 88 14 52Z" stroke-width="2.6"/><path d="M40 66Q80 76 120 66" stroke-width="1.6" opacity=".55"/>';
    return '<svg class="dg" viewBox="0 0 160 92" role="img" aria-label="Masa leudando">'+F(fill)+L(line)+'</svg>';
  }
  var MIN="M8 30C6 18 20 10 32 10C46 10 58 18 56 30C54 42 42 47 32 47C20 47 10 42 8 30Z";
  function miniRoll(){
    return '<svg viewBox="0 0 64 54" aria-hidden="true">'+F('<path d="'+MIN+'" fill="'+CRUST+'"/>')+L('<path d="'+MIN+'" stroke-width="3"/><path d="M18 22Q26 16 30 26M30 20Q38 14 42 24M42 24Q47 20 50 28" stroke-width="2.4"/>')+'</svg>';
  }
  function ico(p){return '<svg viewBox="0 0 24 24" style="width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round">'+p+'</svg>';}
  var GREEN="#79A874",BLUE="#6FA3B8",YEL="#F2D45C";
  function cd(fill,line){return '<svg viewBox="0 0 40 36" aria-hidden="true">'+F(fill)+L(line)+'</svg>';}
  var CAT=[
    ["Súper",cd(
      '<circle cx="16" cy="8" r="4.2" fill="'+RED+'"/><rect x="23" y="2" width="6" height="10" rx="2" fill="'+GREEN+'"/><path d="M7 10H35L31 24H11Z" fill="'+CRUMB+'"/><circle cx="14" cy="30" r="3" fill="'+CRUST+'"/><circle cx="29" cy="30" r="3" fill="'+CRUST+'"/>',
      '<circle cx="16" cy="8" r="4.2" stroke-width="2"/><rect x="23" y="2" width="6" height="10" rx="2" stroke-width="2"/><path d="M7 10H35L31 24H11Z" stroke-width="2.4"/><path d="M2 4H6L11 24H31" stroke-width="2.4"/><circle cx="14" cy="30" r="3" stroke-width="2"/><circle cx="29" cy="30" r="3" stroke-width="2"/><path d="M12 15H33M13 19H31" stroke-width="1.4" opacity=".6"/>')],
    ["Auto",cd(
      '<path d="M3 25V19Q3 15 8 14L13 7H27L32 14Q37 15 37 19V25Z" fill="'+BLUE+'"/><path d="M14 9H19V14H11ZM22 9H26L30 14H22Z" fill="'+CRUMB+'"/><circle cx="11" cy="26" r="5" fill="#3A2A22"/><circle cx="29" cy="26" r="5" fill="#3A2A22"/>',
      '<path d="M3 25V19Q3 15 8 14L13 7H27L32 14Q37 15 37 19V25Z" stroke-width="2.4"/><path d="M14 9H19V14H11ZM22 9H26L30 14H22Z" stroke-width="1.8"/><circle cx="11" cy="26" r="5" stroke-width="2.4"/><circle cx="29" cy="26" r="5" stroke-width="2.4"/><circle cx="11" cy="26" r="1.6" stroke-width="1.6"/><circle cx="29" cy="26" r="1.6" stroke-width="1.6"/><path d="M4 19H7" stroke-width="2.4"/>')],
    ["Salidas",cd(
      '<path d="M8 9H27V28Q27 32 24 32H11Q8 32 8 28Z" fill="'+YEL+'"/><circle cx="12" cy="8" r="4" fill="'+CRUMB+'"/><circle cx="18" cy="6" r="4.6" fill="'+CRUMB+'"/><circle cx="24" cy="8" r="4" fill="'+CRUMB+'"/>',
      '<path d="M8 9H27V28Q27 32 24 32H11Q8 32 8 28Z" stroke-width="2.4"/><path d="M8.5 9Q8 4 12 4.6M13.5 4Q18 0 22.6 4Q27 4 27 9" stroke-width="2"/><path d="M27 13H32Q36 13 36 17V22Q36 26 32 26H27" stroke-width="2.4"/><path d="M14 18h0M19 24h0M22 16h0" stroke-width="2.4" opacity=".7"/>')],
    ["Casa",cd(
      '<path d="M8 17H32V32H8Z" fill="'+CRUMB+'"/><path d="M3 18L20 4L37 18Z" fill="'+RED+'"/><rect x="17" y="22" width="7" height="10" fill="'+CRUST+'"/><rect x="10.5" y="21" width="5" height="5" fill="'+BLUE+'"/>',
      '<path d="M8 17V32H32V17" stroke-width="2.4"/><path d="M3 18L20 4L37 18Z" stroke-width="2.4"/><rect x="17" y="22" width="7" height="10" stroke-width="2"/><rect x="10.5" y="21" width="5" height="5" stroke-width="1.8"/><path d="M26 22h4M26 26h4" stroke-width="1.6" opacity=".7"/>')],
    ["Salud",cd(
      '<path d="M20 32S4 23 4 13a7.5 7.5 0 0 1 16-3 7.5 7.5 0 0 1 16 3c0 10-16 19-16 19Z" fill="'+RED+'"/>',
      '<path d="M20 32S4 23 4 13a7.5 7.5 0 0 1 16-3 7.5 7.5 0 0 1 16 3c0 10-16 19-16 19Z" stroke-width="2.4"/><path d="M20 13V23M15 18H25" stroke-width="3"/>')],
    ["Ropa",cd(
      '<path d="M13 3L2 10L8 17L12 15V32H28V15L32 17L38 10L27 3Q20 10 13 3Z" fill="'+BLUE+'"/>',
      '<path d="M13 3L2 10L8 17L12 15V32H28V15L32 17L38 10L27 3Q20 10 13 3Z" stroke-width="2.4"/><path d="M16 22Q20 25 24 22" stroke-width="1.6" opacity=".6"/>')],
    ["Regalos",cd(
      '<rect x="7" y="17" width="26" height="15" fill="'+RED+'"/><rect x="4" y="11" width="32" height="7" fill="'+CRUST+'"/><rect x="18" y="11" width="4" height="21" fill="'+YEL+'"/><path d="M20 11C14 2 8 7 14 10ZM20 11C26 2 32 7 26 10Z" fill="'+YEL+'"/>',
      '<rect x="7" y="17" width="26" height="15" stroke-width="2.4"/><rect x="4" y="11" width="32" height="7" stroke-width="2.4"/><path d="M18 11V32M22 11V32" stroke-width="1.8"/><path d="M20 11C14 2 8 7 14 10ZM20 11C26 2 32 7 26 10Z" stroke-width="2"/>')],
    ["Otros",cd(
      '<path d="M7 12H33L31 32H9Z" fill="'+GREEN+'"/>',
      '<path d="M7 12H33L31 32H9Z" stroke-width="2.4"/><path d="M14 12V9a6 6 0 0 1 12 0v3" stroke-width="2.4"/><path d="M15 21q5 4 10 0" stroke-width="1.8" opacity=".7"/>')]
  ];
  function hbar(p){
    var w=Math.max(236*p,8),a=6+w,b=10+w;
    return '<svg class="hb" viewBox="0 0 240 20" aria-hidden="true">'+F('<path d="M6 4H234Q238 4 238 10T234 16H6Q2 16 2 10T6 4Z" style="fill:var(--track)"/><path d="M6 4H'+f1(a)+'Q'+f1(b)+' 4 '+f1(b)+' 10T'+f1(a)+' 16H6Q2 16 2 10T6 4Z" fill="'+CRUST+'"/>')+L('<path d="M6 4H234Q238 4 238 10T234 16H6Q2 16 2 10T6 4Z" stroke-width="2.2"/>')+'</svg>';
  }
  function navIco(n){
    var f,l;
    if(n==="inicio"){f='<path d="M6 14H22V24H6Z" fill="'+CRUMB+'"/><path d="M3 15L14 5L25 15Z" fill="'+RED+'"/><rect x="12" y="17" width="5" height="7" fill="'+CRUST+'"/>';l='<path d="M6 14V24H22V14" stroke-width="2"/><path d="M3 15L14 5L25 15Z" stroke-width="2"/><rect x="12" y="17" width="5" height="7" stroke-width="1.6"/>';}
    else if(n==="grupos"){f='<path d="M2 24Q2 15 9 15Q16 15 16 24Z" fill="'+BLUE+'"/><circle cx="9" cy="9" r="4.2" fill="'+YEL+'"/><path d="M15 24Q15 17 20 17Q26 17 26 24Z" fill="'+GREEN+'"/><circle cx="20" cy="11" r="3.2" fill="'+CRUMB+'"/>';l='<path d="M2 24Q2 15 9 15Q16 15 16 24Z" stroke-width="2"/><circle cx="9" cy="9" r="4.2" stroke-width="2"/><path d="M15 24Q15 17 20 17Q26 17 26 24Z" stroke-width="1.8"/><circle cx="20" cy="11" r="3.2" stroke-width="1.8"/>';}
    else if(n==="plan"){f='<rect x="5" y="4" width="18" height="21" rx="3" fill="'+CRUMB+'"/><path d="M9 11H19M9 16H19M9 21H15" stroke="'+GREEN+'" stroke-width="2.6" fill="none"/>';l='<rect x="5" y="4" width="18" height="21" rx="3" stroke-width="2"/><path d="M9 11H19M9 16H19M9 21H15" stroke-width="1.4" opacity=".6"/>';}
    else{f='<circle cx="6" cy="14" r="3.2" fill="'+CRUST+'"/><circle cx="14" cy="14" r="3.2" fill="'+CRUST+'"/><circle cx="22" cy="14" r="3.2" fill="'+CRUST+'"/>';l='<circle cx="6" cy="14" r="3.2" stroke-width="2"/><circle cx="14" cy="14" r="3.2" stroke-width="2"/><circle cx="22" cy="14" r="3.2" stroke-width="2"/>';}
    return '<svg viewBox="0 0 28 28" aria-hidden="true">'+F(f)+L(l)+'</svg>';
  }

  /* ---------- escalera de racha: panadería argentina ---------- */
  function lattice(cx,cy,r){
    var fill="",line="",ds=[-5.5,5.5];
    [[0,1,1,0],[1,0,0,1]].forEach(function(v){
      ds.forEach(function(d){
        var h=Math.sqrt(r*r-d*d),px=cx+v[2]*d,py=cy+v[3]*d;
        fill+='<path d="M'+f1(px-v[0]*h)+' '+f1(py-v[1]*h)+'L'+f1(px+v[0]*h)+' '+f1(py+v[1]*h)+'" stroke="'+CRUST+'" stroke-width="4.4" stroke-linecap="butt" fill="none"/>';
        [-2.2,2.2].forEach(function(o){
          var dd=d+o,hh=Math.sqrt(Math.max(r*r-dd*dd,0)),qx=cx+v[2]*dd,qy=cy+v[3]*dd;
          line+='<path d="M'+f1(qx-v[0]*hh)+' '+f1(qy-v[1]*hh)+'L'+f1(qx+v[0]*hh)+' '+f1(qy+v[1]*hh)+'" stroke-width="1.3" opacity=".85"/>';
        });
      });
    });
    return [fill,line];
  }  function scallop(cx,cy,r,n){
    var d="",i,a,b,p,q;
    for(i=0;i<n;i++){a=i/n*2*Math.PI;b=(i+1)/n*2*Math.PI;p=[cx+r*Math.cos(a),cy+r*Math.sin(a)];q=[cx+r*Math.cos(b),cy+r*Math.sin(b)];
      if(i===0)d+='M'+f1(p[0])+' '+f1(p[1]);
      d+='A'+f1(r*.2)+' '+f1(r*.2)+' 0 0 1 '+f1(q[0])+' '+f1(q[1]);}
    return d+'Z';
  }
  var roll=function(cx,cy,rx,ry){return 'M'+(cx-rx)+' '+cy+'a'+rx+' '+ry+' 0 1 0 '+(2*rx)+' 0a'+rx+' '+ry+' 0 1 0 '+(-2*rx)+' 0Z';};
  var STAGES=[
    [7,"Miñón",function(){return ['<path d="'+MIN+'" fill="'+CRUST+'"/><path d="M16 18Q32 12 48 18" stroke="'+CRUMB+'" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>','<path d="'+MIN+'" stroke-width="3"/><path d="M18 24Q26 17 30 28M30 21Q38 14 42 26M41 27Q46 22 49 30" stroke-width="2.4"/>'];}],
    [14,"Cañoncito",function(){var d="M5 35Q8 28 30 22Q44 18 52 17Q60 28 52 41Q30 39 8 38Q4 37 5 35Z";return ['<path d="'+d+'" fill="'+CRUST+'"/><ellipse cx="53" cy="29" rx="5.5" ry="12" fill="#8B4A17"/>','<path d="'+d+'" stroke-width="2.6"/><ellipse cx="53" cy="29" rx="5.5" ry="12" stroke-width="2"/><path d="M52 24q3 3 0 6t0 5" stroke-width="1.6"/><path d="M14 33q4 3 2 8M23 29q4 4 2 10M32 26q4 5 2 12M41 22q4 6 2 14" stroke-width="2.2"/>'];}],
    [21,"Medialunas",function(){
      var f="",l="",S=[[190,5,3.6],[350,5,3.6],[214,4.4,6.4],[326,4.4,6.4],[242,5.6,8.4],[298,5.6,8.4],[270,7.6,10]];
      S.forEach(function(s){var r=s[0]*Math.PI/180,cx=f1(32+21*Math.cos(r)),cy=f1(40+21*Math.sin(r)),t=' transform="rotate('+(s[0]+90)+' '+cx+' '+cy+')"';
        f+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+s[1]+'" ry="'+s[2]+'"'+t+' fill="'+CRUST+'"/>';
        l+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+s[1]+'" ry="'+s[2]+'"'+t+' stroke-width="2"/>';});
      return [f,l];}],
    [30,"Pastafrola",function(){var l=lattice(32,28,15);return ['<path d="'+scallop(32,28,22,16)+'" fill="'+CRUST+'"/><path d="M17 28a15 15 0 1 0 30 0a15 15 0 1 0 -30 0Z" fill="#B8431F"/>'+l[0],'<path d="'+scallop(32,28,22,16)+'" stroke-width="2.4"/><path d="M17 28a15 15 0 1 0 30 0a15 15 0 1 0 -30 0Z" stroke-width="1.8"/>'+l[1]];}],
    [60,"Pan dulce",function(){return ['<path d="M11 44V28Q11 5 32 5Q53 5 53 28V44Z" fill="'+CRUST+'"/><path d="M8 38Q32 43 56 38V50Q32 55 8 50Z" fill="#E0C58C"/><g fill="'+RED+'"><circle cx="24" cy="19" r="2.8"/><circle cx="39" cy="15" r="2.8"/><circle cx="32" cy="29" r="2.8"/></g><g fill="'+CRUMB+'"><circle cx="45" cy="27" r="2.3"/><circle cx="20" cy="31" r="2.3"/></g>',
      '<path d="M11 44V28Q11 5 32 5Q53 5 53 28V44Z" stroke-width="2.6"/><path d="M8 38Q32 43 56 38V50Q32 55 8 50Z" stroke-width="2.6"/><path d="M16 41v11M24 42v11M32 43v11M40 42v11M48 41v11" stroke-width="1.4" opacity=".6"/><path d="M20 12Q26 22 20 34M44 12Q38 22 44 34" stroke-width="1.6" opacity=".55"/>'];}]
  ];
  var ING=[
    function(){return ['<path d="M7 9h14l2 15H5z" fill="'+CRUMB+'"/>','<path d="M7 9h14l2 15H5zM9 9q5 -5 10 0" stroke-width="2"/>'];},
    function(){return ['<path d="M14 4q8 10 0 18q-8 -8 0 -18z" fill="#BFE3F0"/>','<path d="M14 4q8 10 0 18q-8 -8 0 -18z" stroke-width="2"/>'];},
    function(){return ['<rect x="9" y="10" width="10" height="14" rx="3" fill="#F4E6C8"/>','<rect x="9" y="10" width="10" height="14" rx="3" stroke-width="2"/><path d="M10 6h8v4h-8zM13 6v4M16 6v4" stroke-width="1.6"/>'];},
    function(){return ['<circle cx="14" cy="14" r="9" fill="#E8D3A5"/>','<circle cx="14" cy="14" r="9" stroke-width="2"/><path d="M10 12h0M17 11h0M13 17h0M18 17h0" stroke-width="2.4"/>'];},
    function(){return ['<ellipse cx="14" cy="15" rx="8" ry="10" fill="#F4E6C8"/>','<ellipse cx="14" cy="15" rx="8" ry="10" stroke-width="2"/>'];},
    function(){return ['<rect x="5" y="10" width="18" height="11" rx="2" fill="#F6E27A"/>','<rect x="5" y="10" width="18" height="11" rx="2" stroke-width="2"/><path d="M5 14h18" stroke-width="1.4" opacity=".6"/>'];},
    function(){return ['<rect x="8" y="8" width="12" height="12" rx="2" fill="#F4E6C8"/>','<rect x="8" y="8" width="12" height="12" rx="2" stroke-width="2"/><path d="M11 12h6" stroke-width="1.4" opacity=".6"/>'];}
  ];
  function stSvg(r,vb,on){return '<svg viewBox="'+vb+'" aria-hidden="true"'+(on?'':' style="opacity:.4"')+'>'+F(r[0])+L(r[1])+'</svg>';}
  var EYE='<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  var EYEOFF='<path d="M3 3l18 18"/><path d="M10.6 6.2A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.1 7.7C3.7 9.5 2 12 2 12s4 7 10 7c1.6 0 3-.4 4.3-1"/>';
  /* ---------- íconos nuevos: categorías, ingresos y metas ---------- */
  var IC={};
  IC.carne=cd('<path d="M5 20Q5 7 20 6Q35 5 36 19Q37 31 22 31Q6 32 5 20Z" fill="#D9645A"/><path d="M8 21Q9 10 20 9Q32 8 33 19" fill="none" stroke="#F4E6C8" stroke-width="3" opacity=".8"/><circle cx="26" cy="19" r="4.2" fill="#F4E6C8"/>',
    '<path d="M5 20Q5 7 20 6Q35 5 36 19Q37 31 22 31Q6 32 5 20Z" stroke-width="2.4"/><circle cx="26" cy="19" r="4.2" stroke-width="2"/><path d="M12 22q4 3 8 0M14 15q4 -2 7 0" stroke-width="1.6" opacity=".6"/>');
  IC.burger=cd('<path d="M7 26H33Q33 33 27 33H13Q7 33 7 26Z" fill="'+CRUST+'"/><rect x="5" y="20" width="30" height="6" rx="3" fill="#7A4417"/><path d="M4 18Q8 14 12 18T20 18T28 18T36 18V20H4Z" fill="'+GREEN+'"/><path d="M6 16Q6 4 20 4Q34 4 34 16Z" fill="'+CRUST+'"/><g fill="'+CRUMB+'"><circle cx="14" cy="10" r="1.3"/><circle cx="22" cy="8" r="1.3"/><circle cx="27" cy="12" r="1.3"/></g>',
    '<path d="M7 26H33Q33 33 27 33H13Q7 33 7 26Z" stroke-width="2.2"/><rect x="5" y="20" width="30" height="6" rx="3" stroke-width="2.2"/><path d="M4 18Q8 14 12 18T20 18T28 18T36 18" stroke-width="2"/><path d="M6 16Q6 4 20 4Q34 4 34 16Z" stroke-width="2.4"/>');
  IC.bus=cd('<rect x="3" y="7" width="34" height="21" rx="5" fill="'+YEL+'"/><rect x="6" y="10" width="8" height="7" rx="1.5" fill="'+BLUE+'"/><rect x="16" y="10" width="8" height="7" rx="1.5" fill="'+BLUE+'"/><rect x="26" y="10" width="8" height="7" rx="1.5" fill="'+BLUE+'"/><rect x="3" y="21" width="34" height="3" fill="'+RED+'"/><circle cx="12" cy="29" r="4.2" fill="#3A2A22"/><circle cx="29" cy="29" r="4.2" fill="#3A2A22"/>',
    '<rect x="3" y="7" width="34" height="21" rx="5" stroke-width="2.4"/><rect x="6" y="10" width="8" height="7" rx="1.5" stroke-width="1.6"/><rect x="16" y="10" width="8" height="7" rx="1.5" stroke-width="1.6"/><rect x="26" y="10" width="8" height="7" rx="1.5" stroke-width="1.6"/><circle cx="12" cy="29" r="4.2" stroke-width="2.2"/><circle cx="29" cy="29" r="4.2" stroke-width="2.2"/>');
  IC.gym=cd('<rect x="2" y="12" width="6" height="14" rx="2" fill="'+BLUE+'"/><rect x="7" y="8" width="6" height="22" rx="2" fill="'+BLUE+'"/><rect x="27" y="8" width="6" height="22" rx="2" fill="'+BLUE+'"/><rect x="32" y="12" width="6" height="14" rx="2" fill="'+BLUE+'"/><rect x="13" y="17" width="14" height="4" fill="#B9B3A8"/>',
    '<rect x="2" y="12" width="6" height="14" rx="2" stroke-width="2"/><rect x="7" y="8" width="6" height="22" rx="2" stroke-width="2"/><rect x="27" y="8" width="6" height="22" rx="2" stroke-width="2"/><rect x="32" y="12" width="6" height="14" rx="2" stroke-width="2"/><rect x="13" y="17" width="14" height="4" stroke-width="1.8"/>');
  IC.subs=cd('<circle cx="20" cy="18" r="12" fill="#E88F8F"/><path d="M16 11L28 18L16 25Z" fill="#F4E6C8"/>',
    '<circle cx="20" cy="18" r="12" stroke-width="2.4"/><path d="M16 11L28 18L16 25Z" stroke-width="2"/><path d="M5 12A16 16 0 0 1 30 4M35 24A16 16 0 0 1 10 32" stroke-width="2.2"/><path d="M30 4l-1 -4M30 4l5 1M10 32l1 4M10 32l-5 -1" stroke-width="2"/>');
  IC.guitar=cd('<g transform="translate(4 2) rotate(30 18 18)"><rect x="15.5" y="-4" width="4" height="20" fill="#7A4417"/><rect x="14" y="-8" width="7" height="6" rx="1.5" fill="#7A4417"/><path d="M8 22a7 7 0 0 1 4 -6a6 6 0 0 1 11 0a7 7 0 0 1 4 6a8 8 0 0 1 -9.5 9a8 8 0 0 1 -9.5 -9Z" fill="'+CRUST+'"/><circle cx="17.5" cy="23" r="3" fill="#3A2A22"/></g>',
    '<g transform="translate(4 2) rotate(30 18 18)"><rect x="15.5" y="-4" width="4" height="20" stroke-width="1.8"/><rect x="14" y="-8" width="7" height="6" rx="1.5" stroke-width="1.8"/><path d="M8 22a7 7 0 0 1 4 -6a6 6 0 0 1 11 0a7 7 0 0 1 4 6a8 8 0 0 1 -9.5 9a8 8 0 0 1 -9.5 -9Z" stroke-width="2.2"/><circle cx="17.5" cy="23" r="3" stroke-width="1.8"/></g>');
  IC.debt=cd('<path d="M8 4H29L33 8V32H8Z" fill="'+CRUMB+'"/><circle cx="24" cy="24" r="8" fill="'+RED+'"/><text x="24" y="28.5" text-anchor="middle" font-size="12" font-weight="800" fill="#F4E6C8" font-family="Bricolage Grotesque,sans-serif">!</text>',
    '<path d="M8 4H29L33 8V32H8Z" stroke-width="2.4"/><circle cx="24" cy="24" r="8" stroke-width="2"/><path d="M13 12H24M13 17H21" stroke-width="2" opacity=".7"/>');
  IC.edu=cd('<path d="M2 10V32Q12 29 20 33Q28 29 38 32V10Z" fill="'+BLUE+'"/><path d="M4 8Q12 5 20 9V31Q12 27 4 30Z" fill="'+CRUMB+'"/><path d="M36 8Q28 5 20 9V31Q28 27 36 30Z" fill="'+CRUMB+'"/>',
    '<path d="M4 8Q12 5 20 9V31Q12 27 4 30Z" stroke-width="2.2"/><path d="M36 8Q28 5 20 9V31Q28 27 36 30Z" stroke-width="2.2"/><path d="M8 14Q12 13 16 15M8 19Q12 18 16 20M24 15Q28 13 32 14M24 20Q28 18 32 19" stroke-width="1.5" opacity=".6"/>');
  IC.sueldo=cd('<rect x="9" y="3" width="22" height="14" rx="2" fill="'+GREEN+'"/><rect x="3" y="11" width="34" height="22" rx="3" fill="'+CRUMB+'"/>',
    '<rect x="9" y="3" width="22" height="14" rx="2" stroke-width="2"/><rect x="3" y="11" width="34" height="22" rx="3" stroke-width="2.4"/><path d="M3 13L20 25L37 13" stroke-width="2.2"/>');
  IC.extra=cd('<circle cx="20" cy="18" r="14" fill="'+YEL+'"/><path d="M22 5L12 20H19L17 31L28 15H21Z" fill="'+RED+'"/>',
    '<circle cx="20" cy="18" r="14" stroke-width="2.4"/><path d="M22 5L12 20H19L17 31L28 15H21Z" stroke-width="2"/>');
  IC.regalo2=CAT[6][1].replace('</svg>','<circle cx="33" cy="9" r="6" fill="#8DBB6A" stroke="#2A1608" stroke-width="2"/><path d="M33 6V12M30 9H36" stroke="#2A1608" stroke-width="2"/></svg>');
  IC.otrosin=cd('<path d="M4 22H36V30Q36 32 34 32H6Q4 32 4 30Z" fill="'+CRUMB+'"/><path d="M16 3H24V13H30L20 23L10 13H16Z" fill="'+GREEN+'"/>',
    '<path d="M4 22H36V30Q36 32 34 32H6Q4 32 4 30Z" stroke-width="2.4"/><path d="M16 3H24V13H30L20 23L10 13H16Z" stroke-width="2.2"/>');
  IC.target=cd('<circle cx="20" cy="18" r="14" fill="'+RED+'"/><circle cx="20" cy="18" r="9.5" fill="#F4E6C8"/><circle cx="20" cy="18" r="5" fill="'+RED+'"/>',
    '<circle cx="20" cy="18" r="14" stroke-width="2.4"/><circle cx="20" cy="18" r="9.5" stroke-width="1.8"/><circle cx="20" cy="18" r="5" stroke-width="1.8"/><path d="M20 18L35 3M30 3h5v5" stroke-width="2.6"/>');
  IC.plane=cd('<path d="M3 17L37 4L27 32L19 22Z" fill="'+BLUE+'"/><path d="M19 22L37 4L19 22L17 30Z" fill="#B9B3A8"/>',
    '<path d="M3 17L37 4L27 32L19 22Z" stroke-width="2.4"/><path d="M19 22L37 4" stroke-width="2"/><path d="M19 22L17 30" stroke-width="2"/>');
  IC.life=cd('<path fill-rule="evenodd" d="M20 4a14 14 0 1 0 .01 0ZM20 12a6 6 0 1 1 -.01 0Z" fill="'+RED+'"/><path d="M20 4A14 14 0 0 1 34 18H26A6 6 0 0 0 20 12Z" fill="#F4E6C8"/><path d="M20 32A14 14 0 0 1 6 18H14A6 6 0 0 0 20 24Z" fill="#F4E6C8"/>',
    '<circle cx="20" cy="18" r="14" stroke-width="2.4"/><circle cx="20" cy="18" r="6" stroke-width="2"/>');
  IC.laptop=cd('<rect x="8" y="6" width="24" height="16" rx="2" fill="'+BLUE+'"/><rect x="11" y="9" width="18" height="10" fill="'+CRUMB+'"/><path d="M3 24H37L34 30H6Z" fill="#B9B3A8"/>',
    '<rect x="8" y="6" width="24" height="16" rx="2" stroke-width="2.2"/><rect x="11" y="9" width="18" height="10" stroke-width="1.6"/><path d="M3 24H37L34 30H6Z" stroke-width="2.2"/>');
  // Íconos por id de categoría (ver src/logic/categorias.js). Las categorías nuevas usan el de Otros.
  var ICONOS={super:CAT[0][1],carne:IC.carne,comida:IC.burger,auto:CAT[1][1],transporte:IC.bus,gym:IC.gym,subs:IC.subs,hobbies:IC.guitar,salidas:CAT[2][1],ropa:CAT[5][1],salud:CAT[4][1],regalos:CAT[6][1],servicios:CAT[3][1],deudas:IC.debt,edu:IC.edu,otros:CAT[7][1],
    sueldo:IC.sueldo,extra:IC.extra,regalo_in:IC.regalo2,otros_in:IC.otrosin};
  function catIcon(id){return ICONOS[id]||CAT[7][1];}
  var METAS=[["meta","Meta",IC.target],["viaje","Viaje",IC.plane],["emergencia","Emergencia",IC.life],["casa","Casa",CAT[3][1]],["auto","Auto",CAT[1][1]],["compu","Compu",IC.laptop],["hobbies","Hobbies",IC.guitar],["regalo","Regalo",CAT[6][1]]];
  function metaIcon(id){for(var i=0;i<METAS.length;i++)if(METAS[i][0]===id)return METAS[i][2];return IC.target;}
  function stage(i,on){var s=STAGES[i];return stSvg(s[2](),"0 0 64 54",on!==false);}
  function ingredient(i,on){return stSvg(ING[i](),"0 0 28 28",on);}
  // Gastos por día del mes (centavos); el día marcado va en dorado.
  function dayBars(vals,marca){
    var max=Math.max.apply(null,vals.concat([1])),n=vals.length,w=240/n,f='',l='',i,x,h,y;
    for(i=0;i<n;i++){x=6+i*w;h=vals[i]?Math.max(vals[i]/max*52,3):1.5;y=62-h;
      f+='<rect x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(w*.68)+'" height="'+f1(h)+'" rx="1.6" fill="'+(i===marca?"#F4AE3D":CRUST)+'"/>';
      if(vals[i])l+='<rect x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(w*.68)+'" height="'+f1(h)+'" rx="1.6" stroke-width="1.3"/>';}
    l+='<path d="M3 63Q120 66 245 62" stroke-width="2"/>';
    return '<svg class="bg" viewBox="0 0 248 70" role="img" aria-label="Gastos por día">'+F(f)+L(l)+'</svg>';
  }
  return {miguita:slice,luna:luna,factura:friend,pan:loaf,bolsa:bag,masa:dough,minion:miniRoll,
    navIcon:navIco,icono:ico,barra:hbar,catIcon:catIcon,metaIcon:metaIcon,ICONOS_META:METAS.map(function(m){return {id:m[0],nombre:m[1]};}),premio:stage,ingrediente:ingredient,barrasDias:dayBars,salvavidas:IC.life,
    PREMIOS:STAGES.map(function(s){return {dias:s[0],nombre:s[1]};}),OJO:EYE,OJO_TAPADO:EYEOFF};

})();
