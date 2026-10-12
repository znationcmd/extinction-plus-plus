/* CMDPad++ — basic non-destructive image studio, entirely client-side. */
(function(){
'use strict';
const d=document,toolbar=d.querySelector('.toolbar');if(!toolbar)return;
const btn=d.createElement('button');btn.type='button';btn.className='toolbtn';btn.textContent='🖼 Retouche';btn.title='Images JPEG, PNG, WebP, BMP, GIF statique si supporté; original conservé';toolbar.insertBefore(btn,toolbar.querySelector('.actions'));
let dialog,sourceCanvas,undoCanvas,canvas,ctx,filename='image.png';
function copyCanvas(s){const copy=d.createElement('canvas');copy.width=s.width;copy.height=s.height;copy.getContext('2d').drawImage(s,0,0);return copy}
function message(text){const el=d.getElementById('cmdImageStatus');if(el)el.textContent=text}
function slider(parent,label,min,max,initial){const row=d.createElement('label');row.textContent=label+' ';row.style.cssText='display:inline-flex;gap:6px;align-items:center;margin:4px;font-size:12px';
const slider=d.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.value=initial;
const output=d.createElement('span');output.textContent=String(initial);slider.oninput=()=>{output.textContent=slider.value;applyPreviewFilter()};row.append(slider,output);parent.append(row);return slider}
let brightness,contrast,saturation,gray,editorWrap;
function filterValue(){return 'brightness('+brightness.value+'%) contrast('+contrast.value+'%) saturate('+saturation.value+'%) grayscale('+gray.value+'%)'}
function applyPreviewFilter(){if(canvas)canvas.style.filter=filterValue()}
function resetFilters(){brightness.value=100;contrast.value=100;saturation.value=100;gray.value=0;for(const slider of [brightness,contrast,saturation,gray])slider.oninput()}
function updateSize(){message('Image : '+sourceCanvas.width+' × '+sourceCanvas.height+' pixels (original non modifié)')}
function operation(fn){undoCanvas=copyCanvas(sourceCanvas);try{sourceCanvas=fn(sourceCanvas);canvas.width=sourceCanvas.width;canvas.height=sourceCanvas.height;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(sourceCanvas,0,0);updateSize()}catch(e){sourceCanvas=undoCanvas;message('Opération refusée : '+e.message)}}
function rotate(cw){operation(src=>{const out=d.createElement('canvas');out.width=src.height;out.height=src.width;const g=out.getContext('2d');g.translate(cw?out.width:0,cw?0:out.height);g.rotate(cw?Math.PI/2:-Math.PI/2);g.drawImage(src,0,0);return out})}
function flip(vertical){operation(src=>{const out=copyCanvas(src),g=out.getContext('2d');g.clearRect(0,0,out.width,out.height);g.translate(vertical?0:out.width,vertical?out.height:0);g.scale(vertical?1:-1,vertical?-1:1);g.drawImage(src,0,0);return out})}
function crop(){const values=['x','y','w','h'].map(k=>Number(d.getElementById('cmdCrop'+k).value));let [x,y,w,h]=values;if(!Number.isFinite(x+y+w+h)||x<0||y<0||w<=0||h<=0||x+w>sourceCanvas.width||y+h>sourceCanvas.height){message('Zone hors de l’image');return}
operation(src=>{const out=d.createElement('canvas');out.width=w;out.height=h;out.getContext('2d').drawImage(src,x,y,w,h,0,0,w,h);return out})}
function resize(){const w=Number(d.getElementById('cmdResizeW').value),h=Number(d.getElementById('cmdResizeH').value);if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>25000000){message('Dimensions invalides ou plus de 25 mégapixels');return}
operation(src=>{const out=d.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(src,0,0,w,h);return out})}
async function exportImage(mime){
const out=d.createElement('canvas');out.width=sourceCanvas.width;out.height=sourceCanvas.height;const g=out.getContext('2d');g.filter=filterValue();
if(mime==='image/jpeg'){g.fillStyle='#ffffff';g.fillRect(0,0,out.width,out.height)}
g.drawImage(sourceCanvas,0,0);
const blob=await new Promise(resolve=>out.toBlob(resolve,mime,.93));if(!blob){message('Export non pris en charge par ce navigateur');return}
const url=URL.createObjectURL(blob),a=d.createElement('a'),ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';a.href=url;a.download=filename.replace(/\.[^.]+$/,'')+'-retouche.'+ext;d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);message('Image exportée : '+a.download+' — original conservé')
}
function control(parent,label,cb){const button=d.createElement('button');button.type='button';button.textContent=label;button.style.cssText='padding:7px;border:1px solid #aaa;border-radius:4px;background:#f3f7ff;cursor:pointer;margin:3px';button.onclick=cb;parent.append(button)}
function numeric(parent,id,label,value){const item=d.createElement('label');item.textContent=label+' ';item.style.margin='4px';const field=d.createElement('input');field.id=id;field.type='number';field.min='0';field.value=value;field.style.cssText='width:78px;padding:4px';item.append(field);parent.append(item)}
async function loadImage(file){
if(!file||file.size>30*1024*1024){message('Fichier absent ou supérieur à 30 Mo');return}
try{let bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>25000000){bitmap.close();throw Error('Image supérieure à 25 mégapixels')}
filename=file.name;sourceCanvas=d.createElement('canvas');sourceCanvas.width=bitmap.width;sourceCanvas.height=bitmap.height;sourceCanvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
canvas.width=sourceCanvas.width;canvas.height=sourceCanvas.height;ctx.drawImage(sourceCanvas,0,0);
undoCanvas=null;resetFilters();editorWrap.hidden=false;d.getElementById('cmdResizeW').value=sourceCanvas.width;d.getElementById('cmdResizeH').value=sourceCanvas.height;d.getElementById('cmdCroph').value=sourceCanvas.height;d.getElementById('cmdCropw').value=sourceCanvas.width;
updateSize()}catch(e){message('Image non décodable par ce navigateur : '+e.message)}
}
btn.onclick=()=>{
if(dialog){dialog.showModal();return}
dialog=d.createElement('dialog');dialog.style.cssText='width:min(1040px,96vw);max-height:90vh;overflow:auto;padding:12px;background:white;color:#1b2a3c;border:1px solid #aaa;border-radius:8px';d.body.append(dialog);
const title=d.createElement('h3');title.textContent='CMDPad++ — Retouche photo';dialog.append(title);
const note=d.createElement('p');note.textContent='Opérations locales : recadrer, pivoter, retourner, luminosité, contraste, saturation, noir et blanc. Export PNG/JPEG/WebP; pas de support PSD/RAW natif.';dialog.append(note);
const row=d.createElement('div');dialog.append(row);
control(row,'Ouvrir image...',()=>{const f=d.createElement('input');f.type='file';f.accept='image/*,.bmp,.webp';f.onchange=()=>loadImage(f.files?.[0]);f.click()});
control(row,'Fermer',()=>dialog.close());
const status=d.createElement('p');status.id='cmdImageStatus';dialog.append(status);
editorWrap=d.createElement('div');editorWrap.hidden=true;dialog.append(editorWrap);
const move=d.createElement('div');editorWrap.append(move);
control(move,'↶ Rotation gauche',()=>rotate(false));control(move,'↷ Rotation droite',()=>rotate(true));control(move,'↔ Miroir',()=>flip(false));control(move,'↕ Vertical',()=>flip(true));
control(move,'Annuler la dernière transformation',()=>{if(!undoCanvas)return;const previous=sourceCanvas;sourceCanvas=undoCanvas;undoCanvas=previous;canvas.width=sourceCanvas.width;canvas.height=sourceCanvas.height;ctx.drawImage(sourceCanvas,0,0);updateSize()});
const filters=d.createElement('div');editorWrap.append(filters);
brightness=slider(filters,'Luminosité',0,200,100);contrast=slider(filters,'Contraste',0,200,100);saturation=slider(filters,'Saturation',0,200,100);gray=slider(filters,'Noir et blanc',0,100,0);
control(filters,'Réinitialiser les filtres',resetFilters);
const box=d.createElement('div');box.style.cssText='max-width:100%;max-height:50vh;overflow:auto;border:1px solid #ccc;text-align:center';editorWrap.append(box);
canvas=d.createElement('canvas');canvas.style.cssText='max-width:100%;height:auto';ctx=canvas.getContext('2d');box.append(canvas);
const cut=d.createElement('div');editorWrap.append(cut);
for(const [key,label,value] of [['x','X',0],['y','Y',0],['w','Largeur',100],['h','Hauteur',100]])numeric(cut,'cmdCrop'+key,label,value);
control(cut,'Rogner',crop);
const size=d.createElement('div');editorWrap.append(size);numeric(size,'cmdResizeW','Largeur',100);numeric(size,'cmdResizeH','Hauteur',100);
control(size,'Redimensionner',resize);
const exports=d.createElement('div');editorWrap.append(exports);for(const [mime,label] of [['image/png','Exporter PNG'],['image/jpeg','Exporter JPG'],['image/webp','Exporter WebP']])control(exports,label,()=>exportImage(mime));
dialog.showModal();
};
})();
