async function loadMyListings(){
 const box=document.querySelector('#dashboardListings'), count=document.querySelector('#listingCount'), active=document.querySelector('#activeCount'); if(!window.csSupabase||!box)return;
 const {data:{user}}=await window.csSupabase.auth.getUser(); if(!user){box.innerHTML='<p style="color:var(--muted)">Please log in to manage listings.</p>';return;}
 const {data,error}=await window.csSupabase.from('products').select('id,name,category,condition,price,status').eq('seller_id',user.id).order('created_at',{ascending:false});
 if(error){box.innerHTML='<p style="color:#9b3434">Could not load listings.</p>';return;}
 count.textContent=data.length; active.textContent=data.filter(p=>p.status==='active').length;
 box.innerHTML=data.length?data.map(p=>`<div class="dashboard-item"><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.category)} · ${escapeHtml(p.condition)}</small></div><b>R${Number(p.price).toLocaleString('en-ZA')}</b><button class="delete-listing" data-id="${p.id}">Delete</button></div>`).join(''):'<p style="color:var(--muted);padding:20px 0">No listings yet.</p>';
 document.querySelectorAll('.delete-listing').forEach(b=>b.onclick=async()=>{await window.csSupabase.from('products').delete().eq('id',b.dataset.id);loadMyListings();});
}
async function createListing(event){
 event.preventDefault(); const f=event.target,m=document.querySelector('#listingMessage'); if(!window.csSupabase){m.textContent='Connect Supabase first.';return;}
 const {data:{user}}=await window.csSupabase.auth.getUser(); if(!user){m.textContent='Please log in first.';return;}
 const {error}=await window.csSupabase.from('products').insert({seller_id:user.id,name:f.productName.value.trim(),category:f.productCategory.value,condition:f.productCondition.value,price:Number(f.productPrice.value),description:f.productDescription.value.trim()});
 if(error){m.textContent=error.message;return;} m.textContent='Listing published.';f.reset();loadMyListings();
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
