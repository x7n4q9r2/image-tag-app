
const DB_NAME='ImageTagDB';
let db;

const req=indexedDB.open(DB_NAME,1);
req.onupgradeneeded=e=>{
 const db=e.target.result;
 db.createObjectStore('images',{keyPath:'id',autoIncrement:true});
};
req.onsuccess=e=>{db=e.target.result;render();};

const $=id=>document.getElementById(id);

$("fab").onclick=()=>$("uploadDialog").showModal();
$("closeUpload").onclick=()=>$("uploadDialog").close();
$("closeDetail").onclick=()=>$("detailDialog").close();
$("search").oninput=render;

async function allItems(){
 return new Promise(res=>{
  const tx=db.transaction('images');
  tx.objectStore('images').getAll().onsuccess=e=>res(e.target.result);
 });
}

function compressImage(file,max=1800,quality=.85){
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>{
   let {width,height}=img;
   const ratio=Math.min(1,max/Math.max(width,height));
   width*=ratio;height*=ratio;
   const canvas=document.createElement('canvas');
   canvas.width=width;canvas.height=height;
   canvas.getContext('2d').drawImage(img,0,0,width,height);
   resolve(canvas.toDataURL('image/jpeg',quality));
  };
  img.src=URL.createObjectURL(file);
 });
}

$("saveBtn").onclick=async()=>{
 const file=$("imageInput").files[0];
 if(!file)return alert("ç»åãé¸æãã¦ãã ãã");
 const reader = new FileReader();
reader.onload = () => {
  // 保存処理
};
reader.readAsDataURL(file);
 const tags=$("tagInput").value.trim().split(/\s+/).filter(Boolean);

 const tx=db.transaction('images','readwrite');
 tx.objectStore('images').add({
  data,tags,createdAt:Date.now()
 });
 tx.oncomplete=()=>{
  $("imageInput").value="";
  $("tagInput").value="";
  $("uploadDialog").close();
  render();
 };
};

async function render(){
 if(!db)return;
 let items=await allItems();
 items.sort((a,b)=>b.createdAt-a.createdAt);

 const q=$("search").value.trim().split(/\s+/).filter(Boolean);
 if(q.length){
  items=items.filter(i=>q.every(t=>i.tags.includes(t)));
 }

 $("stats").textContent=`${items.length}ä»¶`;

 const gallery=$("gallery");
 gallery.innerHTML='';

 items.forEach(item=>{
  const img=document.createElement('img');
  img.src=item.data;
  img.className='thumb';
  img.onclick=()=>openDetail(item);
  gallery.appendChild(img);
 });

 updateTagHints();
}

async function updateTagHints(){
 const items=await allItems();
 const tags=[...new Set(items.flatMap(x=>x.tags))].sort();
 $("tagHints").innerHTML=tags.slice(0,30)
   .map(t=>`<span class="tagChip">${t}</span>`).join('');
}

function openDetail(item){
 $("detailImg").src=item.data;
 $("createdAt").textContent=new Date(item.createdAt).toLocaleString();
 $("tagView").textContent =
  item.tags.map(tag => "#" + tag).join(" ");
 $("editTags").value =
  item.tags.join(" ");
 $("editTags").style.display = "none";
 $("updateBtn").style.display = "none";

$("detailDialog").showModal();

 $("updateBtn").onclick=()=>{
  const tx=db.transaction('images','readwrite');
  tx.objectStore('images').put({
   ...item,
   tags:$("editTags").value.trim().split(/\s+/).filter(Boolean)
  });
  tx.oncomplete=()=>{$("detailDialog").close();render();};
  $("tagView").style.display = "block";
  $("editTags").style.display = "none";
  $("updateBtn").style.display = "none";
 };

 $("deleteBtn").onclick=()=>{
  if(!confirm("åé¤ãã¾ããï¼")) return;
  const tx=db.transaction('images','readwrite');
  tx.objectStore('images').delete(item.id);
  tx.oncomplete=()=>{$("detailDialog").close();render();};
 };

 $("downloadBtn").onclick=()=>{
  const a=document.createElement('a');
  a.href=item.data;
  a.download='image.jpg';
  a.click();
 };

 $("editBtn").onclick = () => {
  $("tagView").style.display = "none";
  $("editTags").style.display = "block";
  $("updateBtn").style.display = "inline-block";
 };
}