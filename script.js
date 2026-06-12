
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
 if(!file)return alert("画像を選択してください");
 const data=await compressImage(file);
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

 const keyword = $("search").value.trim();

if(keyword){
  items = items.filter(item =>
    item.tags.join(" ").includes(keyword)
  );
}

 $("stats").textContent=`${items.length}件`;

 const gallery=$("gallery");
 gallery.innerHTML='';

 items.forEach(item=>{
  const img=document.createElement('img');
  img.src=item.data;
  img.className='thumb';
  img.onclick=()=>openDetail(item);
  gallery.appendChild(img);
 });
}

function openDetail(item){
 $("detailImg").src=item.data;
 $("createdAt").textContent=new Date(item.createdAt).toLocaleString();
 $("editTags").value=item.tags.join(" ");
 $("detailDialog").showModal();

 $("updateBtn").onclick=()=>{
  const tx=db.transaction('images','readwrite');
  tx.objectStore('images').put({
   ...item,
   tags:$("editTags").value.trim().split(/\s+/).filter(Boolean)
  });
  tx.oncomplete=()=>{$("detailDialog").close();render();};
 };

 $("deleteBtn").onclick=()=>{
  if(!confirm("削除しますか？")) return;
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
}

$("exportBtn").onclick = async () => {
  const items = await allItems();

  const blob = new Blob(
    [JSON.stringify(items)],
    { type: "application/json" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `backup-${Date.now()}.json`;
  a.click();
};

$("importBtn").onclick = () => {
  $("importInput").click();
};

$("importInput").onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const items = JSON.parse(text);

  const tx = db.transaction("images", "readwrite");
  const store = tx.objectStore("images");

  items.forEach(item => {
    store.put(item);
  });

  tx.oncomplete = () => {
    alert("復元完了");
    render();
  };
};