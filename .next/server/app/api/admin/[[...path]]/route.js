"use strict";(()=>{var a={};a.id=6033,a.ids=[6033],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},3498:a=>{a.exports=require("mysql2/promise")},7875:(a,b,c)=>{c.d(b,{Vn:()=>p,hK:()=>q,y_:()=>r});var d=c(55511),e=c(79748),f=c(33873),g=c(59984);let h=f.resolve(process.cwd(),"uploads"),i=new Map([["image/jpeg",[".jpg",".jpeg"]],["image/png",[".png"]],["image/webp",[".webp"]],["image/gif",[".gif"]],["image/avif",[".avif"]]]),j=Number(process.env.UPLOAD_MAX_FILES),k=Number(process.env.UPLOAD_MAX_FILE_SIZE_MB),l=Number.isFinite(j)&&j>0?Math.floor(j):10,m=Number.isFinite(k)&&k>0?k:8,n=1024*m*1024;async function o(){await e.mkdir(h,{recursive:!0})}async function p(a,b){let c=a.getAll(b).filter(Boolean);if(c.length>l)throw new g.j$(400,`You can upload up to ${l} images at a time.`);await o();let j=[];for(let a of c){if("string"==typeof a)continue;let b=function(a=""){let b=/^[.][a-z0-9]+$/.test(a)?a:"";return`${(0,d.randomUUID)()}${b}`}(function(a){let b=function(a){let b=i.get(String(a?.type||"").toLowerCase()),c=f.extname(a?.name||"").toLowerCase();return b&&b.includes(c)?b[0]:null}(a);if(!b)throw new g.j$(400,"Only JPG, JPEG, PNG, WEBP, GIF, or AVIF image uploads are allowed.");if(!Number.isFinite(a?.size)||0>=Number(a.size))throw new g.j$(400,"Uploaded file is empty.");if(Number(a.size)>n)throw new g.j$(413,`Each image must be smaller than ${Math.floor(m)}MB.`);return b}(a)),c=Buffer.from(await a.arrayBuffer());await e.writeFile(f.join(h,b),c),j.push(`/uploads/${b}`)}return j}function q(a){if("string"!=typeof a)return null;let b=a.replace(/\\/g,"/");if(!b.startsWith("/uploads/"))return null;let c=b.slice(9);return!c||c.includes("/")?null:f.join(h,f.basename(c))}async function r(a){let b=q(a);if(!b)return!1;try{return await e.unlink(b),!0}catch{return!1}}},10846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},21572:a=>{a.exports=require("nodemailer")},27910:a=>{a.exports=require("stream")},28354:a=>{a.exports=require("util")},29294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{a.exports=require("path")},44870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:a=>{a.exports=require("crypto")},57592:(a,b,c)=>{c.d(b,{FQ:()=>m,R9:()=>l,kB:()=>n});var d=c(59984),e=c(6170);let f=[{key:"min_order_value",value:"999"},{key:"cod_enabled",value:"true"},{key:"gst_percent",value:"18"},{key:"membership_price_monthly",value:"99"},{key:"membership_price_yearly",value:"799"},{key:"cart_timeline_enabled",value:"true"},{key:"cart_timeline_max",value:"1999"},{key:"cart_milestones",value:JSON.stringify([{amount:1499,label:"Free Shipping",type:"free_shipping",enabled:!0}])}],g=globalThis.__infixmartSettingsRepo||(globalThis.__infixmartSettingsRepo={ensured:!1});async function h(){if(!g.ensured){for(let a of f)await (0,e.g7)(`INSERT INTO StoreSettings (\`key\`, \`value\`, updatedAt)
       VALUES (:key, :value, NOW())
       ON DUPLICATE KEY UPDATE updatedAt = updatedAt`,a);g.ensured=!0}}async function i(){return await h(),Object.fromEntries((await (0,e.P)(`SELECT \`key\`, \`value\`
     FROM StoreSettings`)).map(a=>[a.key,a.value]))}async function j(a,b){await h(),await (0,e.g7)(`INSERT INTO StoreSettings (\`key\`, \`value\`, updatedAt)
     VALUES (:key, :value, NOW())
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updatedAt = NOW()`,{key:a,value:b})}let k={data:null,ts:0};async function l(){return k.data&&Date.now()-k.ts<6e4||(k.data=await i(),k.ts=Date.now()),{settings:k.data,success:!0,error:!1}}async function m(){return{settings:await i(),success:!0,error:!1}}async function n(a){let b=a?.key;if(!b)throw new d.j$(400,"key is required");return await j(b,String(a?.value??"")),k.ts=0,k.data=null,{message:"Setting saved",success:!0,error:!1}}},63033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},64925:(a,b,c)=>{c.d(b,{$O:()=>l,M1:()=>f,W_:()=>k,Wg:()=>g,c8:()=>j,gV:()=>h,rS:()=>i});var d=c(6170);function e(a){return a?{...a,_id:a.id,value:Number(a.value||0),minOrderValue:Number(a.minOrderValue||0),maxDiscount:null==a.maxDiscount?null:Number(a.maxDiscount),usageLimit:null==a.usageLimit?null:Number(a.usageLimit),usageCount:Number(a.usageCount||0),isActive:!!a.isActive}:null}async function f(){return(await (0,d.P)(`SELECT
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
     WHERE id = :id`,{id:a})}async function m(a,b,c={}){if(a){let[d]=await a.query(b,c);return d}return(0,d.P)(b,c)}async function n(a,b,c={}){if(a){let[d]=await a.execute(b,c);return d}return(0,d.g7)(b,c)}},71889:(a,b,c)=>{c.r(b),c.d(b,{handler:()=>an,patchFetch:()=>am,routeModule:()=>ai,serverHooks:()=>al,workAsyncStorage:()=>aj,workUnitAsyncStorage:()=>ak});var d={};c.r(d),c.d(d,{DELETE:()=>af,GET:()=>ab,HEAD:()=>ah,OPTIONS:()=>ag,PATCH:()=>ae,POST:()=>ac,PUT:()=>ad,dynamic:()=>X,runtime:()=>W});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(59984),v=c(63346),w=c(60100),x=c(43281),y=c(28337),z=c(6170);function A(a){return a?{...a,_id:a.id}:null}function B(a){return a?{...a,_id:a.id}:null}async function C(){let[a,b]=await Promise.all([(0,z.P)(`SELECT id, name, createdAt, updatedAt
       FROM AttributeTypes
       ORDER BY name ASC`),(0,z.P)(`SELECT id, attributeTypeId, value, createdAt, updatedAt
       FROM AttributeValues
       ORDER BY value ASC`)]),c=b.reduce((a,b)=>{let c=b.attributeTypeId;return a[c]||=[],a[c].push(B(b)),a},{});return a.map(a=>({...A(a),values:c[a.id]||[]}))}async function D(a){return A((await (0,z.P)(`SELECT id, name, createdAt, updatedAt
     FROM AttributeTypes
     WHERE id = :id
     LIMIT 1`,{id:a}))[0])}async function E(a){return A((await (0,z.P)(`SELECT id, name, createdAt, updatedAt
     FROM AttributeTypes
     WHERE name = :name
     LIMIT 1`,{name:a}))[0])}async function F(a){return D((await (0,z.g7)(`INSERT INTO AttributeTypes (name, createdAt, updatedAt)
     VALUES (:name, NOW(), NOW())`,{name:a})).insertId)}async function G(a,b){return await (0,z.g7)(`UPDATE AttributeTypes
     SET name = :name, updatedAt = NOW()
     WHERE id = :id`,{id:a,name:b}),D(a)}async function H(a){return(await (0,z.g7)(`DELETE FROM AttributeTypes
     WHERE id = :id`,{id:a})).affectedRows>0}async function I(a){return(await (0,z.P)(`SELECT id, attributeTypeId, value, createdAt, updatedAt
     FROM AttributeValues
     WHERE attributeTypeId = :attributeTypeId
     ORDER BY value ASC`,{attributeTypeId:a})).map(B)}async function J(a,b){let c=await (0,z.g7)(`INSERT INTO AttributeValues (attributeTypeId, value, createdAt, updatedAt)
     VALUES (:attributeTypeId, :value, NOW(), NOW())`,{attributeTypeId:a,value:b});return B((await (0,z.P)(`SELECT id, attributeTypeId, value, createdAt, updatedAt
     FROM AttributeValues
     WHERE id = :id
     LIMIT 1`,{id:c.insertId}))[0])}async function K(a){return B((await (0,z.P)(`SELECT id, attributeTypeId, value, createdAt, updatedAt
     FROM AttributeValues
     WHERE id = :id
     LIMIT 1`,{id:a}))[0])}async function L(a){return(await (0,z.g7)(`DELETE FROM AttributeValues
     WHERE id = :id`,{id:a})).affectedRows>0}async function M(){return{success:!0,data:await C()}}async function N(a){let b=String(a?.name||"").trim();if(!b)throw new u.j$(400,"Name is required");if(await E(b))throw new u.j$(409,"Attribute type already exists");return{success:!0,data:{...await F(b),values:[]}}}async function O(a,b){let c=String(b?.name||"").trim();if(!c)throw new u.j$(400,"Name is required");if(!await D(a))throw new u.j$(404,"Not found");let d=await E(c);if(d&&String(d.id)!==String(a))throw new u.j$(409,"Attribute type name already exists");return{success:!0,data:await G(a,c)}}async function P(a){if(!await D(a))throw new u.j$(404,"Not found");return await H(a),{success:!0,message:"Deleted"}}async function Q(a){return{success:!0,data:await I(a)}}async function R(a,b){let c=String(b?.value||"").trim();if(!c)throw new u.j$(400,"Value is required");if(!await D(a))throw new u.j$(404,"Attribute type not found");return{success:!0,data:await J(a,c)}}async function S(a){if(!await K(a))throw new u.j$(404,"Not found");return await L(a),{success:!0,message:"Deleted"}}var T=c(57592),U=c(96045),V=c(84289);let W="nodejs",X="force-dynamic";async function Y(a){try{return await a.json()}catch{return{}}}async function Z(a){let b=(0,w.ET)(a);return await (0,y.ZT)(b),b}function $(a){let b=a.headers.get("x-forwarded-for");return b?b.split(",")[0].trim():a.headers.get("x-real-ip")||null}async function _(a,b){let[c,d,e]=b;if("POST"===a.method&&"login"===c){let b=await (0,y.bN)(await Y(a)),c=(0,u.ok)(b.body);return(0,v.w9)(c,b.tokens),c}if("GET"===a.method&&"stats"===c)return await Z(a),(0,u.ok)(await (0,y.wx)());if("GET"===a.method&&"orders"===c){await Z(a);let{searchParams:b}=new URL(a.url),c=Number(b.get("page")||1),d=Number(b.get("perPage")||10),e=b.get("status")||"";return(0,u.ok)(await (0,y.Qw)({page:c,perPage:d,status:e}))}if("GET"===a.method&&"users"===c&&!d){await Z(a);let{searchParams:b}=new URL(a.url),c=Number(b.get("page")||1),d=Number(b.get("perPage")||20),e=b.get("search")||"";return(0,u.ok)(await (0,y.CF)({page:c,perPage:d,search:e}))}if("PUT"===a.method&&"users"===c&&d&&"status"===e){let b=await Z(a),c=await Y(a),e=await (0,y.pU)(d,c?.isActive===!0);return await (0,x.b)({adminId:b,action:"UPDATE",entity:"user",entityId:d,detail:`Status set to ${c?.isActive?"active":"Suspended"}`,ip:$(a)}),(0,u.ok)(e)}if("GET"===a.method&&"users"===c&&d&&"stats"===e)return await Z(a),(0,u.ok)(await (0,y.vq)(d));if("GET"===a.method&&"settings"===c&&!d)return await Z(a),(0,u.ok)(await (0,T.FQ)());if("GET"===a.method&&"test-email"===c&&!d){await Z(a);let{searchParams:b}=new URL(a.url);return(0,u.ok)(await (0,y.Y_)(b.get("to")||""))}if("PUT"===a.method&&"settings"===c&&!d){let b=await Z(a),c=await Y(a),d=await (0,T.kB)(c);return await (0,x.b)({adminId:b,action:"UPDATE",entity:"settings",detail:"Settings updated",ip:$(a)}),(0,u.ok)(d)}if("GET"===a.method&&"homepage"===c&&!d)return await Z(a),(0,u.ok)(await (0,U.fP)());if("POST"===a.method&&"homepage"===c&&"upload"===d)return await Z(a),(0,u.ok)(await (0,U.Zw)(a));if("POST"===a.method&&"homepage"===c&&!d)return await Z(a),(0,u.ok)(await (0,U.rO)(await Y(a)),201);if("PUT"===a.method&&"homepage"===c&&d&&!e)return await Z(a),(0,u.ok)(await (0,U.id)(d,await Y(a)));if("DELETE"===a.method&&"homepage"===c&&d&&!e)return await Z(a),(0,u.ok)(await (0,U.ao)(d));if("GET"===a.method&&"coupons"===c&&!d)return await Z(a),(0,u.ok)(await (0,V.qk)());if("POST"===a.method&&"coupons"===c&&!d){let b=await Z(a),c=await Y(a),d=await (0,V._Z)(c);return await (0,x.b)({adminId:b,action:"CREATE",entity:"coupon",detail:`Coupon created: ${c?.code||""}`,ip:$(a)}),d}if("PUT"===a.method&&"coupons"===c&&d&&!e){let b=await Z(a),c=await Y(a),e=await (0,V.lr)(d,c);return await (0,x.b)({adminId:b,action:"UPDATE",entity:"coupon",entityId:d,detail:"Coupon updated",ip:$(a)}),e}if("DELETE"===a.method&&"coupons"===c&&d&&!e){let b=await Z(a),c=await (0,V.jZ)(d);return await (0,x.b)({adminId:b,action:"DELETE",entity:"coupon",entityId:d,ip:$(a)}),c}if("attributes"===c&&"GET"===a.method&&!d)return await Z(a),(0,u.ok)(await M());if("attributes"===c&&"POST"===a.method&&!d)return await Z(a),(0,u.ok)(await N(await Y(a)),201);if("attributes"===c&&"PUT"===a.method&&d&&!e)return await Z(a),(0,u.ok)(await O(d,await Y(a)));if("attributes"===c&&"DELETE"===a.method&&d&&!e)return await Z(a),(0,u.ok)(await P(d));if("attributes"===c&&"GET"===a.method&&d&&"values"===e)return await Z(a),(0,u.ok)(await Q(d));if("attributes"===c&&"POST"===a.method&&d&&"values"===e)return await Z(a),(0,u.ok)(await R(d,await Y(a)),201);if("attributes"===c&&"DELETE"===a.method&&d&&"values"===e){let c=b[3];return await Z(a),(0,u.ok)(await S(c))}return null}async function aa(a,b){let c=b?.params?await b.params:{},d=Array.isArray(c.path)?c.path:[];try{let b=await _(a,d);if(b)return b;return(0,u.fJ)(404,"Route not found")}catch(a){return(0,u.IG)(a)}}let ab=aa,ac=aa,ad=aa,ae=aa,af=aa,ag=aa,ah=aa,ai=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/admin/[[...path]]/route",pathname:"/api/admin/[[...path]]",filename:"route",bundlePath:"app/api/admin/[[...path]]/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\ashis\\OneDrive\\Desktop\\NextJs InfixMart\\app\\api\\admin\\[[...path]]\\route.js",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:aj,workUnitAsyncStorage:ak,serverHooks:al}=ai;function am(){return(0,g.patchFetch)({workAsyncStorage:aj,workUnitAsyncStorage:ak})}async function an(a,b,c){var d;let e="/api/admin/[[...path]]/route";"/index"===e&&(e="/");let g=await ai.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||ai.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===ai.isDev||!E,H=E&&!G,I=a.method||"GET",J=(0,i.getTracer)(),K=J.getActiveScopeSpan(),L={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>ai.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},M=new k.NodeNextRequest(a),N=new k.NodeNextResponse(b),O=l.NextRequestAdapter.fromNodeNextRequest(M,(0,l.signalFromNodeResponse)(b));try{let d=async c=>ai.handle(O,L).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=J.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${I} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${I} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=L.renderOpts.fetchMetrics;let i=L.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=L.renderOpts.collectedTags;if(!E)return await (0,o.I)(M,N,e,L.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==L.renderOpts.collectedRevalidate&&!(L.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&L.renderOpts.collectedRevalidate,d=void 0===L.renderOpts.collectedExpire||L.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:L.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await ai.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await ai.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(M,N,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};K?await g(K):await J.withPropagatedContext(a.headers,()=>J.trace(m.BaseServerSpan.handleRequest,{spanName:`${I} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":I,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await ai.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(M,N,new Response(null,{status:500})),null}}},79428:a=>{a.exports=require("buffer")},79748:a=>{a.exports=require("fs/promises")},84289:(a,b,c)=>{c.d(b,{AH:()=>k,_Z:()=>h,jZ:()=>j,lr:()=>i,qk:()=>g});var d=c(59984),e=c(64925);function f(a){return String(a||"").toUpperCase().trim()}async function g(){return{coupons:await (0,e.M1)(),success:!0,error:!1}}async function h(a){let b=f(a?.code),c=Number(a?.value);return b&&c?await (0,e.gV)(b)?(0,d.ok)({message:"Coupon code already exists",error:!0,success:!1},400):(0,d.ok)({coupon:await (0,e.rS)({code:b,description:a?.description||null,type:a?.type||"percent",value:c,minOrderValue:Number(a?.minOrderValue||0),maxDiscount:a?.maxDiscount?Number(a.maxDiscount):null,usageLimit:a?.usageLimit?Number(a.usageLimit):null,isActive:a?.isActive!==!1,expiresAt:a?.expiresAt||null}),message:"Coupon created successfully",success:!0,error:!1},201):(0,d.ok)({message:"Code and value are required",error:!0,success:!1},400)}async function i(a,b){let c=await (0,e.Wg)(a);return c?(0,d.ok)({coupon:await (0,e.c8)(a,{code:b?.code?f(b.code):c.code,description:b?.description??c.description,type:b?.type??c.type,value:b?.value!==void 0?Number(b.value):c.value,minOrderValue:b?.minOrderValue!==void 0?Number(b.minOrderValue):c.minOrderValue,maxDiscount:b?.maxDiscount!==void 0?b.maxDiscount?Number(b.maxDiscount):null:c.maxDiscount,usageLimit:b?.usageLimit!==void 0?b.usageLimit?Number(b.usageLimit):null:c.usageLimit,isActive:b?.isActive!==void 0?b.isActive:c.isActive,expiresAt:b?.expiresAt!==void 0?b.expiresAt||null:c.expiresAt}),message:"Coupon updated",success:!0,error:!1}):(0,d.ok)({message:"Coupon not found",error:!0,success:!1},404)}async function j(a){return await (0,e.W_)(a)?(0,d.ok)({message:"Coupon deleted",success:!0,error:!1}):(0,d.ok)({message:"Coupon not found",error:!0,success:!1},404)}async function k(a){let b,c=f(a?.code);if(!c)return{error:!0,message:"Coupon code is required"};let d=await (0,e.gV)(c);if(!d||!d.isActive)return{error:!0,message:"Invalid or expired coupon code"};if(d.expiresAt&&new Date(d.expiresAt)<new Date)return{error:!0,message:"This coupon has expired"};if(null!==d.usageLimit&&d.usageCount>=d.usageLimit)return{error:!0,message:"This coupon has reached its usage limit"};let g=Number(a?.cartTotal)||0;if(g<d.minOrderValue)return{error:!0,message:`Minimum order value Rs.${d.minOrderValue} required for this coupon`};let h=(b=0,"percent"===d.type?(b=Math.round(g*d.value/100),d.maxDiscount&&(b=Math.min(b,d.maxDiscount))):b=Number(d.value||0),Math.min(Math.round(b),g));return{error:!1,discount:h,message:`Coupon applied! You save Rs.${h}`,couponCode:d.code,type:d.type,value:d.value}}},86439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")},96045:(a,b,c)=>{c.d(b,{rO:()=>s,ao:()=>u,fP:()=>r,m1:()=>q,id:()=>t,Zw:()=>v});var d=c(59984),e=c(7875),f=c(6170);let g=`
  id,
  section,
  \`key\`,
  title,
  subtitle,
  image,
  link,
  badge,
  badgeColor,
  bgColor,
  textColor,
  isActive,
  \`order\`,
  meta,
  createdAt,
  updatedAt
`;function h(a){return a?{...a,_id:a.id,isActive:!!a.isActive}:null}async function i(a,{activeOnly:b=!0}={}){return(await (0,f.P)(`SELECT ${g}
     FROM HomePageContents
     WHERE section = :section
       ${b?"AND isActive = 1":""}
     ORDER BY \`order\` ASC, createdAt ASC`,{section:a})).map(h)}async function j(){return(await (0,f.P)(`SELECT ${g}
     FROM HomePageContents
     ORDER BY section ASC, \`order\` ASC, createdAt ASC`)).map(h)}async function k(a){return h((await (0,f.P)(`SELECT ${g}
     FROM HomePageContents
     WHERE id = :id
     LIMIT 1`,{id:a}))[0])}async function l(a){return k((await (0,f.g7)(`INSERT INTO HomePageContents (
      section,
      \`key\`,
      title,
      subtitle,
      image,
      link,
      badge,
      badgeColor,
      bgColor,
      textColor,
      isActive,
      \`order\`,
      meta,
      createdAt,
      updatedAt
    ) VALUES (
      :section,
      :key,
      :title,
      :subtitle,
      :image,
      :link,
      :badge,
      :badgeColor,
      :bgColor,
      :textColor,
      :isActive,
      :order,
      :meta,
      NOW(),
      NOW()
    )`,{...a,isActive:+!!a.isActive})).insertId)}async function m(a,b){let c=Object.entries({...b,isActive:void 0===b.isActive?void 0:+!!b.isActive}).filter(([,a])=>void 0!==a);if(!c.length)return k(a);let d=c.map(([a])=>`\`${a}\` = :${a}`).join(", ");return await (0,f.g7)(`UPDATE HomePageContents
     SET ${d}, updatedAt = NOW()
     WHERE id = :id`,{id:a,...Object.fromEntries(c)}),k(a)}async function n(a){return(await (0,f.g7)(`DELETE FROM HomePageContents
     WHERE id = :id`,{id:a})).affectedRows>0}function o(a,b=!1){return void 0===a?b:!0===a||"true"===a||1===a||"1"===a}function p(a,b=null){return void 0===a?b:null===a||""===a?null:"string"==typeof a?a:JSON.stringify(a)}async function q(a){return{items:await i(a,{activeOnly:!0}),success:!0,error:!1}}async function r(){return{items:await j(),success:!0,error:!1}}async function s(a){if(!a.section||!a.key)throw new d.j$(400,"section and key are required");return{item:await l({section:String(a.section),key:String(a.key),title:a.title??null,subtitle:a.subtitle??null,image:a.image??null,link:a.link??null,badge:a.badge??null,badgeColor:a.badgeColor||"#1565C0",bgColor:a.bgColor||"#1565C0",textColor:a.textColor||"#fff",isActive:o(a.isActive,!0),order:Number(a.order??0),meta:p(a.meta)}),message:"Item created",success:!0,error:!1}}async function t(a,b){let c=await k(a);if(!c)throw new d.j$(404,"Item not found");let f=void 0!==b.image?b.image:c.image;return c.image&&c.image!==f&&await (0,e.y_)(c.image),{item:await m(a,{title:b.title??c.title,subtitle:b.subtitle??c.subtitle,image:f,link:b.link??c.link,badge:b.badge??c.badge,badgeColor:b.badgeColor??c.badgeColor,bgColor:b.bgColor??c.bgColor,textColor:b.textColor??c.textColor,isActive:void 0!==b.isActive?o(b.isActive,c.isActive):c.isActive,order:void 0!==b.order?Number(b.order):c.order,meta:p(b.meta,c.meta)}),message:"Item updated",success:!0,error:!1}}async function u(a){let b=await k(a);if(!b)throw new d.j$(404,"Item not found");return b.image&&await (0,e.y_)(b.image),await n(a),{message:"Item deleted",success:!0,error:!1}}async function v(a){let b=await a.formData(),[c]=await (0,e.Vn)(b,"image");if(!c)throw new d.j$(400,"No file uploaded");return{image:c,success:!0,error:!1}}}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[5873,641,809,8102,5980],()=>b(b.s=71889));module.exports=c})();