"use strict";exports.id=1744,exports.ids=[1744],exports.modules={29990:(a,b,c)=>{c.d(b,{AR:()=>k,Co:()=>j,FD:()=>l,Ys:()=>g,r9:()=>i,vp:()=>n,yA:()=>m,zt:()=>h});var d=c(6170);let e=`
  p.id,
  p.name,
  p.slug,
  p.sku,
  p.description,
  p.images,
  p.brand,
  p.price,
  p.oldprice,
  p.catName,
  p.catId,
  p.subCatId,
  p.subCat,
  p.thirdSubCatId,
  p.thirdSubCat,
  p.countInStock,
  p.rating,
  p.isFeatured,
  p.discount,
  p.productRam,
  p.size,
  p.productWeight,
  p.createdAt,
  p.updatedAt
`;function f(a){return{id:a.cartId,_id:a.cartId,productId:a?{id:a.id,_id:a.id,name:a.name,slug:a.slug,sku:a.sku,description:a.description,images:q(a.images,[]),brand:a.brand,price:Number(a.price||0),oldprice:Number(a.oldprice||0),catName:a.catName,catId:a.catId,subCatId:a.subCatId,subCat:a.subCat,thirdSubCatId:a.thirdSubCatId,thirdSubCat:a.thirdSubCat,countInStock:Number(a.countInStock||0),rating:Number(a.rating||0),isFeatured:!!a.isFeatured,discount:Number(a.discount||0),productRam:a.productRam,size:q(a.size,[]),productWeight:q(a.productWeight,[]),createdAt:a.createdAt,updatedAt:a.updatedAt}:null,quantity:Number(a.quantity||1),userId:a.userId,createdAt:a.cartCreatedAt,updatedAt:a.cartUpdatedAt}}async function g(a){return(await (0,d.P)(`SELECT
       cp.id AS cartId,
       cp.quantity,
       cp.userId,
       cp.createdAt AS cartCreatedAt,
       cp.updatedAt AS cartUpdatedAt,
       ${e}
     FROM CartProducts cp
     LEFT JOIN Products p ON p.id = cp.productId
     WHERE cp.userId = :userId
     ORDER BY cp.createdAt DESC`,{userId:a})).map(f)}async function h(a,b=null){return(await o(b,`SELECT id, productId, quantity
     FROM CartProducts
     WHERE userId = :userId
     ORDER BY createdAt DESC`,{userId:a})).map(a=>({id:a.id,productId:a.productId,quantity:Number(a.quantity||1)}))}async function i(a,b,c=null){let d=await o(c,`SELECT id, productId, quantity, userId, createdAt, updatedAt
     FROM CartProducts
     WHERE userId = :userId AND productId = :productId
     LIMIT 1`,{userId:a,productId:b});return d[0]?{...d[0],_id:d[0].id,quantity:Number(d[0].quantity||1)}:null}async function j(a,b,c=1,d=null){let e=await p(d,`INSERT INTO CartProducts (
      productId,
      quantity,
      userId,
      createdAt,
      updatedAt
    ) VALUES (
      :productId,
      :quantity,
      :userId,
      NOW(),
      NOW()
    )`,{userId:a,productId:b,quantity:c});return{id:e.insertId,_id:e.insertId,productId:b,quantity:c,userId:a}}async function k(a,b,c,d=null){return(await p(d,`UPDATE CartProducts
     SET quantity = :quantity, updatedAt = NOW()
     WHERE id = :id AND userId = :userId`,{id:a,userId:b,quantity:c})).affectedRows>0}async function l(a,b,c=null){return(await p(c,`DELETE FROM CartProducts
     WHERE id = :id AND userId = :userId`,{id:a,userId:b})).affectedRows>0}async function m(a,b=null){await p(b,`DELETE FROM CartProducts
     WHERE userId = :userId`,{userId:a})}async function n(a,b,c=null){b.length&&await p(c,`DELETE FROM CartProducts
     WHERE userId = :userId AND id IN (${b.map(a=>Number(a)).join(",")})`,{userId:a})}async function o(a,b,c={}){if(a){let[d]=await a.query(b,c);return d}return(0,d.P)(b,c)}async function p(a,b,c={}){if(a){let[d]=await a.execute(b,c);return d}return(0,d.g7)(b,c)}function q(a,b){try{return JSON.parse(a||JSON.stringify(b))}catch{return b}}},64925:(a,b,c)=>{c.d(b,{$O:()=>l,M1:()=>f,W_:()=>k,Wg:()=>g,c8:()=>j,gV:()=>h,rS:()=>i});var d=c(6170);function e(a){return a?{...a,_id:a.id,value:Number(a.value||0),minOrderValue:Number(a.minOrderValue||0),maxDiscount:null==a.maxDiscount?null:Number(a.maxDiscount),usageLimit:null==a.usageLimit?null:Number(a.usageLimit),usageCount:Number(a.usageCount||0),isActive:!!a.isActive}:null}async function f(){return(await (0,d.P)(`SELECT
       id,
       code,
       description,
       type,
       value,
       minOrderValue,
       maxDiscount,
       usageLimit,
       usageCount,
       isActive,
       expiresAt,
       createdAt,
       updatedAt
     FROM Coupons
     ORDER BY createdAt DESC`)).map(e)}async function g(a,b=null){return e((await m(b,`SELECT
       id,
       code,
       description,
       type,
       value,
       minOrderValue,
       maxDiscount,
       usageLimit,
       usageCount,
       isActive,
       expiresAt,
       createdAt,
       updatedAt
     FROM Coupons
     WHERE id = :id
     LIMIT 1`,{id:a}))[0])}async function h(a,b=null){return e((await m(b,`SELECT
       id,
       code,
       description,
       type,
       value,
       minOrderValue,
       maxDiscount,
       usageLimit,
       usageCount,
       isActive,
       expiresAt,
       createdAt,
       updatedAt
     FROM Coupons
     WHERE code = :code
     LIMIT 1`,{code:a}))[0])}async function i(a){return g((await (0,d.g7)(`INSERT INTO Coupons (
      code,
      description,
      type,
      value,
      minOrderValue,
      maxDiscount,
      usageLimit,
      usageCount,
      isActive,
      expiresAt,
      createdAt,
      updatedAt
    ) VALUES (
      :code,
      :description,
      :type,
      :value,
      :minOrderValue,
      :maxDiscount,
      :usageLimit,
      0,
      :isActive,
      :expiresAt,
      NOW(),
      NOW()
    )`,{...a,isActive:+!!a.isActive})).insertId)}async function j(a,b){let c=Object.entries({...b,isActive:void 0===b.isActive?void 0:+!!b.isActive}).filter(([,a])=>void 0!==a);if(!c.length)return g(a);let e=c.map(([a])=>`\`${a}\` = :${a}`).join(", ");return await (0,d.g7)(`UPDATE Coupons
     SET ${e}, updatedAt = NOW()
     WHERE id = :id`,{id:a,...Object.fromEntries(c)}),g(a)}async function k(a){return(await (0,d.g7)(`DELETE FROM Coupons
     WHERE id = :id`,{id:a})).affectedRows>0}async function l(a,b=null){await n(b,`UPDATE Coupons
     SET usageCount = usageCount + 1, updatedAt = NOW()
     WHERE id = :id`,{id:a})}async function m(a,b,c={}){if(a){let[d]=await a.query(b,c);return d}return(0,d.P)(b,c)}async function n(a,b,c={}){if(a){let[d]=await a.execute(b,c);return d}return(0,d.g7)(b,c)}},76462:(a,b,c)=>{c.d(b,{Cv:()=>l,FR:()=>j,II:()=>h,Kw:()=>k,LL:()=>i,w$:()=>g});var d=c(6170);let e=`
  id,
  name,
  mobile,
  pincode,
  flatHouse,
  areaStreet,
  landmark,
  townCity,
  state,
  country,
  status,
  isDefault,
  userId,
  createdAt,
  updatedAt
`;function f(a){return a?{...a,_id:a.id,status:!!a.status,isDefault:!!a.isDefault}:null}async function g(a){return(await (0,d.P)(`SELECT ${e}
     FROM Addresses
     WHERE userId = :userId
     ORDER BY isDefault DESC, createdAt DESC`,{userId:a})).map(f)}async function h(a,b){return f((await (0,d.P)(`SELECT ${e}
     FROM Addresses
     WHERE id = :id AND userId = :userId
     LIMIT 1`,{id:a,userId:b}))[0])}async function i(a){await (0,d.g7)(`UPDATE Addresses
     SET isDefault = 0, updatedAt = NOW()
     WHERE userId = :userId`,{userId:a})}async function j(a){return h((await (0,d.g7)(`INSERT INTO Addresses (
      name,
      mobile,
      pincode,
      flatHouse,
      areaStreet,
      landmark,
      townCity,
      state,
      country,
      status,
      isDefault,
      userId,
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :mobile,
      :pincode,
      :flatHouse,
      :areaStreet,
      :landmark,
      :townCity,
      :state,
      :country,
      :status,
      :isDefault,
      :userId,
      NOW(),
      NOW()
    )`,{...a,status:a.status??!0,isDefault:+!!a.isDefault})).insertId,a.userId)}async function k(a,b,c){let e=Object.entries(c).filter(([,a])=>void 0!==a);if(0===e.length)return h(a,b);let f=e.map(([a])=>`\`${a}\` = :${a}`).join(", ");return await (0,d.g7)(`UPDATE Addresses
     SET ${f}, updatedAt = NOW()
     WHERE id = :id AND userId = :userId`,{id:a,userId:b,...Object.fromEntries(e)}),h(a,b)}async function l(a,b){return(await (0,d.g7)(`DELETE FROM Addresses
     WHERE id = :id AND userId = :userId`,{id:a,userId:b})).affectedRows>0}},81744:(a,b,c)=>{c.d(b,{Bg:()=>w,tH:()=>A,VQ:()=>o,L0:()=>y,oP:()=>l.oP,BV:()=>D,Fh:()=>C,FK:()=>B,bF:()=>z,By:()=>n,Kv:()=>E});var d=c(59984),e=c(6170),f=c(19091);function g(a){return`Rs.${Number(a||0).toLocaleString("en-IN")}`}async function h(a,b){if(b?.email)try{await (0,f.Z)({to:b.email,subject:`Order Confirmed! #${a.id} - InfixMart`,text:`Hi ${b.name||"Customer"}, your order #${a.id} has been confirmed. Total: ${g(a.totalPrice)}.`,html:function(a,b){let c=Array.isArray(a.items)?a.items:[],d=a.shippingAddress||{},e=c.map(a=>`
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${a.name||"Product"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${a.qty||1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${g(Number(a.price||0)*Number(a.qty||1))}</td>
        </tr>`).join("");return`<!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,sans-serif;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#1565C0;color:#fff;padding:18px 24px;font-size:20px;font-weight:700;">InfixMart Order Confirmation</td></tr>
          <tr><td style="padding:24px;">
            <p style="margin:0 0 12px;">Hi <strong>${b?.name||"Customer"}</strong>,</p>
            <p style="margin:0 0 18px;">Your order #${a.id} has been placed successfully.</p>
            <p style="margin:0 0 18px;"><strong>Total:</strong> ${g(a.totalPrice)}</p>
            <p style="margin:0 0 18px;"><strong>Payment:</strong> ${a.paymentMethod||"COD"}</p>
            <p style="margin:0 0 18px;"><strong>Shipping Address:</strong> ${[d.name,d.address,d.city,d.state,d.postalCode].filter(Boolean).join(", ")||"Not available"}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaed;border-collapse:collapse;">
              <thead>
                <tr style="background:#f0f5ff;color:#1565C0;">
                  <th style="padding:10px 12px;text-align:left;">Item</th>
                  <th style="padding:10px 12px;text-align:center;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${e}</tbody>
            </table>
          </td></tr>
        </table>
      </td></tr></table>
    </body>
  </html>`}(a,b)})}catch(a){console.error("[order-email]",a)}}var i=c(76462),j=c(29990),k=c(64925),l=c(89529),m=c(17194);function n(a){return Math.round(100*Number(a||0))/100}function o(a,b){let c=Error(b);return c.status=a,c}function p(a,b){try{return JSON.parse(a)}catch{return b}}function q(a){let b=Number(a);return Number.isInteger(b)&&b>0?b:null}async function r(a){let b=(await F(a,`SELECT \`key\`, \`value\`
     FROM StoreSettings`)).reduce((a,b)=>(a[b.key]=b.value,a),{});return{gstPercent:Math.max(0,Number(b.gst_percent)||0),cartMilestones:p(b.cart_milestones||"[]",[])}}async function s({userId:a,addressId:b,shippingAddress:c}){if(b){let c=await (0,i.II)(b,a);if(!c)throw o(400,"Selected address was not found.");return{name:c.name,phone:c.mobile,address:c.flatHouse+(c.areaStreet?`, ${c.areaStreet}`:""),city:c.townCity,state:c.state,postalCode:c.pincode,country:c.country||"India"}}if(!c||"object"!=typeof c)throw o(400,"Delivery address is required.");let d={name:String(c.name||"").trim(),phone:String(c.phone||c.mobile||"").trim(),address:String(c.address||"").trim(),city:String(c.city||c.townCity||"").trim(),state:String(c.state||"").trim(),postalCode:String(c.postalCode||c.pincode||"").trim(),country:String(c.country||"India").trim()||"India"};if(!d.name||!d.phone||!d.address||!d.city||!d.state||!d.postalCode)throw o(400,"Delivery address is incomplete.");return d}async function t({couponCode:a,baseTotal:b,conn:c}){if(!a)return{couponId:null,couponCode:null,couponDiscount:0};let d=await (0,k.gV)(String(a).toUpperCase().trim(),c);if(!d||!d.isActive)throw o(400,"Invalid or expired coupon code.");if(d.expiresAt&&new Date(d.expiresAt)<new Date)throw o(400,"This coupon has expired.");if(null!==d.usageLimit&&d.usageCount>=d.usageLimit)throw o(400,"This coupon has reached its usage limit.");if(b<d.minOrderValue)throw o(400,`Minimum order value Rs.${d.minOrderValue} required for this coupon.`);return{couponId:d.id,couponCode:d.code,couponDiscount:function(a,b){if(!a)return 0;let c=0;return"percent"===a.type?(c=Math.round(b*a.value/100),a.maxDiscount&&(c=Math.min(c,a.maxDiscount))):c=Number(a.value||0),Math.min(n(c),n(b))}(d,b)}}async function u(a,b,c){let d=(await F(a,`SELECT
       id,
       name,
       images,
       price,
       countInStock
     FROM Products
     WHERE id = :productId
     ${c?"FOR UPDATE":""}`,{productId:b}))[0];if(!d)throw o(400,`Product ${b} not found.`);return{...d,images:p(d.images||"[]",[]),price:Number(d.price||0),countInStock:Number(d.countInStock||0)}}async function v({userId:a,items:b,addressId:c,shippingAddress:d,couponCode:e,conn:f,lockProducts:g=!1}){let h=function(a){if(!Array.isArray(a)||0===a.length)throw o(400,"Your cart is empty.");let b=new Map;for(let c of a){let a=q(c?.product??c?.productId),d=q(c?.qty??c?.quantity),e=q(c?.cartItemId??c?.id);if(!a||!d)throw o(400,"Invalid checkout item payload.");let f=b.get(a)||{productId:a,qty:0,cartItemIds:[]};f.qty+=d,e&&f.cartItemIds.push(e),b.set(a,f)}return[...b.values()]}(b),[{gstPercent:i,cartMilestones:j},k]=await Promise.all([r(f),s({userId:a,addressId:c,shippingAddress:d})]),l=[],m=[],p=0;for(let a of h){let b=await u(f,a.productId,g);if(b.countInStock<a.qty)throw o(400,`Insufficient stock for "${b.name}". Only ${b.countInStock} left.`);let c=n(b.price);p+=c*a.qty,l.push({productId:b.id,name:b.name,image:b.images?.[0]||"",price:c,qty:a.qty}),m.push(...a.cartItemIds)}p=n(p);let v=!!Array.isArray(j)&&j.some(a=>a&&"free_shipping"===a.type&&!1!==a.enabled&&p>=Number(a.amount||0)),w=p>=999||v?0:49,x=n(i/100*p),y=n(p+w+x),z=await t({couponCode:e,baseTotal:y,conn:f});return{userId:a,addressId:c?Number(c):null,shippingAddress:k,secureOrderItems:l,cartItemIds:[...new Set(m)],itemsPrice:p,shippingPrice:w,gstAmount:x,totalPrice:n(y-z.couponDiscount),couponId:z.couponId,couponCode:z.couponCode,couponDiscount:z.couponDiscount,currency:"INR"}}async function w({userId:a,addressId:b,shippingAddress:c,couponCode:d,conn:e,lockProducts:f=!1}){let g=(await (0,j.zt)(a,e)).map(a=>({cartItemId:a.id,productId:a.productId,qty:a.quantity}));return v({userId:a,items:g,addressId:b,shippingAddress:c,couponCode:d,conn:e,lockProducts:f})}async function x(a,b,c){if(0===(await G(a,`UPDATE Products
     SET countInStock = countInStock - :qty, updatedAt = NOW()
     WHERE id = :productId AND countInStock >= :qty`,{productId:b,qty:c})).affectedRows)throw o(400,"Insufficient stock while finalizing the order.")}async function y({userId:a,checkout:b,paymentMethod:c,paymentResult:d={},isPaid:e=!1,paidAt:f=null,conn:g}){if(!b?.secureOrderItems?.length)throw o(400,"No order items.");for(let a of b.secureOrderItems)await x(g,a.productId,a.qty);let h=await (0,l.fS)({userId:a,items:b.secureOrderItems,shippingAddress:b.shippingAddress,paymentMethod:c,paymentResult:{...d||{},...b.couponCode?{couponCode:b.couponCode,couponDiscount:b.couponDiscount}:{}},itemsPrice:n(b.itemsPrice),shippingPrice:n(b.shippingPrice),gstAmount:n(b.gstAmount),totalPrice:n(b.totalPrice),isPaid:!0===e,paidAt:e?f||new Date:null,status:"pending"},g);return await (0,l.HZ)(h.id,b.secureOrderItems,g),b.couponId&&await (0,k.$O)(b.couponId,g),Array.isArray(b.cartItemIds)&&b.cartItemIds.length>0&&await (0,j.vp)(a,b.cartItemIds,g),(0,l.Uo)(h.id,g)}async function z(a,b){let c=await (0,m.lC)(a);await h(b,c)}async function A(a,b){if("COD"!==(b?.paymentMethod||"COD"))throw new d.j$(400,"Online payments must be completed through the payment verification endpoint.");let c=await (0,e.FO)().getConnection();try{await c.beginTransaction();let d=Array.isArray(b?.items)&&b.items.length>0?await v({userId:a,items:b.items,addressId:b.addressId,shippingAddress:b.shippingAddress,couponCode:b.couponCode,conn:c,lockProducts:!0}):await w({userId:a,addressId:b.addressId,shippingAddress:b.shippingAddress,couponCode:b.couponCode,conn:c,lockProducts:!0}),e=await y({userId:a,checkout:d,paymentMethod:"COD",conn:c});return await c.commit(),await z(a,e),{order:e,message:"Order created successfully",success:!0,error:!1}}catch(a){if(await c.rollback(),a.status)throw new d.j$(a.status,a.message);throw a}finally{c.release()}}async function B(a){return{orders:await (0,l.PQ)(a),message:"Orders fetched successfully",success:!0,error:!1}}async function C(a,b){let c=await (0,l.Uo)(b);if(!c)throw new d.j$(404,"Order not found");if(c.userId!==Number(a)){let b=await (0,m.lC)(a);if(!b||"admin"!==b.role)throw new d.j$(403,"Access denied")}return{order:c,message:"Order fetched successfully",success:!0,error:!1}}async function D(a){return{...await (0,l.Lj)(a),message:"All orders fetched",success:!0,error:!1}}async function E(a,b){if(!["pending","processing","shipped","delivered","cancelled"].includes(b))throw new d.j$(400,"Invalid status value");if(!await (0,l.Uo)(a))throw new d.j$(404,"Order not found");return await (0,l.Kv)(a,b),{order:await (0,l.Uo)(a),message:"Order status updated",success:!0,error:!1}}async function F(a,b,c={}){let[d]=await a.query(b,c);return d}async function G(a,b,c={}){let[d]=await a.execute(b,c);return d}},89529:(a,b,c)=>{c.d(b,{HZ:()=>g,Kv:()=>k,Lj:()=>j,PQ:()=>i,Uo:()=>h,fS:()=>f,oP:()=>l});var d=c(6170);function e(a){return a?{...a,_id:a.id,items:o(a.items,[]),shippingAddress:o(a.shippingAddress,{}),paymentResult:o(a.paymentResult,{}),itemsPrice:Number(a.itemsPrice||0),shippingPrice:Number(a.shippingPrice||0),gstAmount:Number(a.gstAmount||0),totalPrice:Number(a.totalPrice||0),isPaid:!!a.isPaid}:null}async function f(a,b=null){return h((await n(b,`INSERT INTO Orders (
      userId,
      items,
      shippingAddress,
      paymentMethod,
      paymentResult,
      itemsPrice,
      shippingPrice,
      gstAmount,
      totalPrice,
      isPaid,
      paidAt,
      status,
      createdAt,
      updatedAt
    ) VALUES (
      :userId,
      :items,
      :shippingAddress,
      :paymentMethod,
      :paymentResult,
      :itemsPrice,
      :shippingPrice,
      :gstAmount,
      :totalPrice,
      :isPaid,
      :paidAt,
      :status,
      NOW(),
      NOW()
    )`,{...a,items:JSON.stringify(a.items||[]),shippingAddress:JSON.stringify(a.shippingAddress||{}),paymentResult:JSON.stringify(a.paymentResult||{}),isPaid:+!!a.isPaid,paidAt:a.paidAt||null,status:a.status||"pending"})).insertId,b)}async function g(a,b,c=null){for(let d of b)await n(c,`INSERT INTO OrderItems (
        orderId,
        productId,
        name,
        image,
        price,
        qty,
        createdAt,
        updatedAt
      ) VALUES (
        :orderId,
        :productId,
        :name,
        :image,
        :price,
        :qty,
        NOW(),
        NOW()
      )`,{orderId:a,productId:d.productId,name:d.name,image:d.image||"",price:d.price,qty:d.qty})}async function h(a,b=null){return e((await m(b,`SELECT
       id,
       userId,
       items,
       shippingAddress,
       paymentMethod,
       paymentResult,
       itemsPrice,
       shippingPrice,
       gstAmount,
       totalPrice,
       isPaid,
       paidAt,
       status,
       createdAt,
       updatedAt
     FROM Orders
     WHERE id = :id
     LIMIT 1`,{id:a}))[0])}async function i(a){return(await (0,d.P)(`SELECT
       id,
       userId,
       items,
       shippingAddress,
       paymentMethod,
       paymentResult,
       itemsPrice,
       shippingPrice,
       gstAmount,
       totalPrice,
       isPaid,
       paidAt,
       status,
       createdAt,
       updatedAt
     FROM Orders
     WHERE userId = :userId
     ORDER BY createdAt DESC`,{userId:a})).map(e)}async function j({page:a=1,perPage:b=10}){let[c,f]=await Promise.all([(0,d.P)("SELECT COUNT(*) AS totalOrders FROM Orders"),(0,d.P)(`SELECT
         id,
         userId,
         items,
         shippingAddress,
         paymentMethod,
         paymentResult,
         itemsPrice,
         shippingPrice,
         gstAmount,
         totalPrice,
         isPaid,
         paidAt,
         status,
         createdAt,
         updatedAt
       FROM Orders
       ORDER BY createdAt DESC
       LIMIT :limit OFFSET :offset`,{limit:b,offset:(a-1)*b})]),g=Number(c[0]?.totalOrders||0);return{orders:f.map(e),totalOrders:g,totalPages:Math.max(1,Math.ceil(g/b)),page:a}}async function k(a,b){return(await (0,d.g7)(`UPDATE Orders
     SET status = :status, updatedAt = NOW()
     WHERE id = :id`,{id:a,status:b})).affectedRows>0}async function l(a,b=null){return a?e((await m(b,`SELECT
       id,
       userId,
       items,
       shippingAddress,
       paymentMethod,
       paymentResult,
       itemsPrice,
       shippingPrice,
       gstAmount,
       totalPrice,
       isPaid,
       paidAt,
       status,
       createdAt,
       updatedAt
     FROM Orders
     WHERE isPaid = 1 AND paymentResult LIKE :paymentId
     LIMIT 1`,{paymentId:`%${a}%`}))[0]):null}async function m(a,b,c={}){if(a){let[d]=await a.query(b,c);return d}return(0,d.P)(b,c)}async function n(a,b,c={}){if(a){let[d]=await a.execute(b,c);return d}return(0,d.g7)(b,c)}function o(a,b){try{return JSON.parse(a||JSON.stringify(b))}catch{return b}}}};