const sharp = require('sharp');
const fs = require('node:fs/promises');
const source = process.argv[2];
const out = 'public/obj/practice-collection-v2';
// Keep the main alpha-connected object, removing generation speckles outside it.
async function clean(rect, name, size = 448) {
  const {data, info} = await sharp(source).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info, seen=new Uint8Array(w*h); let largest=[];
  for(let p=0;p<w*h;p++) {
    if(seen[p]||data[p*4+3]<40)continue;
    const component=[p];seen[p]=1;
    for(let j=0;j<component.length;j++) {
      const q=component[j],x=q%w,y=Math.floor(q/w);
      for(const n of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])
        if(n>=0&&!seen[n]&&data[n*4+3]>=40){seen[n]=1;component.push(n);}
    }
    if(component.length>largest.length)largest=component;
  }
  const keep=new Uint8Array(w*h);largest.forEach(p=>keep[p]=1);
  for(let p=0;p<w*h;p++)if(!keep[p])data[p*4+3]=0;
  const png=await sharp(data,{raw:info}).png().toBuffer();
  await sharp(png).trim({threshold:20}).resize(size,size,{fit:'contain',background:'#00000000'})
    .extend({top:(512-size)/2,bottom:(512-size)/2,left:(512-size)/2,right:(512-size)/2,background:'#00000000'})
    .webp({quality:92}).toFile(`${out}/${name}.webp`);
}
(async()=>{
  await fs.mkdir(out,{recursive:true});
  for(const [i,name] of ['blackgold','silverom','whitejade','olivejade','flowerwood','flower-master'].entries())
    await clean({left:(i%4)*443,top:Math.floor(i/4)*443,width:443,height:443},name);
  await clean({left:1465,top:470,width:175,height:170},'celadon');
  await clean({left:1005,top:640,width:200,height:230},'green-charm');
  await clean({left:1435,top:640,width:220,height:230},'white-charm');
})();
