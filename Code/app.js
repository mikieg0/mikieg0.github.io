(() => {
  "use strict";

  const STORE_KEY = "miga-dorada-demo-v1";
  const ADMIN_PASSWORD = "horno2026";
  const currency = amount => `S/ ${Number(amount || 0).toFixed(2)}`;
  const discountFor = product => data.promo?.active && data.promo.productId === product.id ? Math.min(90,Math.max(0,Number(data.promo.discount)||0)) : 0;
  const unitPrice = product => Math.round(Number(product.price)*(1-discountFor(product)/100)*100)/100;
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const photo = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=80`;
  const starterProducts = [
    {id:"frances",name:"Pan francés",category:"Pan francés",description:"Corteza crujiente y miga ligera. Un clásico para todos los días.",price:0.60,stock:48,image:photo("photo-1509440159596-0249088772ff"),badge:"Recién horneado"},
    {id:"integral",name:"Pan integral",category:"Pan integral",description:"Harina integral, semillas y el sabor de lo hecho sin apuros.",price:1.20,stock:24,image:photo("photo-1534620808146-d33bb39128b2"),badge:"Con semillas"},
    {id:"ciabatta",name:"Ciabatta artesanal",category:"Pan ciabatta",description:"Miga alveolada, corteza dorada y fermentación lenta.",price:3.50,stock:16,image:photo("photo-1598373182133-52452f7691ef"),badge:"Favorito"},
    {id:"yema",name:"Pan de yema",category:"Pan de yema",description:"Suave, ligeramente dulce y perfecto para la hora del café.",price:1.00,stock:22,image:photo("photo-1555507036-ab1f4038808a"),badge:"De la casa"},
    {id:"molde",name:"Pan de molde",category:"Pan de molde",description:"Tierno por dentro, recién horneado y listo para compartir.",price:8.00,stock:12,image:photo("photo-1598373182133-52452f7691ef"),badge:"Fresco cada día"},
    {id:"croissant",name:"Croissant de mantequilla",category:"Croissants",description:"Capas delicadas y exterior dorado que se deshace al morder.",price:5.50,stock:14,image:photo("photo-1555507036-ab1f4038808a"),badge:"Más pedido"},
    {id:"torta",name:"Torta de chocolate",category:"Tortas",description:"Bizcocho húmedo de cacao con cobertura cremosa. Para 8 porciones.",price:68.00,stock:5,image:photo("photo-1578985545062-69928b1d9587"),badge:"Para celebrar"},
    {id:"pastel",name:"Pastel de frutos rojos",category:"Pasteles",description:"Crema suave, fruta de temporada y una base crujiente.",price:9.50,stock:9,image:photo("photo-1488477181946-6428a0291777"),badge:"De temporada"},
    {id:"empanada",name:"Empanada de carne",category:"Empanadas",description:"Masa hojaldrada rellena de un guiso casero bien sazonado.",price:4.50,stock:18,image:photo("photo-1601050690597-df0568f70950"),badge:"Salado"},
    {id:"alfajor",name:"Alfajor de maicena",category:"Postres",description:"Dos tapas suaves, manjar blanco y un toque de coco.",price:3.00,stock:20,image:photo("photo-1558961363-fa8fdf82db35"),badge:"Dulce momento"},
    {id:"especial",name:"Pan de masa madre",category:"Productos especiales",description:"Fermentación natural, corteza intensa y mucho carácter.",price:12.00,stock:7,image:photo("photo-1589367920969-ab8e050bbb04"),badge:"Edición especial"}
  ];
  const starterHours = [
    {day:"Lunes a viernes",open:"07:00",close:"19:00",closed:false},
    {day:"Sábados",open:"07:30",close:"17:00",closed:false},
    {day:"Domingos",open:"08:00",close:"13:00",closed:false},
    {day:"Feriados",open:"",close:"",closed:true}
  ];
  const starterData = {
    products:starterProducts, categories:["Pan francés","Pan integral","Pan ciabatta","Pan de yema","Pan de molde","Croissants","Tortas","Pasteles","Empanadas","Postres","Productos especiales"],
    cart:[],favorites:[],orders:[],hours:starterHours,
    zones:[{name:"Zona cercana (demostración)",fee:5,min:20,eta:"30–45 min",active:true},{name:"Zona extendida (demostración)",fee:8,min:35,eta:"45–70 min",active:true}],
    promo:{title:"Un poquito de felicidad.",label:"OFERTA DEL DÍA",description:"El mejor plan: algo recién horneado y un ratito para ti. Pregunta por nuestras sorpresas del día.",productId:"croissant",discount:10,active:true},
    settings:{businessName:"Miga Dorada",address:"",phone:"",minimum:20,deliveryEnabled:true,adminConfigured:false}
  };
  let data;
  let storageReadFailed = false;
  try { const saved = JSON.parse(localStorage.getItem(STORE_KEY)); data = saved ? {...starterData,...saved,settings:{...starterData.settings,...saved.settings}} : structuredClone(starterData); }
  catch (error) { console.error("No se pudo leer el almacenamiento local de la demostración.",error); storageReadFailed = true; data = structuredClone(starterData); }
  const save = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
    catch(error) { console.error("No se pudo guardar la demostración en este dispositivo.",error); toast("No se pudieron guardar los cambios en este navegador.",true); }
  };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let selectedCategory = "Todos";
  let onlyFavorites = false;
  let adminTab = "products";
  let adminAuthenticated = false;
  let orderSubmissionInProgress = false;
  let messageSending = false;

  const toast = (message, error = false) => {
    const region = $("#toastRegion"), el = document.createElement("div");
    el.className = `toast${error ? " error" : ""}`; el.textContent = message; region.append(el);
    setTimeout(() => el.remove(), 3400);
  };
  const persist = () => { save(); renderHeader(); };
  const openModal = (content, wide = false) => {
    const modal = $("#modalCard");
    modal.classList.toggle("wide", wide);
    modal.innerHTML = `<button class="modal-close" data-close-modal aria-label="Cerrar">×</button>${content}`;
    $("#modalBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
  };
  const closeModal = () => {
    $("#modalBackdrop").hidden = true; document.body.style.overflow = "";
  };
  const iconHeart = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`;
  const renderHeader = () => {
    $("#cartCount").textContent = data.cart.reduce((sum,line) => sum + line.quantity, 0);
    document.title = `${data.settings.businessName || "Miga Dorada"} | Panadería artesanal`;
    $("#currentYear").textContent = new Date().getFullYear();
  };
  const renderCategories = () => {
    const categories = ["Todos",...data.categories.filter(category => data.products.some(product => product.category === category))];
    if (!categories.includes(selectedCategory)) selectedCategory = "Todos";
    $("#categoryTabs").innerHTML = categories.map(category => `<button class="category-tab${category === selectedCategory ? " active" : ""}" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("");
  };
  const renderProducts = () => {
    renderCategories();
    const query = $("#productSearch").value.trim().toLocaleLowerCase("es");
    let products = data.products.filter(product => {
      const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
      const matchesQuery = !query || `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("es").includes(query);
      const matchesFavorites = !onlyFavorites || data.favorites.includes(product.id);
      return matchesCategory && matchesQuery && matchesFavorites;
    });
    const sort = $("#sortProducts").value;
    if (sort === "price-low") products.sort((a,b) => a.price-b.price);
    if (sort === "price-high") products.sort((a,b) => b.price-a.price);
    if (sort === "name") products.sort((a,b) => a.name.localeCompare(b.name,"es"));
    $("#productCount").textContent = `${onlyFavorites ? `${products.length} favorito${products.length === 1 ? "" : "s"}` : `${products.length} producto${products.length === 1 ? "" : "s"} en nuestro catálogo`} · stock de demostración`;
    $("#showFavorites").textContent = onlyFavorites ? "Ver todo el catálogo" : "♡ Ver mis favoritos";
    $("#productGrid").innerHTML = products.length ? products.map(product => {
      const favorite = data.favorites.includes(product.id);
      const stock = Number(product.stock) || 0;
      const discount=discountFor(product);
      return `<article class="product-card"><div class="product-image-wrap"><img loading="lazy" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" onerror="this.src='https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=700&q=80'"><span class="product-badge">${escapeHTML(discount?`${discount}% menos`:product.badge||product.category)}</span><button class="favorite-button${favorite ? " active" : ""}" data-favorite="${escapeHTML(product.id)}" aria-label="${favorite ? "Quitar de favoritos" : "Agregar a favoritos"}">${iconHeart}</button></div><div class="product-info"><span class="product-category">${escapeHTML(product.category)}</span><h3 class="product-name">${escapeHTML(product.name)}<span class="product-price">${discount?`<del>${currency(product.price)}</del>`:""}<strong>${currency(unitPrice(product))}</strong></span></h3><p class="product-description">${escapeHTML(product.description)}</p><div class="product-action"><span class="stock-label${stock === 0 ? " out" : stock < 6 ? " low" : ""}">${stock === 0 ? "Agotado · 0 unidades" : stock < 6 ? `¡Últimas ${stock} ${stock === 1 ? "unidad" : "unidades"}!` : `${stock} unidades disponibles`}</span><button class="add-button" data-add="${escapeHTML(product.id)}" ${stock === 0 ? "disabled" : ""}>${stock === 0 ? "Sin stock" : "+ Agregar"}</button></div></div></article>`;
    }).join("") : `<div class="empty-state"><span>♡</span><h3>${onlyFavorites ? "Tu lista empieza aquí." : "No encontramos ese antojo."}</h3><p>${onlyFavorites ? "Guarda tus productos favoritos tocando el corazón." : "Prueba con otra búsqueda o categoría."}</p><button class="button button-quiet" data-clear-search>Ver todo el catálogo</button></div>`;
  };
  const renderHours = () => {
    const day = new Date().getDay();
    const rowIndex = day === 0 ? 2 : day === 6 ? 1 : 0;
    const today = data.hours[rowIndex] || starterHours[rowIndex];
    const now = new Date();
    const hm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const isOpen = !today.closed && today.open && hm >= today.open && hm < today.close;
    const status = $("#openStatus");
    status.classList.toggle("closed",!isOpen);
    status.innerHTML = `<span class="status-dot"></span><strong>${isOpen ? "¡Estamos abiertos!" : "Ahora estamos cerrados"}</strong>`;
    $("#hoursList").innerHTML = data.hours.map((row,index) => `<div class="hours-row${index === rowIndex ? " today" : ""}"><span>${escapeHTML(row.day)}${index === rowIndex ? " · Hoy" : ""}</span><span>${row.closed ? "Cerrado" : `${escapeHTML(row.open || "—")} – ${escapeHTML(row.close || "—")}`}</span></div>`).join("");
    $("#contactTodayHours").textContent = today.closed ? "Cerrado hoy" : `${today.open || "—"} – ${today.close || "—"}`;
  };
  const renderContact = () => {
    $("#contactAddress").innerHTML = data.settings.address ? escapeHTML(data.settings.address).replace(/\n/g,"<br>") : "Ubicación de demostración<br>Configura tu dirección en Administración";
    $("#mapLink").href = `https://maps.google.com/?q=${encodeURIComponent(data.settings.address || "panadería")}`;
    $("#contactPhone").textContent = data.settings.phone ? `+51 ${data.settings.phone}` : "Configura tu WhatsApp";
    $("#contactPhoneLink").textContent = data.settings.phone ? "Escribir por WhatsApp ↗" : "¡Nos encantará leerte!";
    $("#contactPhoneLink").href = data.settings.phone ? `https://wa.me/51${data.settings.phone.replace(/\D/g,"")}` : "#contacto";
    const promo = data.promo;
    $("#promoLabel").textContent = promo.active ? promo.label : "HECHO CON CARIÑO";
    $("#promoTitle").textContent = promo.active ? promo.title : "Un poquito de felicidad.";
    $("#promoDescription").textContent = promo.active ? promo.description : "El mejor plan: algo recién horneado y un ratito para ti.";
    $("#promoButton").textContent = promo.active ? `${promo.discount ? `${promo.discount}% de descuento` : "Ver la selección"} →` : "Descubre el catálogo →";
    renderHours();
  };
  const addToCart = id => {
    const product = data.products.find(item => item.id === id);
    if (!product || Number(product.stock) < 1) return toast("Este producto no está disponible.",true);
    const line = data.cart.find(item => item.productId === id);
    if (line && line.quantity >= Number(product.stock)) return toast("No hay más unidades disponibles.",true);
    line ? line.quantity++ : data.cart.push({productId:id,quantity:1});
    persist(); renderProducts(); toast(`${product.name} se agregó a tu pedido.`);
  };
  const cartSubtotal = () => data.cart.reduce((sum,line) => sum + (unitPrice(data.products.find(product => product.id === line.productId) || {id:"",price:0}) * line.quantity),0);
  const cartDelivery = () => {
    const zoneIndex = $("#deliveryZone")?.value;
    return zoneIndex === undefined ? 0 : Number(data.zones[Number(zoneIndex)]?.fee || 0);
  };
  const cartTotalsHTML = delivery => `<div class="cart-totals"><div class="total-row"><span>Subtotal</span><strong>${currency(cartSubtotal())}</strong></div><div class="total-row"><span>${delivery ? "Delivery" : "Recojo en tienda"}</span><strong>${delivery ? currency(cartDelivery()) : "Gratis"}</strong></div><div class="total-row total"><span>Total</span><strong>${currency(cartSubtotal()+(delivery ? cartDelivery() : 0))}</strong></div></div>`;
  const openCart = () => {
    const zones = data.zones.filter(zone => zone.active);
    const cartItems = data.cart.map(line => {
      const product = data.products.find(item => item.id === line.productId);
      return product ? `<div class="cart-line"><img src="${escapeHTML(product.image)}" alt=""><div><h4>${escapeHTML(product.name)}</h4><p>${currency(unitPrice(product))} por unidad${discountFor(product)?` · ${discountFor(product)}% de descuento`:""}</p><div class="quantity-control"><button data-quantity="${escapeHTML(product.id)}" data-delta="-1" aria-label="Reducir cantidad">−</button><span>${line.quantity}</span><button data-quantity="${escapeHTML(product.id)}" data-delta="1" aria-label="Aumentar cantidad" ${line.quantity >= product.stock ? "disabled" : ""}>+</button><button class="remove-line" data-remove="${escapeHTML(product.id)}">Quitar</button></div></div><span class="line-price">${currency(unitPrice(product)*line.quantity)}</span></div>` : "";
    }).join("");
    const now = new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
    const minDate = now.toISOString().slice(0,16);
    const isDelivery = false;
    openModal(`<div class="modal-kicker">UN PEDIDO HECHO CON CARIÑO</div><h2 class="modal-title" id="modalTitle">Tu pedido.</h2><p class="modal-subtitle">Un vistazo a las cosas ricas que elegiste.</p>${cartItems ? `<div class="cart-lines">${cartItems}</div>` : `<div class="cart-empty"><span>🥐</span>Tu bolsa está esperando algo recién horneado.<br><br><button class="button button-quiet" data-close-modal>Descubrir productos</button></div>`}<div id="cartTotalArea">${cartTotalsHTML(isDelivery)}</div><div class="delivery-options"><label class="choice-card"><input type="radio" name="delivery-method" value="pickup" checked><span><strong>Recojo en tienda</strong><small>Sin costo de delivery</small></span></label><label class="choice-card"><input type="radio" name="delivery-method" value="delivery" ${!data.settings.deliveryEnabled ? "disabled" : ""}><span><strong>Delivery a domicilio</strong><small>${data.settings.deliveryEnabled ? "Tarifa según tu zona" : "No disponible por el momento"}</small></span></label></div><div id="deliveryZoneArea" hidden><div class="field"><label for="deliveryZone">Zona de delivery</label><select id="deliveryZone">${zones.map((zone,index) => `<option value="${data.zones.indexOf(zone)}">${escapeHTML(zone.name)} · ${currency(zone.fee)} · ${escapeHTML(zone.eta)}</option>`).join("")}</select></div>${zones.length ? `<p class="field-note" id="zoneNote"></p>` : `<p class="field-note">Aún no hay zonas de delivery activas.</p>`}</div><form id="checkoutForm" novalidate><div class="form-grid"><div class="field"><label for="customerName">Tu nombre *</label><input id="customerName" name="customerName" autocomplete="name" required placeholder="¿Cómo te llamas?"></div><div class="field"><label for="customerPhone">Tu WhatsApp (para contactarte) *</label><input id="customerPhone" name="customerPhone" inputmode="tel" autocomplete="tel" required placeholder="Ej.: 987654321 (+51 Perú)"></div><div class="field full"><label for="customerAddress" id="addressLabel">Dirección (si aplica)</label><input id="customerAddress" name="customerAddress" autocomplete="street-address" placeholder="Calle, número, distrito"></div><div class="field full"><label for="deliveryDate">Fecha y hora de entrega *</label><input id="deliveryDate" name="deliveryDate" type="datetime-local" min="${minDate}" required></div><div class="field full"><label for="specialInstructions">¿Alguna indicación especial?</label><textarea id="specialInstructions" name="specialInstructions" placeholder="Una dedicatoria, referencias para llegar, alergias..."></textarea></div></div><p class="field-note" id="minimumNote"></p><button class="button button-dark modal-primary" type="submit" ${!data.cart.length ? "disabled" : ""}>Enviar pedido a la panadería por WhatsApp <span>↗</span></button></form>`,true);
    updateCheckoutMode();
    $("#deliveryZone")?.addEventListener("change",updateCartDelivery);
    $$('input[name="delivery-method"]').forEach(input => input.addEventListener("change",updateCheckoutMode));
    $("#checkoutForm").addEventListener("submit",submitOrder);
  };
  const updateCartDelivery = () => {
    const isDelivery = $('input[name="delivery-method"]:checked')?.value === "delivery";
    $("#cartTotalArea").innerHTML = cartTotalsHTML(isDelivery);
    const zone = data.zones[Number($("#deliveryZone")?.value)];
    const note = $("#zoneNote");
    if (note && zone) note.textContent = `Pedido mínimo ${currency(zone.min)} · Tiempo estimado ${zone.eta}.`;
    const minimum = isDelivery ? Number(zone?.min || 0) : Number(data.settings.minimum || 0);
    $("#minimumNote").textContent = isDelivery ? `Delivery disponible · pedido mínimo de ${currency(minimum)}.` : `Pedido mínimo para recojo: ${currency(minimum)}.`;
  };
  const updateCheckoutMode = () => {
    const isDelivery = $('input[name="delivery-method"]:checked')?.value === "delivery";
    $("#deliveryZoneArea").hidden = !isDelivery;
    $("#addressLabel").textContent = isDelivery ? "Dirección de delivery *" : "Dirección (si aplica)";
    $("#customerAddress").required = isDelivery;
    updateCartDelivery();
  };
  const submitOrder = async event => {
    event.preventDefault();
    if (orderSubmissionInProgress) return;
    if (!data.cart.length) return toast("Agrega al menos un producto antes de confirmar.",true);
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const isDelivery = $('input[name="delivery-method"]:checked')?.value === "delivery";
    if (isDelivery && !data.settings.deliveryEnabled) return toast("El delivery no está disponible por el momento.",true);
    const zone = isDelivery ? data.zones[Number($("#deliveryZone").value)] : null;
    const minimum = isDelivery ? Number(zone?.min || 0) : Number(data.settings.minimum || 0);
    if (isDelivery && (!zone || !zone.active)) return toast("Selecciona una zona de delivery disponible.",true);
    if (cartSubtotal() < minimum) return toast(`El pedido mínimo es ${currency(minimum)}.`,true);
    if (!data.settings.phone || !/^\+?[\d\s().-]+$/.test(data.settings.phone.trim())) return toast("Configura el WhatsApp de la panadería en Administración → Negocio.",true);
    const details = Object.fromEntries(new FormData(form).entries());
    const enteredPhone = details.customerPhone.trim();
    if (!/^\+?[\d\s().-]+$/.test(enteredPhone)) return toast("Ingresa un número de WhatsApp válido.",true);
    const phoneDigits = enteredPhone.replace(/\D/g,"").replace(/^00/,"");
    if (!((phoneDigits.length === 9 && phoneDigits.startsWith("9")) || (phoneDigits.length >= 8 && phoneDigits.length <= 15 && !phoneDigits.startsWith("0")))) return toast("Ingresa un número de WhatsApp válido, incluyendo el código de país si no es de Perú.",true);
    const requestedDate = new Date(details.deliveryDate);
    if (Number.isNaN(requestedDate.getTime()) || requestedDate < new Date()) return toast("Elige una fecha y hora futura.",true);
    const requestedDay = requestedDate.getDay() === 0 ? 2 : requestedDate.getDay() === 6 ? 1 : 0;
    const requestedHours = data.hours[requestedDay];
    const requestedTime = `${String(requestedDate.getHours()).padStart(2,"0")}:${String(requestedDate.getMinutes()).padStart(2,"0")}`;
    if (!requestedHours || requestedHours.closed || !requestedHours.open || !requestedHours.close) return toast("Ese día la panadería está cerrada. Elige otra fecha disponible.",true);
    if (requestedTime < requestedHours.open || requestedTime >= requestedHours.close) return toast(`La entrega debe ser entre ${requestedHours.open} y ${requestedHours.close}. Elige otra hora.`,true);
    const id = `MD-${Date.now().toString().slice(-7)}`;
    const items = data.cart.map(line => {
      const product = data.products.find(item => item.id === line.productId);
      if (!product || product.stock < line.quantity) return null;
      return {id:product.id,name:product.name,quantity:line.quantity,price:unitPrice(product)};
    });
    if (items.some(item => !item)) return toast("Algunos productos cambiaron de disponibilidad. Revisa tu pedido.",true);
    const subtotal = cartSubtotal(), fee = isDelivery ? Number(zone.fee) : 0;
    const order = {id,createdAt:new Date().toISOString(),items,subtotal,deliveryFee:fee,total:subtotal+fee,status:"Pendiente",method:isDelivery?"Delivery":"Recojo en tienda",zone:zone?.name||"",eta:zone?.eta||"Listo en tienda",date:details.deliveryDate,name:details.customerName.trim(),phone:details.customerPhone.trim(),address:details.customerAddress.trim(),instructions:details.specialInstructions.trim(),whatsappMessageStatus:"pending"};
    data.orders.unshift(order);
    items.forEach(item => {const product=data.products.find(p=>p.id===item.id);product.stock=Math.max(0,Number(product.stock)-item.quantity);});
    data.cart=[];persist();renderProducts();renderContact();closeModal();
    orderSubmissionInProgress = true;
    openModal(`<div class="modal-kicker">PEDIDO ${escapeHTML(order.id)}</div><h2 class="modal-title" id="modalTitle">Enviando tu pedido.</h2><p class="modal-subtitle" id="whatsappSendStatus">Estamos enviando el resumen al WhatsApp de la panadería.</p>`);
    try {
      await deliverOrderConfirmation(order);
    } finally {
      orderSubmissionInProgress = false;
    }
  };
  const sendOrderConfirmation = async order => {
    let response;
    try {
      response = await fetch("/api/send-whatsapp", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          businessPhone:data.settings.phone,
          customerPhone:order.phone,
          customerName:order.name,
          orderId:order.id,
          businessName:data.settings.businessName || "Miga Dorada",
          method:order.method,
          deliveryAt:new Date(order.date).toLocaleString("es-PE"),
          address:order.address,
          zone:order.zone,
          instructions:order.instructions,
          items:order.items.map(item=>({name:item.name,quantity:item.quantity,price:item.price})),
          subtotal:order.subtotal,
          deliveryFee:order.deliveryFee,
          total:order.total
        })
      });
    } catch (error) {
      throw new Error("No se pudo conectar con el servidor de envío. Verifica que esté iniciado e inténtalo de nuevo.");
    }
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error("El servidor de envío devolvió una respuesta no válida.");
    }
    if (!response.ok) throw new Error(result.error || "WhatsApp no pudo aceptar el mensaje.");
    if (result.accepted !== true) throw new Error("WhatsApp no confirmó la aceptación del mensaje.");
  };
  const showOrderMessageResult = (order, sent, errorMessage = "") => {
    const notice = sent
      ? "El resumen del pedido se envió al WhatsApp de la panadería. La entrega del mensaje puede tardar; el pedido sigue pendiente hasta que la panadería lo confirme."
      : `El pedido quedó guardado en este dispositivo, pero el mensaje no se envió. ${escapeHTML(errorMessage)} Puedes intentarlo de nuevo.`;
    openModal(`<div class="modal-kicker">¡GRACIAS, ${escapeHTML(order.name.toLocaleUpperCase("es"))}!</div><h2 class="modal-title" id="modalTitle">${sent ? "Pedido enviado a la panadería." : "No se pudo enviar el pedido."}</h2><p class="modal-subtitle">Pedido ${escapeHTML(order.id)} · ${currency(order.total)} · Estado: Pendiente.</p><div class="inline-notice">${notice}</div>${sent ? "" : `<button class="button button-dark modal-primary" id="retryWhatsApp">Reintentar envío por WhatsApp</button>`}<button class="button button-quiet modal-primary" id="showOrderHistory">Ver mis pedidos</button>`);
    $("#retryWhatsApp")?.addEventListener("click",()=>retryOrderConfirmation(order));
    $("#showOrderHistory").addEventListener("click",openHistory);
  };
  const deliverOrderConfirmation = async order => {
    try {
      await sendOrderConfirmation(order);
      order.whatsappMessageStatus = "accepted";
      persist();
      showOrderMessageResult(order,true);
      toast(`Pedido ${order.id} enviado al WhatsApp de la panadería.`);
    } catch (error) {
      order.whatsappMessageStatus = "failed";
      persist();
      showOrderMessageResult(order,false,error.message);
      toast("El pedido se guardó, pero no se pudo enviar el mensaje.",true);
    }
  };
  const retryOrderConfirmation = async order => {
    if (messageSending) return;
    messageSending = true;
    openModal(`<div class="modal-kicker">PEDIDO ${escapeHTML(order.id)}</div><h2 class="modal-title" id="modalTitle">Reintentando envío.</h2><p class="modal-subtitle">Estamos enviando el pedido al WhatsApp de la panadería.</p>`);
    try {
      await deliverOrderConfirmation(order);
    } finally {
      messageSending = false;
    }
  };
  const openHistory = () => {
    const orders = data.orders;
    openModal(`<div class="modal-kicker">TUS COMPRAS EN ESTE DISPOSITIVO</div><h2 class="modal-title" id="modalTitle">Historial de pedidos.</h2><p class="modal-subtitle">Los pedidos de esta demostración se guardan localmente, sin una cuenta ni base de datos.</p>${orders.length ? orders.map(order=>`<div class="order-card"><div class="order-card-head"><strong>${escapeHTML(order.id)}</strong><span class="small-muted">${escapeHTML(order.status)}</span></div><p>${new Date(order.createdAt).toLocaleString("es-PE")} · ${escapeHTML(order.method)} · <strong>${currency(order.total)}</strong></p><div class="order-items">${order.items.map(item=>`${escapeHTML(item.name)} × ${item.quantity}`).join(" · ")}</div></div>`).join("") : `<div class="cart-empty"><span>◷</span>Tus pedidos aparecerán aquí una vez que realices uno.</div>`}`,true);
  };
  const openAdmin = () => {
    if (!adminAuthenticated) {
      openModal(`<div class="modal-kicker">ESPACIO PRIVADO</div><h2 class="modal-title" id="modalTitle">Administración.</h2><p class="modal-subtitle">Gestiona el catálogo y revisa los pedidos de tu panadería.</p><form class="login-form" id="adminLogin"><div class="field"><label for="adminPassword">Contraseña de demostración</label><input id="adminPassword" type="password" required autocomplete="current-password" placeholder="Ingresa la contraseña"></div><p class="login-warning">Esta versión de demostración funciona en tu navegador y no reemplaza una autenticación segura de servidor. Credencial de ejemplo: <strong>horno2026</strong>.</p><button class="button button-dark modal-primary" type="submit">Entrar al panel →</button></form>`);
      $("#adminLogin").addEventListener("submit",event=>{event.preventDefault();if($("#adminPassword").value!==ADMIN_PASSWORD)return toast("La contraseña no es correcta.",true);adminAuthenticated=true;adminTab="products";renderAdmin();});
      return;
    }
    renderAdmin();
  };
  const renderAdmin = () => {
    const tabs = [["products","Productos"],["orders","Pedidos"],["sales","Ventas"],["settings","Negocio"],["promo","Promoción"]];
    let content = "";
    if (adminTab === "products") content = adminProducts();
    if (adminTab === "orders") content = adminOrders();
    if (adminTab === "sales") content = adminSales();
    if (adminTab === "settings") content = adminSettings();
    if (adminTab === "promo") content = adminPromo();
    openModal(`<div class="modal-kicker">PANEL DEL PROPIETARIO · DEMOSTRACIÓN</div><h2 class="modal-title" id="modalTitle">Administración.</h2><p class="modal-subtitle">Los cambios se guardan en este navegador.</p><div class="admin-tabs">${tabs.map(([id,label])=>`<button class="admin-tab${adminTab===id?" active":""}" data-admin-tab="${id}">${label}</button>`).join("")}<button class="admin-tab" data-admin-logout>Cerrar sesión</button></div><div id="adminContent">${content}</div>`,true);
    $$("[data-admin-tab]").forEach(button=>button.addEventListener("click",()=>{adminTab=button.dataset.adminTab;renderAdmin();}));
    $("[data-admin-logout]")?.addEventListener("click",()=>{adminAuthenticated=false;openAdmin();});
    bindAdminTab();
  };
  const adminProducts = () => `<div class="admin-toolbar"><strong>Catálogo (${data.products.length})</strong><button class="button button-dark" data-new-product>+ Nuevo producto</button></div><div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead><tbody>${data.products.map(product=>`<tr><td><img src="${escapeHTML(product.image)}" alt=""><span class="product-table-name">${escapeHTML(product.name)}</span></td><td>${escapeHTML(product.category)}</td><td>${currency(product.price)}</td><td>${product.stock}</td><td class="table-actions"><button data-edit-product="${escapeHTML(product.id)}">Editar</button><button data-delete-product="${escapeHTML(product.id)}">Eliminar</button></td></tr>`).join("")}</tbody></table></div><p class="small-muted">Precios en soles peruanos (S/). Las fotografías de muestra provienen de Unsplash.</p>`;
  const adminOrders = () => `<div class="admin-toolbar"><strong>Pedidos (${data.orders.length})</strong><span class="small-muted">Estados gestionados localmente</span></div>${data.orders.length ? data.orders.map(order=>`<div class="order-card"><div class="order-card-head"><strong>${escapeHTML(order.id)} · ${currency(order.total)}</strong><select class="status-select" data-order-status="${escapeHTML(order.id)}">${["Pendiente","Confirmado","Preparando","En camino","Entregado","Cancelado"].map(status=>`<option ${status===order.status?"selected":""}>${status}</option>`).join("")}</select></div><p>${escapeHTML(order.name)} · ${escapeHTML(order.phone)} · ${new Date(order.date).toLocaleString("es-PE")} · ${escapeHTML(order.method)}${order.address?` · ${escapeHTML(order.address)}`:""}</p><div class="order-items">${order.items.map(item=>`${escapeHTML(item.name)} × ${item.quantity} (${currency(item.price*item.quantity)})`).join(" · ")}</div>${order.instructions?`<p>Nota: ${escapeHTML(order.instructions)}</p>`:""}</div>`).join(""):`<div class="cart-empty">Aún no hay pedidos. Los pedidos confirmados por clientes aparecerán aquí.</div>`}`;
  const adminSales = () => {
    const confirmed=data.orders.filter(order=>order.status!=="Cancelado"&&order.status!=="Pendiente");
    const today=new Date(),dayOrders=confirmed.filter(order=>new Date(order.createdAt).toDateString()===today.toDateString());
    const weekStart=new Date(today);weekStart.setDate(today.getDate()-6);weekStart.setHours(0,0,0,0);
    const weekOrders=confirmed.filter(order=>new Date(order.createdAt)>=weekStart);
    const monthOrders=confirmed.filter(order=>{const d=new Date(order.createdAt);return d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear();});
    const revenue=orders=>orders.reduce((sum,order)=>sum+order.total,0);
    const sold={};confirmed.forEach(order=>order.items.forEach(item=>sold[item.name]=(sold[item.name]||0)+item.quantity));
    const best=Object.entries(sold).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return `<div class="admin-stat-grid"><div class="admin-stat"><span>HOY · ${dayOrders.length} pedidos</span><strong>${currency(revenue(dayOrders))}</strong></div><div class="admin-stat"><span>ÚLTIMOS 7 DÍAS · ${weekOrders.length}</span><strong>${currency(revenue(weekOrders))}</strong></div><div class="admin-stat"><span>ESTE MES · ${monthOrders.length}</span><strong>${currency(revenue(monthOrders))}</strong></div></div><h3 style="font:18px var(--serif)">Productos más pedidos</h3>${best.length?`<div class="admin-table"><table style="width:100%"><tbody>${best.map(([name,count])=>`<tr><td>${escapeHTML(name)}</td><td>${count} unidades</td></tr>`).join("")}</tbody></table></div>`:`<p class="small-muted">Los productos más vendidos aparecerán cuando haya pedidos.</p>`}<p class="admin-note">Las ventas se calculan con pedidos guardados en este dispositivo, excluyendo pedidos cancelados. Son cifras de demostración, no datos contables.</p>`;
  };
  const adminSettings = () => { return `<div class="admin-toolbar"><strong>Datos del negocio</strong></div><form id="settingsForm"><div class="form-grid"><div class="field"><label for="settingName">Nombre de la panadería</label><input id="settingName" name="businessName" value="${escapeHTML(data.settings.businessName)}" required></div><div class="field"><label for="settingPhone">WhatsApp, sin +51</label><input id="settingPhone" name="phone" inputmode="tel" value="${escapeHTML(data.settings.phone)}" placeholder="Ej.: 987654321"></div><div class="field full"><label for="settingAddress">Dirección real del negocio</label><input id="settingAddress" name="address" value="${escapeHTML(data.settings.address)}" placeholder="Escribe aquí la dirección exacta"></div><div class="field"><label for="settingMinimum">Pedido mínimo para recojo (S/)</label><input id="settingMinimum" name="minimum" type="number" min="0" step=".5" value="${data.settings.minimum}"></div><div class="field"><label class="favorite-toggle-row"><input name="deliveryEnabled" type="checkbox" ${data.settings.deliveryEnabled?"checked":""}> Habilitar delivery</label></div></div><button class="button button-dark" type="submit">Guardar datos</button></form><h3 style="font:19px var(--serif);margin:28px 0 7px">Horarios de atención</h3><form id="hoursForm">${data.hours.map((row,index)=>`<div class="schedule-row"><strong>${escapeHTML(row.day)}</strong><input type="time" aria-label="Apertura ${escapeHTML(row.day)}" data-hour-open="${index}" value="${escapeHTML(row.open)}" ${row.closed?"disabled":""}><input type="time" aria-label="Cierre ${escapeHTML(row.day)}" data-hour-close="${index}" value="${escapeHTML(row.close)}" ${row.closed?"disabled":""}><label><input type="checkbox" data-hour-closed="${index}" ${row.closed?"checked":""}> Cerrado</label></div>`).join("")}<button class="button button-dark" style="margin-top:14px" type="submit">Guardar horarios</button></form><h3 style="font:19px var(--serif);margin:28px 0 7px">Zonas y tarifas de delivery</h3><div id="zonesEditor">${data.zones.map((zone,index)=>`<div class="zone-row"><input aria-label="Nombre de zona" data-zone-name="${index}" value="${escapeHTML(zone.name)}"><input aria-label="Tarifa en soles" data-zone-fee="${index}" type="number" min="0" step=".5" value="${zone.fee}"><input aria-label="Mínimo en soles" data-zone-min="${index}" type="number" min="0" step=".5" value="${zone.min}"><span>${escapeHTML(zone.eta)}</span><label><input data-zone-active="${index}" type="checkbox" ${zone.active?"checked":""}> Disponible</label></div>`).join("")}</div><div class="admin-toolbar"><button class="button button-quiet" data-add-zone>+ Añadir zona</button><button class="button button-dark" data-save-zones>Guardar zonas</button></div><p class="admin-note">Para publicar pedidos en producción, conecta una base de datos con acceso seguro y valida las tarifas y horarios en el servidor.</p>`; };
  const adminPromo = () => `<div class="admin-toolbar"><strong>Oferta del día</strong></div><form id="promoForm"><div class="form-grid"><div class="field"><label for="promoActive">Estado de promoción</label><select id="promoActive" name="active"><option value="true" ${data.promo.active?"selected":""}>Activa</option><option value="false" ${!data.promo.active?"selected":""}>Inactiva</option></select></div><div class="field"><label for="promoDiscount">Descuento (%)</label><input id="promoDiscount" name="discount" type="number" min="0" max="90" value="${data.promo.discount}"></div><div class="field"><label for="promoBadge">Etiqueta</label><input id="promoBadge" name="label" value="${escapeHTML(data.promo.label)}"></div><div class="field"><label for="promoProduct">Producto asociado</label><select id="promoProduct" name="productId">${data.products.map(product=>`<option value="${escapeHTML(product.id)}" ${data.promo.productId===product.id?"selected":""}>${escapeHTML(product.name)}</option>`).join("")}</select></div><div class="field full"><label for="promoTitleInput">Título</label><input id="promoTitleInput" name="title" value="${escapeHTML(data.promo.title)}"></div><div class="field full"><label for="promoDescriptionInput">Descripción</label><textarea id="promoDescriptionInput" name="description">${escapeHTML(data.promo.description)}</textarea></div></div><button class="button button-dark" type="submit">Guardar promoción</button><div class="admin-promo-preview">El descuento se aplica automáticamente al producto asociado en el catálogo, carrito y pedido.</div></form>`;
  const bindAdminTab = () => {
    $("[data-new-product]")?.addEventListener("click",()=>showProductForm());
    $$("[data-edit-product]").forEach(button=>button.addEventListener("click",()=>showProductForm(button.dataset.editProduct)));
    $$("[data-delete-product]").forEach(button=>button.addEventListener("click",()=>{
      const product=data.products.find(item=>item.id===button.dataset.deleteProduct);
      if(!product)return;
      if(!confirm(`¿Eliminar "${product.name}" del catálogo?`))return;
      data.products=data.products.filter(item=>item.id!==product.id);
      data.categories=[...new Set(data.products.map(item=>item.category))];
      data.cart=data.cart.filter(line=>line.productId!==product.id);
      data.favorites=data.favorites.filter(id=>id!==product.id);
      if(data.promo.productId===product.id){
        data.promo.productId=data.products[0]?.id||"";
        if(!data.promo.productId)data.promo.active=false;
      }
      persist();renderProducts();renderContact();renderAdmin();toast("Producto eliminado.");
    }));
    $$("[data-order-status]").forEach(select=>select.addEventListener("change",()=>{const order=data.orders.find(item=>item.id===select.dataset.orderStatus);if(order){order.status=select.value;persist();toast(`Estado de ${order.id} actualizado.`);}}));
    $("#settingsForm")?.addEventListener("submit",event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget).entries());data.settings={...data.settings,businessName:values.businessName.trim(),phone:values.phone.replace(/\D/g,""),address:values.address.trim(),minimum:Math.max(0,Number(values.minimum)||0),deliveryEnabled:values.deliveryEnabled==="on"};persist();renderContact();renderAdmin();toast("Datos del negocio guardados.");});
    $$("[data-hour-closed]").forEach(check=>check.addEventListener("change",()=>{const index=Number(check.dataset.hourClosed);$$(`[data-hour-open="${index}"], [data-hour-close="${index}"]`).forEach(input=>input.disabled=check.checked);}));
    $("#hoursForm")?.addEventListener("submit",event=>{event.preventDefault();data.hours=data.hours.map((row,index)=>({day:row.day,open:$(`[data-hour-open="${index}"]`).value,close:$(`[data-hour-close="${index}"]`).value,closed:$(`[data-hour-closed="${index}"]`).checked}));persist();renderContact();renderAdmin();toast("Horarios guardados.");});
    $("[data-add-zone]")?.addEventListener("click",()=>{data.zones.push({name:"Nueva zona",fee:5,min:20,eta:"30–45 min",active:true});persist();renderAdmin();});
    $("[data-save-zones]")?.addEventListener("click",()=>{data.zones=data.zones.map((zone,index)=>({...zone,name:$(`[data-zone-name="${index}"]`).value.trim(),fee:Math.max(0,Number($(`[data-zone-fee="${index}"]`).value)||0),min:Math.max(0,Number($(`[data-zone-min="${index}"]`).value)||0),active:$(`[data-zone-active="${index}"]`).checked}));persist();toast("Zonas de delivery guardadas.");});
    $("#promoForm")?.addEventListener("submit",event=>{event.preventDefault();const v=Object.fromEntries(new FormData(event.currentTarget).entries());data.promo={active:v.active==="true",discount:Math.min(90,Math.max(0,Number(v.discount)||0)),label:v.label.trim(),productId:v.productId,title:v.title.trim(),description:v.description.trim()};persist();renderContact();renderAdmin();toast("Promoción guardada.");});
  };
  const showProductForm = id => {
    const product=id?data.products.find(item=>item.id===id):{name:"",category:data.categories[0]||"",description:"",price:"",stock:"",image:"",badge:""};
    const categories=[...new Set([...data.categories,product.category].filter(Boolean))];
    openModal(`<div class="modal-kicker">CATÁLOGO DE LA PANADERÍA</div><h2 class="modal-title" id="modalTitle">${id?"Editar producto":"Nuevo producto"}.</h2><p class="modal-subtitle">Completa los datos de este producto.</p><form id="productForm"><div class="form-grid"><div class="field"><label for="productName">Nombre *</label><input id="productName" name="name" value="${escapeHTML(product.name)}" required></div><div class="field"><label for="productCategory">Categoría *</label><input id="productCategory" name="category" list="categoryOptions" value="${escapeHTML(product.category)}" required><datalist id="categoryOptions">${categories.map(category=>`<option value="${escapeHTML(category)}">`).join("")}</datalist></div><div class="field"><label for="productPrice">Precio (S/) *</label><input id="productPrice" name="price" type="number" min="0" step=".1" value="${escapeHTML(product.price)}" required></div><div class="field"><label for="productStock">Stock *</label><input id="productStock" name="stock" type="number" min="0" step="1" value="${escapeHTML(product.stock)}" required></div><div class="field full"><label for="productDescription">Descripción</label><textarea id="productDescription" name="description">${escapeHTML(product.description)}</textarea></div><div class="field full"><label for="productImage">URL de la fotografía</label><input id="productImage" name="image" type="url" value="${product.image.startsWith("data:")?"":escapeHTML(product.image)}" placeholder="https://..."></div><div class="field full"><label for="productImageFile">O subir una fotografía</label><input id="productImageFile" name="imageFile" type="file" accept="image/*"></div><div class="field full"><label for="productBadge">Etiqueta</label><input id="productBadge" name="badge" value="${escapeHTML(product.badge)}" placeholder="Ej.: Más pedido"></div></div><p class="small-muted">Las imágenes subidas se guardan en este navegador; se recomienda usar fotografías optimizadas de menos de 1 MB.</p><button class="button button-dark modal-primary" type="submit">Guardar producto</button></form>`,true);
    $("#productForm").addEventListener("submit",event=>{
      event.preventDefault();
      const values=Object.fromEntries(new FormData(event.currentTarget).entries());
      const file=$("#productImageFile").files[0];
      if(file&&(!file.type.startsWith("image/")||file.size>1024*1024))return toast("Elige una imagen de menos de 1 MB.",true);
      const persistProduct=image=>{
        const updated={id:id||`producto-${Date.now()}`,name:values.name.trim(),category:values.category.trim(),description:values.description.trim(),price:Math.max(0,Number(values.price)||0),stock:Math.max(0,Math.floor(Number(values.stock)||0)),image:image||product.image||photo("photo-1509440159596-0249088772ff"),badge:values.badge.trim()};
        if(id)data.products=data.products.map(item=>item.id===id?updated:item);else data.products.push(updated);
        data.categories=[...new Set([...data.categories,updated.category])];persist();renderProducts();renderAdmin();toast(id?"Producto actualizado.":"Producto añadido al catálogo.");
      };
      if(!file)return persistProduct(values.image.trim());
      const reader=new FileReader();
      reader.addEventListener("load",()=>{if(typeof reader.result==="string")persistProduct(reader.result);else toast("No se pudo leer la imagen.",true);});
      reader.addEventListener("error",()=>toast("No se pudo cargar la imagen.",true));
      reader.readAsDataURL(file);
    });
  };
  const waContact = message => {
    const phone=(data.settings.phone||"").replace(/\D/g,"");
    const number=phone?`51${phone}`:"";
    const url=`https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(url,"_blank","noopener");
    if(!phone)toast("WhatsApp se abrió sin destinatario: configura el número real desde Administración.");
  };
  document.addEventListener("click",event=>{
    const target=event.target.closest("button,a");
    if(!target)return;
    if(target.matches("[data-close-modal]")){closeModal();return;}
    if(target.matches("[data-open-admin]")){openAdmin();return;}
    if(target.matches("[data-category]")){selectedCategory=target.dataset.category;onlyFavorites=false;renderProducts();return;}
    if(target.matches("[data-add]")){addToCart(target.dataset.add);return;}
    if(target.matches("[data-favorite]")){const id=target.dataset.favorite;data.favorites.includes(id)?data.favorites=data.favorites.filter(item=>item!==id):data.favorites.push(id);persist();renderProducts();return;}
    if(target.matches("[data-clear-search]")){$("#productSearch").value="";selectedCategory="Todos";onlyFavorites=false;renderProducts();return;}
    if(target.matches("[data-remove]")){data.cart=data.cart.filter(line=>line.productId!==target.dataset.remove);persist();renderProducts();openCart();return;}
    if(target.matches("[data-quantity]")){const line=data.cart.find(item=>item.productId===target.dataset.quantity);const product=data.products.find(item=>item.id===target.dataset.quantity);if(!line||!product)return;line.quantity+=Number(target.dataset.delta);if(line.quantity<=0)data.cart=data.cart.filter(item=>item!==line);if(line.quantity>product.stock)line.quantity=product.stock;persist();renderProducts();openCart();return;}
  });
  $("#productSearch").addEventListener("input",()=>{onlyFavorites=false;renderProducts();});
  $("#sortProducts").addEventListener("change",renderProducts);
  $("#showFavorites").addEventListener("click",()=>{onlyFavorites=!onlyFavorites;selectedCategory="Todos";renderProducts();});
  $("#favoritesShortcut").addEventListener("click",()=>{onlyFavorites=true;selectedCategory="Todos";renderProducts();$("#productos").scrollIntoView({behavior:"smooth"});});
  $("#historyShortcut").addEventListener("click",openHistory);
  $("#cartShortcut").addEventListener("click",openCart);
  $("#heroOrder").addEventListener("click",openCart);
  $("#contactOrder").addEventListener("click",openCart);
  $("#scheduleButton").addEventListener("click",openCart);
  $("#promoButton").addEventListener("click",()=>{if(data.promo.active&&data.promo.productId)addToCart(data.promo.productId);$("#productos").scrollIntoView({behavior:"smooth"});});
  $("#contactWhatsapp").addEventListener("click",()=>waContact(`Hola, quisiera consultar sobre los productos de ${data.settings.businessName||"la panadería"}.`));
  $("#floatingWhatsapp").addEventListener("click",()=>waContact(`Hola, quisiera hacer una consulta a ${data.settings.businessName||"la panadería"}.`));
  $("#menuToggle").addEventListener("click",()=>{const nav=$("#mainNav"),isOpen=nav.classList.toggle("open");$("#menuToggle").setAttribute("aria-expanded",String(isOpen));});
  $$("#mainNav a").forEach(link=>link.addEventListener("click",()=>{$("#mainNav").classList.remove("open");$("#menuToggle").setAttribute("aria-expanded","false");}));
  $("#modalBackdrop").addEventListener("click",event=>{if(event.target.id==="modalBackdrop")closeModal();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!$("#modalBackdrop").hidden)closeModal();});
  renderHeader();renderProducts();renderContact();
  if(storageReadFailed)toast("No se pudo leer el almacenamiento guardado. Se inició una demostración nueva.");
})();
