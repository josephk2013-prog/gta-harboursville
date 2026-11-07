import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function canvasMap(draw, repeatX=1, repeatY=1) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  draw(ctx,canvas.width,canvas.height);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(repeatX,repeatY);
  texture.anisotropy=8;
  return texture;
}

export function createHarboursvilleTextures() {
  const asphalt=canvasMap((c,w,h)=>{
    c.fillStyle='#34383a';c.fillRect(0,0,w,h);
    for(let i=0;i<18000;i++){
      const v=35+Math.random()*55;
      c.fillStyle='rgba('+v+','+v+','+v+',0.22)';
      const s=Math.random()*2.2;c.fillRect(Math.random()*w,Math.random()*h,s,s);
    }
    for(let i=0;i<90;i++){
      c.strokeStyle='rgba(15,18,20,.12)';c.lineWidth=1+Math.random()*2;
      c.beginPath();const x=Math.random()*w,y=Math.random()*h;c.moveTo(x,y);c.lineTo(x+Math.random()*28,y+Math.random()*3);c.stroke();
    }
  },2,34);
  const concrete=canvasMap((c,w,h)=>{
    c.fillStyle='#aaa99f';c.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){
      const v=Math.random()>.5?255:35;
      c.fillStyle='rgba('+v+','+v+','+v+',.10)';
      c.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3);
    }
    c.strokeStyle='rgba(70,70,65,.12)';c.lineWidth=2;
    for(let y=0;y<h;y+=128){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  },3,3);
  const facade=canvasMap((c,w,h)=>{
    c.fillStyle='#8b8981';c.fillRect(0,0,w,h);
    const cols=8,rows=14,cw=w/cols,ch=h/rows;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      c.fillStyle=['#263b45','#344c56','#52616a','#28343a'][Math.floor(Math.random()*4)];
      c.fillRect(x*cw+5,y*ch+5,cw-10,ch-10);
      if(Math.random()>.76){c.fillStyle='#d8bd83';c.fillRect(x*cw+7,y*ch+7,cw-14,ch-14);}
    }
    c.fillStyle='rgba(225,220,205,.45)';c.fillRect(0,0,w,5);
  },1,2);
  const grass=canvasMap((c,w,h)=>{
    c.fillStyle='#64745e';c.fillRect(0,0,w,h);
    for(let i=0;i<14000;i++){
      const g=75+Math.random()*65;
      c.fillStyle='rgba(40,'+g+',45,.24)';
      c.fillRect(Math.random()*w,Math.random()*h,1,2+Math.random()*5);
    }
  },12,12);
  return {asphalt,concrete,facade,grass};
}
