"use strict";exports.id=9168,exports.ids=[9168],exports.modules={7875:(a,b,c)=>{c.d(b,{Vn:()=>p,hK:()=>q,y_:()=>r});var d=c(55511),e=c(79748),f=c(33873),g=c(59984);let h=f.resolve(process.cwd(),"uploads"),i=new Map([["image/jpeg",[".jpg",".jpeg"]],["image/png",[".png"]],["image/webp",[".webp"]],["image/gif",[".gif"]],["image/avif",[".avif"]]]),j=Number(process.env.UPLOAD_MAX_FILES),k=Number(process.env.UPLOAD_MAX_FILE_SIZE_MB),l=Number.isFinite(j)&&j>0?Math.floor(j):10,m=Number.isFinite(k)&&k>0?k:8,n=1024*m*1024;async function o(){await e.mkdir(h,{recursive:!0})}async function p(a,b){let c=a.getAll(b).filter(Boolean);if(c.length>l)throw new g.j$(400,`You can upload up to ${l} images at a time.`);await o();let j=[];for(let a of c){if("string"==typeof a)continue;let b=function(a=""){let b=/^[.][a-z0-9]+$/.test(a)?a:"";return`${(0,d.randomUUID)()}${b}`}(function(a){let b=function(a){let b=i.get(String(a?.type||"").toLowerCase()),c=f.extname(a?.name||"").toLowerCase();return b&&b.includes(c)?b[0]:null}(a);if(!b)throw new g.j$(400,"Only JPG, JPEG, PNG, WEBP, GIF, or AVIF image uploads are allowed.");if(!Number.isFinite(a?.size)||0>=Number(a.size))throw new g.j$(400,"Uploaded file is empty.");if(Number(a.size)>n)throw new g.j$(413,`Each image must be smaller than ${Math.floor(m)}MB.`);return b}(a)),c=Buffer.from(await a.arrayBuffer());await e.writeFile(f.join(h,b),c),j.push(`/uploads/${b}`)}return j}function q(a){if("string"!=typeof a)return null;let b=a.replace(/\\/g,"/");if(!b.startsWith("/uploads/"))return null;let c=b.slice(9);return!c||c.includes("/")?null:f.join(h,f.basename(c))}async function r(a){let b=q(a);if(!b)return!1;try{return await e.unlink(b),!0}catch{return!1}}},9168:(a,b,c)=>{c.d(b,{AS:()=>j,C7:()=>x,CG:()=>n,Lf:()=>u,MC:()=>m,Ne:()=>s,QO:()=>t,TW:()=>r,dA:()=>v,fB:()=>q,gU:()=>k,iy:()=>y,j$:()=>w,oN:()=>l,qd:()=>z,vX:()=>p,vm:()=>o});var d=c(59984),e=c(13598),f=c(7875),g=c(10548);let h=a=>String(a||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");async function i(a,b=null){let c=h(a||"product"),d=c||"product",e=1;for(;await (0,g.iN)(d,b);)d=`${c||"product"}-${e++}`;return d}async function j(a){return{...await (0,g.Pt)(a),message:"Products fetched successfully",success:!0,error:!1}}async function k(a,b){return{...await (0,g.X5)(a,b),message:"Products fetched successfully",success:!0,error:!1}}async function l(a,b={}){return{...await (0,g.Pt)({page:Number(b.page||1),perPage:Number(b.perPage||1e4),categoryName:a||""}),message:"Products fetched successfully",success:!0,error:!1}}async function m(a,b={}){return{...await (0,g.Pt)({page:Number(b.page||1),perPage:Number(b.perPage||1e4),subCategory:a||""}),message:"Products fetched successfully",success:!0,error:!1}}async function n(a){return{...await (0,g.Pt)({page:1,perPage:1e4,subCategoryName:a||""}),message:"Products fetched successfully",success:!0,error:!1}}async function o(a){return{...await (0,g.Pt)({page:1,perPage:1e4,thirdCategory:a||""}),message:"Products fetched successfully",success:!0,error:!1}}async function p(a){return{...await (0,g.Pt)({page:1,perPage:1e4,thirdCategoryName:a||""}),message:"Products fetched successfully",success:!0,error:!1}}async function q(a={}){return{...await (0,g.Pt)({page:1,perPage:1e4,category:a.catId||"",subCategory:a.subCatId||"",thirdCategory:a.thirdSubCatId||"",minPrice:a.minPrice??"",maxPrice:a.maxPrice??""}),totalPages:0,page:0,message:"Products fetched successfully",success:!0,error:!1}}async function r(a={}){return{...await (0,g.Pt)({page:1,perPage:1e4,category:a.catId||"",subCategory:a.subCatId||"",thirdCategory:a.thirdSubCatId||"",exactRating:a.rating??""}),message:"Products fetched successfully",success:!0,error:!1}}async function s(){return{products:await (0,g.jU)(),message:"Featured Products fetched successfully",success:!0,error:!1}}async function t(a){let b=await (0,g.bT)(a);if(!b)throw new d.j$(404,"Product not found");return{product:b,message:"Product fetched successfully",success:!0,error:!1}}async function u(a){let b=await (0,g.zq)(a);if(!b)throw new d.j$(404,"Product not found");return{product:b,message:"Product fetched successfully",success:!0,error:!1}}async function v(){return{productCount:await (0,g.W0)(),message:"Product count fetched successfully",success:!0,error:!1}}async function w(a){let b=Array.isArray(a.images)?a.images:JSON.parse(a.images||"[]");return{product:await (0,g.WY)({name:a.name,slug:a.slug?await i(a.slug):await i(a.name||"product"),sku:a.sku?String(a.sku).trim().toUpperCase():`SKU-${Date.now()}`,description:(0,e.z)(a.description||""),images:b,brand:a.brand||null,price:Number(a.price||0),oldprice:Number(a.oldprice||0),catName:a.catName||null,catId:a.catId||null,subCatId:a.subCatId||null,subCat:a.subCat||null,thirdSubCatId:a.thirdSubCatId||null,thirdSubCat:a.thirdSubCat||null,countInStock:Number(a.countInStock||0),rating:Number(a.rating||0),isFeatured:a.isFeatured||!1,discount:a.discount??0,productRam:a.productRam||null,size:Array.isArray(a.size)?a.size:JSON.parse(a.size||"[]"),productWeight:Array.isArray(a.productWeight)?a.productWeight:JSON.parse(a.productWeight||"[]")}),message:"Product created successfully",success:!0,error:!1}}async function x(a,b){let c=await (0,g.bT)(a);if(!c)throw new d.j$(404,"Product not found");let f=Array.isArray(b.images)?b.images:JSON.parse(b.images||"[]");return{product:await (0,g.vc)(a,{name:b.name,slug:b.slug?await i(b.slug,a):c.slug,sku:b.sku?String(b.sku).trim().toUpperCase():c.sku,description:(0,e.z)(b.description||""),images:f,brand:b.brand||null,price:Number(b.price||0),oldprice:Number(b.oldprice||0),catName:b.catName||null,catId:b.catId||null,subCatId:b.subCatId||null,subCat:b.subCat||null,thirdSubCatId:b.thirdSubCatId||null,thirdSubCat:b.thirdSubCat||null,countInStock:Number(b.countInStock||0),rating:Number(b.rating||0),isFeatured:b.isFeatured||!1,discount:b.discount??0,productRam:b.productRam||null,size:Array.isArray(b.size)?b.size:JSON.parse(b.size||"[]"),productWeight:Array.isArray(b.productWeight)?b.productWeight:JSON.parse(b.productWeight||"[]")}),message:"Product updated successfully",success:!0,error:!1}}async function y(a){let b=await (0,g.bT)(a);if(!b)throw new d.j$(404,"Product not found");for(let a of b.images||[])await (0,f.y_)(a);return await (0,g.TZ)(a),{message:"Product deleted successfully",success:!0,error:!1}}async function z(a){if(!Array.isArray(a)||0===a.length)throw new d.j$(400,"No product IDs provided");for(let b of(await (0,g.Ue)(a)))for(let a of b.images||[])await (0,f.y_)(a);return await (0,g.PC)(a),{message:"Products deleted successfully",success:!0,error:!1}}},10548:(a,b,c)=>{c.d(b,{PC:()=>q,Pt:()=>g,TZ:()=>o,Ue:()=>p,W0:()=>l,WY:()=>m,X5:()=>h,bT:()=>j,iN:()=>r,jU:()=>i,vc:()=>n,zq:()=>k});var d=c(6170);let e=`
  id,
  name,
  slug,
  sku,
  description,
  images,
  brand,
  price,
  oldprice,
  catName,
  catId,
  subCatId,
  subCat,
  thirdSubCatId,
  thirdSubCat,
  countInStock,
  rating,
  isFeatured,
  discount,
  productRam,
  size,
  productWeight,
  createdAt,
  updatedAt
`;function f(a){return a?{...a,_id:a.id,images:t(a.images,[]),size:t(a.size,[]),productWeight:t(a.productWeight,[]),isFeatured:!!a.isFeatured}:null}async function g({page:a=1,perPage:b=10,category:c="",categoryName:g="",subCategory:h="",subCategoryName:i="",thirdCategory:j="",thirdCategoryName:k="",search:l="",onSale:m="",minRating:n="",exactRating:o="",inStockOnly:p="",minPrice:q="",maxPrice:r="",sort:s=""}){var t;let u=[],v={limit:b,offset:(a-1)*b};c&&(u.push("catId = :category"),v.category=Number(c)),g&&(u.push("catName = :categoryName"),v.categoryName=String(g)),h&&(u.push("subCatId = :subCategory"),v.subCategory=Number(h)),i&&(u.push("subCat = :subCategoryName"),v.subCategoryName=String(i)),j&&(u.push("thirdSubCatId = :thirdCategory"),v.thirdCategory=Number(j)),k&&(u.push("thirdSubCat = :thirdCategoryName"),v.thirdCategoryName=String(k)),l&&(u.push("name LIKE :search"),v.search=`%${l}%`),"true"===m&&u.push("discount > 0"),n&&(u.push("rating >= :minRating"),v.minRating=Number(n)),""!==o&&(u.push("rating = :exactRating"),v.exactRating=Number(o)),"true"===p&&u.push("countInStock > 0"),""!==q&&""!==r?(u.push("price BETWEEN :minPrice AND :maxPrice"),v.minPrice=Number(q),v.maxPrice=Number(r)):""!==q?(u.push("price >= :minPrice"),v.minPrice=Number(q)):""!==r&&(u.push("price <= :maxPrice"),v.maxPrice=Number(r));let w=u.length?`WHERE ${u.join(" AND ")}`:"",x="price-asc"===(t=s)?"price ASC":"price-desc"===t?"price DESC":"rating-desc"===t?"rating DESC":"name-asc"===t?"name ASC":"popular"===t?"rating DESC":"bestseller"===t?"discount DESC, rating DESC":"createdAt DESC",[y,z]=await Promise.all([(0,d.P)(`SELECT COUNT(*) AS total
       FROM Products
       ${w}`,v),(0,d.P)(`SELECT ${e}
       FROM Products
       ${w}
       ORDER BY ${x}
       LIMIT :limit OFFSET :offset`,v)]),A=Number(y[0]?.total||0);return{products:z.map(f),totalPages:Math.max(1,Math.ceil(A/b)),page:a}}async function h(a,{page:b=1,perPage:c=1e4}={}){return g({page:b,perPage:c,category:a})}async function i(){return(await (0,d.P)(`SELECT ${e}
     FROM Products
     WHERE isFeatured = 1`)).map(f)}async function j(a){return f((await (0,d.P)(`SELECT ${e}
     FROM Products
     WHERE id = :id
     LIMIT 1`,{id:a}))[0])}async function k(a){return f((await (0,d.P)(`SELECT ${e}
     FROM Products
     WHERE slug = :slug
     LIMIT 1`,{slug:a}))[0])}async function l(){let a=await (0,d.P)("SELECT COUNT(*) AS productCount FROM Products");return Number(a[0]?.productCount||0)}async function m(a){return j((await (0,d.g7)(`INSERT INTO Products (
      name,
      slug,
      sku,
      description,
      images,
      brand,
      price,
      oldprice,
      catName,
      catId,
      subCatId,
      subCat,
      thirdSubCatId,
      thirdSubCat,
      countInStock,
      rating,
      isFeatured,
      discount,
      productRam,
      size,
      productWeight,
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :slug,
      :sku,
      :description,
      :images,
      :brand,
      :price,
      :oldprice,
      :catName,
      :catId,
      :subCatId,
      :subCat,
      :thirdSubCatId,
      :thirdSubCat,
      :countInStock,
      :rating,
      :isFeatured,
      :discount,
      :productRam,
      :size,
      :productWeight,
      NOW(),
      NOW()
    )`,s(a))).insertId)}async function n(a,b){let c=Object.entries(s(b)).filter(([,a])=>void 0!==a);if(!c.length)return j(a);let e=c.map(([a])=>`\`${a}\` = :${a}`).join(", ");return await (0,d.g7)(`UPDATE Products
     SET ${e}, updatedAt = NOW()
     WHERE id = :id`,{id:a,...Object.fromEntries(c)}),j(a)}async function o(a){return(await (0,d.g7)(`DELETE FROM Products
     WHERE id = :id`,{id:a})).affectedRows>0}async function p(a){if(!Array.isArray(a)||0===a.length)return[];let b=a.map(a=>Number(a)).filter(a=>Number.isInteger(a)&&a>0);return b.length?(await (0,d.P)(`SELECT ${e}
     FROM Products
     WHERE id IN (${b.join(",")})`)).map(f):[]}async function q(a){if(!Array.isArray(a)||0===a.length)return 0;let b=a.map(a=>Number(a)).filter(a=>Number.isInteger(a)&&a>0);return b.length?Number((await (0,d.g7)(`DELETE FROM Products
     WHERE id IN (${b.join(",")})`)).affectedRows||0):0}async function r(a,b=null){return!!(await (0,d.P)(`SELECT id
     FROM Products
     WHERE slug = :slug
       ${b?"AND id != :excludeId":""}
     LIMIT 1`,b?{slug:a,excludeId:b}:{slug:a}))[0]}function s(a){return{name:a.name,slug:a.slug,sku:a.sku,description:a.description,images:a.images?JSON.stringify(a.images):void 0,brand:a.brand??null,price:a.price??0,oldprice:a.oldprice??0,catName:a.catName??null,catId:a.catId??null,subCatId:a.subCatId??null,subCat:a.subCat??null,thirdSubCatId:a.thirdSubCatId??null,thirdSubCat:a.thirdSubCat??null,countInStock:a.countInStock??0,rating:a.rating??0,isFeatured:+!!a.isFeatured,discount:a.discount??0,productRam:a.productRam??null,size:a.size?JSON.stringify(a.size):JSON.stringify([]),productWeight:a.productWeight?JSON.stringify(a.productWeight):JSON.stringify([])}}function t(a,b){try{return JSON.parse(a||JSON.stringify(b))}catch{return b}}},13598:(a,b,c)=>{c.d(b,{Q:()=>g,z:()=>f});let d=["script","style","iframe","object","embed","form","input","button","textarea","select","meta","link"],e=RegExp(`<(?:${d.join("|")})\\b[^>]*>[\\s\\S]*?<\\/(?:${d.join("|")})>|<(?:${d.join("|")})\\b[^>]*\\/?\\s*>`,"gi");function f(a=""){return String(a).replace(e,"").replace(/\son[a-z]+\s*=\s*"[^"]*"/gi,"").replace(/\son[a-z]+\s*=\s*'[^']*'/gi,"").replace(/\son[a-z]+\s*=\s*[^\s>]+/gi,"").replace(/\s(href|src)\s*=\s*(['"])javascript:[\s\S]*?\2/gi,"").trim()}function g(a=""){return f(a).replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/\s+/g," ").trim()}}};