exports.id=5980,exports.ids=[5980],exports.modules={6170:(a,b,c)=>{"use strict";c.d(b,{FO:()=>g,P:()=>h,g7:()=>i});var d=c(3498);function e(a,{allowEmpty:b=!1}={}){let c=process.env[a];if(null==c||!b&&""===c)throw Error(`Missing required environment variable: ${a}`);return c}let f=globalThis.__infixmartMysqlPool||(globalThis.__infixmartMysqlPool={pool:null});function g(){return f.pool||(f.pool=d.createPool({host:e("DB_HOST"),port:Number(process.env.DB_PORT||3306),database:e("DB_NAME"),user:e("DB_USER"),password:e("DB_PASSWORD",{allowEmpty:!0}),waitForConnections:!0,connectionLimit:Number(process.env.DB_POOL_LIMIT||10),queueLimit:0,namedPlaceholders:!0,charset:"utf8mb4"})),f.pool}async function h(a,b={}){let[c]=await g().query(a,b);return c}async function i(a,b={}){let[c]=await g().execute(a,b);return c}},8146:(a,b,c)=>{"use strict";c.d(b,{E9:()=>k,Ie:()=>l,Ml:()=>i,tf:()=>m,wK:()=>h,zK:()=>j});var d=c(38629),e=c(59984);let f=d.YjP().trim().toLowerCase().email("Invalid email address"),g=d.YjP().min(8,"Password must be at least 8 characters").regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&^_\-])/,"Password must contain a letter, number, and special character"),h=d.Ikc({email:f,password:d.YjP().min(1,"Password is required")}),i=d.Ikc({email:f,password:d.YjP().min(1,"Password is required")}),j=d.Ikc({name:d.YjP().trim().min(1,"Name is required"),email:f,password:g}),k=d.Ikc({email:f});d.Ikc({password:g});let l=d.Ikc({email:f,otp:d.YjP().length(6,"OTP must be 6 digits").regex(/^\d+$/,"OTP must be numeric")});function m(a,b){let c=a.safeParse(b);if(!c.success){let a=c.error.errors[0]?.message||"Invalid request data";throw new e.j$(400,a)}return c.data}},17194:(a,b,c)=>{"use strict";c.d(b,{Gs:()=>i,f8:()=>m,kg:()=>l,lC:()=>j,or:()=>k,x8:()=>h});var d=c(6170);let e=`
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
    )`,{name:a,email:b,password:c,avatar:e,mobile:f,country:g,accessToken:h,refreshToken:i,verify_email:k,last_login_date:l,status:m,otp:n,otp_expires:o,google_id:p,role:q});return j(r.insertId)}async function m(a,b){let c=Object.entries(b).filter(([a,b])=>f.has(a)&&void 0!==b);if(0===c.length)return j(a);let e=c.map(([a])=>`\`${a}\` = :${a}`).join(", "),g=Object.fromEntries(c);return await (0,d.g7)(`UPDATE Users SET ${e}, updatedAt = NOW() WHERE id = :id`,{...g,id:a}),j(a)}},19091:(a,b,c)=>{"use strict";let d;c.d(b,{Z:()=>h});var e=c(21572);let f=Number(process.env.SMTP_PORT||465),g=null!=process.env.SMTP_SECURE?"true"===process.env.SMTP_SECURE:465===f;async function h({to:a,subject:b,text:c="",html:h=""}){await (!d&&(d=e.createTransport({host:process.env.SMTP_HOST,port:f,secure:g,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}})),d).sendMail({from:`"InfixMart" <${process.env.SMTP_FROM||process.env.SMTP_USER}>`,to:a,subject:b,text:c,html:h})}},28337:(a,b,c)=>{"use strict";c.d(b,{bN:()=>r,Qw:()=>u,CF:()=>v,wx:()=>t,vq:()=>x,ZT:()=>s,Y_:()=>y,pU:()=>w});var d=c(7028),e=c(59984),f=c(8146),g=c(35984),h=c(19091),i=c(43281),j=c(17194),k=c(6170);async function l(){let[a,b,c,d]=await Promise.all([(0,k.P)("SELECT COUNT(*) AS totalOrders FROM Orders"),(0,k.P)("SELECT COUNT(*) AS totalUsers FROM Users"),(0,k.P)("SELECT COUNT(*) AS totalProducts FROM Products"),(0,k.P)("SELECT COALESCE(SUM(totalPrice), 0) AS totalRevenue FROM Orders")]);return{totalOrders:Number(a[0]?.totalOrders||0),totalUsers:Number(b[0]?.totalUsers||0),totalProducts:Number(c[0]?.totalProducts||0),totalRevenue:Number(d[0]?.totalRevenue||0)}}async function m({page:a=1,perPage:b=10,status:c=""}){let d=[],e={limit:b,offset:(a-1)*b};c&&(d.push("o.status = :status"),e.status=c);let f=d.length?`WHERE ${d.join(" AND ")}`:"",[g,h]=await Promise.all([(0,k.P)(`SELECT COUNT(*) AS totalOrders
       FROM Orders o
       ${f}`,e),(0,k.P)(`SELECT
         o.*,
         u.name AS user_name,
         u.email AS user_email
       FROM Orders o
       LEFT JOIN Users u ON u.id = o.userId
       ${f}
       ORDER BY o.createdAt DESC
       LIMIT :limit OFFSET :offset`,e)]),i=Number(g[0]?.totalOrders||0),j=Math.max(1,Math.ceil(i/b));return{orders:h.map(a=>({...a,items:p(a.items,[]),shippingAddress:p(a.shippingAddress,{}),paymentResult:p(a.paymentResult,{}),user:a.user_name||a.user_email?{name:a.user_name,email:a.user_email}:null})),totalOrders:i,totalPages:j,page:a}}async function n({page:a=1,perPage:b=20,search:c=""}){let d=[],e={limit:b,offset:(a-1)*b};c&&(d.push("(name LIKE :search OR email LIKE :search)"),e.search=`%${c}%`);let f=d.length?`WHERE ${d.join(" AND ")}`:"",[g,h]=await Promise.all([(0,k.P)(`SELECT COUNT(*) AS totalUsers
       FROM Users
       ${f}`,e),(0,k.P)(`SELECT
         id,
         name,
         email,
         avatar,
         mobile,
         country,
         verify_email,
         last_login_date,
         status,
         google_id,
         role,
         createdAt,
         updatedAt
       FROM Users
       ${f}
       ORDER BY createdAt DESC
       LIMIT :limit OFFSET :offset`,e)]),i=Number(g[0]?.totalUsers||0),j=Math.max(1,Math.ceil(i/b));return{users:h.map(a=>({...a,_id:a.id,verify_email:!!a.verify_email})),totalUsers:i,totalPages:j,page:a}}async function o(a){let[b,c]=await Promise.all([(0,k.P)(`SELECT COUNT(*) AS orderCount
       FROM Orders
       WHERE userId = :userId`,{userId:a}),(0,k.P)(`SELECT COALESCE(SUM(totalPrice), 0) AS totalSpent
       FROM Orders
       WHERE userId = :userId`,{userId:a})]);return{orderCount:Number(b[0]?.orderCount||0),totalSpent:Number(c[0]?.totalSpent||0)}}function p(a,b){try{return JSON.parse(a||JSON.stringify(b))}catch{return b}}async function q(a){let b=(0,g.Q5)(a),c=(0,g.TL)(a);return await (0,j.f8)(a,{refreshToken:c,last_login_date:new Date}),{accessToken:b,refreshToken:c}}async function r(a){let{email:b,password:c}=(0,f.tf)(f.wK,a),g=await (0,j.Gs)(b);if(!g)throw new e.j$(401,"Invalid credentials");if("admin"!==g.role)throw new e.j$(403,"Access denied. Admins only.");if("active"!==g.status)throw new e.j$(403,"Account is not active. Contact support.");if(!await d.Ay.compare(String(c),String(g.password||"")))throw new e.j$(401,"Invalid credentials");let h=await q(g.id),k=await (0,j.lC)(g.id);return await (0,i.b)({adminId:g.id,action:"LOGIN",entity:"admin",detail:`Admin logged in: ${b}`}),{body:{message:"Login successful",success:!0,error:!1,data:{user:(0,j.x8)(k)}},tokens:h}}async function s(a){let b=await (0,j.lC)(a);if(!b||"admin"!==b.role)throw new e.j$(403,"Access denied. Admins only.");return b}async function t(){return{...await l(),message:"Dashboard stats fetched successfully",success:!0,error:!1}}async function u({page:a,perPage:b,status:c}){return{...await m({page:a,perPage:b,status:c}),message:"All orders fetched",success:!0,error:!1}}async function v(a){return{...await n(a),message:"Users fetched successfully",success:!0,error:!1}}async function w(a,b){let c=await (0,j.lC)(a);if(!c)throw new e.j$(404,"User not found");if("admin"===c.role)throw new e.j$(403,"Cannot suspend an admin account");let d=b?"active":"Suspended",f=await (0,j.f8)(a,{status:d});return await (0,i.b)({adminId:c.id,action:"UPDATE",entity:"user",entityId:a,detail:`Status changed to ${d}`}),{message:`User ${d}`,user:(0,j.x8)(f),success:!0,error:!1}}async function x(a){return{...await o(a),success:!0,error:!1}}async function y(a){if(!a)throw new e.j$(400,"Provide ?to=your@email.com");return await (0,h.Z)({to:a,subject:"InfixMart SMTP Test",text:"This is a plain-text test email from InfixMart. If you see this, SMTP is working.",html:`<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;padding:32px;background:#f4f6f9;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <h2 style="color:#1565C0;margin-top:0;">InfixMart SMTP Test</h2>
    <p style="color:#333;">This is a test email sent from the InfixMart backend.</p>
    <p style="color:#555;">If you are reading this, your SMTP configuration is working correctly.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
    <p style="color:#888;font-size:12px;">
      Sent at: ${new Date().toISOString()}<br/>
      SMTP Host: ${process.env.SMTP_HOST||""}<br/>
      SMTP User: ${process.env.SMTP_USER||""}
    </p>
  </div>
</body></html>`}),{message:`Test email sent to ${a}. Check inbox (and spam folder).`,success:!0,error:!1}}},35984:(a,b,c)=>{"use strict";c.d(b,{$$:()=>j,$Y:()=>h,En:()=>i,Q5:()=>e,TL:()=>f,yE:()=>g});var d=c(48318);function e(a){return d.sign({id:a},process.env.JWT_SECRET_ACCESS_TOKEN,{expiresIn:"15m"})}function f(a){return d.sign({id:a},process.env.JWT_SECRET_REFRESH_TOKEN,{expiresIn:"7d"})}function g(a){return d.sign({email:a,purpose:"password-reset"},process.env.JWT_SECRET||process.env.JWT_SECRET_ACCESS_TOKEN,{expiresIn:"10m"})}function h(a){return d.verify(a,process.env.JWT_SECRET_ACCESS_TOKEN)}function i(a){return d.verify(a,process.env.JWT_SECRET_REFRESH_TOKEN)}function j(a){return d.verify(a,process.env.JWT_SECRET||process.env.JWT_SECRET_ACCESS_TOKEN)}},43281:(a,b,c)=>{"use strict";c.d(b,{b:()=>g});var d=c(6170);let e=!1;async function f(){await (0,d.g7)(`
    CREATE TABLE IF NOT EXISTS AdminAuditLog (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      adminId     INT UNSIGNED NOT NULL,
      action      VARCHAR(64)  NOT NULL,
      entity      VARCHAR(64)  NOT NULL,
      entityId    VARCHAR(128) DEFAULT NULL,
      detail      TEXT         DEFAULT NULL,
      ip          VARCHAR(64)  DEFAULT NULL,
      createdAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_adminId (adminId),
      INDEX idx_entity  (entity, entityId),
      INDEX idx_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)}async function g({adminId:a,action:b,entity:c,entityId:g=null,detail:h=null,ip:i=null}){try{e||(await f(),e=!0),await (0,d.g7)(`INSERT INTO AdminAuditLog (adminId, action, entity, entityId, detail, ip)
       VALUES (:adminId, :action, :entity, :entityId, :detail, :ip)`,{adminId:a,action:String(b).toUpperCase().slice(0,64),entity:String(c).toLowerCase().slice(0,64),entityId:null!=g?String(g).slice(0,128):null,detail:h?String(h).slice(0,2e3):null,ip:i?String(i).slice(0,64):null})}catch(a){console.error("[AuditLog] Failed to write audit log:",a?.message)}}},59984:(a,b,c)=>{"use strict";c.d(b,{IG:()=>i,fJ:()=>h,j$:()=>e,ok:()=>g});var d=c(10641);class e extends Error{constructor(a,b){super(b),this.name="HttpError",this.status=a}}function f(a,b=200){return d.NextResponse.json(a,{status:b})}function g(a,b=200){return f(a,b)}function h(a,b){return f({message:b,error:!0,success:!1},a)}function i(a){return a instanceof e?h(a.status,a.message):(console.error("[native-api]",a),h(500,"Internal server error"))}},60100:(a,b,c)=>{"use strict";c.d(b,{ET:()=>g,G8:()=>i,KK:()=>h,R9:()=>j});var d=c(59984),e=c(63346),f=c(35984);function g(a){let b=(0,e.UM)(a,"accessToken")||(0,e.dS)(a);if(!b)throw new d.j$(401,"Unauthorized");try{return(0,f.$Y)(b).id}catch{throw new d.j$(401,"Unauthorized")}}function h(a){let b=(0,e.UM)(a,"refreshToken")||(0,e.dS)(a);if(!b)throw new d.j$(401,"No refresh token provided");return b}function i(a,b){let c=(0,e.UM)(a,"passwordResetToken");if(!c)throw new d.j$(403,"Password reset session expired");try{let a=(0,f.$$)(c);if("password-reset"!==a.purpose||String(a.email).toLowerCase()!==String(b).toLowerCase())throw Error("invalid");return a.email}catch{throw new d.j$(403,"Password reset session expired")}}function j(a){try{return(0,f.En)(a)}catch{throw new d.j$(403,"Invalid refresh token")}}},63346:(a,b,c)=>{"use strict";c.d(b,{hf:()=>i,GQ:()=>k,dS:()=>m,UM:()=>l,w9:()=>h,bk:()=>j});let d=function(){if(process.env.COOKIE_DOMAIN)return String(process.env.COOKIE_DOMAIN).trim();try{let a=new URL(process.env.FRONTEND_URL||"");return a.hostname.startsWith("www.")?a.hostname.slice(4):a.hostname}catch{return}}(),e=function(){let a=String(process.env.COOKIE_SAME_SITE||"").trim().toLowerCase();return["lax","strict","none"].includes(a)?a:"lax"}(),f=function(a,b=!1){if(null==a||""===a)return b;let c=String(a).trim().toLowerCase();return!!["1","true","yes","on"].includes(c)||!["0","false","no","off"].includes(c)&&b}(process.env.COOKIE_SECURE,!0)||"none"===e;function g(a){return{httpOnly:!0,secure:f,sameSite:e,path:"/",maxAge:a,...d?{domain:d}:{}}}function h(a,{accessToken:b,refreshToken:c}){b&&a.cookies.set("accessToken",b,g(900)),c&&a.cookies.set("refreshToken",c,g(604800))}function i(a){a.cookies.set("accessToken","",{...g(0),expires:new Date(0)}),a.cookies.set("refreshToken","",{...g(0),expires:new Date(0)})}function j(a,b){a.cookies.set("passwordResetToken",b,g(600))}function k(a){a.cookies.set("passwordResetToken","",{...g(0),expires:new Date(0)})}function l(a,b){return a.cookies.get(b)?.value||null}function m(a){let b=a.headers.get("authorization");return b?.startsWith("Bearer ")&&b.slice(7).trim()||null}},78335:()=>{},96487:()=>{}};