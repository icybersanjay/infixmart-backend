(()=>{var a={};a.id=9095,a.ids=[9095],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},3498:a=>{"use strict";a.exports=require("mysql2/promise")},6170:(a,b,c)=>{"use strict";c.d(b,{FO:()=>g,P:()=>h,g7:()=>i});var d=c(3498);function e(a,{allowEmpty:b=!1}={}){let c=process.env[a];if(null==c||!b&&""===c)throw Error(`Missing required environment variable: ${a}`);return c}let f=globalThis.__infixmartMysqlPool||(globalThis.__infixmartMysqlPool={pool:null});function g(){return f.pool||(f.pool=d.createPool({host:e("DB_HOST"),port:Number(process.env.DB_PORT||3306),database:e("DB_NAME"),user:e("DB_USER"),password:e("DB_PASSWORD",{allowEmpty:!0}),waitForConnections:!0,connectionLimit:Number(process.env.DB_POOL_LIMIT||10),queueLimit:0,namedPlaceholders:!0,charset:"utf8mb4"})),f.pool}async function h(a,b={}){let[c]=await g().query(a,b);return c}async function i(a,b={}){let[c]=await g().execute(a,b);return c}},10548:(a,b,c)=>{"use strict";c.d(b,{PC:()=>q,Pt:()=>g,TZ:()=>o,Ue:()=>p,W0:()=>l,WY:()=>m,X5:()=>h,bT:()=>j,iN:()=>r,jU:()=>i,vc:()=>n,zq:()=>k});var d=c(6170);let e=`
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
     LIMIT 1`,b?{slug:a,excludeId:b}:{slug:a}))[0]}function s(a){return{name:a.name,slug:a.slug,sku:a.sku,description:a.description,images:a.images?JSON.stringify(a.images):void 0,brand:a.brand??null,price:a.price??0,oldprice:a.oldprice??0,catName:a.catName??null,catId:a.catId??null,subCatId:a.subCatId??null,subCat:a.subCat??null,thirdSubCatId:a.thirdSubCatId??null,thirdSubCat:a.thirdSubCat??null,countInStock:a.countInStock??0,rating:a.rating??0,isFeatured:+!!a.isFeatured,discount:a.discount??0,productRam:a.productRam??null,size:a.size?JSON.stringify(a.size):JSON.stringify([]),productWeight:a.productWeight?JSON.stringify(a.productWeight):JSON.stringify([])}}function t(a,b){try{return JSON.parse(a||JSON.stringify(b))}catch{return b}}},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},17194:(a,b,c)=>{"use strict";c.d(b,{Gs:()=>i,f8:()=>m,kg:()=>l,lC:()=>j,or:()=>k,x8:()=>h});var d=c(6170);let e=`
  id,
  name,
  email,
  password,
  avatar,
  mobile,
  country,
  accessToken,
  refreshToken,
  verify_email,
  last_login_date,
  status,
  otp,
  otp_expires,
  google_id,
  role,
  createdAt,
  updatedAt
`,f=new Set(["name","email","password","avatar","mobile","country","accessToken","refreshToken","verify_email","last_login_date","status","otp","otp_expires","google_id","role"]);function g(a){return a?{...a,_id:a.id,verify_email:!!a.verify_email}:null}function h(a){if(!a)return null;let{password:b,refreshToken:c,otp:d,otp_expires:e,...f}=a;return f}async function i(a){return g((await (0,d.P)(`SELECT ${e} FROM Users WHERE email = :email LIMIT 1`,{email:a}))[0])}async function j(a){return g((await (0,d.P)(`SELECT ${e} FROM Users WHERE id = :id LIMIT 1`,{id:a}))[0])}async function k(a){return g((await (0,d.P)(`SELECT ${e} FROM Users WHERE refreshToken = :refreshToken LIMIT 1`,{refreshToken:a}))[0])}async function l({name:a,email:b,password:c,avatar:e="",mobile:f=null,country:g="",accessToken:h="",refreshToken:i="",verify_email:k=!1,last_login_date:l=null,status:m="active",otp:n=null,otp_expires:o=null,google_id:p=null,role:q="user"}){let r=await (0,d.g7)(`INSERT INTO Users (
      name,
      email,
      password,
      avatar,
      mobile,
      country,
      accessToken,
      refreshToken,
      verify_email,
      last_login_date,
      status,
      otp,
      otp_expires,
      google_id,
      role,
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :email,
      :password,
      :avatar,
      :mobile,
      :country,
      :accessToken,
      :refreshToken,
      :verify_email,
      :last_login_date,
      :status,
      :otp,
      :otp_expires,
      :google_id,
      :role,
      NOW(),
      NOW()
    )`,{name:a,email:b,password:c,avatar:e,mobile:f,country:g,accessToken:h,refreshToken:i,verify_email:k,last_login_date:l,status:m,otp:n,otp_expires:o,google_id:p,role:q});return j(r.insertId)}async function m(a,b){let c=Object.entries(b).filter(([a,b])=>f.has(a)&&void 0!==b);if(0===c.length)return j(a);let e=c.map(([a])=>`\`${a}\` = :${a}`).join(", "),g=Object.fromEntries(c);return await (0,d.g7)(`UPDATE Users SET ${e}, updatedAt = NOW() WHERE id = :id`,{...g,id:a}),j(a)}},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},27910:a=>{"use strict";a.exports=require("stream")},28317:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>ah,patchFetch:()=>ag,routeModule:()=>ac,serverHooks:()=>af,workAsyncStorage:()=>ad,workUnitAsyncStorage:()=>ae});var d={};c.r(d),c.d(d,{DELETE:()=>_,GET:()=>X,HEAD:()=>ab,OPTIONS:()=>aa,PATCH:()=>$,POST:()=>Y,PUT:()=>Z,dynamic:()=>T,runtime:()=>S});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(59984),v=c(60100),w=c(10548),x=c(17194),y=c(6170);function z(a){return a?{id:a.id,rating:Number(a.rating),title:a.title,comment:a.comment,verified:!!a.verified,createdAt:a.createdAt,updatedAt:a.updatedAt,userId:a.userId,productId:a.productId,user:a.userName||a.userAvatar?{name:a.userName||"User",avatar:a.userAvatar||""}:void 0}:null}async function A(a,{page:b=1,perPage:c=10}={}){let[d,e]=await Promise.all([(0,y.P)(`SELECT COUNT(*) AS total
       FROM Reviews
       WHERE productId = :productId`,{productId:a}),(0,y.P)(`SELECT
         r.id,
         r.userId,
         r.productId,
         r.rating,
         r.title,
         r.comment,
         r.verified,
         r.createdAt,
         r.updatedAt,
         u.name AS userName,
         u.avatar AS userAvatar
       FROM Reviews r
       LEFT JOIN Users u ON u.id = r.userId
       WHERE r.productId = :productId
       ORDER BY r.createdAt DESC
       LIMIT :limit OFFSET :offset`,{productId:a,limit:c,offset:(b-1)*c})]);return{reviews:e.map(z),total:Number(d[0]?.total||0),page:b,perPage:c}}async function B(a){return(await (0,y.P)(`SELECT rating, COUNT(*) AS count
     FROM Reviews
     WHERE productId = :productId
     GROUP BY rating`,{productId:a})).map(a=>({rating:Number(a.rating),count:Number(a.count)}))}async function C(a){return z((await (0,y.P)(`SELECT
       r.id,
       r.userId,
       r.productId,
       r.rating,
       r.title,
       r.comment,
       r.verified,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.avatar AS userAvatar
     FROM Reviews r
     LEFT JOIN Users u ON u.id = r.userId
     WHERE r.id = :id
     LIMIT 1`,{id:a}))[0])}async function D(a,b){return z((await (0,y.P)(`SELECT
       r.id,
       r.userId,
       r.productId,
       r.rating,
       r.title,
       r.comment,
       r.verified,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.avatar AS userAvatar
     FROM Reviews r
     LEFT JOIN Users u ON u.id = r.userId
     WHERE r.userId = :userId AND r.productId = :productId
     LIMIT 1`,{userId:a,productId:b}))[0])}async function E(a){return(await (0,y.P)(`SELECT
       r.id,
       r.userId,
       r.productId,
       r.rating,
       r.title,
       r.comment,
       r.verified,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.avatar AS userAvatar
     FROM Reviews r
     LEFT JOIN Users u ON u.id = r.userId
     WHERE r.userId = :userId
     ORDER BY r.createdAt DESC`,{userId:a})).map(z)}async function F(a){return C((await (0,y.g7)(`INSERT INTO Reviews (
      userId,
      productId,
      rating,
      title,
      comment,
      verified,
      createdAt,
      updatedAt
    ) VALUES (
      :userId,
      :productId,
      :rating,
      :title,
      :comment,
      :verified,
      NOW(),
      NOW()
    )`,{...a,verified:+!!a.verified})).insertId)}async function G(a,b){let c=Object.entries({...b,verified:void 0===b.verified?void 0:+!!b.verified}).filter(([,a])=>void 0!==a);if(!c.length)return C(a);let d=c.map(([a])=>`\`${a}\` = :${a}`).join(", ");return await (0,y.g7)(`UPDATE Reviews
     SET ${d}, updatedAt = NOW()
     WHERE id = :id`,{id:a,...Object.fromEntries(c)}),C(a)}async function H(a){return(await (0,y.g7)(`DELETE FROM Reviews
     WHERE id = :id`,{id:a})).affectedRows>0}async function I(a,b){return!!(await (0,y.P)(`SELECT o.id
     FROM Orders o
     INNER JOIN OrderItems oi ON oi.orderId = o.id
     WHERE o.userId = :userId
       AND o.status IN ('delivered', 'shipped')
       AND oi.productId = :productId
     LIMIT 1`,{userId:a,productId:b}))[0]}async function J(a){let b=await (0,y.P)(`SELECT AVG(rating) AS avgRating
     FROM Reviews
     WHERE productId = :productId`,{productId:a}),c=b[0]?.avgRating?Number(Number(b[0].avgRating).toFixed(1)):0;await (0,y.g7)(`UPDATE Products
     SET rating = :rating, updatedAt = NOW()
     WHERE id = :productId`,{rating:c,productId:a})}function K(a){return Number.parseInt(a,10)}function L(a,b=null){let c=String(a||"").trim();return b?c.slice(0,b):c}async function M(a,b){let[{reviews:c,total:d,page:e,perPage:f},g]=await Promise.all([A(a,b),B(a)]),h=function(a){let b={1:0,2:0,3:0,4:0,5:0};for(let c of a)b[c.rating]=c.count;return b}(g),i=Object.values(h).reduce((a,b)=>a+b,0);return{success:!0,error:!1,data:{reviews:c,totalPages:Math.max(1,Math.ceil(d/f)),currentPage:e,totalReviews:d},summary:{avgRating:i?Number((Object.entries(h).reduce((a,[b,c])=>a+Number(b)*c,0)/i).toFixed(1)):0,totalRatings:i,ratingMap:h}}}async function N(a,b){let c=Number(b.productId),d=K(b.rating);if(!c||!d)throw new u.j$(400,"productId and rating are required");if(d<1||d>5)throw new u.j$(400,"Rating must be between 1 and 5");if(!await (0,w.bT)(c))throw new u.j$(404,"Product not found");if(await D(a,c))throw new u.j$(400,"You have already reviewed this product");let e=await F({userId:a,productId:c,rating:d,title:L(b.title,120),comment:L(b.comment),verified:await I(a,c)});return await J(c),{success:!0,error:!1,message:"Review submitted successfully",data:e}}async function O(a,b,c){let d,e=await C(b);if(!e||e.userId!==Number(a))throw new u.j$(404,"Review not found");if(void 0!==c.rating&&((d=K(c.rating))<1||d>5))throw new u.j$(400,"Rating must be between 1 and 5");let f=await G(b,{rating:d,title:void 0!==c.title?L(c.title,120):void 0,comment:void 0!==c.comment?L(c.comment):void 0});return await J(e.productId),{success:!0,error:!1,message:"Review updated",data:f}}async function P(a,b){let c=await C(b);if(!c)throw new u.j$(404,"Review not found");if(c.userId!==Number(a)){let b=await (0,x.lC)(a);if(!b||"admin"!==b.role)throw new u.j$(403,"Access denied")}return await H(b),await J(c.productId),{success:!0,error:!1,message:"Review deleted"}}async function Q(a){return{success:!0,error:!1,data:await E(a)}}async function R(a,b){return{success:!0,error:!1,review:await D(a,b)}}let S="nodejs",T="force-dynamic";async function U(a){try{return await a.json()}catch{return{}}}async function V(a,b){let[c,d]=b;if("GET"===a.method&&"product"===c&&d){let{searchParams:b}=new URL(a.url);return(0,u.ok)(await M(d,{page:Number(b.get("page")||1),perPage:Number(b.get("perPage")||10)}))}return"GET"===a.method&&"my"===c&&1===b.length?(0,u.ok)(await Q((0,v.ET)(a))):"GET"===a.method&&"check"===c&&d?(0,u.ok)(await R((0,v.ET)(a),d)):"POST"===a.method&&0===b.length?(0,u.ok)(await N((0,v.ET)(a),await U(a)),201):"PUT"===a.method&&c&&1===b.length?(0,u.ok)(await O((0,v.ET)(a),c,await U(a))):"DELETE"===a.method&&c&&1===b.length?(0,u.ok)(await P((0,v.ET)(a),c)):null}async function W(a,b){let c=b?.params?await b.params:{},d=Array.isArray(c.path)?c.path:[];try{let b=await V(a,d);if(b)return b;return(0,u.fJ)(404,"Route not found")}catch(a){return(0,u.IG)(a)}}let X=W,Y=W,Z=W,$=W,_=W,aa=W,ab=W,ac=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/reviews/[[...path]]/route",pathname:"/api/reviews/[[...path]]",filename:"route",bundlePath:"app/api/reviews/[[...path]]/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\ashis\\OneDrive\\Desktop\\NextJs InfixMart\\app\\api\\reviews\\[[...path]]\\route.js",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:ad,workUnitAsyncStorage:ae,serverHooks:af}=ac;function ag(){return(0,g.patchFetch)({workAsyncStorage:ad,workUnitAsyncStorage:ae})}async function ah(a,b,c){var d;let e="/api/reviews/[[...path]]/route";"/index"===e&&(e="/");let g=await ac.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||ac.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===ac.isDev||!E,H=E&&!G,I=a.method||"GET",J=(0,i.getTracer)(),K=J.getActiveScopeSpan(),L={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>ac.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},M=new k.NodeNextRequest(a),N=new k.NodeNextResponse(b),O=l.NextRequestAdapter.fromNodeNextRequest(M,(0,l.signalFromNodeResponse)(b));try{let d=async c=>ac.handle(O,L).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=J.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${I} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${I} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=L.renderOpts.fetchMetrics;let i=L.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=L.renderOpts.collectedTags;if(!E)return await (0,o.I)(M,N,e,L.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==L.renderOpts.collectedRevalidate&&!(L.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&L.renderOpts.collectedRevalidate,d=void 0===L.renderOpts.collectedExpire||L.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:L.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await ac.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await ac.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(M,N,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};K?await g(K):await J.withPropagatedContext(a.headers,()=>J.trace(m.BaseServerSpan.handleRequest,{spanName:`${I} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":I,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await ac.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(M,N,new Response(null,{status:500})),null}}},28354:a=>{"use strict";a.exports=require("util")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},35984:(a,b,c)=>{"use strict";c.d(b,{$$:()=>j,$Y:()=>h,En:()=>i,Q5:()=>e,TL:()=>f,yE:()=>g});var d=c(48318);function e(a){return d.sign({id:a},process.env.JWT_SECRET_ACCESS_TOKEN,{expiresIn:"15m"})}function f(a){return d.sign({id:a},process.env.JWT_SECRET_REFRESH_TOKEN,{expiresIn:"7d"})}function g(a){return d.sign({email:a,purpose:"password-reset"},process.env.JWT_SECRET||process.env.JWT_SECRET_ACCESS_TOKEN,{expiresIn:"10m"})}function h(a){return d.verify(a,process.env.JWT_SECRET_ACCESS_TOKEN)}function i(a){return d.verify(a,process.env.JWT_SECRET_REFRESH_TOKEN)}function j(a){return d.verify(a,process.env.JWT_SECRET||process.env.JWT_SECRET_ACCESS_TOKEN)}},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:a=>{"use strict";a.exports=require("crypto")},59984:(a,b,c)=>{"use strict";c.d(b,{IG:()=>i,fJ:()=>h,j$:()=>e,ok:()=>g});var d=c(10641);class e extends Error{constructor(a,b){super(b),this.name="HttpError",this.status=a}}function f(a,b=200){return d.NextResponse.json(a,{status:b})}function g(a,b=200){return f(a,b)}function h(a,b){return f({message:b,error:!0,success:!1},a)}function i(a){return a instanceof e?h(a.status,a.message):(console.error("[native-api]",a),h(500,"Internal server error"))}},60100:(a,b,c)=>{"use strict";c.d(b,{ET:()=>g,G8:()=>i,KK:()=>h,R9:()=>j});var d=c(59984),e=c(63346),f=c(35984);function g(a){let b=(0,e.UM)(a,"accessToken")||(0,e.dS)(a);if(!b)throw new d.j$(401,"Unauthorized");try{return(0,f.$Y)(b).id}catch{throw new d.j$(401,"Unauthorized")}}function h(a){let b=(0,e.UM)(a,"refreshToken")||(0,e.dS)(a);if(!b)throw new d.j$(401,"No refresh token provided");return b}function i(a,b){let c=(0,e.UM)(a,"passwordResetToken");if(!c)throw new d.j$(403,"Password reset session expired");try{let a=(0,f.$$)(c);if("password-reset"!==a.purpose||String(a.email).toLowerCase()!==String(b).toLowerCase())throw Error("invalid");return a.email}catch{throw new d.j$(403,"Password reset session expired")}}function j(a){try{return(0,f.En)(a)}catch{throw new d.j$(403,"Invalid refresh token")}}},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},63346:(a,b,c)=>{"use strict";c.d(b,{hf:()=>i,GQ:()=>k,dS:()=>m,UM:()=>l,w9:()=>h,bk:()=>j});let d=function(){if(process.env.COOKIE_DOMAIN)return String(process.env.COOKIE_DOMAIN).trim();try{let a=new URL(process.env.FRONTEND_URL||"");return a.hostname.startsWith("www.")?a.hostname.slice(4):a.hostname}catch{return}}(),e=function(){let a=String(process.env.COOKIE_SAME_SITE||"").trim().toLowerCase();return["lax","strict","none"].includes(a)?a:"lax"}(),f=function(a,b=!1){if(null==a||""===a)return b;let c=String(a).trim().toLowerCase();return!!["1","true","yes","on"].includes(c)||!["0","false","no","off"].includes(c)&&b}(process.env.COOKIE_SECURE,!0)||"none"===e;function g(a){return{httpOnly:!0,secure:f,sameSite:e,path:"/",maxAge:a,...d?{domain:d}:{}}}function h(a,{accessToken:b,refreshToken:c}){b&&a.cookies.set("accessToken",b,g(900)),c&&a.cookies.set("refreshToken",c,g(604800))}function i(a){a.cookies.set("accessToken","",{...g(0),expires:new Date(0)}),a.cookies.set("refreshToken","",{...g(0),expires:new Date(0)})}function j(a,b){a.cookies.set("passwordResetToken",b,g(600))}function k(a){a.cookies.set("passwordResetToken","",{...g(0),expires:new Date(0)})}function l(a,b){return a.cookies.get(b)?.value||null}function m(a){let b=a.headers.get("authorization");return b?.startsWith("Bearer ")&&b.slice(7).trim()||null}},78335:()=>{},79428:a=>{"use strict";a.exports=require("buffer")},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},96487:()=>{}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[5873,641,809],()=>b(b.s=28317));module.exports=c})();