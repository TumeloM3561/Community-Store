function idEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

async function loadItem(){
  const id=new URLSearchParams(location.search).get('id');
  const loading=document.querySelector('#itemLoading');
  const wrap=document.querySelector('#itemDetails');
  if(!id||!window.csSupabase){loading.textContent='Item could not be loaded.';return;}

  const {data:p,error}=await window.csSupabase
    .from('products')
    .select('id,seller_id,name,category,condition,price,description,image_url,status,created_at')
    .eq('id',id)
    .maybeSingle();

  if(error||!p){loading.textContent='This item could not be found or is no longer available.';return;}
  if(p.status!=='active'){loading.textContent='This item has been removed or sold.';return;}

  const seller=await window.csSupabase
    .from('profiles')
    .select('full_name,role')
    .eq('id',p.seller_id)
    .maybeSingle();

  const image=p.image_url ? idEsc(p.image_url) : '';
  const imageHtml=image
    ? `<img class="item-detail-image" src="${image}" alt="${idEsc(p.name)} product picture" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><div class="item-image-fallback" hidden><span>No product picture available</span></div>`
    : `<div class="item-image-fallback"><span>No product picture available</span></div>`;

  wrap.innerHTML=`
    <div class="crumbs"><a href="marketplace.html">Marketplace</a> / Item details</div>
    <section class="item-detail-card">
      <div class="item-detail-image-wrap">
        ${imageHtml}
        <div class="item-detail-image-shade"></div>
        <span class="item-image-badge">${idEsc(p.category)}</span>
      </div>
      <div class="item-detail-info">
        <span class="product-tag">${idEsc(p.condition)}</span>
        <h1>${idEsc(p.name)}</h1>
        <div class="item-detail-price">R${Number(p.price).toLocaleString('en-ZA',{minimumFractionDigits:0})}</div>
        <p class="item-detail-seller-line">Sold by <strong>${idEsc(seller.data?.full_name||'Community seller')}</strong> · ${idEsc(seller.data?.role||'seller')}</p>
        <button class="btn btn-primary item-add-button" id="detailAdd">Add to cart</button>
      </div>
    </section>
    <section class="item-detail-lower">
      <div class="hero-card item-description-card">
        <div class="detail-heading"><span>01</span><h2>Description</h2></div>
        <p>${idEsc(p.description||'No description provided.')}</p>
      </div>
      <div class="hero-card item-seller-card">
        <div class="detail-heading"><span>02</span><h2>Seller</h2></div>
        <strong>${idEsc(seller.data?.full_name||'Community seller')}</strong>
        <p class="note">${idEsc(seller.data?.role||'seller')}</p>
      </div>
    </section>`;

  loading.hidden=true;
  wrap.hidden=false;

  document.querySelector('#detailAdd').onclick=()=>{
    const cart=getCart();
    if(!cart.some(x=>String(x.id)===String(p.id))){
      cart.push({...p,quantity:1});
      saveCart(cart);
      toast('Added to cart.');
    }else toast('Item is already in your cart.');
  };
}

loadItem();
