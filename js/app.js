const sampleProducts = [
  {id:'sample-1',name:'Student Laptop',category:'Electronics',condition:'Good condition',price:4500,description:'Sample listing for the project demo.'},
  {id:'sample-2',name:'Networking Textbook',category:'Books',condition:'Good condition',price:350,description:'Sample study material.'},
  {id:'sample-3',name:'Study Desk',category:'Home',condition:'Used',price:700,description:'Sample furniture listing.'}
];
let products=[];

function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function getCart(){try{return JSON.parse(localStorage.getItem('cs_cart')||'[]')}catch{return []}}
function saveCart(cart){localStorage.setItem('cs_cart',JSON.stringify(cart)); updateCartCount();}
function updateCartCount(){const el=document.querySelector('#cartCount');if(!el)return;const n=getCart().length;el.textContent=n;el.hidden=n===0;}
function toast(message){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=message;t.hidden=false;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>t.hidden=true,2200)}

async function updateNavigation(){
  const login=document.querySelector('#navLogin'), register=document.querySelector('#navRegister');
  if(!window.csSupabase){updateCartCount();return;}
  const {data:{user}}=await window.csSupabase.auth.getUser();
  if(user){
    if(login){login.textContent='Account';login.href='account.html';login.onclick=null;}
    if(register){register.textContent='Logout';register.href='#';register.onclick=async e=>{e.preventDefault();await window.csSupabase.auth.signOut();location.href='index.html';};}
  } else {
    if(login){login.textContent='Login';login.href='login.html';login.onclick=null;}
    if(register){register.textContent='Create account';register.href='register.html';register.onclick=null;}
  }
  updateCartCount();
}

function productCard(p){
  const price=Number(p.price||0);
  const safeImage=p.image_url?escapeHtml(p.image_url):'';
  const imageHtml=safeImage
    ? `<img class="product-image-photo" src="${safeImage}" alt="${escapeHtml(p.name||'Product')}" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><div class="product-image product-image-bg" hidden><span>${escapeHtml(p.category||'Product')}</span></div>`
    : `<div class="product-image product-image-bg"><span>${escapeHtml(p.category||'Product')}</span></div>`;
  const detailsUrl=p.id&&!String(p.id).startsWith('sample-')?`item-details.html?id=${encodeURIComponent(p.id)}`:'#';
  return `<article class="product-card" data-details-url="${detailsUrl}"><a class="product-card-link" href="${detailsUrl}"><div class="product-image product-image-bg" style="padding:0">${imageHtml}</div><div class="product-info"><span class="product-tag">${escapeHtml(p.category||'Community listing')}</span><h3>${escapeHtml(p.name)}</h3><div class="product-meta"><span>${escapeHtml(p.condition||'')}</span><span>${escapeHtml(p.category||'')}</span></div><p class="seller">${escapeHtml(p.description||'')}</p><div class="price">R${price.toLocaleString('en-ZA',{minimumFractionDigits:0})}</div></div></a>${p.id&&!String(p.id).startsWith('sample-')?`<div class="product-actions" style="padding:0 15px 15px"><button type="button" class="btn btn-secondary btn-sm add-cart" data-id="${escapeHtml(p.id)}">Add to cart</button></div>`:''}</article>`;
}
function renderProducts(list){const grid=document.querySelector('#productGrid');if(!grid)return;grid.innerHTML=list.map(productCard).join('');const empty=document.querySelector('#emptyState');if(empty)empty.hidden=list.length!==0;const info=document.querySelector('#resultInfo');if(info)info.textContent=`${list.length} listing${list.length===1?'':'s'} found`;document.querySelectorAll('.add-cart').forEach(b=>b.onclick=()=>addToCart(b.dataset.id));}
function renderFeatured(){const grid=document.querySelector('#featuredGrid');if(grid){grid.innerHTML=products.slice(0,4).map(productCard).join('');document.querySelectorAll('.add-cart').forEach(b=>b.onclick=()=>addToCart(b.dataset.id));}}
function applyFilters(){
 const category=document.querySelector('#categoryFilter')?.value||'All', condition=document.querySelector('#conditionFilter')?.value||'All', query=(document.querySelector('#fSearch')?.value||'').trim().toLowerCase(), max=Number(document.querySelector('#fMax')?.value||0);
 let list=products.filter(p=>(category==='All'||p.category===category)&&(condition==='All'||p.condition===condition)&&(!query||`${p.name} ${p.category} ${p.condition} ${p.description||''}`.toLowerCase().includes(query))&&(!max||Number(p.price)<=max));
 const sort=document.querySelector('#fSort')?.value;if(sort==='low')list.sort((a,b)=>a.price-b.price);if(sort==='high')list.sort((a,b)=>b.price-a.price);if(sort==='name')list.sort((a,b)=>String(a.name).localeCompare(String(b.name)));renderProducts(list);
}
async function loadProducts(){
 if(!window.csSupabase){products=sampleProducts;applyFilters();renderFeatured();return;}
 const {data,error}=await window.csSupabase.from('products').select('id,seller_id,name,category,condition,price,description,image_url,status,created_at').eq('status','active').order('created_at',{ascending:false});
 if(error){console.error(error);products=sampleProducts}else products=data||[];applyFilters();renderFeatured();
}
function addToCart(id){const p=products.find(x=>String(x.id)===String(id));if(!p)return;const cart=getCart();if(!cart.some(x=>String(x.id)===String(id))){cart.push({...p,quantity:1});saveCart(cart);toast('Added to cart.')}else toast('Item is already in your cart.');}

async function initSellForm(){const form=document.querySelector('#sellForm');if(!form)return;const fileInput=document.querySelector('#sImageFile');const preview=document.querySelector('#imagePreview');const maxSize=5*1024*1024;
if(fileInput&&preview){fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];preview.hidden=!file;if(file){const url=URL.createObjectURL(file);preview.innerHTML=`<img src="${url}" alt="Selected product picture">`;}});}
form.onsubmit=async e=>{e.preventDefault();const msg=document.querySelector('#sellMsg');const btn=document.querySelector('#publishListingBtn');if(!window.csSupabase){msg.textContent='Connect Supabase first.';return;}const {data:{user}}=await window.csSupabase.auth.getUser();if(!user){msg.textContent='Please log in before publishing a listing.';return;}const file=fileInput?.files?.[0];if(!file){msg.textContent='Please upload a picture of the item.';return;}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){msg.textContent='Please upload a JPG, PNG or WebP image.';return;}if(file.size>maxSize){msg.textContent='Image is too large. Please choose an image under 5 MB.';return;}const title=document.querySelector('#sTitle').value.trim();const price=Number(document.querySelector('#sPrice').value);if(!title||!Number.isFinite(price)||price<0){msg.textContent='Please enter a valid title and price.';return;}btn.disabled=true;msg.textContent='Uploading picture...';const extension=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const filePath=`${user.id}/${crypto.randomUUID()}.${extension}`;const upload=await window.csSupabase.storage.from('product-images').upload(filePath,file,{contentType:file.type,upsert:false});if(upload.error){console.error(upload.error);msg.textContent='Picture upload failed: '+upload.error.message;btn.disabled=false;return;}const {data:urlData}=window.csSupabase.storage.from('product-images').getPublicUrl(filePath);const payload={seller_id:user.id,name:title,category:document.querySelector('#sCat').value,condition:document.querySelector('#sCond').value,price,description:document.querySelector('#sDesc').value.trim(),image_url:urlData.publicUrl,status:'active'};msg.textContent='Saving listing...';const {error}=await window.csSupabase.from('products').insert(payload);if(error){console.error(error);await window.csSupabase.storage.from('product-images').remove([filePath]);msg.textContent=error.message;btn.disabled=false;return;}msg.className='msg ok';msg.textContent='Listing published successfully.';form.reset();if(preview){preview.hidden=true;preview.innerHTML='';}btn.disabled=false;};}

async function initCommunity(){const board=document.querySelector('#boardGrid');const form=document.querySelector('#postForm');if(!board)return;let posts=[];async function load(){if(window.csSupabase){const r=await window.csSupabase.from('community_posts').select('id,type,title,body,created_at,author_id').eq('status','active').order('created_at',{ascending:false});if(!r.error)posts=r.data||[];}render();}function render(){const active=document.querySelector('.chip.on')?.dataset.type||'All';const list=posts.filter(p=>active==='All'||p.type===active);board.innerHTML=list.length?list.map(p=>`<article class="post"><span class="product-tag">${escapeHtml(p.type)}</span><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.body)}</p><small>${new Date(p.created_at).toLocaleString('en-ZA')}</small></article>`).join(''):'<p class="empty-state">No posts yet.</p>';}
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');render();});
if(form)form.onsubmit=async e=>{e.preventDefault();const msg=document.querySelector('#postMsg');if(!window.csSupabase){msg.textContent='Connect Supabase first.';return;}const {data:{user}}=await window.csSupabase.auth.getUser();if(!user){msg.textContent='Please log in to post.';return;}const payload={author_id:user.id,type:document.querySelector('#pType').value,title:document.querySelector('#pTitle').value.trim(),body:document.querySelector('#pBody').value.trim()};const r=await window.csSupabase.from('community_posts').insert(payload);if(r.error){msg.textContent=r.error.message;return;}msg.className='msg ok';msg.textContent='Post published.';form.reset();await load();};await load();}

async function initCart(){const body=document.querySelector('#cartBody');if(!body)return;function render(){const cart=getCart();if(!cart.length){body.innerHTML='<div class="empty-state"><h2>Your cart is empty</h2><p>Add a product from the marketplace first.</p><a class="btn btn-primary" href="marketplace.html" style="margin-top:14px">Browse marketplace</a></div>';return;}const total=cart.reduce((s,p)=>s+Number(p.price)*Number(p.quantity||1),0);body.innerHTML=`<div class="hero-card"><h2>Cart items</h2>${cart.map(p=>`<div class="cart-row"><div class="product-placeholder">${escapeHtml(p.category)}</div><div><strong>${escapeHtml(p.name)}</strong><small class="seller">${escapeHtml(p.condition)}</small></div><b>R${Number(p.price).toLocaleString('en-ZA')}</b><button class="btn btn-secondary btn-sm remove-cart" data-id="${escapeHtml(p.id)}">Remove</button></div>`).join('')}<div style="display:flex;justify-content:space-between;align-items:center;padding-top:20px"><strong>Total</strong><strong>R${total.toLocaleString('en-ZA',{minimumFractionDigits:2})}</strong></div><div class="product-actions"><button class="btn btn-primary" id="checkoutBtn">Checkout</button><button class="btn btn-secondary" id="clearCartBtn">Clear cart</button></div><p class="msg" id="checkoutMsg"></p></div>`;document.querySelectorAll('.remove-cart').forEach(b=>b.onclick=()=>{saveCart(getCart().filter(p=>String(p.id)!==String(b.dataset.id)));render();});document.querySelector('#clearCartBtn').onclick=()=>{saveCart([]);render();};document.querySelector('#checkoutBtn').onclick=checkout;}
async function checkout(){
 const msg=document.querySelector('#checkoutMsg');const cart=getCart();
 if(!window.csSupabase){msg.textContent='Connect Supabase first.';return;}
 const {data:{user}}=await window.csSupabase.auth.getUser();
 if(!user){msg.textContent='Please log in before checkout.';return;}
 if(!cart.length){msg.textContent='Your cart is empty.';return;}
 msg.textContent='Creating order...';
 const items=cart.filter(p=>!String(p.id).startsWith('sample-')).map(p=>({product_id:p.id,quantity:Number(p.quantity||1)}));
 if(items.length!==cart.length){msg.textContent='Please remove demo/sample items before checkout.';return;}
 const {data,error}=await window.csSupabase.rpc('place_order',{p_items:items});
 if(error){console.error(error);msg.textContent=error.message;return;}
 saveCart([]);msg.className='msg ok';msg.textContent='Order created successfully. The seller has been notified. Payment is simulated for this academic project.';
 setTimeout(()=>location.href='account.html',900);
}
render();}

async function init(){
 const menuToggle=document.querySelector('#menuToggle');
 const mainNav=document.querySelector('#mainNav');
 menuToggle?.addEventListener('click',()=>{
   const open=mainNav?.classList.toggle('open');
   menuToggle.setAttribute('aria-expanded',String(!!open));
 });
 mainNav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
   if(window.innerWidth<=850){mainNav.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false');}
 }));
 document.addEventListener('click',e=>{
   if(window.innerWidth<=850 && mainNav?.classList.contains('open') && !mainNav.contains(e.target) && !menuToggle?.contains(e.target)){
     mainNav.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false');
   }
 });
 document.querySelector('#heroSearchForm')?.addEventListener('submit',e=>{e.preventDefault();const v=document.querySelector('#heroSearch')?.value||'';location.href='marketplace.html'+(v?'?search='+encodeURIComponent(v):'');});
 document.querySelector('#categoryFilter')?.addEventListener('change',applyFilters);document.querySelector('#conditionFilter')?.addEventListener('change',applyFilters);document.querySelector('#fSearch')?.addEventListener('input',applyFilters);document.querySelector('#fMax')?.addEventListener('input',applyFilters);document.querySelector('#fSort')?.addEventListener('change',applyFilters);
 const params=new URLSearchParams(location.search);if(document.querySelector('#fSearch')&&params.get('search'))document.querySelector('#fSearch').value=params.get('search');if(document.querySelector('#categoryFilter')&&params.get('category'))document.querySelector('#categoryFilter').value=params.get('category');
 await updateNavigation();await loadProducts();await initSellForm();await initCommunity();await initCart();
}
init();
