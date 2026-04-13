"use strict";(()=>{var a={};a.id=9201,a.ids=[9201],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},3498:a=>{a.exports=require("mysql2/promise")},4825:(a,b,c)=>{c.r(b),c.d(b,{handler:()=>aa,patchFetch:()=>_,routeModule:()=>X,serverHooks:()=>$,workAsyncStorage:()=>Y,workUnitAsyncStorage:()=>Z});var d={};c.r(d),c.d(d,{DELETE:()=>U,GET:()=>Q,HEAD:()=>W,OPTIONS:()=>V,PATCH:()=>T,POST:()=>R,PUT:()=>S,dynamic:()=>L,runtime:()=>K});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(59984),v=c(60100),w=c(28337),x=c(89529),y=c(6170);function z(a){return a?{...a,_id:a.id,user:a.userId?{id:a.userId,name:a.userName||null,email:a.userEmail||null}:void 0,order:a.orderId?{id:a.orderId,totalPrice:null==a.orderTotalPrice?null:Number(a.orderTotalPrice)}:void 0}:null}async function A(a){return B((await (0,y.g7)(`INSERT INTO Returns (
      orderId,
      userId,
      reason,
      status,
      adminNote,
      createdAt,
      updatedAt
    ) VALUES (
      :orderId,
      :userId,
      :reason,
      'pending',
      NULL,
      NOW(),
      NOW()
    )`,a)).insertId)}async function B(a){return z((await (0,y.P)(`SELECT
       r.id,
       r.orderId,
       r.userId,
       r.reason,
       r.status,
       r.adminNote,
       r.createdAt,
       r.updatedAt,
       u.name AS userName,
       u.email AS userEmail,
       o.totalPrice AS orderTotalPrice
     FROM Returns r
     LEFT JOIN Users u ON u.id = r.userId
     LEFT JOIN Orders o ON o.id = r.orderId
     WHERE r.id = :id
     LIMIT 1`,{id:a}))[0])}async function C(a){return(await (0,y.P)(`SELECT id, orderId, userId, reason, status, adminNote, createdAt, updatedAt
     FROM Returns
     WHERE orderId = :orderId AND status IN ('pending', 'approved')
     LIMIT 1`,{orderId:a}))[0]||null}async function D(a){return(await (0,y.P)(`SELECT
       r.id,
       r.orderId,
       r.userId,
       r.reason,
       r.status,
       r.adminNote,
       r.createdAt,
       r.updatedAt,
       o.totalPrice AS orderTotalPrice
     FROM Returns r
     LEFT JOIN Orders o ON o.id = r.orderId
     WHERE r.userId = :userId
     ORDER BY r.createdAt DESC`,{userId:a})).map(z)}async function E({page:a=1,perPage:b=20,status:c=""}){let d=(a-1)*b,e=c?"WHERE r.status = :status":"",[f,g]=await Promise.all([(0,y.P)(`SELECT COUNT(*) AS total
       FROM Returns r
       ${c?"WHERE r.status = :status":""}`,c?{status:c}:{}),(0,y.P)(`SELECT
         r.id,
         r.orderId,
         r.userId,
         r.reason,
         r.status,
         r.adminNote,
         r.createdAt,
         r.updatedAt,
         u.name AS userName,
         u.email AS userEmail,
         o.totalPrice AS orderTotalPrice
       FROM Returns r
       LEFT JOIN Users u ON u.id = r.userId
       LEFT JOIN Orders o ON o.id = r.orderId
       ${e}
       ORDER BY r.createdAt DESC
       LIMIT :limit OFFSET :offset`,c?{status:c,limit:b,offset:d}:{limit:b,offset:d})]),h=Number(f[0]?.total||0);return{data:g.map(z),total:h,totalPages:Math.max(1,Math.ceil(h/b)),currentPage:a}}async function F(a,b){let c=Object.entries(b).filter(([,a])=>void 0!==a),d=c.map(([a])=>`\`${a}\` = :${a}`).join(", ");return await (0,y.g7)(`UPDATE Returns
     SET ${d}, updatedAt = NOW()
     WHERE id = :id`,{id:a,...Object.fromEntries(c)}),B(a)}async function G(a,b){let c=Number(b?.orderId),d=String(b?.reason||"").trim();if(!c||!d)throw new u.j$(400,"orderId and reason are required");let e=await (0,x.Uo)(c);if(!e||e.userId!==Number(a))throw new u.j$(404,"Order not found");if("delivered"!==e.status)throw new u.j$(400,"Return requests can only be raised for delivered orders");let f=new Date(e.updatedAt);if(Math.floor((Date.now()-f.getTime())/864e5)>7)throw new u.j$(400,"Return window of 7 days has expired");if(await C(c))throw new u.j$(400,"A return request for this order already exists");return{success:!0,error:!1,message:"Return request submitted",data:await A({orderId:c,userId:a,reason:d})}}async function H(a){return{success:!0,error:!1,data:await D(a)}}async function I(a){return{success:!0,error:!1,...await E(a)}}async function J(a,b){let c=b?.status,d=["approved","rejected","completed"];if(!d.includes(c))throw new u.j$(400,`status must be one of: ${d.join(", ")}`);let e=await B(a);if(!e)throw new u.j$(404,"Return request not found");return{success:!0,error:!1,message:"Return status updated",data:await F(a,{status:c,adminNote:b?.adminNote?.trim()||e.adminNote})}}let K="nodejs",L="force-dynamic";async function M(a){try{return await a.json()}catch{return{}}}async function N(a){let b=(0,v.ET)(a);await (0,w.ZT)(b)}async function O(a,b){let[c]=b;if("POST"===a.method&&0===b.length)return(0,u.ok)(await G((0,v.ET)(a),await M(a)),201);if("GET"===a.method&&"my"===c)return(0,u.ok)(await H((0,v.ET)(a)));if("GET"===a.method&&0===b.length){await N(a);let{searchParams:b}=new URL(a.url);return(0,u.ok)(await I({page:Number(b.get("page")||1),perPage:Number(b.get("perPage")||20),status:b.get("status")||""}))}return"PUT"===a.method&&c?(await N(a),(0,u.ok)(await J(c,await M(a)))):null}async function P(a,b){let c=b?.params?await b.params:{},d=Array.isArray(c.path)?c.path:[];try{let b=await O(a,d);if(b)return b;return(0,u.fJ)(404,"Route not found")}catch(a){return(0,u.IG)(a)}}let Q=P,R=P,S=P,T=P,U=P,V=P,W=P,X=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/returns/[[...path]]/route",pathname:"/api/returns/[[...path]]",filename:"route",bundlePath:"app/api/returns/[[...path]]/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\ashis\\OneDrive\\Desktop\\NextJs InfixMart\\app\\api\\returns\\[[...path]]\\route.js",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:Y,workUnitAsyncStorage:Z,serverHooks:$}=X;function _(){return(0,g.patchFetch)({workAsyncStorage:Y,workUnitAsyncStorage:Z})}async function aa(a,b,c){var d;let e="/api/returns/[[...path]]/route";"/index"===e&&(e="/");let g=await X.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||X.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===X.isDev||!E,H=E&&!G,I=a.method||"GET",J=(0,i.getTracer)(),K=J.getActiveScopeSpan(),L={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>X.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},M=new k.NodeNextRequest(a),N=new k.NodeNextResponse(b),O=l.NextRequestAdapter.fromNodeNextRequest(M,(0,l.signalFromNodeResponse)(b));try{let d=async c=>X.handle(O,L).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=J.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${I} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${I} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=L.renderOpts.fetchMetrics;let i=L.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=L.renderOpts.collectedTags;if(!E)return await (0,o.I)(M,N,e,L.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==L.renderOpts.collectedRevalidate&&!(L.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&L.renderOpts.collectedRevalidate,d=void 0===L.renderOpts.collectedExpire||L.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:L.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await X.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await X.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(M,N,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};K?await g(K):await J.withPropagatedContext(a.headers,()=>J.trace(m.BaseServerSpan.handleRequest,{spanName:`${I} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":I,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await X.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(M,N,new Response(null,{status:500})),null}}},10846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},21572:a=>{a.exports=require("nodemailer")},27910:a=>{a.exports=require("stream")},28354:a=>{a.exports=require("util")},29294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:a=>{a.exports=require("crypto")},63033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},79428:a=>{a.exports=require("buffer")},86439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")},89529:(a,b,c)=>{c.d(b,{HZ:()=>g,Kv:()=>k,Lj:()=>j,PQ:()=>i,Uo:()=>h,fS:()=>f,oP:()=>l});var d=c(6170);function e(a){return a?{...a,_id:a.id,items:o(a.items,[]),shippingAddress:o(a.shippingAddress,{}),paymentResult:o(a.paymentResult,{}),itemsPrice:Number(a.itemsPrice||0),shippingPrice:Number(a.shippingPrice||0),gstAmount:Number(a.gstAmount||0),totalPrice:Number(a.totalPrice||0),isPaid:!!a.isPaid}:null}async function f(a,b=null){return h((await n(b,`INSERT INTO Orders (
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
     LIMIT 1`,{paymentId:`%${a}%`}))[0]):null}async function m(a,b,c={}){if(a){let[d]=await a.query(b,c);return d}return(0,d.P)(b,c)}async function n(a,b,c={}){if(a){let[d]=await a.execute(b,c);return d}return(0,d.g7)(b,c)}function o(a,b){try{return JSON.parse(a||JSON.stringify(b))}catch{return b}}}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[5873,641,809,8102,5980],()=>b(b.s=4825));module.exports=c})();